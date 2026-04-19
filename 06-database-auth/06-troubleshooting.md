# Troubleshooting Guide - Database & Authentication

## Common Issues and Solutions

### Issue 1: Database Connection Failed

**Symptoms:**
- Supabase connection errors
- API returns database errors
- Tables not accessible

**Solutions:**

#### Check 1: Supabase URL and Key
```powershell
# Check environment variables
vercel env ls production | findstr SUPABASE
```

#### Check 2: Supabase Project Status
1. Go to Supabase dashboard
2. Check if project is active
3. Check database is running

#### Check 3: Table Permissions
1. Go to Supabase dashboard
2. Table Editor → Select table
3. Check RLS (Row Level Security) settings
4. Ensure anon key has read/write permissions

### Issue 2: Registration Fails

**Symptoms:**
- Registration API returns error
- User not created in database
- "User already exists" error

**Solutions:**

#### Check 1: Check if user already exists
1. Go to Supabase dashboard
2. Table Editor → users table
3. Search for email

#### Check 2: Check password hashing
```javascript
// Ensure bcryptjs is installed
// Check hashPassword function is working
```

#### Check 3: Check database constraints
1. Verify email field is unique
2. Check required fields are provided
3. Check for validation errors

### Issue 3: Login Fails

**Symptoms:**
- Login returns "Invalid credentials"
- Token not generated
- User not authenticated

**Solutions:**

#### Check 1: Verify credentials
1. Check email is correct
2. Check password is correct
3. Check user exists in database

#### Check 2: Check password comparison
```javascript
// Ensure comparePassword is working
// Check password_hash in database matches
```

#### Check 3: Check JWT generation
```javascript
// Ensure JWT_SECRET is set
// Check generateToken function is working
```

### Issue 4: Token Verification Fails

**Symptoms:**
- Protected routes return "Invalid token"
- Token verification fails
- User not authenticated

**Solutions:**

#### Check 1: JWT_SECRET matches
```powershell
# Check JWT_SECRET is same in all environments
vercel env ls production | findstr JWT_SECRET
```

#### Check 2: Token format
```javascript
// Ensure token is sent as "Bearer <token>"
// Check Authorization header format
```

#### Check 3: Token expiration
```javascript
// Check if token is expired (7 days default)
// Generate new token if expired
```

### Issue 5: Protected Routes Not Working

**Symptoms:**
- Protected routes accessible without authentication
- Middleware not working
- Token not being checked

**Solutions:**

#### Check 1: Middleware is applied
```javascript
// Ensure withAuth wrapper is used
// Check middleware is imported correctly
```

#### Check 2: Frontend auth context
```javascript
// Check AuthProvider is wrapping app
// Check useAuth hook is used correctly
```

#### Check 3: Token storage
```javascript
// Check token is stored in localStorage
// Check token is retrieved on page load
```

### Issue 6: Session Not Persisting

**Symptoms:**
- User logged out on page refresh
- Token not saved
- Auth context not persisting

**Solutions:**

#### Check 1: localStorage
```javascript
// Check if token is saved to localStorage
// Check localStorage is enabled in browser
```

#### Check 2: AuthContext useEffect
```javascript
// Check useEffect runs on mount
// Check token is retrieved from localStorage
// Check user is set correctly
```

#### Check 3: Browser privacy settings
1. Check if browser blocks localStorage
2. Check if cookies are enabled
3. Try in different browser

### Issue 7: CORS Errors

**Symptoms:**
- CORS errors in browser console
- API calls blocked
- "Origin not allowed" error

**Solutions:**

#### Check 1: Supabase CORS settings
1. Go to Supabase dashboard
2. Settings → API → CORS
3. Add your Vercel domain: https://uibac.vercel.app
4. Add localhost for development: http://localhost:3000

#### Check 2: API route CORS
```javascript
// Add CORS headers to API routes
res.setHeader('Access-Control-Allow-Origin', '*')
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
```

### Issue 8: Password Hashing Fails

**Symptoms:**
- Password not hashed
- Registration fails
- bcryptjs errors

**Solutions:**

#### Check 1: bcryptjs installed
```powershell
npm list bcryptjs
```

#### Check 2: Hash function
```javascript
// Ensure hashPassword is async
// Ensure await is used
// Check for TypeScript errors
```

#### Check 3: Password length
- Ensure password is not too long
- Check bcryptjs limits

### Getting Help

#### Check Logs
1. **Vercel logs:** Dashboard → Deployments → View logs
2. **Supabase logs:** Dashboard → Logs
3. **Browser console:** F12 → Console tab
4. **Network tab:** F12 → Network tab

#### Useful Commands
```powershell
# Check database packages
npm list @supabase/supabase-js

# Check auth packages
npm list jsonwebtoken bcryptjs

# Check environment variables
vercel env ls production

# Test database connection
# Use browser console to test Supabase client

# Test API endpoints
# Use browser console to test auth endpoints
```

#### Reset Authentication Configuration
If authentication is causing issues and you need to rollback:

```powershell
# Step 1: Remove auth context
Remove-Item "C:\Users\DELL\uibac\context\AuthContext.js"

# Step 2: Remove auth pages
Remove-Item "C:\Users\DELL\uibac\pages\login.js"
Remove-Item "C:\Users\DELL\uibac\pages\register.js"
Remove-Item "C:\Users\DELL\uibac\pages\dashboard.js"

# Step 3: Remove auth API routes
Remove-Item "C:\Users\DELL\uibac\pages\api\auth\*.js"

# Step 4: Remove protected routes
Remove-Item "C:\Users\DELL\uibac\pages\api\protected.js"

# Step 5: Remove auth utilities
Remove-Item "C:\Users\DELL\uibac\lib\auth.js"

# Step 6: Revert _app.js
# Remove AuthProvider wrapper

# Step 7: Rebuild and deploy
cd C:\Users\DELL\uibac
npm run build
vercel --prod --yes
```

#### Delete Database (if not needed)
1. Go to Supabase dashboard
2. Settings → General
3. Click "Delete project"
4. Confirm deletion

#### Contact Support
- Supabase Support: https://supabase.com/support
- Vercel Support: https://vercel.com/support
- GitHub Issues: https://github.com/supabase/supabase-js/issues

## Prevention Tips

1. **Use environment variables** - Never hardcode secrets
2. **Hash passwords** - Never store plain text passwords
3. **Use HTTPS** - Always use HTTPS for auth
4. **Set token expiration** - Don't use permanent tokens
5. **Validate input** - Validate email and password format
6. **Rate limit auth endpoints** - Prevent brute force attacks
7. **Monitor auth logs** - Track suspicious activity

## Quick Reference

| Issue | Quick Fix |
|-------|-----------|
| Database connection failed | Check SUPABASE_URL and SUPABASE_ANON_KEY |
| Registration fails | Check if user already exists |
| Login fails | Verify credentials, check password hashing |
| Token verification fails | Check JWT_SECRET matches |
| Protected routes not working | Check middleware and AuthContext |
| Session not persisting | Check localStorage and AuthContext |
| CORS errors | Add domain to Supabase CORS settings |
| Password hashing fails | Check bcryptjs installation |

## Security Best Practices

1. **Never log passwords** - Never log passwords in console or files
2. **Use strong secrets** - Generate random JWT_SECRET
3. **Limit token lifetime** - Use short expiration (7 days recommended)
4. **Hash passwords** - Always use bcrypt with salt
5. **Validate input** - Sanitize all user input
6. **Use HTTPS only** - Never use HTTP for auth
7. **Implement rate limiting** - Prevent brute force attacks
8. **Monitor for attacks** - Track failed login attempts
