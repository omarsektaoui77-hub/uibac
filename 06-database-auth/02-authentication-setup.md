# Step 2: JWT Authentication Setup

## Overview
Implement JWT (JSON Web Token) authentication for user registration, login, and protected routes.

## What is JWT?
JWT is a compact, URL-safe means of representing claims to be transferred between two parties. It enables stateless authentication.

## Step-by-Step Instructions

### 1: Install Authentication Packages

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Install JWT and bcrypt packages
npm install jsonwebtoken bcryptjs
npm install @types/jsonwebtoken @types/bcryptjs --save-dev
```

### 2: Add JWT Secret to Environment Variables

#### In Vercel Dashboard:
1. Go to https://vercel.com/omarsektaoui77-hubs-projects/uibac/settings/environment-variables
2. Add `JWT_SECRET` with a random secret (generate one below)
3. Select "Production" and "Preview"
4. Click "Save"

#### Generate JWT Secret:
```powershell
# Generate random secret
$secret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
Write-Host "JWT_SECRET: $secret"
```

#### Add to .env.local:
```powershell
$secret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
Add-Content -Path "C:\Users\DELL\uibac\.env.local" -Value "JWT_SECRET=$secret"
```

### 3: Create Authentication Utilities

#### Create file: `lib/auth.js`:
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

export function hashPassword(password) {
  const bcrypt = require('bcryptjs')
  return bcrypt.hash(password, 10)
}

export function comparePassword(password, hash) {
  const bcrypt = require('bcryptjs')
  return bcrypt.compare(password, hash)
}
```

#### PowerShell Command to Create:
```powershell
$authUtil = @"
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

export function hashPassword(password) {
  const bcrypt = require('bcryptjs')
  return bcrypt.hash(password, 10)
}

export function comparePassword(password, hash) {
  const bcrypt = require('bcryptjs')
  return bcrypt.compare(password, hash)
}
"@
Set-Content -Path "C:\Users\DELL\uibac\lib\auth.js" -Value $authUtil
```

### 4: Create Registration API Route

#### Create file: `pages/api/auth/register.js`:
```javascript
import { supabase } from '../../../lib/supabase'
import { hashPassword, generateToken } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' })
  }

  try {
    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' })
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: passwordHash,
      })
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: 'Failed to create user' })
    }

    // Generate token
    const token = generateToken(user.id)

    res.status(201).json({
      user: { id: user.id, email: user.email },
      token,
    })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
}
```

### 5: Create Login API Route

#### Create file: `pages/api/auth/login.js`:
```javascript
import { supabase } from '../../../lib/supabase'
import { comparePassword, generateToken } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' })
  }

  try {
    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Verify password
    const isValid = await comparePassword(password, user.password_hash)

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Generate token
    const token = generateToken(user.id)

    res.status(200).json({
      user: { id: user.id, email: user.email },
      token,
    })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
}
```

### 6: Create Frontend Auth Context

#### Create file: `context/AuthContext.js`:
```javascript
import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for token in localStorage
    const token = localStorage.getItem('token')
    if (token) {
      // Verify token and set user
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) setUser(data.user)
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

  const logout = () => {
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

### 7: Wrap App with Auth Provider

#### Update `pages/_app.js`:
```javascript
import { AuthProvider } from '../context/AuthContext'

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  )
}
```

### 8: Deploy and Test

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Commit changes
git add .
git commit -m "Add JWT authentication"
git push origin main

# Deploy to production
vercel --prod --yes
```

#### Test Registration:
```javascript
// In browser console on https://uibac.vercel.app
fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'password123',
  }),
})
  .then(res => res.json())
  .then(data => console.log(data))
```

#### Test Login:
```javascript
// In browser console
fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'password123',
  }),
})
  .then(res => res.json())
  .then(data => console.log(data))
```

## Time Estimate
**20 minutes** to complete this step

## Cost
**$0** - JWT and bcrypt are free

## Common Issues

### Issue: JWT_SECRET not set
**Solution:**
1. Check environment variables in Vercel
2. Verify JWT_SECRET is set
3. Redeploy after adding variable

### Issue: Token verification fails
**Solution:**
1. Check JWT_SECRET matches between generation and verification
2. Ensure token is not expired
3. Check token format

### Issue: Password hashing fails
**Solution:**
1. Verify bcryptjs is installed
2. Check for TypeScript errors
3. Ensure password is provided

## Next Steps
- Create protected routes (see `03-protected-routes.md`)
