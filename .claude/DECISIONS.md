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
seed is `"${YYYY-MM-DD}:${difficulty}"` (local date, not UTC — so the puzzle
changes at the player's local midnight, not at UTC midnight), hashed with
`xmur3` into a `mulberry32` PRNG seed. Including `difficulty` in the seed
means each difficulty is a fully independent random puzzle, not just the
same solved grid with a different number of holes punched out of it.

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

## CSS specificity bug worth remembering

Early on, `.actions button` (element+class selector) accidentally
overrode a more specific-looking `.notes-toggle` (single class) rule,
because element+class beats a single class regardless of source order.
Fixed by scoping to `.actions .notes-toggle` (two classes). If a new
button added inside `.actions` looks like it's ignoring its own modifier
class, check this first.
