# Daily Sudoku

A daily sudoku puzzle web app, in the spirit of Wordle: everyone who opens
it on the same day gets the same puzzle, generated deterministically with
no backend or database.

**Live**: https://dailysudoku.danivalcarcel.workers.dev/

## Features

- New puzzle every day, resetting at local midnight
- Four difficulty levels (Easy, Medium, Hard, Extreme), each with its own
  independent daily puzzle and saved progress
- Notes/pencil marks for candidate numbers
- Automatic validation as you type (no "check" button)
- Scoring: points for completing a row, column, or box, plus a bigger bonus
  for finishing the whole puzzle, with a lifetime total and a per-day history
- English / Spanish
- Responsive: on-screen numpad on mobile and tablet, keyboard and
  arrow-key navigation on desktop

## Tech stack

React 19 + Vite, plain JavaScript. No backend, no accounts — everything
(progress, notes, score, history, language, difficulty) is saved in the
browser's `localStorage`.

## Getting started

Requires [Node.js](https://nodejs.org).

```bash
npm install
npm run dev
```

Opens the dev server at `http://localhost:5173`.

## Build

```bash
npm run build
```

Outputs a production build to `dist/`.

## Deploy

The app is hosted on Cloudflare Workers. To deploy manually (requires
`wrangler login` first):

```bash
npm run deploy
```

## Releases

Pushing a tag matching `vX.Y.Z` triggers `.github/workflows/release.yml`,
which builds the app and publishes a GitHub Release with the build
attached. A tag with a `-suffix` (e.g. `v0.1.0-beta.1`) is published as a
pre-release; a clean tag (e.g. `v1.0.0`) as a full release:

```bash
git tag v0.1.0-beta.1
git push origin v0.1.0-beta.1
```
