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

  boardStorage.js          persistence of {board, notes, completedUnits, scored} per day+difficulty
  score.js                 persistence of the lifetime total score
  scoreHistory.js          persistence of per-day point totals (never pruned)

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
   local `YYYY-MM-DD` string. This string is used both as the RNG seed
   input and as the storage key for that day's data.
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
   or creates a `puzzleState` object: `{ board, notes, completedUnits, scored }`.
   - `board`: 9×9 array of strings (`''` for empty, `'1'`-`'9'` for filled).
   - `notes`: 9×9 array of number arrays (candidate marks per cell).
   - `completedUnits`: `{ rows: bool[9], cols: bool[9], boxes: bool[9] }` —
     which units have already earned their points, so they never re-earn.
   - `scored`: whether the whole-puzzle completion bonus was already given.
4. Every `puzzleState` change is persisted via `savePuzzleState(seed,
   difficulty, board, notes, completedUnits, scored)`, keyed by
   `daily-sudoku:board:<date>:<difficulty>`. Saving also deletes any stored
   key for a *different date* (but keeps other difficulties for the *same*
   date) — see `.claude/DECISIONS.md`.
5. Two independent `useEffect`s watch for scoring events:
   - one fires whenever `board` changes, recomputes which rows/cols/boxes
     are newly complete-and-correct (`sudokuCompletion.js`), awards
     `unitPoints` per newly-completed unit, and shows a toast.
   - one fires whenever the whole board matches the solution and `scored`
     is still `false`, awards `completionPoints` once.
   Both add to the lifetime total (`score.js`) and to today's entry in the
   history map (`scoreHistory.js`).

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
arrow-key navigation calls `.focus()` on. `selected: {row, col}` in React
state is a *separate* notion of "current cell" from DOM focus — it's what
the numpad and the notes-mode selection ring use, and it's what survives
a numpad tap stealing DOM focus away from the grid.
