# Security Policy 🔒

## Reporting Security Issues

If you discover a security vulnerability, please email **ashezz0512@gmail.com** instead of using the public issue tracker.

---

## Security Measures Implemented

### 1. **Environment Variables**

**⚠️ CRITICAL: Never commit `.env` files to Git!**

All sensitive configuration is stored in environment variables:
- Database credentials
- API keys (Arcjet, Neon)
- JWT secrets
- Redis connection strings

**Files excluded from Git:**
```
.env
.env.local
.env.development
.env.production
.env.*.local
```

### 2. **Secrets Management**

**For Local Development:**
1. Copy `.env.example` to `.env`
2. Fill in your actual credentials
3. **Never share your `.env` file**

**For Production:**
Use secret management services:
- **AWS**: AWS Secrets Manager / Systems Manager Parameter Store
- **Vercel**: Environment Variables in project settings
- **Heroku**: Config Vars
- **Docker**: Docker secrets or env files (not committed)

### 3. **JWT Secret Generation**

**Generate a strong JWT secret:**
```bash
# Method 1: Node.js crypto (Recommended)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Method 2: OpenSSL
openssl rand -hex 32

# Method 3: Online (use with caution)
# Visit: https://www.random.org/strings/
```

**Minimum Requirements:**
- Length: 32+ characters
- Randomness: Use cryptographically secure random generators
- Uniqueness: Different secret for dev/staging/production

---

## Authentication & Authorization

### JWT Implementation

**Token Storage:**
- ✅ Stored in `httpOnly` cookies (prevents XSS attacks)
- ✅ `secure` flag in production (HTTPS only)
- ✅ `sameSite: strict` (prevents CSRF)

**Token Payload:**
```javascript
{
  id: user.id,
  email: user.email,
  role: user.role,
  iat: timestamp,
  exp: timestamp + 15min
}
```

**Security Features:**
- Signed tokens (prevents tampering)
- Short expiration (15 minutes)
- No sensitive data in payload
- Verified on every protected route

### Password Security

**Hashing:**
- Algorithm: bcrypt
- Salt rounds: 10 (2^10 = 1024 iterations)
- Minimum password strength enforced via validation

**Best Practices:**
```javascript
// ✅ GOOD: Async hashing (non-blocking)
const hash = await bcrypt.hash(password, 10);

// ❌ BAD: Sync hashing (blocks event loop)
const hash = bcrypt.hashSync(password, 10);
```

### Role-Based Access Control (RBAC)

**Roles:**
- `guest`: Unauthenticated users (5 requests/min)
- `user`: Regular authenticated users (10 requests/min)
- `admin`: Admin users (20 requests/min)

**Implementation:**
```javascript
// Require authentication
router.get('/users', authenticateToken, getUsers);

// Require specific role
router.delete('/users/:id', authenticateToken, requireRole(['admin']), deleteUser);
```

---

## API Security

### 1. **Rate Limiting (Arcjet)**

**Configuration:**
```javascript
// Guest users (no auth)
- 5 requests per minute
- 403 Forbidden after limit

// Authenticated users
- 10 requests per minute (user role)
- 20 requests per minute (admin role)
- 429 Too Many Requests after limit
```

**Purpose:**
- Prevent brute force attacks
- Prevent DDoS attacks
- Limit abuse from malicious actors

### 2. **Bot Protection (Arcjet)**

**Features:**
- Detects automated scrapers
- Blocks malicious bots
- Allows legitimate bots (search engines, monitoring)

**Allowed bots:**
- Search engines (Google, Bing)
- Preview bots (Slack, Discord)
- Monitoring services (Uptime Robot)

### 3. **Shield Protection (Arcjet)**

**Protects against:**
- SQL injection attempts
- XSS (Cross-Site Scripting)
- Path traversal attacks
- Command injection
- LDAP injection

### 4. **HTTP Security Headers (Helmet)**

**Headers set by Helmet:**
```
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Referrer-Policy: no-referrer
```

### 5. **Input Validation (Zod)**

**All inputs validated before processing:**

```javascript
// Registration schema
{
  name: string (min 1, max 255),
  email: valid email format,
  password: min 8 chars, at least 1 uppercase, 1 lowercase, 1 number,
  role: enum ['user', 'admin'] (optional, defaults to 'user')
}
```

**Validation errors return 400 with details:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 6. **SQL Injection Prevention**

**Using Drizzle ORM with parameterized queries:**

```javascript
// ✅ SAFE: Parameterized query
const user = await db
  .select()
  .from(users)
  .where(eq(users.email, email))
  .limit(1);

// ❌ DANGEROUS: String interpolation (never do this!)
const query = `SELECT * FROM users WHERE email = '${email}'`;
```

### 7. **CORS Configuration**

**Current setup:**
```javascript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
```

**For production, set specific origins:**
```bash
# .env.production
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

---

## Database Security

### Connection Security

**Neon PostgreSQL:**
- ✅ SSL/TLS encryption (`sslmode=require`)
- ✅ Serverless with automatic connection pooling
- ✅ No direct database credentials in code
- ✅ Environment variable configuration

**Connection string format:**
```
postgresql://username:password@host.neon.tech/db?sslmode=require
```

### Query Security

**Best practices:**
1. **Never use raw SQL with user input**
2. **Always use ORM parameterized queries**
3. **Validate and sanitize all inputs**
4. **Use prepared statements**

### Data Protection

**Sensitive fields:**
- Passwords: Never returned in API responses
- Email: Only returned to authenticated users
- User data: Filtered based on role

```javascript
// Password field excluded from all select queries
const [user] = await db
  .select({
    id: users.id,
    email: users.email,
    name: users.name,
    role: users.role,
    // password: NEVER SELECTED
  })
  .from(users);
```

---

## Redis Security

### Connection Security

**Development (Docker):**
```
REDIS_URL=redis://redis:6379
```

**Production (AWS ElastiCache):**
```
# With AUTH
REDIS_URL=redis://:password@your-cluster.cache.amazonaws.com:6379

# With TLS
REDIS_URL=rediss://:password@your-cluster.cache.amazonaws.com:6380
```

### Cache Security Considerations

**What's cached:**
- ✅ User profile data (public info only)
- ✅ JWT verification results (temporary)
- ❌ Passwords (NEVER cached)
- ❌ Sensitive user data

**TTL (Time To Live):**
- User data: 10 minutes
- JWT verification: 15 minutes
- Auto-expires to prevent stale data

---

## Docker Security

### Image Security

**Multi-stage build:**
```dockerfile
# Production image only includes runtime dependencies
FROM node:18-alpine AS production
```

**Security features:**
- ✅ Alpine Linux (minimal attack surface)
- ✅ Non-root user
- ✅ Only production dependencies
- ✅ No development tools

**Best practices:**
```dockerfile
# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership and switch user
RUN chown -R nodejs:nodejs /app
USER nodejs
```

### Container Security

**Don't expose:**
- Database ports externally (only internal network)
- Redis ports externally (only internal network)
- Development/debug ports in production

**Do expose:**
- Only API port (3000) through reverse proxy
- HTTPS (443) via load balancer/App Runner

---

## Logging & Monitoring

### What's Logged

**✅ Safe to log:**
- Request method, path, status code
- Response time
- User ID (not email)
- Error messages (sanitized)
- Authentication success/failure

**❌ NEVER log:**
- Passwords
- JWT tokens
- API keys
- Database connection strings
- Full request bodies (may contain sensitive data)

### Example Logs

**Good:**
```javascript
logger.info('User authenticated', { userId: user.id, role: user.role });
```

**Bad:**
```javascript
logger.info('User authenticated', { password: req.body.password }); // ❌ NEVER!
```

### Log Levels

```javascript
logger.error('Critical error') // Production errors
logger.warn('Rate limit exceeded') // Security warnings
logger.info('User logged in') // Important events
logger.debug('Cache hit: users:all') // Development debugging
```

---

## Deployment Security Checklist

### Before Deploying to Production:

**Environment:**
- [ ] Change all default passwords and secrets
- [ ] Generate new JWT secret (don't reuse dev secret)
- [ ] Use production database (not dev database)
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper `ALLOWED_ORIGINS` for CORS

**Secrets Management:**
- [ ] Store secrets in AWS Secrets Manager / Parameter Store
- [ ] Never commit `.env` files
- [ ] Rotate secrets regularly (every 90 days)
- [ ] Use different secrets for dev/staging/production

**API Security:**
- [ ] Enable HTTPS (use Let's Encrypt or AWS Certificate Manager)
- [ ] Configure proper rate limits
- [ ] Set up IP whitelisting for admin endpoints (if applicable)
- [ ] Enable Arcjet in LIVE mode (not DRY_RUN)

**Database:**
- [ ] Enable automated backups
- [ ] Set up read replicas (for scaling)
- [ ] Configure connection pool limits
- [ ] Enable query logging for auditing

**Monitoring:**
- [ ] Set up CloudWatch alarms
- [ ] Configure error tracking (Sentry)
- [ ] Enable access logs
- [ ] Set up uptime monitoring

**Infrastructure:**
- [ ] Use private subnets for database and Redis
- [ ] Configure security groups (least privilege)
- [ ] Enable VPC flow logs
- [ ] Set up WAF (Web Application Firewall) if using ALB

---

## Incident Response

### If Credentials Are Leaked:

**Immediate Actions:**
1. **Rotate ALL secrets immediately**
   - Generate new JWT secret
   - Generate new API keys
   - Reset database password

2. **Invalidate all existing sessions**
   - Clear Redis cache
   - Force all users to re-login

3. **Check logs for unauthorized access**
   - Review CloudWatch logs
   - Check for unusual activity
   - Identify affected users

4. **Notify affected users**
   - Send security notification emails
   - Recommend password changes
   - Report breach if data exposed

### If Security Vulnerability Found:

1. **Assess severity** (Critical, High, Medium, Low)
2. **Develop and test fix**
3. **Deploy fix ASAP** (hot-fix deployment)
4. **Document in security advisory**
5. **Post-mortem analysis**

---

## Security Best Practices for Contributors

### Code Review Checklist:

- [ ] No hardcoded secrets or credentials
- [ ] All user inputs are validated
- [ ] SQL queries use parameterized statements
- [ ] Authentication required for sensitive endpoints
- [ ] Error messages don't leak sensitive information
- [ ] Logging doesn't expose secrets
- [ ] Dependencies are up-to-date (no known vulnerabilities)

### Running Security Audit:

```bash
# Check for known vulnerabilities in dependencies
npm audit

# Fix vulnerabilities automatically (if possible)
npm audit fix

# Generate audit report
npm audit --json > audit-report.json
```

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)
- [AWS Security Best Practices](https://aws.amazon.com/architecture/security-identity-compliance/)
- [Neon Security](https://neon.tech/docs/introduction/security)
- [Arcjet Documentation](https://docs.arcjet.com/)

---

## Contact

For security concerns, contact: **ashezz0512@gmail.com**

**Last Updated:** July 2026
