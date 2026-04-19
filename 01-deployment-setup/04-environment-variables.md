# Environment Variables Setup

## What are Environment Variables?
Environment variables are configuration values that are set outside your code. They allow you to manage sensitive data (API keys, database URLs) and configuration settings without hardcoding them.

## Vercel Environment Variables

### Adding Variables via Vercel Dashboard (Recommended)

1. Go to Vercel dashboard: https://vercel.com/omarsektaoui77-hubs-projects/uibac/settings/environment-variables
2. Click "Add New"
3. Enter variable name and value
4. Select environment(s):
   - **Production:** Only for main branch deployments
   - **Preview:** For all preview deployments
   - **Development:** For local development
5. Click "Save"

### Adding Variables via Vercel CLI

```powershell
# Add variable for preview environment
vercel env add NEXT_PUBLIC_API_URL preview
# When prompted, paste the value

# Add variable for production
vercel env add NEXT_PUBLIC_API_URL production
# When prompted, paste the value
```

**Note:** CLI requires interactive input - cannot be automated.

### Common Environment Variables

#### For Railway Backend:
```bash
NEXT_PUBLIC_API_URL=http://roundhouse.proxy.rlwy.net:39487
```

#### For Firebase (if used):
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
```

#### For Database (if used):
```bash
DATABASE_URL=your_database_url
```

## Local Development Environment Variables

### Using .env.local
Create `.env.local` in project root:
```bash
NEXT_PUBLIC_API_URL=http://roundhouse.proxy.rlwy.net:39487
```

**Important:** Never commit `.env.local` to git. Add to `.gitignore`:
```gitignore
.env.local
.env.production
```

### PowerShell - Create .env.local
```powershell
Set-Content -Path "C:\Users\DELL\uibac\.env.local" -Value "NEXT_PUBLIC_API_URL=http://roundhouse.proxy.rlwy.net:39487"
```

## Railway Environment Variables

### Adding Variables via Railway Dashboard
1. Go to Railway dashboard
2. Select your project
3. Click on your service
4. Go to "Variables" tab
5. Add variables:
   - `PORT=39487`
   - `NODE_ENV=production`
   - Any other required variables

## vercel.json Configuration

You can also set environment variables in `vercel.json`:
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

**Note:** Variables in `vercel.json` are visible in your code and are not encrypted. For sensitive data, use Vercel dashboard.

## NEXT_PUBLIC_ Variables

In Next.js, variables starting with `NEXT_PUBLIC_` are exposed to the browser:
- **NEXT_PUBLIC_API_URL:** Available in both server and client
- **API_SECRET:** Only available on server-side

**Rule:** Never store secrets in `NEXT_PUBLIC_` variables.

## Accessing Environment Variables in Code

### Next.js:
```javascript
// Server-side or client-side
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// Server-side only
const dbUrl = process.env.DATABASE_URL;
```

### React Component:
```javascript
export default function MyComponent() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  // ...
}
```

## Best Practices

1. **Never commit .env files** - Add to .gitignore
2. **Use different environments** - Production, Preview, Development
3. **Document required variables** - Create .env.example
4. **Rotate secrets regularly** - Change API keys periodically
5. **Use Vercel dashboard for secrets** - More secure than vercel.json

## Troubleshooting

### Issue: Environment variable not working
**Solution:**
1. Check variable name matches exactly (case-sensitive)
2. Redeploy after adding variables
3. Check Vercel dashboard to confirm variable exists

### Issue: Variable undefined in code
**Solution:**
1. Ensure variable starts with `NEXT_PUBLIC_` for client-side access
2. Check you're using `process.env.VARIABLE_NAME`
3. Restart development server after adding .env.local

## Verification

### Check Vercel environment variables:
```powershell
vercel env ls preview
vercel env ls production
```

### Pull environment variables locally:
```powershell
vercel env pull .env.local
```

## Next Steps
- [ ] Test deployment workflow (see `05-testing-workflow.md`)
