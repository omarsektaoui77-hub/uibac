# Step 1: Database Setup (Supabase)

## Overview
Set up a free Supabase database for user management and data storage. Supabase provides PostgreSQL, authentication, and real-time features for free.

## What is Supabase?
Supabase is an open-source Firebase alternative that provides:
- PostgreSQL database (500MB free)
- Built-in authentication
- Real-time subscriptions
- File storage (1GB free)
- Edge functions

## Step-by-Step Instructions

### 1. Create Supabase Account

#### Step A: Sign Up
1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub (recommended)
4. Select "Free" plan
5. Verify email address

#### Step B: Create New Project
1. Click "New Project"
2. Enter project name: "uibac"
3. Enter database password (save this!)
4. Select region: Choose closest to your users
5. Click "Create new project"
6. Wait 2-3 minutes for project to be created

### 2: Get Database Connection Details

#### Step A: Go to Project Settings
1. In Supabase dashboard, click "Settings"
2. Click "Database"
3. Scroll to "Connection string"
4. Copy the connection string

#### Step B: Get Environment Variables
You'll need:
- `SUPABASE_URL` - From project settings → API
- `SUPABASE_ANON_KEY` - From project settings → API
- `SUPABASE_SERVICE_ROLE_KEY` - From project settings → API (for backend only)

### 3: Install Supabase Client

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Install Supabase client
npm install @supabase/supabase-js
```

### 4: Create Database Tables

#### Step A: Go to SQL Editor
1. In Supabase dashboard, click "SQL Editor"
2. Click "New query"

#### Step B: Create Users Table
```sql
-- Create users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email
CREATE INDEX idx_users_email ON users(email);
```

#### Step C: Create Sessions Table
```sql
-- Create sessions table
CREATE TABLE sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on token
CREATE INDEX idx_sessions_token ON sessions(token);
-- Create index on user_id
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
```

#### Step D: Run the Query
1. Click "Run" to execute the SQL
2. Verify tables are created in "Table Editor"

### 5: Add Environment Variables to Vercel

#### Step A: Add Variables in Vercel Dashboard
1. Go to https://vercel.com/omarsektaoui77-hubs-projects/uibac/settings/environment-variables
2. Add `SUPABASE_URL` with your Supabase URL
3. Add `SUPABASE_ANON_KEY` with your anon key
4. Add `SUPABASE_SERVICE_ROLE_KEY` with your service role key
5. Select "Production" and "Preview"
6. Click "Save"

#### Step B: Add to .env.local
```powershell
# Add Supabase variables to local environment
Add-Content -Path "C:\Users\DELL\uibac\.env.local" -Value "SUPABASE_URL=your-supabase-url"
Add-Content -Path "C:\Users\DELL\uibac\.env.local" -Value "SUPABASE_ANON_KEY=your-anon-key"
Add-Content -Path "C:\Users\DELL\uibac\.env.local" -Value "SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
```

### 6: Create Supabase Client Utility

#### Create file: `lib/supabase.js`:
```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

#### PowerShell Command to Create:
```powershell
# Create lib directory if not exists
if (!(Test-Path "C:\Users\DELL\uibac\lib")) {
    New-Item -ItemType Directory -Path "C:\Users\DELL\uibac\lib"
}

$supabaseUtil = @"
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
"@
Set-Content -Path "C:\Users\DELL\uibac\lib\supabase.js" -Value $supabaseUtil
```

### 7: Test Database Connection

#### Create test file: `lib/test-db.js`:
```javascript
import { supabase } from './supabase'

export async function testDatabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1)
    
    if (error) {
      console.error('Database connection failed:', error)
      return false
    }
    
    console.log('Database connection successful')
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}
```

### 8: Deploy and Test

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Commit changes
git add .
git commit -m "Add Supabase database setup"
git push origin main

# Deploy to production
vercel --prod --yes
```

#### Test in Browser:
1. Open https://uibac.vercel.app
2. Press F12 → Console
3. Run:
```javascript
// Test database connection (if you have a test endpoint)
// Or check in API logs
```

## Time Estimate
**20 minutes** to complete this step

## Cost
**$0** - Supabase free tier (500MB database)

## Common Issues

### Issue: Database connection failed
**Solution:**
1. Check SUPABASE_URL is correct
2. Check SUPABASE_ANON_KEY is correct
3. Verify environment variables are set in Vercel
4. Check Supabase project is active

### Issue: Tables not created
**Solution:**
1. Check SQL query syntax
2. Verify query was executed in SQL Editor
3. Check Table Editor for tables
4. Check for errors in SQL output

### Issue: Permission denied
**Solution:**
1. Check Row Level Security (RLS) settings
2. Ensure anon key has appropriate permissions
3. Check table permissions in Supabase dashboard

## Next Steps
- Set up JWT authentication (see `02-authentication-setup.md`)
