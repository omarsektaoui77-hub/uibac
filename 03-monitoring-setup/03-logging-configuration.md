# Step 3: Logging Configuration

## Overview
Configure console and file logging for both frontend and backend to track application behavior and debug issues.

## What is Logging?
Logging is the practice of recording events and messages from your application to help with debugging and monitoring.

## Step-by-Step Instructions

### 1. Install Logging Package (Backend)

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Install winston for backend logging (if you have a separate backend folder)
# npm install winston winston-daily-rotate-file
```

### 2. Configure Console Logging (Frontend)

#### Create logging utility: `lib/logger.js`:
```javascript
const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log('[LOG]', ...args)
    }
  },
  error: (...args) => {
    console.error('[ERROR]', ...args)
  },
  warn: (...args) => {
    console.warn('[WARN]', ...args)
  },
  info: (...args) => {
    if (isDevelopment) {
      console.info('[INFO]', ...args)
    }
  },
}
```

#### PowerShell Command to Create:
```powershell
$loggerUtil = @"
const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log('[LOG]', ...args)
    }
  },
  error: (...args) => {
    console.error('[ERROR]', ...args)
  },
  warn: (...args) => {
    console.warn('[WARN]', ...args)
  },
  info: (...args) => {
    if (isDevelopment) {
      console.info('[INFO]', ...args)
    }
  },
}
"@
if (!(Test-Path "C:\Users\DELL\uibac\lib")) {
    New-Item -ItemType Directory -Path "C:\Users\DELL\uibac\lib"
}
Set-Content -Path "C:\Users\DELL\uibac\lib\logger.js" -Value $loggerUtil
```

### 3. Use Logger in Components

#### Example usage in Next.js pages:
```javascript
import { logger } from '../lib/logger'

export default function MyComponent() {
  useEffect(() => {
    logger.log('Component mounted')
  }, [])

  const handleClick = () => {
    logger.info('Button clicked')
  }

  const handleError = (error) => {
    logger.error('Error occurred:', error)
  }

  return <button onClick={handleClick}>Click me</button>
}
```

### 4. Configure Backend Logging (if applicable)

#### For Express.js backend:
```javascript
const winston = require('winston')
const { combine, timestamp, printf } = winston.format

const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`
})

const logger = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    logFormat
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
})

// Use in routes
app.get('/api/test', (req, res) => {
  logger.info('API endpoint called')
  res.json({ message: 'Success' })
})
```

### 5. Create Logs Directory (if using file logging)

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Create logs directory
if (!(Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs"
}

# Add logs directory to .gitignore
Add-Content -Path ".gitignore" -Value "logs/" -Force
```

### 6. Configure Vercel Logging

#### Vercel automatically logs:
- Build output
- Server logs
- Function execution logs
- Error logs

#### View Vercel Logs:
1. Go to Vercel dashboard
2. Select your project
3. Click "Deployments"
4. Click on a deployment
5. View logs in the "Logs" tab

### 7. Configure Railway Logging

#### Railway automatically logs:
- Application output
- Error messages
- System events

#### View Railway Logs:
1. Go to Railway dashboard
2. Select your project
3. Click on your service
4. View logs in the "Logs" tab

### 8. Test Logging

#### Test Frontend Logging:
```javascript
// In browser console
console.log('[TEST] Frontend logging works')
console.error('[TEST] Error logging works')
console.warn('[TEST] Warning logging works')
```

#### Test Backend Logging:
```powershell
# Test backend endpoint
Invoke-WebRequest -Uri "https://roundhouse.proxy.rlwy.net:39487/api/test" -UseBasicParsing
```

### 9. Deploy and Verify

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Commit changes
git add .
git commit -m "Add logging configuration"
git push origin main

# Deploy to production
vercel --prod --yes
```

#### Verify Logs:
1. Go to Vercel dashboard → Deployments → Logs
2. Check for application logs
3. Verify logging is working

## Time Estimate
**10 minutes** to complete this step

## Cost
**$0** - Console logging is free

## Common Issues

### Issue: Too many logs in console
**Solution:**
1. Use isDevelopment check
2. Only log errors in production
3. Adjust log levels

### Issue: File logging not working
**Solution:**
1. Ensure logs directory exists
2. Check file permissions
3. Verify winston configuration

## Next Steps
- Set up UptimeRobot monitoring (see `04-uptimerobot-monitoring.md`)
