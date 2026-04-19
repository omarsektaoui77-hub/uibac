# Deploy UIBAC to GitHub and Vercel

## Docker Deployment (Manual)

### Build Docker Image Locally

```powershell
cd c:\Users\DELL\uibac
docker build -t uibac:latest .
```

### Run Container Locally

```powershell
docker run -d -p 3000:3000 --name uibac uibac:latest
```

### With Environment Variables

```powershell
docker run -d -p 3000:3000 --name uibac `
  -e JWT_SECRET=your-super-secret-jwt-key-min-32-chars `
  -e PORT=3000 `
  -e HOST=0.0.0.0 `
  -e NODE_ENV=production `
  uibac:latest
```

### Push to Docker Registry

```powershell
docker tag uibac:latest your-registry/uibac:latest
docker push your-registry/uibac:latest
```

### Health Check

After deployment, test the health endpoint:

```powershell
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "autonomyEnabled": true,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

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

Repo: `https://github.com/omarsektaoui77-hub/uibac` (branch `main` is already pushed).

### Option A — Vercel for Git (recommended)

1. Sign in at [vercel.com](https://vercel.com) with GitHub.
2. **Add New Project** → Import **uibac**.
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

### Option B — GitHub Actions

Use this **instead of** Option A if you want CI to build and upload artifacts (e.g. GitHub Enterprise). If you already connected the repo under Vercel (Option A), **remove** `.github/workflows/vercel-production.yml` or you may get **two** production deploys per push.

This repo includes [`.github/workflows/vercel-production.yml`](.github/workflows/vercel-production.yml). After you [create a Vercel access token](https://vercel.com/guides/how-do-i-use-a-vercel-api-access-token) and run `vercel link` once locally to read `orgId` and `projectId` from `.vercel/project.json`, add these [repository secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions) in GitHub:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

The workflow is set to **manual** (`workflow_dispatch`). In GitHub: **Actions** → **Vercel Production Deployment** → **Run workflow**. To run on every `main` push, edit the workflow file and add a `push` trigger as described in the YAML comments. See the [Vercel guide](https://vercel.com/guides/how-can-i-use-github-actions-with-vercel).

### Option C — CLI on your PC

```powershell
cd c:\Users\DELL\uibac
npx vercel login
npx vercel link
npx vercel --prod
```

Complete the browser/device prompt when the CLI asks for authentication.
