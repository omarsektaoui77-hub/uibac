# Deploy UIBAC to GitHub and Vercel

## GitHub

1. Create a new empty repository on GitHub (no README if you already have commits locally).
2. In PowerShell, from the project root:

```powershell
cd c:\Users\DELL\uibac
git status
git add -A
git commit -m "Prepare UIBAC for deploy: gitignore, ingest env, deploy docs"
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git branch -M main
git push -u origin main
```

Use a [Personal Access Token](https://github.com/settings/tokens) when Git asks for a password over HTTPS, or use SSH.

If `venv` or `.venv` was ever committed, remove it from the index once (after `.gitignore` is updated):

```powershell
git rm -r --cached bacquest-backend/venv_312 2>$null
git rm -r --cached .venv 2>$null
git commit -m "Stop tracking virtualenv directories"
```

## Vercel

1. Sign in at [vercel.com](https://vercel.com) with GitHub.
2. **Add New Project** → Import this repository.
3. **Root directory:** leave default (repository root with `package.json`).
4. **Environment variables** (Production and Preview as needed):

| Name | Example / note |
|------|----------------|
| `GROQ_API_KEY` | From Groq console |
| `GEMINI_API_KEY` | Optional |
| `AI_PROVIDER_ORDER` | `groq,gemini` (omit `ollama` on Vercel) |

Do not rely on `OLLAMA_HOST` on Vercel; Ollama must run on your machine.

5. Deploy, then open `https://YOUR_PROJECT.vercel.app/en` and test **Ask AI**.

6. Optional: set `INGEST_API_BASE_URL` only if you host a public API; otherwise `/api/ingest` returns 503 with a clear JSON message.
