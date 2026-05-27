---
name: deploy-vercel
description: Deploy the user's Next.js project to Vercel by committing to GitHub and triggering the Vercel auto-deploy pipeline. Use this skill whenever the user asks to deploy changes, deploy to production, push live, or any similar request involving deploying the history-game project.
---

# Deploy to Vercel via GitHub

## Context

The project `history-game` is a Next.js app deployed on Vercel.
GitHub is the deployment source of truth: pushes to the `main` branch auto-deploy via Vercel's Git integration.

## ⚠️ Critical Rule

**Never run `npx vercel --prod` directly.** This bypasses GitHub, causing the repo to fall out of sync silently. All deployments must go through Git.

## Deploy steps

### 1. Ensure git is available

Git is installed via GitHub Desktop. Add this directory to `PATH` before every git command:

```powershell
$env:PATH += ';C:\Users\proko\AppData\Local\GitHubDesktop\app-3.5.8\resources\app\git\cmd'
```

### 2. Stage all changes

```powershell
cd C:\Users\proko\history-game
git add -A
```

### 3. Commit with a descriptive message

```powershell
git commit -m "feat/fix/docs: concise summary of what changed"
```

### 4. Push to main

```powershell
git push origin main
```

### 5. Verify on GitHub

Remote: `https://github.com/prokopHouda/history_game.git`
Branch: `main`

### 6. Vercel auto-deploys

The deployment appears at:
- Production URL: `https://history-game-ten.vercel.app`
- Vercel dashboard: `https://vercel.com/prokop-s-projects/history-game`

No manual Vercel commands are needed.

## Environment reference

| Item | Value |
|------|-------|
| Local project root | `C:\Users\proko\history-game` |
| Git remote | `https://github.com/prokopHouda/history_game.git` |
| Branch | `main` |
| Git executable | `C:\Users\proko\AppData\Local\GitHubDesktop\app-3.5.8\resources\app\git\cmd\git.exe` |
| Vercel project | `prokop-s-projects/history-game` |
| Production alias | `https://history-game-ten.vercel.app` |
