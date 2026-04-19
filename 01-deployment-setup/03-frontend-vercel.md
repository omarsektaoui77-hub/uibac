# Frontend Setup - Vercel

## What is Vercel?
Vercel is a cloud platform for static sites and serverless functions, optimized for Next.js. It offers a free tier perfect for development.

## Vercel Account Setup

### 1. Create Vercel Account
- Go to https://vercel.com
- Sign up with GitHub (recommended)
- Free tier includes:
  - Unlimited deployments
  - 100GB bandwidth/month
  - Automatic HTTPS
  - Preview deployments for every git branch

### 2. Connect GitHub Repository
1. Go to Vercel dashboard
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js

### 3. Configure Project Settings

#### Framework Preset:
- **Framework:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`

#### Environment Variables:
- Add in Vercel dashboard (see `04-environment-variables.md`)

## Vercel CLI Setup

### Install Vercel CLI:
```powershell
npm install -g vercel
vercel --version
```

### Login to Vercel:
```powershell
vercel login
```

### Link Project (first time only):
```powershell
cd C:\Users\DELL\uibac
vercel link
```
Follow the prompts to link your local project to Vercel.

## Deployment Options

### Option 1: Git Integration (Recommended)
- Push to GitHub
- Vercel auto-deploys on push
- Preview deployments for every branch
- Production deployment on main branch

### Option 2: Vercel CLI
```powershell
# Deploy to preview
vercel --yes

# Deploy to production
vercel --prod --yes
```

## vercel.json Configuration

Create `vercel.json` in project root:
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "framework": "nextjs",
  "env": {
    "NODE_ENV": "production",
    "NEXT_PUBLIC_API_URL": "http://roundhouse.proxy.rlwy.net:39487"
  }
}
```

## Test Deployment

### Local Build Test:
```powershell
cd C:\Users\DELL\uibac
npm install
npm run build
npm start
```

### Preview Deployment:
```powershell
git checkout -b preview/test-$(Get-Date -Format 'yyyyMMdd-HHmmss')
git push origin preview/test-*
vercel --yes
```

### Production Deployment:
```powershell
git checkout main
git push origin main
vercel --prod --yes
```

## Vercel Dashboard Features

### Deployment History:
- View all deployments
- Rollback to previous versions
- View deployment logs

### Analytics:
- Page views
- Bandwidth usage
- Performance metrics

### Domains:
- Custom domain setup
- Automatic SSL certificates
- Domain redirects

## Common Vercel Issues

### Issue: Build fails
**Solution:**
1. Check build logs in Vercel dashboard
2. Verify `package.json` scripts are correct
3. Check for missing dependencies

### Issue: Environment variables not working
**Solution:**
1. Check environment variables in Vercel dashboard
2. Verify variable names match exactly
3. Redeploy after adding variables

### Issue: Preview deployment not updating
**Solution:**
1. Force redeploy: `vercel --yes`
2. Check git branch is pushed
3. Clear browser cache

## Next Steps
- [ ] Set up environment variables (see `04-environment-variables.md`)
- [ ] Test deployment workflow (see `05-testing-workflow.md`)
