/**
 * Streamify Deployment Checklist
 */

# Deployment Checklist

## Before Deployment

### Code Quality
- [ ] Run ESLint: `npm run lint`
- [ ] Type check: `npx tsc --noEmit`
- [ ] Test all routes: `npm run test`

### Environment Variables
- [ ] Add all required env vars to deployment platform
- [ ] Test production OAuth keys
- [ ] Verify database URL (production)
- [ ] Check Stripe live keys

### Database
- [ ] Run migrations: `npm run db:push`
- [ ] Verify all tables created
- [ ] Backup production database

### Security
- [ ] Set new NEXTAUTH_SECRET
- [ ] Review CORS settings
- [ ] Enable rate limiting
- [ ] Add security headers

## Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Vercel Environment Variables
```
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=<new-secret>
DATABASE_URL=<production-db>
DIRECT_URL=<production-direct-db>
GOOGLE_ID=<prod-id>
GOOGLE_SECRET=<prod-secret>
GITHUB_ID=<prod-id>
GITHUB_SECRET=<prod-secret>
STRIPE_SECRET_KEY=<live-key>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<live-key>
AWS_ACCESS_KEY_ID=<prod-key>
AWS_SECRET_ACCESS_KEY=<prod-secret>
```

## Railway/Render Deployment (Backend Database)

1. Create PostgreSQL database
2. Note connection string
3. Set DATABASE_URL & DIRECT_URL

## Post-Deployment

- [ ] Test login/signup
- [ ] Verify OAuth providers
- [ ] Check database connectivity
- [ ] Test payment flow
- [ ] Monitor error logs
- [ ] Set up uptime monitoring
- [ ] Enable auto-backups

## Production Monitoring

- [ ] Setup Sentry for error tracking
- [ ] Configure CloudWatch logs
- [ ] Set up alerts for errors/downtime
- [ ] Monitor database performance
- [ ] Review Stripe logs

## Rollback Plan

If issues occur:

```bash
# Rollback to previous deployment
vercel rollback

# Or redeploy specific version
vercel --prod --skip-build
```
