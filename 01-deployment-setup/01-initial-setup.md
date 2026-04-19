# Initial Setup - Windows 11 + PowerShell

## Prerequisites:
1. Node.js (v18+)
2. Git
3. GitHub account
4. Vercel account (free)
5. Railway account (free)

## Tool Installation:

### 1. Node.js
- Download from https://nodejs.org
- LTS version recommended
- Verify installation:
```powershell
node --version
npm --version
```

### 2. Git
- Download from https://git-scm.com
- Verify installation:
```powershell
git --version
```

### 3. Vercel CLI (global)
```powershell
npm install -g vercel
vercel --version
```

### 4. Login to Vercel
```powershell
vercel login
```
This will open a browser window to authenticate.

### 5. Link project to Vercel (first time only)
```powershell
cd C:\Users\DELL\uibac
vercel link
```
Follow the prompts to link your project to Vercel.

### 6. Configure Git (first time only)
```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Verify Setup
```powershell
# Check all tools are installed
node --version
npm --version
git --version
vercel --version

# Check project directory
cd C:\Users\DELL\uibac
git status
```

## Next Steps
- [ ] Set up Railway backend (see `02-backend-railway.md`)
- [ ] Configure Vercel frontend (see `03-frontend-vercel.md`)
- [ ] Set up environment variables (see `04-environment-variables.md`)
