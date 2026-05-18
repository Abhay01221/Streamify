# Developer Onboarding Checklist

## Pre-Development Setup (Day 1)

### Environment Setup
- [ ] Clone repository: `git clone <repo>`
- [ ] Install Node.js 18+ (verify: `node --version`)
- [ ] Install PostgreSQL (verify: `psql --version`)
- [ ] Run setup script: `npm run setup` or `./setup.sh`

### Configuration
- [ ] Copy `.env.local.example` to `.env.local`
- [ ] Generate NEXTAUTH_SECRET: `openssl rand -base64 32`
- [ ] Configure Google OAuth
  - [ ] Create project at https://console.cloud.google.com
  - [ ] Add credentials (OAuth 2.0 Client ID)
  - [ ] Set authorized redirect: `http://localhost:3000/api/auth/callback/google`
  - [ ] Copy Client ID & Secret to `.env.local`
- [ ] Configure GitHub OAuth
  - [ ] Create OAuth App at https://github.com/settings/developers
  - [ ] Set Authorization callback: `http://localhost:3000/api/auth/callback/github`
  - [ ] Copy Client ID & Secret to `.env.local`

### Database Setup
- [ ] Create PostgreSQL database: `createdb streamify`
- [ ] Generate Prisma client: `npm run prisma:generate`
- [ ] Create tables: `npm run db:push`
- [ ] Seed data: `npm run db:seed`
- [ ] Open Prisma Studio: `npm run prisma:studio`

### Verification
- [ ] Start dev server: `npm run dev`
- [ ] Open http://localhost:3000
- [ ] Test landing page loads
- [ ] Test signup page
- [ ] Test login with seeded credentials
- [ ] Verify database connection

## Week 1: Core Features

### Authentication Deep Dive
- [ ] Test email/password signup
- [ ] Test email/password login
- [ ] Test Google OAuth flow
- [ ] Test GitHub OAuth flow
- [ ] Verify tokens are stored
- [ ] Test protected routes redirect
- [ ] Review NextAuth documentation

### Content API
- [ ] Test GET /api/content (list all)
- [ ] Test GET /api/content/:id (detail)
- [ ] Test GET /api/content/trending
- [ ] Test GET /api/content/search
- [ ] Add sample content via Prisma Studio
- [ ] Test all content queries return proper data

### UI Components
- [ ] Test Button component in all variants
- [ ] Test Input component with validation
- [ ] Test ContentCard hover effect
- [ ] Test Navbar responsive behavior
- [ ] Test Footer links
- [ ] Verify animations work smoothly

## Week 2: Stripe Integration

### Payment Setup
- [ ] Create Stripe account at https://stripe.com
- [ ] Get API keys (test & live)
- [ ] Add STRIPE_SECRET_KEY to `.env.local`
- [ ] Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to `.env.local`
- [ ] Implement Stripe customer creation on signup

### Checkout Implementation
- [ ] Implement POST /api/subscription/create-checkout
- [ ] Create Stripe checkout session
- [ ] Redirect to Stripe Checkout
- [ ] Handle success/cancel URLs
- [ ] Implement webhook handler

### Subscription Webhooks
- [ ] Implement webhook receiver at `/api/webhooks/stripe`
- [ ] Handle payment_intent.succeeded
- [ ] Handle customer.subscription.created
- [ ] Handle customer.subscription.updated
- [ ] Handle customer.subscription.deleted
- [ ] Test webhooks with Stripe CLI

## Week 3: Video Player

### Video.js Setup
- [ ] Install Video.js & HLS.js
- [ ] Create VideoPlayer component
- [ ] Implement basic controls
- [ ] Add quality selector

### HLS Streaming
- [ ] Setup HLS manifest URL from test content
- [ ] Implement adaptive bitrate
- [ ] Test on different network speeds
- [ ] Implement fallback streams

### Features
- [ ] Implement playback speed control
- [ ] Add subtitle/CC selector
- [ ] Implement skip intro button
- [ ] Add picture-in-picture
- [ ] Save watch progress

## Week 4: AWS Integration

### AWS Setup
- [ ] Create AWS account
- [ ] Create S3 bucket (streamify-videos)
- [ ] Create CloudFront distribution
- [ ] Generate IAM credentials
- [ ] Add credentials to `.env.local`

### Video Upload
- [ ] Create admin upload API endpoint
- [ ] Implement multipart upload to S3
- [ ] Generate HLS manifest
- [ ] Test video playback via CloudFront

### Image CDN
- [ ] Setup Cloudinary account
- [ ] Configure image transformations
- [ ] Update poster/backdrop URLs
- [ ] Test image loading

## Ongoing Testing

### Automated Tests
- [ ] Setup Jest & React Testing Library
- [ ] Write tests for components
- [ ] Write tests for API routes
- [ ] Aim for 80%+ coverage
- [ ] Setup CI/CD on GitHub Actions

### Manual Testing
- [ ] Test on Chrome, Firefox, Safari
- [ ] Test on mobile (iPhone, Android)
- [ ] Test on tablet
- [ ] Test on TV (1920x1080+)
- [ ] Test with slow internet (throttle in DevTools)

### Browser Testing
- [ ] Desktop browsers (latest versions)
- [ ] Mobile browsers
- [ ] Dark mode support
- [ ] Print styles (if applicable)

### Accessibility
- [ ] Test with keyboard navigation
- [ ] Test with screen reader
- [ ] Check color contrast ratios
- [ ] Verify form labels

## Performance Optimization

### Frontend
- [ ] Measure Lighthouse score
- [ ] Optimize images (next/image)
- [ ] Minimize bundle size
- [ ] Implement lazy loading
- [ ] Setup critical CSS

### Backend
- [ ] Add database indexes
- [ ] Implement API caching
- [ ] Setup Redis (optional)
- [ ] Monitor database queries
- [ ] Profile API endpoints

## Security Review

### Code
- [ ] No hardcoded secrets
- [ ] Input validation on all forms
- [ ] SQL injection prevention (Prisma)
- [ ] XSS protection (React)
- [ ] CSRF protection (NextAuth)

### Infrastructure
- [ ] HTTPS enabled
- [ ] Security headers set
- [ ] CORS properly configured
- [ ] Rate limiting active
- [ ] SQL injection prevention

## Documentation

### Code Documentation
- [ ] JSDoc comments on functions
- [ ] README for each module
- [ ] API endpoint documentation
- [ ] Database schema documentation

### User Documentation
- [ ] User guide
- [ ] FAQ
- [ ] Troubleshooting guide
- [ ] Video tutorials (optional)

## Pre-Production

### Data Migration
- [ ] Plan migration strategy
- [ ] Test migration scripts
- [ ] Backup production data
- [ ] Plan rollback procedure

### Deployment
- [ ] Setup Vercel deployment
- [ ] Configure production database
- [ ] Setup error tracking (Sentry)
- [ ] Configure monitoring/alerts
- [ ] Setup backup strategy

### Launch Preparation
- [ ] Final security audit
- [ ] Performance testing
- [ ] Load testing
- [ ] Stress testing
- [ ] User acceptance testing

## Useful Commands

```bash
# Development
npm run dev           # Start dev server
npm run lint          # Run ESLint
npm run build         # Build for production
npm run start         # Start production server

# Database
npm run db:push       # Push schema to DB
npm run db:seed       # Seed database
npm run prisma:studio # Open Prisma Studio

# Utilities
npm run format        # Format with Prettier
npm run type-check    # Check TypeScript types
npm run test          # Run tests
npm run test:watch    # Watch mode

# Deployment
npm run build && npm run start  # Production build & start
```

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Docs](https://next-auth.js.org)
- [Stripe API Docs](https://stripe.com/docs/api)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Framer Motion Docs](https://www.framer.com/motion)

## Support & Questions

- 📧 Email: dev@streamify.local
- 💬 Discord: [Community Server](#)
- 📖 Wiki: [Internal Docs](#)
- 🐛 Issues: [GitHub Issues](#)

## Success Criteria for MVP

- ✅ Users can signup/login
- ✅ Content can be browsed by category
- ✅ Videos play successfully
- ✅ Stripe payments work
- ✅ Users can manage subscriptions
- ✅ Mobile responsive
- ✅ Page load < 3 seconds
- ✅ No critical security issues

---

**Good luck! 🚀**
