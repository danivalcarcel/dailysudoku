# Project context

## What this is

A "daily sudoku" web app, in the spirit of Wordle: one puzzle per day, same
puzzle for everyone who opens it that day, resetting at the same fixed UTC
time worldwide (07:00 UTC), not at each player's local midnight.
Started as a deliberately bare-bones skeleton ("lo más básico posible") and
grew feature by feature over a single long conversation, each feature added
on explicit request and verified in the browser before moving on.

The user (Dani) writes in Spanish and the conversation happened in Spanish.
The app itself supports Spanish and English via `src/i18n.js`.

## Tech stack

- **React 19** + **Vite 8**, plain JavaScript (no TypeScript).
- No routing, no state-management library, no CSS framework, no i18n
  library, no sudoku-generation library — all hand-rolled in small
  single-purpose modules under `src/`. This was a deliberate choice each
  time (see `.claude/DECISIONS.md`), not an oversight — keep it that way
  unless there's a real reason to add a dependency.
- Deployed as a static site (no real backend, no database, no accounts).
  All persistence is the browser's `localStorage`. It's hosted on
  **Cloudflare Workers** (static assets, SPA routing) — see
  `.claude/DECISIONS.md` for how that was set up.

## Current feature set (as of this writing)

- Daily puzzle generated client-side from a seed derived from the date and
  the selected difficulty (`src/sudokuGenerator.js`).
- Four difficulties: Fácil/Easy, Medio/Medium, Difícil/Hard, Extremo/Extreme
  (`src/difficulties.js`), each a fully independent daily puzzle with its
  own saved progress.
- Manual digit entry via keyboard (physical) or an on-screen numpad (shown
  automatically on narrower viewports, ≤860px). Phones (≤480px) get a
  compact 3×3 numpad grid; tablets (≤860px) get a single row of 9 — see
  `.claude/DECISIONS.md`.
- Arrow-key navigation between cells.
- Automatic validation: wrong digits are highlighted red as you type, no
  "check" button.
- Notes/pencil marks: a toggle switches digit entry into marking candidates
  in a 3×3 mini-grid instead of filling the cell; entering a **correct**
  value clears that cell's notes and removes that digit from the notes of
  every peer cell in the same row/column/box (a wrong entry touches nothing).
  Selecting any filled cell also bold-highlights that same digit wherever it
  appears as a note elsewhere, to help compare candidates.
- A per-difficulty timer: ticks every second while that difficulty's puzzle
  is unsolved, freezes on completion, persists across reloads, and the
  final time is recorded in the daily history.
- Scoring: points for completing a row, column, or box (see
  `.claude/DECISIONS.md` for why columns were added), plus a larger bonus
  for finishing the whole puzzle. A running lifetime total and a per-day
  history (points + per-difficulty times) are both persisted and never
  reset.
- i18n (ES/EN) with a language switcher, persisted preference.
- Local progress persistence per day+difficulty (board, notes, which
  units/whole-puzzle have already been scored, elapsed time) so a reload
  never loses progress or double-awards points.
- Responsive layout: compact corner header, board scales to viewport width
  (bigger on desktop, gently inset on phones — see `.claude/DECISIONS.md`
  for the `#root` sizing bug this depended on), numpad only on touch-sized
  viewports.
- Cells take focus themselves (`preventDefault` + `focus({preventScroll:
  true})`) instead of relying on the browser default, so iOS doesn't
  scroll the page to "center" a tapped cell.
- GitHub repo with a tag-triggered release workflow (see
  `.claude/DEV_SETUP.md`).
- Live at https://dailysudoku.danivalcarcel.workers.dev/, deployed via
  Cloudflare Workers (`npm run deploy` / `wrangler deploy`).

## How the user likes to work

- Requests almost always come as "¿podemos añadir X?" — treat this as a
  request to implement directly, not just to discuss, given the established
  pattern across this project. Reserve actual back-and-forth discussion for
  genuinely open-ended or ambiguous asks.
- When a default choice is ambiguous and consequential (repo visibility,
  which languages to support, whether to include a third scoring axis the
  user didn't explicitly mention), it's fine to ask a quick clarifying
  question rather than guess — but keep it to one focused question, not a
  design review.
- After any UI-affecting change, actually open the dev server preview and
  click through it (desktop and mobile viewport) rather than assuming the
  code is correct. This project's whole history has been developed this
  way and the user expects it.
- Keep the codebase minimal: no comments except where a non-obvious "why"
  exists, no speculative abstractions, no added dependencies unless there's
  a concrete need.
- No em dashes in any written output (organization-wide instruction).
