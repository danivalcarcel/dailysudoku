# Architecture

## File map

```
src/
  main.jsx              entry point, renders <App />
  App.jsx                all component logic and JSX (single component, no sub-components)
  App.css                all component styles
  index.css              CSS custom properties (color palette) + global/body styles

  sudokuGenerator.js      puzzle generation (seeded RNG, backtracking, uniqueness check)
  difficulties.js         difficulty list + config (targetEmpty, unitPoints, completionPoints)
  sudokuCompletion.js      row/column/box completion checks used by the scoring system

  boardStorage.js          persistence of {board, notes, completedUnits, scored, elapsedSeconds, mistakes} per day+difficulty
  scoreHistory.js          persistence of per-day {points, times: {difficulty: seconds}} (never pruned)

  i18n.js                  translations dict (es/en) + locale detection/persistence

.github/workflows/release.yml   tag-triggered build + GitHub release
.claude/launch.json              dev server config for the Claude Code browser preview
```

There are no subdirectories under `src/` and no shared "components" folder —
the whole UI is one component (`App`) rendering everything inline. This was
fine at every step so far; if `App.jsx` keeps growing, splitting out the
board grid and the numpad into their own components would be the natural
next refactor, but don't do it preemptively.

## Data flow, top to bottom

1. `getDailySeed(date)` (in `sudokuGenerator.js`) turns a `Date` into a
   `YYYY-MM-DD` string, but shifted so the "day" changes for everyone at
   the same fixed UTC hour (`RESET_HOUR_UTC`, currently 7) rather than at
   each player's local midnight — see `.claude/DECISIONS.md`. This string
   is used both as the RNG seed input and as the storage key for that
   day's data.
2. `generateDailySudoku(date, difficulty)` combines the date seed with the
   difficulty name (`"${seed}:${difficulty}"`), hashes it (`xmur3`) into a
   seed for `mulberry32`, then:
   - fills a full valid 9×9 grid via randomized backtracking (`fillGrid`),
   - repeatedly removes cells (`removeCells`) while a solver
     (`countSolutions`, capped at 2) confirms the remaining puzzle still
     has exactly one solution, up to `DIFFICULTY_CONFIG[difficulty].targetEmpty`
     empty cells.
   - Returns `{ puzzle, solution }` as 9×9 arrays (0 = empty in `puzzle`).
3. `App.jsx` calls this once per `difficulty` change (`useMemo`), then loads
   or creates a `puzzleState` object:
   `{ board, notes, completedUnits, scored, elapsedSeconds, mistakes }`.
   - `board`: 9×9 array of strings (`''` for empty, `'1'`-`'9'` for filled).
   - `notes`: 9×9 array of number arrays (candidate marks per cell).
   - `completedUnits`: `{ rows: bool[9], cols: bool[9], boxes: bool[9] }` —
     which units have already earned their points, so they never re-earn.
   - `scored`: whether the whole-puzzle completion bonus was already given.
   - `elapsedSeconds`: seconds spent on the current attempt at this
     difficulty's puzzle; see the timer effect below.
   - `mistakes`: count of wrong-digit entries this attempt (erasing doesn't
     increment it). `failed = mistakes > MAX_MISTAKES` (3) is derived from
     this each render, not stored separately — once `failed`, `handleChange`/
     `toggleNote` no-op and every cell's `readOnly` becomes `given ||
     failed`, locking the board until `handleReset`.
4. Every `puzzleState` change is persisted via `savePuzzleState(seed,
   difficulty, board, notes, completedUnits, scored, elapsedSeconds,
   mistakes)`, keyed by `daily-sudoku:board:<date>:<difficulty>`. Saving
   also deletes any stored key for a *different date* (but keeps other
   difficulties for the *same* date) — see `.claude/DECISIONS.md`.
5. Three independent `useEffect`s watch for scoring/timing events:
   - a timer effect that, while `!isSolved`, ticks a `setInterval` every
     second incrementing `elapsedSeconds` (cleared/frozen once solved);
   - one that fires whenever `board` changes, recomputes which rows/cols/
     boxes are newly complete-and-correct (`sudokuCompletion.js`), awards
     `unitPoints` per newly-completed unit, and shows a toast;
   - one that fires whenever the whole board matches the solution and
     `scored` is still `false`, awards `completionPoints` once and records
     `elapsedSeconds` into today's history entry for this difficulty
     (`recordHistoryTime`).
   Both scoring effects add to today's entry in the history map
   (`scoreHistory.js`); the topbar score display reads `history[seed].points`
   directly, so it shows only today's points and resets on its own once the
   day (and `seed`) changes — there's no separate lifetime counter.

## Rendering the board

Each cell is a wrapper `<div className="cell ...">` (this is the actual
grid item — `.board`'s direct children — so all the `nth-child` border and
`nth-child(9n)`/`nth-last-child(-n+9)` edge-border rules target these divs).
Inside it:

- an absolutely-positioned `<div className="cell__notes">` (a 3×3 mini-grid
  of digits 1-9, blank unless that digit is a note on that cell) — only
  rendered when the cell is empty and has at least one note;
- on top of it, an absolutely-positioned, transparent `<input
  className="cell__input">` that actually handles focus, typing, and the
  `readOnly` given-cell case.

The input stays on top (later in the DOM, same stacking context) so clicks
and keystrokes always land on it, while its transparent background lets the
notes grid show through when there's no value. This dual-layer approach
was chosen specifically so the pre-existing focus/arrow-key-navigation/
numpad-targeting logic (built before notes existed) didn't need to change —
see `.claude/DECISIONS.md`.

`cellRefs` (a `useRef` 9×9 array of the actual `<input>` DOM nodes) is what
arrow-key navigation calls `.focus({preventScroll: true})` on. `selected:
{row, col}` in React state is a *separate* notion of "current cell" from
DOM focus — it's what the numpad and the notes-mode selection ring use, and
it's what survives a numpad tap stealing DOM focus away from the grid.

Every cell's input also has `onMouseDown`/`onTouchStart` handlers that
`preventDefault()` and take focus manually via `focus({preventScroll:
true})`, instead of letting the browser's default tap-to-focus run — see
`.claude/DECISIONS.md` (iOS otherwise scrolls the page to "center" the
tapped cell).

## Puzzle date + reset countdown

`getNextResetTime(date)` (in `sudokuGenerator.js`, alongside `getDailySeed`)
returns the next `Date` at which `RESET_HOUR_UTC` occurs — today's if it
hasn't passed yet, tomorrow's otherwise. `App.jsx` polls this every 30s
into a `countdown` state (milliseconds remaining), formatted as `"9h
52min"` — minute precision only, so a 30s poll is enough; don't tick this
one every second like the per-puzzle timer. The displayed puzzle date
(`formatDate(seed, locale)`) reuses `seed` (`getDailySeed()`'s result), not
`new Date()`, for the reason in `.claude/DECISIONS.md`.

## Page shell (`body` / `#root`)

`index.css` centers the app card horizontally: `body` is
`display:flex; justify-content:center`, and `#root` is `width:100%;
display:flex; justify-content:center`. Both pieces matter — see
`.claude/DECISIONS.md` for the bug this fixes (a missing width on `#root`
silently shrank the whole app on both desktop and mobile) and why the page
is *not* also vertically centered (tried once, reverted).
