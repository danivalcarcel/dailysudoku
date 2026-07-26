# Dev environment setup

This was developed on a Windows machine that initially had **no Node.js and
no GitHub CLI installed at all**. If a future session starts on a fresh
machine (or this one, reimaged), don't assume either is present — check
first, don't guess.

## Node.js / npm

Check first:

```bash
node --version
```

```bash
npm --version
```

If missing, on Windows the fastest path (used previously) is `winget`:

```bash
winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
```

After installing, PATH needs to be refreshed in the *current* shell session
(a new terminal window would pick it up automatically):

```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

Then, from the project root:

```bash
npm install
```

```bash
npm run dev
```

opens the dev server at `http://localhost:5173`.

```bash
npm run build
```

produces a production build in `dist/` (this is what the release workflow
also runs).

If the dev server fails with something like `Cannot find package
'@cloudflare/vite-plugin'` after pulling changes, it's not a bug — a
dependency was added to `package.json` (e.g. by the Cloudflare integration
PR) and `npm install` just hasn't been run since. Run it and retry.

## Browser preview via Claude Code

`.claude/launch.json` is already configured so the Claude Code browser
preview tool can start the dev server directly (`preview_start` with
`{name: "daily-sudoku-dev"}`). On this machine, `npm` had to be referenced
by its full path (`C:\Program Files\nodejs\npm.cmd`) through `cmd.exe` with
an explicit `PATH` prepend, because the preview tool's process didn't see
the just-installed Node on its own — see the `runtimeExecutable`/
`runtimeArgs` in that file if the preview server fails to start with a
"node not recognized" error again after a fresh Node install.

## GitHub CLI

Check first:

```bash
gh auth status
```

If `gh` itself is missing:

```bash
winget install --id GitHub.cli -e --accept-source-agreements --accept-package-agreements
```

**Authentication must be done by the user, not by Claude** — it requires a
real GitHub login (browser device-code flow). Ask the user to run this
themselves in their own terminal and confirm when done:

```bash
gh auth login
```

(GitHub.com → HTTPS → "Login with a web browser"). Don't attempt to script
around this or ask for a pasted personal access token as a shortcut.

## Repository and releases

Repo: `danivalcarcel/dailysudoku` (private), remote `origin`, default
branch `main`.

Releases are created by `.github/workflows/release.yml`, triggered by
pushing a tag matching `v*.*.*`:

```bash
git tag v0.1.0-beta.1
```

```bash
git push origin v0.1.0-beta.1
```

A tag with a `-suffix` (like `-beta.1`, `-rc.1`) is published as a
**pre-release** automatically; a clean `vX.Y.Z` tag is published as a
normal release. The workflow builds the app, zips `dist/`, and attaches it
to the GitHub release with auto-generated notes.

## Live deployment (Cloudflare Workers)

Live URL: **https://dailysudoku.danivalcarcel.workers.dev/**

The project is connected to Cloudflare Workers through Cloudflare's GitHub
App (set up by the user directly in the Cloudflare dashboard, not through
this repo's own workflow). That integration auto-opened PR #1 ("Add
Cloudflare Workers configuration"), which was reviewed and merged — see
`.claude/DECISIONS.md`. That PR added:

- `wrangler.jsonc` — Worker config (`name: "dailysudoku"`, SPA asset
  routing via `not_found_handling: "single-page-application"`).
- the `@cloudflare/vite-plugin` plugin in `vite.config.js`.
- `wrangler` as a dependency, plus `preview`/`deploy` scripts in
  `package.json`.

To deploy manually from a local checkout:

```bash
npm run deploy
```

This runs `npm run build && wrangler deploy`. It requires being logged in
to the Cloudflare account that owns this Worker (`wrangler login`) — ask
the user to do that themselves the same way as `gh auth login`, don't try
to script around it.

There is currently **no CI step that deploys automatically** — deploys
happen either by running `npm run deploy` locally, or through whatever
Cloudflare's own GitHub integration does on pushes to `main` (check the
Cloudflare dashboard link in PR #1 if that needs confirming). The GitHub
Actions release workflow (above) is independent of this and only handles
GitHub Releases, not deployment.
