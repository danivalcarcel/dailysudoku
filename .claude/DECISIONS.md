# Design decisions and why

Things a future session would otherwise have to rediscover by reading diffs.
Ordered roughly by when they came up.

## No backend, ever (so far)

Every feature — the daily puzzle, notes, score, history, language, difficulty
preference — is generated or persisted entirely client-side. This was set
early ("web estática") and every later feature was deliberately designed to
fit that constraint rather than reaching for a server. If a future request
needs shared/cross-device state (a real leaderboard, syncing progress across
devices), that's a genuine architecture change, not a small addition —
flag it explicitly rather than quietly bolting a backend on.

## Daily puzzle: seeded generation, not a fixed list or per-request random

Two alternatives were considered: (a) generate client-side from a
date-derived seed, or (b) pre-generate a static list of puzzles (e.g. 365)
and pick by day-of-year. Seeded generation was chosen because it needs no
maintenance/regeneration and "just works" indefinitely, at the cost of the
puzzle quality/difficulty being algorithmic rather than hand-curated. The
seed is `"${YYYY-MM-DD}:${difficulty}"`, hashed with `xmur3` into a
`mulberry32` PRNG seed. Including `difficulty` in the seed means each
difficulty is a fully independent random puzzle, not just the same solved
grid with a different number of holes punched out of it.

**The day boundary is a fixed UTC time, not local midnight.** This
originally used each player's local calendar date (so the puzzle changed
at local midnight, a different real-world instant per timezone), but was
changed so *everyone* gets the new puzzle at the same moment worldwide:
`RESET_HOUR_UTC = 7` in `sudokuGenerator.js` — `getDailySeed` subtracts
that many hours from the given `Date` before reading its UTC year/month/
day, so the calendar day used for the seed only advances once the wall
clock in UTC passes 07:00. Concretely: at 05:00 UTC on July 27th it's still
July 26th's puzzle; only from 07:00 UTC on July 27th does July 27th's
puzzle start. **Anything that displays "today's date" in the UI must use
`getDailySeed()`'s result, not the browser's local calendar date** — during
the early hours of a new local day (or even a new UTC day, before 07:00)
it's still showing yesterday's puzzle, and the displayed date needs to
match. If the reset time ever needs to change, `RESET_HOUR_UTC` is the one
constant to edit; don't reintroduce local-timezone-based dating.

Uniqueness is enforced during hole-punching: each candidate removal is kept
only if a solution-counting solver (capped at 2, for speed) still finds
exactly one solution. This is the standard technique; don't replace it with
anything that skips the uniqueness check even for performance, or puzzles
could have multiple valid solutions.

## Notes rendering: overlay div, not a different cell type

When notes/pencil-marks were added, the board cells were already plain
`<input>` elements directly as the grid's children (for the simplest
possible focus/typing/arrow-nav model). Rather than restructuring cells
into something non-input-based to show a 3×3 mini-grid of candidates, each
cell became a wrapper `<div>` containing the notes grid *and* the original
input, with the input made transparent and absolutely positioned on top.
This preserved every bit of existing interaction logic (focus, keyboard
handling, ref-based arrow navigation, numpad targeting) unchanged. If notes
ever need to render differently, keep the input-on-top-of-notes structure
unless there's a real reason to change the interaction model too.

`inputMode="none"` is set on every cell's input specifically to suppress
the mobile on-screen keyboard, so the custom numpad is the primary mobile
input method. This does *not* block physical keyboard input — `inputMode`
is purely a hint to on-screen/virtual keyboards.

## Scoring: three axes (row/column/box), not two

The user asked for points on completing "una caja completa o una fila"
(a box or a row) — two of the three structural units in a sudoku. Columns
were added anyway, on the assumption that rewarding two of three symmetric
structures while ignoring the third would feel inconsistent, and this was
explicitly flagged back to the user as a judgment call rather than silently
assumed. If a future session finds column-scoring should be removed,
that's a deliberate reversal of an assistant decision, not a bug fix.

Point values were made deliberately large ("bastante más cantidad de
puntos... para que la gente se motive más") — see `DIFFICULTY_CONFIG` in
`src/difficulties.js` for the current numbers. Don't quietly shrink these
back down without being asked; the size is intentional.

## Anti-farming: completion flags never reset on "Reiniciar"

`scored` (whole puzzle) and `completedUnits` (per row/col/box) persist
across a manual reset — only the fillable cells and notes are cleared.
This is deliberate: without it, a player could fill a row, bank the points,
erase it, refill it, and bank the same points again. If a "true restart,
including points" feature is ever wanted, it needs to be an explicit new
action, not a side effect of the existing Reset button.

## Board storage cleanup is per-date, not per-date-and-difficulty

`savePuzzleState` deletes any stored board key for a *different date* than
the one just saved, but deliberately leaves other *difficulties of the same
date* alone. This lets a player switch between difficulties on the same day
without losing progress on the others, while still not accumulating an
ever-growing pile of old-day entries in `localStorage`. Score history
(`scoreHistory.js`) is the one thing that is *never* pruned — that's the
whole point of a "historical record" the user later asked for.

## Toast feedback for unit completions

When rows/columns/boxes scoring was added, a transient top-center toast
("+N puntos") was added alongside it, on the reasoning that immediate
feedback matters more for motivation than points that just silently
accumulate in a number at the top of the page. This wasn't explicitly
requested but was judged to directly serve the stated goal ("para que la
gente se motive más").

## Deployment: Cloudflare Workers, connected outside the conversation

The user connected the GitHub repo to Cloudflare Workers directly through
Cloudflare's own dashboard/GitHub App integration — this did not happen
through a request in this conversation, and Claude had no part in choosing
Cloudflare over the GitHub Pages option floated in `.claude/ROADMAP.md`.
That integration auto-opened PR #1 ("Add Cloudflare Workers configuration"),
generated by the `cloudflare-workers-and-pages` bot via "Wrangler
autoconfig". The PR was reviewed (diff read file-by-file: `.gitignore`,
`package.json`, `vite.config.js`, new `wrangler.jsonc`, and the
`package-lock.json` update for the two new devDependencies) before
squash-merging it — nothing in it looked unexpected for a standard
Cloudflare Vite integration. See `.claude/DEV_SETUP.md` for the resulting
deploy command and the live URL. If Cloudflare-specific files
(`wrangler.jsonc`, the `cloudflare()` Vite plugin) look out of place later,
this is why they exist — don't remove them without checking whether the
live site still needs them.

## `#root` had no width: a real, long-standing sizing bug

`body` centers its content with `display:flex; justify-content:center`,
but `#root` (the child that React renders `.app` into) had no `width` of
its own. A flex item with no set width shrinks to its *content* size
instead of filling available space, so `.app`'s own `width:100%` was
resolving against an already-shrunk `#root` — meaning the board had quietly
been smaller than intended on **both** desktop and mobile the whole time,
not just after the "enlarge the desktop board" request that surfaced it.
Fixed with `#root { width:100%; display:flex; justify-content:center; }`
(`#root` needs its own `justify-content:center` to re-center `.app`, since
giving `#root` width:100% removes the leftover space `body`'s
justify-content had been centering *within*).

One follow-up attempt tried also centering the page **vertically**
(`align-items:center` on `body`), to close a gap that appeared below
"Historial" on tall phones (iPhone 15) once the board started rendering at
its correct, larger size. The user tried it and asked for a rollback
("no queda bien") — it's reverted. Don't reintroduce vertical centering on
`body` without asking first; the page is meant to sit top-aligned.

## Mobile numpad: 3×3 grid on phones, single row of 9 on tablets

The numpad went through a few iterations: originally a 3×3 grid sized like
the desktop version (too tall to fit a phone viewport without scrolling),
then a single row of 9 small buttons to solve that (fit, but felt cramped
on phones), and settled on a breakpoint split: phones (`≤480px`) get a
3×3 grid sized smaller than the original, tablets (`≤860px`, i.e. wider
than a phone but still touch-sized) keep the single row of 9, which has
enough width there to not feel cramped. If asked to tweak numpad sizing
again, check which breakpoint is actually being tested against — "the
numpad" means different CSS depending on viewport width.

The board itself (and the numpad/history, to stay visually aligned with
it) also isn't edge-to-edge on phones: it's inset to `min(28rem, 90%)`
rather than 100%, because once the `#root` bug above was fixed and the
board correctly filled the available width, it felt oversized/dominant on
a phone screen. The topbar (title + language switch) shares that same 90%
inset so it lines up with the board below it.

## Per-difficulty timer: ticks while unsolved, freezes on completion

`elapsedSeconds` lives on `puzzleState` (per day+difficulty, persisted like
everything else there). A `useEffect` keyed on `[isSolved, seed,
difficulty]` runs a `setInterval` that increments it once a second, but
only while `!isSolved`; solving the puzzle lets the effect's cleanup clear
the interval, freezing the value. This means the timer only counts time
while the tab is open (browsers throttle/pause intervals in inactive
background tabs) — a deliberate, simple choice over trying to track
"real" elapsed wall-clock time with explicit pause/resume handling.
`handleReset` zeroes `elapsedSeconds` (restarting a puzzle restarts its
clock), but does **not** touch `scored`/`completedUnits` (same
anti-farming reasoning as elsewhere) — so replaying an already-solved
puzzle shows a live timer again but can't re-record a new history time.

## Note highlighting: based on the selected cell's actual value

When a cell that already has a value (given or filled) is selected,
`highlightDigit` is computed from `board[selected.row][selected.col]` and
every `cell__note` matching that digit anywhere else on the board gets a
bold/accent-colored style. Selecting an *empty* cell clears the highlight
(nothing to compare against). This piggybacks on the existing `selected`
state rather than adding new state — if selection tracking ever changes,
this highlight logic needs to move with it.

## Locale detection defaults to English, not Spanish, for unknown languages

`detectLocale()` originally fell back to Spanish whenever the browser's
language wasn't a recognized value in `LOCALES`. Changed so only an actual
`es`-prefixed browser locale picks Spanish; every other value (French,
German, unset, etc. — and English itself) picks English. A stored manual
preference (from the language switcher) still overrides detection either
way. If more languages are ever added to `LOCALES`, decide explicitly
whether the "anything else defaults to English" fallback still applies or
needs to become smarter (e.g. matching against each supported locale) —
don't assume the current two-branch logic scales past two languages.

## Mistake limit: locks the board, doesn't auto-reset it

`MAX_MISTAKES = 3` in `App.jsx`. Only entering an actual wrong digit counts
(`value !== '' && !isCorrectEntry` in `handleChange`) — erasing a cell
never increments `mistakes`, so backspacing away a mistake doesn't erase
the penalty (that's the point: mistakes are permanent for the attempt).
`failed` is derived (`mistakes > MAX_MISTAKES`), not stored, so it's
naturally in sync with the persisted count after a reload.

On failure the board is **not** automatically cleared — it locks
(`readOnly`, dimmed via `.board--locked`) with a message asking the player
to press Reset themselves. This was a deliberate choice over auto-clearing
immediately: the player gets a moment to see the state that lost them
before it's wiped. `handleReset` zeroes `mistakes` along with the board/
notes/timer, same as any other fresh attempt.

The displayed counter caps at `MAX_MISTAKES`/`MAX_MISTAKES` (e.g. "3/3")
even though the underlying count can reach `MAX_MISTAKES + 1` internally
(that's what flips `failed`) — showing "4/3" would read as a bug rather
than "you're over the limit". If the limit or its wording changes, keep
that display cap in mind.

Already-earned row/column/box points from before the failure are **not**
clawed back (same anti-farming philosophy as elsewhere: earning is
one-directional). Only the completion bonus is out of reach until a fresh,
successful attempt.

## Topbar score: daily, not lifetime-cumulative

Originally `score.js` persisted a single lifetime-total counter shown in the
topbar, incremented forever and never reset. The user expected the topbar
number to go back to 0 once the daily puzzle changed, and confirmed (when
asked) that this should be a real behavior change, not just a misunderstanding
of the existing cumulative design. `score.js` was deleted; the topbar now
reads `history[seed]?.points ?? 0` directly from `scoreHistory.js`, which
already tracked points per date — so it naturally shows 0 for a fresh day
without any explicit reset logic. There is no lifetime total displayed
anywhere anymore; if one is wanted later (e.g. a "puntos totales" stat), it
would need to be derived by summing all `history` entries, not reintroduced
as a separately-persisted counter (that would risk drifting from the
per-day figures again).

## CSS specificity bug worth remembering

Early on, `.actions button` (element+class selector) accidentally
overrode a more specific-looking `.notes-toggle` (single class) rule,
because element+class beats a single class regardless of source order.
Fixed by scoping to `.actions .notes-toggle` (two classes). If a new
button added inside `.actions` looks like it's ignoring its own modifier
class, check this first.
