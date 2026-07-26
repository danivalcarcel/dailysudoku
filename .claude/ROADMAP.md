# Roadmap / ideas

None of this has been requested. It's context for "what might come next",
not a to-do list — don't start implementing any of it without the user
asking first.

- **Deployment**: the app isn't hosted anywhere yet, only built locally and
  released as a downloadable zip via GitHub Releases. GitHub Pages (via a
  workflow step, or `gh-pages` branch) would be the natural next step if
  the user wants a live URL to actually play from.
- **Cross-device sync**: everything is `localStorage`-only right now, so
  progress/score/history don't follow a player between devices or browsers.
  Would require introducing a backend/accounts — a real architecture
  change, not a small addition (see `.claude/DECISIONS.md`).
- **Real leaderboard**: the score/history system is entirely local to one
  browser; there's no way to compare with anyone else. Same backend caveat
  as above.
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
- **`App.jsx` size**: it's a single ~350-line component with no
  sub-components. Fine so far; if it keeps growing, splitting out the board
  grid and the numpad would be the natural refactor (see
  `.claude/ARCHITECTURE.md`) — don't do this preemptively.
