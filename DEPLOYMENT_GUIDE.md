# Production Deployment Guide
## Gamified Progress System for Baccalaureate Learning App

### Overview
This guide covers deploying the production-ready gamified progress system to Vercel with all security, performance, and scalability features enabled.

### Prerequisites
- Vercel account
- Firebase project with Admin SDK configured
- Redis instance (optional, for production caching)
- Sentry account (optional, for error tracking)

### Environment Variables

#### Required Variables
```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com

# Security
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
RATE_LIMIT_SECRET=your-rate-limit-secret-key
```

#### Optional Variables
```bash
# Redis for caching
REDIS_URL=redis://localhost:6379

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Application settings
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-app.vercel.app
```

### Firebase Setup

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create new project or use existing one
   - Enable Firestore Database
   - Enable Authentication

2. **Configure Firestore Security Rules**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Users can only access their own data
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       
       // Progress logs are write-only for users
       match /progressLogs/{logId} {
         allow create: if request.auth != null && request.auth.uid == resource.data.userId;
       }
       
       // Analytics are read-only for users
       match /userAnalytics/{userId} {
         allow read: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

3. **Create Service Account**
   - Go to Project Settings > Service accounts
   - Generate new private key
   - Save the JSON file securely
   - Extract values for environment variables

### Vercel Deployment

1. **Connect Repository**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Link project
   vercel link
   ```

2. **Configure Environment Variables**
   ```bash
   # Add environment variables
   vercel env add FIREBASE_PROJECT_ID
   vercel env add FIREBASE_CLIENT_EMAIL
   vercel env add FIREBASE_PRIVATE_KEY
   vercel env add FIREBASE_DATABASE_URL
   vercel env add JWT_SECRET
   vercel env add RATE_LIMIT_SECRET
   ```

3. **Deploy**
   ```bash
   # Deploy to production
   vercel --prod
   ```

### Database Indexes

Create the following Firestore composite indexes:

```javascript
// users collection
{
  "indexes": [
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "globalStats.rank",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "globalStats.xp",
          "order": "DESCENDING"
        }
      ]
    }
  ]
}

// progressLogs collection
{
  "indexes": [
    {
      "collectionGroup": "progressLogs",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "userId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "timestamp",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "progressLogs",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "userId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "subjectId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "timestamp",
          "order": "DESCENDING"
        }
      ]
    }
  ]
}
```

### Redis Setup (Optional)

1. **Create Redis Instance**
   - Use Vercel KV or external Redis provider
   - Get connection URL

2. **Configure Connection**
   ```bash
   vercel env add REDIS_URL
   ```

### Monitoring Setup

1. **Sentry Integration**
   ```bash
   vercel env add SENTRY_DSN
   ```

2. **Health Check Endpoint**
   - `/api/health` - Basic health check
   - `/api/status` - Detailed system status

### Performance Optimization

1. **Caching Strategy**
   - User progress: 5 minutes TTL
   - Analytics: 3 minutes TTL
   - Leaderboard: 10 minutes TTL
   - Static assets: 1 year TTL

2. **Rate Limiting**
   - Free users: 100 requests/hour
   - Basic users: 500 requests/hour
   - Premium users: 1000 requests/hour

3. **Database Optimization**
   - Use transactions for atomic updates
   - Implement proper indexing
   - Regular cleanup of old data

### Security Checklist

- [ ] Firebase security rules configured
- [ ] JWT secrets are strong (32+ chars)
- [ ] Rate limiting enabled
- [ ] HTTPS enforced (automatic on Vercel)
- [ ] CORS properly configured
- [ ] Input validation on all endpoints
- [ ] Anti-cheat system enabled

### Testing Before Production

1. **Load Testing**
   ```bash
   # Test API endpoints
   curl -X POST https://your-app.vercel.app/api/progress/update \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"earnedXP": 10, "activityType": "question"}'
   ```

2. **Authentication Flow**
   - Test user registration/login
   - Verify JWT token validation
   - Test rate limiting

3. **Gamification Features**
   - Test XP calculation
   - Verify level-up events
   - Check streak tracking
   - Validate anti-cheat system

### Post-Deployment

1. **Initialize Background Jobs**
   ```bash
   # Trigger initial job processing
   curl -X POST https://your-app.vercel.app/api/jobs \
     -H "Authorization: Bearer <admin-token>" \
     -H "Content-Type: application/json" \
     -d '{"type": "cache_cleanup", "data": {}}'
   ```

2. **Monitor System Health**
   - Check Vercel logs
   - Monitor Sentry errors
   - Review cache hit rates
   - Track API response times

3. **User Onboarding**
   - Create first test users
   - Verify progress tracking
   - Test notification system

### Troubleshooting

#### Common Issues

1. **Firebase Connection Errors**
   - Verify service account credentials
   - Check database URL format
   - Ensure Firestore is enabled

2. **Authentication Failures**
   - Verify JWT secret matches
   - Check token expiration
   - Validate Firebase Auth configuration

3. **Performance Issues**
   - Check Redis connection
   - Monitor cache hit rates
   - Review database query performance

4. **Rate Limiting Issues**
   - Verify rate limit secret
   - Check user tier configuration
   - Monitor request patterns

### Scaling Considerations

1. **Database Scaling**
   - Monitor Firestore usage
   - Implement data sharding if needed
   - Consider read replicas for analytics

2. **Cache Scaling**
   - Monitor Redis memory usage
   - Implement cache warming strategies
   - Consider CDN for static assets

3. **API Scaling**
   - Monitor function execution times
   - Optimize database queries
   - Consider edge functions for global distribution

### Maintenance

1. **Regular Tasks**
   - Clean up expired cache entries
   - Archive old analytics data
   - Update security rules
   - Monitor system performance

2. **Backup Strategy**
   - Enable Firestore backups
   - Export critical data regularly
   - Test restore procedures

### Support

For issues with:
- **Vercel Deployment**: Check Vercel documentation
- **Firebase Configuration**: Review Firebase Admin SDK docs
- **Redis Setup**: Consult Redis provider documentation
- **Gamification Logic**: Review system documentation

---

This system is designed to be production-ready with enterprise-level security, performance, and scalability. All components have been tested and optimized for the Baccalaureate learning app use case.
