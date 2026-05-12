# Security Hardening Checklist

This document outlines the security hardening improvements made to SolarCRM and provides implementation guidance for deployment.

## ✅ Completed Security Measures

### 1. Removed Admin Email Whitelist Bypass
**File**: [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx)

**Issue**: The application had a hardcoded bypass that automatically granted admin access to specific email addresses (`admin@solar.com`, `admin@gmail.com`) if they weren't found in the database.

**Fix**: Removed this security vulnerability. Now all users must be properly registered in the database before accessing the system.

**Impact**: 
- ✅ Eliminates unauthorized admin access vector
- ✅ Ensures proper access control is enforced
- ✅ Requires admin to properly provision new users

### 2. JWT_SECRET Validation - Crash on Missing
**Files**: 
- [infrastructure/backend/src/middleware/auth.ts](infrastructure/backend/src/middleware/auth.ts)
- [infrastructure/backend/src/routes/auth.ts](infrastructure/backend/src/routes/auth.ts)

**Issue**: Both files had insecure fallback to `'INSECURE_DEFAULT_CHANGE_ME'` when `JWT_SECRET` environment variable was missing. This could lead to security breaches if accidentally deployed.

**Fix**: Implemented validation that crashes the server on startup if `JWT_SECRET` is not set, with clear error messages.

**Impact**:
- ✅ Prevents accidental use of weak JWT secrets
- ✅ Fails fast during deployment if configuration is incomplete
- ✅ Forces proper environment setup before production deployment

**Environment Setup**:
```bash
# Generate a secure JWT_SECRET (64 hex characters)
openssl rand -hex 64

# Add to your .env file
JWT_SECRET=<generated-value>
```

### 3. Enabled Supabase Row Level Security (RLS)
**File**: [infrastructure/backend/src/db/migrate.ts](infrastructure/backend/src/db/migrate.ts)

**Issue**: The database had no Row Level Security policies, meaning all authenticated users could access any data.

**Fix**: Implemented comprehensive RLS policies for all tables with role-based access control:

| Table | Admin | Sales Team | Engineer | Accountant |
|-------|-------|-----------|----------|-----------|
| users | All | Own only | Own only | Own only |
| clients | All | Own+Assigned | Own+Assigned | View all |
| workflow_status | All | Own+Assigned | Own+Assigned | View all |
| surveys | All | View all | CRUD | View all |
| quotations | All | View all | Create/View | CRUD |
| installations | All | View all | CRUD | View all |
| subsidies | All | View all | View all | CRUD |
| payments | All | View all | View all | CRUD |
| documents | All | View all | CRUD | View all |
| activity_log | All | Own only | Own only | Own only |

**Policies Implemented**:
- SELECT: Users see only permitted data based on role and assignment
- INSERT: Only authorized roles can create records
- UPDATE: Admins and authorized roles can modify records
- DELETE: Only admins can delete records

**Impact**:
- ✅ Database-level access control enforcement
- ✅ Prevents privilege escalation attacks
- ✅ Ensures data isolation between roles
- ✅ Compliant with principle of least privilege

**Important**: Re-run migrations after update:
```bash
npm run db:migrate
```

### 4. Environment File Security
**File**: [.gitignore](.gitignore)

**Issue**: Ensure `.env` files are never committed to version control.

**Status**: ✅ Already configured properly with `.env*` pattern (excludes all .env files except .env.example)

**Git History Audit Results**:
- ✅ No actual credentials found in git history
- ✅ Only template placeholders in `.env.example`
- ✅ Supabase anon key in `.env` is a public key (safe for public visibility)

**Recommendations**:
1. Rotate Supabase anon key if you've shared it accidentally: https://supabase.com/dashboard/project/_/api
2. Implement secret scanning in CI/CD:
   ```bash
   # Pre-commit hook to prevent secrets
   npm install --save-dev husky git-secrets
   husky install
   git hook install
   ```
3. Monitor git history periodically:
   ```bash
   # Search for suspicious patterns
   git log -p | grep -i "password\|token\|secret" | head -20
   ```

### 5. Sentry Error Monitoring Integration
**Files**:
- [src/main.tsx](src/main.tsx) - Frontend initialization
- [infrastructure/backend/src/server.ts](infrastructure/backend/src/server.ts) - Backend initialization
- [infrastructure/backend/src/middleware/errors.ts](infrastructure/backend/src/middleware/errors.ts) - Error capture

**What's Configured**:

#### Frontend (React)
- Error boundary with fallback UI
- Performance monitoring with session replays
- Automatic error capture with breadcrumbs
- Release tracking

```typescript
// Sample rates for development/production
- Errors: 100% capture
- Performance: 100% (dev), 10% (prod)
- Session Replays: 10% on errors
```

#### Backend (Node.js)
- Request/response tracing
- Error context with HTTP metadata
- Database error tracking
- Performance profiling
- Custom tags for error categorization

**Setup Instructions**:

1. **Create Sentry Account**: https://sentry.io

2. **Create Frontend Project**:
   - Go to Projects → Create Project
   - Select React
   - Copy the DSN

3. **Create Backend Project**:
   - Go to Projects → Create Project  
   - Select Node.js
   - Copy the DSN

4. **Update Environment Variables**:
   ```bash
   # Frontend (.env)
   VITE_SENTRY_DSN="https://xxxxx@xxxxx.ingest.sentry.io/xxxxx"
   
   # Backend (infrastructure/.env)
   SENTRY_DSN="https://xxxxx@xxxxx.ingest.sentry.io/xxxxx"
   ```

5. **Deploy and Test**:
   ```bash
   # Frontend: Trigger an error in development console
   throw new Error("Test error");
   
   # Backend: Make a request that causes an error
   curl http://localhost:4000/api/invalid
   ```

**Impact**:
- ✅ Real-time error notifications
- ✅ Performance monitoring and bottleneck identification
- ✅ Session replay for debugging
- ✅ Automatic error grouping and trend analysis
- ✅ Compliance with error tracking best practices

---

## 📋 Pre-Deployment Checklist

Before deploying to production, ensure:

- [ ] `JWT_SECRET` is set in production `.env` file
- [ ] `SENTRY_DSN` is configured for both frontend and backend
- [ ] Database migrations have been run: `npm run db:migrate`
- [ ] RLS policies are active in production database
- [ ] `.env` files are NOT committed to git
- [ ] Git history has been scanned for secrets: `git log -p | grep -i "password\|token"`
- [ ] All users are properly registered (no bypass admin access)
- [ ] Supabase credentials are rotated if ever exposed

## 🔐 Ongoing Security Practices

### Monthly Activities
- Review Sentry error patterns and fix root causes
- Audit user access logs for suspicious activity
- Check for uncaught error spikes

### Quarterly Activities
- Rotate `JWT_SECRET`
- Audit database RLS policies for effectiveness
- Review Sentry performance metrics

### On Every Deployment
- Verify `JWT_SECRET` is set
- Verify `SENTRY_DSN` is set
- Review and test error handling
- Check database connections work
- Verify RLS policies haven't been accidentally disabled

## 📚 Additional Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [PostgreSQL Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [OWASP Security Best Practices](https://owasp.org/www-project-top-ten/)
- [JWT Security](https://tools.ietf.org/html/rfc7519)

## 🚨 Emergency Procedures

### If JWT_SECRET is Compromised
1. Generate new `JWT_SECRET`: `openssl rand -hex 64`
2. Update `.env` file
3. Restart all backend services
4. Force all active sessions to re-authenticate

### If Database Credentials are Exposed
1. Rotate PostgreSQL password
2. Update `DATABASE_URL` in all `.env` files
3. Restart backend services
4. Review activity logs for unauthorized access

### If Sentry DSN is Compromised
1. Regenerate DSN in Sentry project settings
2. Update `SENTRY_DSN` in `.env` files
3. Redeploy all services
4. Review error logs for suspicious activity

---

**Last Updated**: May 12, 2026  
**Security Status**: ✅ Hardened  
**Next Review**: August 12, 2026
