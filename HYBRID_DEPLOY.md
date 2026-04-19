# Hybrid Deployment Guide (Vercel + Separate Backend)

## Architecture

- **Frontend:** Next.js app deployed to Vercel
- **Backend:** Express API deployed separately (Back4App, Northflank, Railway)
- **Communication:** Frontend calls backend API via `NEXT_PUBLIC_API_URL`

---

## Step 1: Deploy Backend to Container Service

### Option A: Back4App

1. Go to https://containers.back4app.com/new-container
2. Configure:
   - Name: `zeroleak-soc-api`
   - GitHub repo: `omarsektaoui77-hub/uibac`
   - Branch: `main`
   - Root Directory: empty (`/`)
3. Environment Variables:
   ```
   JWT_SECRET=b401e86c489cd7903e246fc898fa590c976c27d7cf3f76e0beb1c7e770c88847ffdd80afa99b444c202fed1e6dc0eab969c1818026ee49e6c8819a3dbacce804
   PORT=3000
   HOST=0.0.0.0
   NODE_ENV=production
   ```
4. Click "Create Container"
5. Wait for deployment and get the production URL

### Option B: Northflank

1. Go to https://app.northflank.com
2. Create new container service
3. Configure:
   - Image: Build from GitHub
   - Repo: `omarsektaoui77-hub/uibac`
   - Branch: `main`
   - Port: 3000
4. Environment Variables:
   ```
   JWT_SECRET=b401e86c489cd7903e246fc898fa590c976c27d7cf3f76e0beb1c7e770c88847ffdd80afa99b444c202fed1e6dc0eab969c1818026ee49e6c8819a3dbacce804
   PORT=3000
   HOST=0.0.0.0
   NODE_ENV=production
   ```
5. Deploy and get the production URL

### Option C: Railway

1. Go to https://railway.app
2. New project → Deploy from GitHub
3. Select `omarsektaoui77-hub/uibac`
4. Configure:
   - Branch: `main`
   - Root directory: `/`
5. Environment Variables:
   ```
   JWT_SECRET=b401e86c489cd7903e246fc898fa590c976c27d7cf3f76e0beb1c7e770c88847ffdd80afa99b444c202fed1e6dc0eab969c1818026ee49e6c8819a3dbacce804
   PORT=3000
   HOST=0.0.0.0
   NODE_ENV=production
   ```
6. Deploy and get the production URL

---

## Step 2: Deploy Frontend to Vercel

1. Go to https://vercel.com
2. Sign in with GitHub
3. Add New Project → Import `uibac`
4. Configure:
   - Root Directory: `/` (repository root)
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
5. Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.com
   NODE_ENV=production
   ```
6. Deploy

---

## Step 3: Validate Integration

1. Test backend health:
   ```bash
   curl https://your-backend-url.com/health
   ```
   Expected response:
   ```json
   {
     "status": "healthy",
     "autonomyEnabled": true,
     "timestamp": "2024-01-01T00:00:00.000Z"
   }
   ```

2. Test frontend:
   - Open Vercel URL
   - Check if app loads
   - Verify API calls work

---

## Environment Variables Reference

### Backend (Container Service)
```
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
```

### Frontend (Vercel)
```
NEXT_PUBLIC_API_URL=https://your-backend-url.com
NODE_ENV=production
```

---

## Troubleshooting

### Backend Not Responding
- Check container logs
- Verify environment variables
- Ensure port 3000 is exposed
- Check HEALTHCHECK status

### Frontend Cannot Reach Backend
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check CORS configuration
- Verify backend is accessible from public internet
- Check network/firewall settings

### Build Failures
- Check build logs
- Verify dependencies are installed
- Ensure TypeScript errors are fixed
