# deploy-vercel

## Context

For every code change to the user’s Next.js / Vercel project, the correct deployment flow is:

1. **GitHub is the source of truth.**
2. The project is connected to Vercel so that pushes to the `main` branch auto-deploy.
3. Manual `npx vercel --prod` bypasses GitHub, silently desyncing the repo. This should never be done.

## How to deploy (step-by-step)

1. **Git must be in PATH.** On this Windows machine, git is installed via GitHub Desktop at:
   ```
   C:\Users\proko\AppData\Local\GitHubDesktop\app-3.5.8\resources\app\git\cmd
   ```
   Always prepend this directory to `$env:PATH` before running any `git` command:
   ```powershell
   $env:PATH += ';C:\Users\proko\AppData\Local\GitHubDesktop\app-3.5.8\resources\app\git\cmd'
   ```

2. **Stage all changes.** Run from the project root (`C:\Users\proko\history-game`):
   ```powershell
   cd C:\Users\proko\history-game
   git add -A
   ```

3. **Commit with a descriptive message.**
   ```powershell
   git commit -m "feat/fix/docs: <concise description of what changed>"
   ```

4. **Push to `main` on GitHub.**
   ```powershell
   git push origin main
   ```

5. **Confirm the remote is correct.** The repo is `https://github.com/prokopHouda/history_game.git`.

6. **Vercel auto-deploys.** The deployment status can be checked at `https://vercel.com/prokop-s-projects/history-game`.
   No manual deploy commands are needed.

## Common mistakes to avoid

- ❌ **Never** run `npx vercel --prod` directly — this deploys the local directory but leaves GitHub stale.
- ❌ **Never** assume `git` is in the default PowerShell `PATH` on this machine; always set it from the GitHub Desktop location above.
- ❌ **Never** change git configs, remote URLs, or branch names unless explicitly asked.

## Environment recap

| Item | Value |
|------|-------|
| Local project root | `C:\Users\proko\history-game` |
| Git remote | `https://github.com/prokopHouda/history_game.git` |
| Branch | `main` |
| Git executable | `C:\Users\proko\AppData\Local\GitHubDesktop\app-3.5.8\resources\app\git\cmd\git.exe` |
| Vercel project | `history-game` (team `prokop-s-projects`) |
| Vercel alias | `https://history-game-ten.vercel.app` |
