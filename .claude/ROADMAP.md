# Roadmap / ideas

None of this has been requested. It's context for "what might come next",
not a to-do list — don't start implementing any of it without the user
asking first.

- **More languages**: `src/i18n.js` currently has `es`/`en`. Adding another
  language is just one more dictionary entry plus adding the code to
  `LOCALES`.
- **Sound/animation polish**: no sound effects exist; the only animation is
  the score toast's fade in/out.
- **Undo/redo**: not implemented — no history stack of moves exists beyond
  the single current board state.
- **Difficulty-aware hints**: nothing like "reveal one cell" or "check my
  current progress against the solution" beyond the always-on red-highlight
  validation exists.
- **`App.jsx` size**: it's a single ~540-line component with no
  sub-components (growing steadily as features are added). Fine so far; if
  it keeps growing, splitting out the board grid and the numpad would be
  the natural refactor (see `.claude/ARCHITECTURE.md`) — don't do this
  preemptively.
- **Configurable mistake limit / difficulty**: `MAX_MISTAKES` is a single
  hardcoded constant (3) for every difficulty. Making it configurable per
  difficulty (e.g. more forgiving on Easy) is a natural extension nobody's
  asked for yet.
- **All-time leaderboard**: the current one is daily-only by design (see
  `.claude/DECISIONS.md`'s backend entry) — an all-time or weekly view was
  considered and explicitly deferred, not forgotten.
- **Per-device session revocation**: sessions are a single stateless JWT
  secret today; revoking one device without logging out every device would
  need a real sessions table, deliberately not built for v1 (see
  `.claude/DECISIONS.md`).
- **Progress merge instead of last-write-wins**: real conflict resolution
  (merging two devices' simultaneous edits field-by-field) instead of
  whichever `PUT` lands last winning outright — explicitly deferred as
  unnecessary complexity for a casual game, see `.claude/DECISIONS.md`.
