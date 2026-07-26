# Daily Sudoku

React + Vite static web app: a daily sudoku puzzle, generated deterministically
(no backend, no database), with difficulty levels, notes, i18n, local
persistence and a scoring system.

Repo: https://github.com/danivalcarcel/dailysudoku (private)

This file is the entry point. For the full context of how this project came
to be and how to keep working on it, read the files in `.claude/`:

- **[.claude/PROJECT_CONTEXT.md](.claude/PROJECT_CONTEXT.md)** — what this app is, current features, tech stack, and how the user (Dani) likes to work.
- **[.claude/ARCHITECTURE.md](.claude/ARCHITECTURE.md)** — file-by-file map of `src/`, what each module owns, and how they connect.
- **[.claude/DECISIONS.md](.claude/DECISIONS.md)** — the non-obvious design decisions and the reasoning behind them. Read this before changing scoring, storage keys, or the notes rendering.
- **[.claude/DEV_SETUP.md](.claude/DEV_SETUP.md)** — how to get a dev environment running from scratch (Node, GitHub CLI), and how to build/release.
- **[.claude/ROADMAP.md](.claude/ROADMAP.md)** — ideas that came up but were never requested/implemented. Not commitments, just context.

## Quick facts

- Plain JavaScript (no TypeScript), no state-management or UI libraries, no sudoku library — everything in `src/` is hand-rolled on purpose.
- All persistence is `localStorage`. There is no backend and no accounts.
- UI text is in `src/i18n.js` (Spanish/English). Add new keys there, not inline strings.
- Always verify UI changes in an actual browser (desktop + mobile viewport) before calling a task done — this project has consistently been developed that way.
