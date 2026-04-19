# Step 3: Protected Routes Setup

## Overview
Create protected API routes and frontend pages that require authentication.

## What are Protected Routes?
Protected routes are pages or API endpoints that can only be accessed by authenticated users.

## Step-by-Step Instructions

### 1: Create Protected API Route

#### Create file: `pages/api/protected.js`:
```javascript
import { verifyToken } from '../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Get token from Authorization header
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  // Verify token
  const decoded = verifyToken(token)

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  // Return protected data
  res.status(200).json({
    message: 'This is protected data',
    userId: decoded.userId,
  })
}
```

### 2: Create Middleware for API Protection

#### Create file: `lib/middleware.js`:
```javascript
import { verifyToken } from './auth'

export function withAuth(handler) {
  return async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const decoded = verifyToken(token)

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Add user info to request
    req.userId = decoded.userId

    return handler(req, res)
  }
}
```

### 3: Create Protected Frontend Page

#### Create file: `pages/dashboard.js`:
```javascript
import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/router'

export default function Dashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    router.push('/login')
    return null
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user.email}</p>
      <p>This is a protected page.</p>
    </div>
  )
}
```

### 4: Create Login Page

#### Create file: `pages/login.js`:
```javascript
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/router'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const result = await login(email, password)

    if (result.error) {
      setError(result.error)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit">Login</button>
      </form>
    </div>
  )
}
```

### 5: Create Register Page

#### Create file: `pages/register.js`:
```javascript
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/router'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { register } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const result = await register(email, password)

    if (result.error) {
      setError(result.error)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div>
      <h1>Register</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit">Register</button>
      </form>
    </div>
  )
}
```

### 6: Test Protected Routes

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Commit changes
git add .
git commit -m "Add protected routes"
git push origin main

# Deploy to production
vercel --prod --yes
```

#### Test Protected API (without token):
```javascript
// In browser console
fetch('/api/protected')
  .then(res => res.json())
  .then(data => console.log(data))
// Expected: { error: "No token provided" }
```

#### Test Protected API (with token):
```javascript
// First login to get token
const loginRes = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'password123',
  }),
})
const loginData = await loginRes.json()

// Then use token to access protected route
const protectedRes = await fetch('/api/protected', {
  headers: { Authorization: `Bearer ${loginData.token}` },
})
const protectedData = await protectedRes.json()
console.log(protectedData)
// Expected: { message: "This is protected data", userId: "..." }
```

## Time Estimate
**15 minutes** to complete this step

## Cost
**$0** - No additional costs

## Common Issues

### Issue: Protected route always returns 401
**Solution:**
1. Check token is being sent in Authorization header
2. Verify token format: "Bearer <token>"
3. Check JWT_SECRET matches between generation and verification

### Issue: Frontend redirects to login even when logged in
**Solution:**
1. Check if token is in localStorage
2. Verify token is not expired
3. Check AuthContext is working correctly

### Issue: User data not persisting
**Solution:**
1. Ensure token is stored in localStorage
2. Check AuthContext is reading token on mount
3. Verify token is valid

## Next Steps
- Implement session management (see `04-session-management.md`)
