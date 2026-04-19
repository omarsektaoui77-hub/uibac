# Step 5: Testing & Verification

## Overview
Comprehensive testing to ensure authentication and database are working correctly.

## Pre-Test Checklist
- [ ] Database setup complete (Step 1)
- [ ] JWT authentication configured (Step 2)
- [ ] Protected routes created (Step 3)
- [ ] Session management implemented (Step 4)

## Test #1: Database Connection

### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Test database connection (if you have a test endpoint)
# Or check in browser console
```

### Browser Console Test:
```javascript
// Test if Supabase client is configured
import { supabase } from '/lib/supabase'

// Test connection
const { data, error } = await supabase
  .from('users')
  .select('id')
  .limit(1)

console.log('Database connection test:', error ? 'Failed' : 'Success')
```

**Expected Result:** Database connection successful

## Test #2: User Registration

### Browser Console Test:
```javascript
// Test registration
const registerRes = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'password123',
  }),
})

const registerData = await registerRes.json()
console.log('Registration result:', registerData)
```

**Expected Result:** { user: {...}, token: "..." }

## Test #3: User Login

### Browser Console Test:
```javascript
// Test login
const loginRes = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'password123',
  }),
})

const loginData = await loginRes.json()
console.log('Login result:', loginData)

// Store token for next tests
localStorage.setItem('testToken', loginData.token)
```

**Expected Result:** { user: {...}, token: "..." }

## Test #4: Get Current User

### Browser Console Test:
```javascript
// Test /api/auth/me
const token = localStorage.getItem('testToken')
const meRes = await fetch('/api/auth/me', {
  headers: { Authorization: `Bearer ${token}` },
})

const meData = await meRes.json()
console.log('Current user:', meData)
```

**Expected Result:** { user: { id: "...", email: "..." } }

## Test #5: Protected Route (with valid token)

### Browser Console Test:
```javascript
// Test protected route with valid token
const token = localStorage.getItem('testToken')
const protectedRes = await fetch('/api/protected', {
  headers: { Authorization: `Bearer ${token}` },
})

const protectedData = await protectedRes.json()
console.log('Protected route result:', protectedData)
```

**Expected Result:** { message: "This is protected data", userId: "..." }

## Test #6: Protected Route (without token)

### Browser Console Test:
```javascript
// Test protected route without token
const protectedRes = await fetch('/api/protected')
const protectedData = await protectedRes.json()
console.log('Protected route result (no token):', protectedData)
```

**Expected Result:** { error: "No token provided" }

## Test #7: Protected Route (invalid token)

### Browser Console Test:
```javascript
// Test protected route with invalid token
const protectedRes = await fetch('/api/protected', {
  headers: { Authorization: 'Bearer invalid_token' },
})

const protectedData = await protectedRes.json()
console.log('Protected route result (invalid token):', protectedData)
```

**Expected Result:** { error: "Invalid token" }

## Test #8: Logout

### Browser Console Test:
```javascript
// Test logout
const token = localStorage.getItem('testToken')
const logoutRes = await fetch('/api/auth/logout', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
})

const logoutData = await logoutRes.json()
console.log('Logout result:', logoutData)

// Clear test token
localStorage.removeItem('testToken')
```

**Expected Result:** { message: "Logged out successfully" }

## Test #9: Frontend Authentication Flow

### Manual Browser Test:
1. Go to https://uibac.vercel.app/register
2. Register a new account
3. Should be redirected to dashboard
4. Check if user data is displayed
5. Logout
6. Try to access dashboard (should redirect to login)
7. Login again
8. Should access dashboard successfully

**Expected Result:** Full authentication flow works

## Test #10: Database Integrity

### Check Supabase Dashboard:
1. Go to Supabase dashboard
2. Table Editor → users table
3. Verify user was created
4. Check email and password_hash fields
5. Table Editor → sessions table (if used)
6. Verify sessions are being created

**Expected Result:** Data correctly stored in database

## Final Verification Checklist

- [ ] Database connection successful
- [ ] User registration works
- [ ] User login works
- [ ] Get current user works
- [ ] Protected routes work with valid token
- [ ] Protected routes reject without token
- [ ] Protected routes reject invalid token
- [ ] Logout works
- [ ] Frontend authentication flow works
- [ ] Database integrity verified

## Time Estimate
**15 minutes** to complete all tests

## Cost
**$0** - Testing is free

## Rollback Plan

If authentication causes issues:

### Remove Authentication Code:
```powershell
# Remove auth context
Remove-Item "C:\Users\DELL\uibac\context\AuthContext.js"

# Remove auth pages
Remove-Item "C:\Users\DELL\uibac\pages\login.js"
Remove-Item "C:\Users\DELL\uibac\pages\register.js"
Remove-Item "C:\Users\DELL\uibac\pages\dashboard.js"

# Remove auth API routes
Remove-Item "C:\Users\DELL\uibac\pages\api\auth\*.js"

# Revert _app.js
# Remove AuthProvider wrapper

# Rebuild and deploy
cd C:\Users\DELL\uibac
npm run build
vercel --prod --yes
```

### Delete Database (if not needed):
1. Go to Supabase dashboard
2. Settings → General
3. Click "Delete project"
4. Confirm deletion

## Next Steps
- Review troubleshooting guide (see `06-troubleshooting.md`)
- If all tests pass, proceed to next setup (Setup #4: CI/CD)
