# Safe Testing Workflow: Next.js + Railway + Vercel (Free Tier)

**Constraints:**
- ✅ Zero cost (free tiers only)
- ✅ Production never touched during testing
- ✅ Maximum 5 manual commands
- ✅ Isolated environment (delete in 1 command)
- ✅ Pre-test checklist + post-test cleanup

---

## Pre-Test Checklist

- [ ] Railway backend is running (check: `curl http://roundhouse.proxy.rlwy.net:39487`)
- [ ] Vercel CLI installed (`vercel --version`)
- [ ] Git authenticated to GitHub (`git remote -v`)
- [ ] Current working directory is home (`cd ~`)
- [ ] No local server running on port 3000 (`lsof -ti:3000` should return nothing)

---

## Testing Workflow (5 Commands Max)

### Command 1: Clone to Isolated Sandbox
```bash
cd ~ && git clone https://github.com/omarsektaoui77-hub/uibac uibac-sandbox && cd uibac-sandbox && git checkout -b test-workflow
```

### Command 2: Configure Environment
```bash
echo "NEXT_PUBLIC_API_URL=http://roundhouse.proxy.rlwy.net:39487" > .env.local && npm install
```

### Command 3: Test Locally
```bash
npm run build && npm start
```
**Manual check:** Open `http://localhost:3000` in browser, verify backend connectivity

### Command 4: Deploy to Vercel Preview
```bash
git add -A && git commit -m "Test workflow" && git push -u origin test-workflow
```
**Manual check:** Open Preview URL from output (Vercel auto-deploys preview)

### Command 5: Cleanup (1 Command)
```bash
cd ~ && rm -rf uibac-sandbox && git push origin --delete test-workflow
```

---

## Post-Test Cleanup

### If Test Failed:
```bash
# Delete preview deployment
vercel rm $(vercel ls | grep test-workflow | awk '{print $1}')

# Delete everything
cd ~ && rm -rf uibac-sandbox && git push origin --delete test-workflow
```

### If Test Succeeded:
```bash
# Merge to main (production auto-deploys)
cd ~/uibac-sandbox
git checkout main
git merge test-workflow
git push origin main

# Then cleanup
cd ~ && rm -rf uibac-sandbox && git push origin --delete test-workflow
```

---

## Troubleshooting

### Mixed-Content Errors (HTTPS calling HTTP)
**Problem:** Vercel Preview = HTTPS, Railway = HTTP
**Solution:** Update vercel.json to use Railway HTTPS endpoint:
```json
"NEXT_PUBLIC_API_URL": "https://roundhouse.proxy.rlwy.net:39487"
```

### Build Fails Locally
```bash
# Check Node version
node --version  # Should be >=18

# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

### Preview Deployment Fails
```bash
# Check Vercel logs
vercel logs

# Verify environment variables
vercel env ls
```

### Can't Delete Branch
```bash
# Force delete
git branch -D test-workflow
git push origin --delete test-workflow --force
```

---

## Quick Reference

| Action | Command |
|--------|---------|
| Check backend health | `curl http://roundhouse.proxy.rlwy.net:39487` |
| Kill local server | `lsof -ti:3000 \| xargs kill -9` |
| View preview deployments | `vercel ls` |
| Delete specific preview | `vercel rm <deployment-url>` |
| Revert to previous commit | `git revert HEAD && git push` |

---

## Safety Guarantees

- ✅ **Production URL never changes** - Preview deployments are separate
- ✅ **Main branch untouched** - All work happens on feature branch
- ✅ **Isolated filesystem** - Sandbox folder can be deleted anytime
- ✅ **Zero cost** - Vercel Hobby tier = unlimited free previews
- ✅ **Auto-cleanup** - Preview deployments expire in 14 days if forgotten
