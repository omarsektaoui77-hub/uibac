# Step 4: Session Management

## Overview
Implement session management using JWT tokens stored in database for better security and session tracking.

## What is Session Management?
Session management tracks user sessions, allows logout from all devices, and provides better security than simple JWT tokens.

## Step-by-Step Instructions

### 1: Create Session API Routes

#### Create file: `pages/api/auth/me.js`:
```javascript
import { supabase } from '../../../lib/supabase'
import { verifyToken } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  const decoded = verifyToken(token)

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  // Get user from database
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, created_at')
    .eq('id', decoded.userId)
    .single()

  if (error || !user) {
    return res.status(404).json({ error: 'User not found' })
  }

  res.status(200).json({ user })
}
```

#### Create file: `pages/api/auth/logout.js`:
```javascript
import { supabase } from '../../../lib/supabase'
import { verifyToken } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  const decoded = verifyToken(token)

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  // Delete session from database (if using sessions table)
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('token', token)

  if (error) {
    // Session might not exist, but that's okay
    console.error('Error deleting session:', error)
  }

  res.status(200).json({ message: 'Logged out successfully' })
}
```

### 2: Update Auth Context with Session Management

#### Update `context/AuthContext.js`:
```javascript
import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => {
          if (!res.ok) {
            localStorage.removeItem('token')
            return null
          }
          return res.json()
        })
        .then(data => {
          if (data?.user) setUser(data.user)
        })
        .catch(() => localStorage.removeItem('token'))
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (data.token) {
      localStorage.setItem('token', data.token)
      setUser(data.user)
    }
    return data
  }

  const register = async (email, password) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (data.token) {
      localStorage.setItem('token', data.token)
      setUser(data.user)
    }
    return data
  }

  const logout = async () => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch (error) {
        console.error('Logout error:', error)
      }
    }
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
```

### 3: Add Session Expiration Check

#### Update `lib/auth.js`:
```javascript
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET

export function generateToken(userId) {
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

export function isTokenExpired(token) {
  try {
    const decoded = jwt.decode(token)
    const now = Date.now() / 1000
    return decoded.exp < now
  } catch (error) {
    return true
  }
}

export function hashPassword(password) {
  const bcrypt = require('bcryptjs')
  return bcrypt.hash(password, 10)
}

export function comparePassword(password, hash) {
  const bcrypt = require('bcryptjs')
  return bcrypt.compare(password, hash)
}
```

### 4: Add Token Refresh (Optional)

#### Create file: `pages/api/auth/refresh.js`:
```javascript
import { verifyToken, generateToken } from '../../../lib/auth'
import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { token } = req.body

  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  const decoded = verifyToken(token)

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  // Generate new token
  const newToken = generateToken(decoded.userId)

  res.status(200).json({ token: newToken })
}
```

### 5: Deploy and Test

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Commit changes
git add .
git commit -m "Add session management"
git push origin main

# Deploy to production
vercel --prod --yes
```

#### Test Session Management:
```javascript
// Test /api/auth/me
const token = localStorage.getItem('token')
fetch('/api/auth/me', {
  headers: { Authorization: `Bearer ${token}` },
})
  .then(res => res.json())
  .then(data => console.log(data))

// Test logout
fetch('/api/auth/logout', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
})
  .then(res => res.json())
  .then(data => console.log(data))
```

## Time Estimate
**15 minutes** to complete this step

## Cost
**$0** - No additional costs

## Common Issues

### Issue: Session not ending on logout
**Solution:**
1. Check if token is being removed from localStorage
2. Verify logout API is being called
3. Check for errors in logout API

### Issue: Token not refreshing
**Solution:**
1. Check refresh API is configured
2. Verify new token is being generated
3. Ensure new token is stored in localStorage

## Next Steps
- Test and verify authentication (see `05-testing-verification.md`)
