---
name: deployment-history-game
description: |
  Use this skill whenever you modify any file in the history_game project.
  It governs how changes are committed, deployed, and documented.
  Always follow this workflow before declaring any task complete.
---

# Deployment & Commit Workflow — history_game

## Project identity
- **Name**: `history_game` (Next.js quiz game with Supabase backend)
- **Local root**: `C:\Users\proko\Documents\GitHub\history_game`
- **Git remote**: `https://github.com/prokopHouda/history_game.git`
- **Branch**: `main`
- **Vercel project**: `prokop-s-projects/history-game`
- **Production URL**: `https://history-game-ten.vercel.app`

## ⚠️ Critical Rules

### Rule 1 — Always commit via GitHub
All code changes **must** be committed to GitHub (`main` branch). Vercel auto-deploys from GitHub. Never skip Git.

### Rule 2 — Never deploy directly via Vercel
**Do NOT run `npx vercel --prod`, `vercel deploy`, or any Vercel CLI command.**
This bypasses GitHub and silently desyncs the repo. The only valid deployment path is:

```
local changes → git commit → git push origin main → Vercel auto-deploy
```

### Rule 3 — Update `/docs` documentation as part of every relevant commit
After making code changes, inspect the files under `/docs` in the repository. If any documentation is now inaccurate, incomplete, or missing due to the changes, update it **in the same commit** (or in a follow-up commit before pushing).

## Git setup (one-time per session)

Git is installed via GitHub Desktop. The exact path may change with app updates. Detect it dynamically or use the fallback below.

```powershell
# Dynamic detection
$gitExe = (Get-ChildItem "C:\Users\proko\AppData\Local\GitHubDesktop" -Recurse -Filter git.exe -ErrorAction SilentlyContinue | Select-Object -First 1).FullName

# Fallback if detection fails
if (-not $gitExe) { $gitExe = 'C:\Users\proko\AppData\Local\GitHubDesktop\app-3.5.11\resources\app\git\cmd\git.exe' }

# Alias for brevity
function git { & $gitExe @args }
```

## Standard commit & deploy steps

Run these steps **automatically** after any code change, unless the user explicitly asks you to skip them.

### 1. Review what changed
```powershell
git status
git diff --stat
```

### 2. Inspect `/docs` for needed updates
- List the files in `docs/`: `Get-ChildItem docs`
- Read any doc that relates to the changed code (e.g., `architecture.md`, `api.md`).
- If the docs are now stale or missing new behaviour, edit them before committing.

### 3. Stage everything (code + docs)
```powershell
git add -A
```

### 4. Commit with a descriptive message
```powershell
git commit -m "type: concise summary"
```
Use prefixes: `feat:`, `fix:`, `docs:`, `refactor:`, `style:`.
If both code and docs changed, prefer a single commit with a summary line and a body:
```powershell
git commit -m "feat: allow language switching during active game

docs: update api.md with new changeLang flow"
```

### 5. Push to GitHub
```powershell
git push origin main
```

If GitHub returns an `Internal Server Error`, wait a few seconds and retry the push.

### 6. Confirm Vercel auto-deploy
After a successful push, Vercel will queue a build automatically. No manual action is required.
- Dashboard: `https://vercel.com/prokop-s-projects/history-game`
- Live URL: `https://history-game-ten.vercel.app`

## What to do when git is not in PATH
If `git` command is not recognized, **do not give up**. Git is available via GitHub Desktop. Use the full path or the dynamic detection snippet above.

## Summary checklist (repeat before every "Done")
- [ ] Code changes are saved to disk
- [ ] `/docs` reviewed and updated if needed
- [ ] Changes staged with `git add -A`
- [ ] Commit message follows `type: description` format
- [ ] Pushed to `origin main`
- [ ] No Vercel CLI commands were used
