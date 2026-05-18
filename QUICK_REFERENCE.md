# Streamify - Developer Quick Reference

## 🚀 Essential Commands

```bash
# Setup
npm install                    # Install dependencies
npm run db:push               # Create database
npm run db:seed               # Seed sample data

# Development
npm run dev                    # Start dev server (localhost:3000)
npm run lint                   # Check code quality
npm run format                 # Format code
npm run type-check             # Check TypeScript

# Database
npm run prisma:studio         # Open Prisma GUI
npm run db:reset              # Reset database (caution!)

# Build & Deploy
npm run build                  # Build for production
npm run start                  # Start production server
```

## 📁 Key Files & Directories

```
src/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   ├── auth/                 # Auth pages
│   ├── browse/               # Content browsing
│   └── page.tsx              # Home page
├── components/               # React components
│   ├── ui/                   # Base UI library
│   ├── layout/               # Layout (Navbar, Footer)
│   └── content/              # Content (Card, Player)
├── lib/                      # Utilities
│   ├── api-client.ts         # API requests
│   ├── auth.ts               # Auth helpers
│   ├── constants.ts          # App constants
│   └── stripe.ts             # Stripe utilities
├── store/                    # Zustand state stores
├── types/                    # TypeScript definitions
└── middleware.ts             # NextAuth middleware

prisma/
└── schema.prisma             # Database schema

docs/
├── API.md                    # Full API reference
└── DEPLOYMENT.md             # Deployment guide

Configuration files:
- .env.local.example          # Environment template
- tsconfig.json               # TypeScript config
- tailwind.config.js          # Styling config
- next.config.js              # Next.js config
```

## 🔑 Environment Variables

Required `.env.local` variables:

```bash
# Database
DATABASE_URL=postgresql://...

# NextAuth
NEXTAUTH_SECRET=<random-secret>
NEXTAUTH_URL=http://localhost:3000

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_ID=...
GITHUB_SECRET=...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=streamify-videos
NEXT_PUBLIC_CLOUDFRONT_URL=https://...

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

## 🗄️ Database Models

```
User → Subscription, WatchHistory, Favorite, PlanToWatch, Download
Content → Episode, VideoSource, Subtitle
Episode → VideoSource, Subtitle, WatchHistory
Subscription → Stripe customer data
```

## 📡 API Endpoints Quick Map

```
Authentication:
  POST   /api/auth/signup
  POST   /api/auth/login
  GET    /api/auth/session

Content:
  GET    /api/content
  GET    /api/content/:id
  GET    /api/content/trending
  GET    /api/content/search

User:
  GET    /api/user/profile
  GET    /api/user/favorites
  GET    /api/user/plantowatch

Subscriptions:
  GET    /api/subscription/plans
  POST   /api/subscription/create-checkout
```

## 🎨 Tailwind Classes Quick Reference

```
Colors:
  text-purple-500     → Primary purple
  bg-pink-500         → Accent pink
  bg-dark-900         → Dark background

Spacing:
  p-4, m-4, gap-4     → 1rem spacing

Typography:
  text-lg, text-2xl   → Font sizes
  font-bold           → Weight

Responsive:
  md:w-1/2             → Tablet width
  lg:hidden            → Hide on desktop
```

## 🔐 Authentication Flow

```
User Input
    ↓
NextAuth Provider (Email/Google/GitHub)
    ↓
Authentication
    ↓
JWT Token Generated
    ↓
Session Created
    ↓
Protected Routes Accessible
```

## 🚨 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Database connection error | Check `DATABASE_URL` in `.env.local` |
| OAuth not working | Verify redirect URIs in provider settings |
| 401 Unauthorized | Ensure auth middleware is configured |
| Images not loading | Check AWS S3 or Cloudinary credentials |
| Stripe errors | Use test keys, not live keys |

## 🧪 Testing Your Setup

```bash
# 1. Test database connection
npm run prisma:studio

# 2. Test API
curl http://localhost:3000/api/content

# 3. Test auth
# Visit http://localhost:3000/auth/login

# 4. Test subscription
# Visit http://localhost:3000/plans

# 5. Watch console
# npm run dev (with devtools open)
```

## 📊 Performance Tips

```javascript
// Use React Query for data
const { data } = useQuery(['content'], fetchContent)

// Lazy load components
const Player = lazy(() => import('@/components/VideoPlayer'))

// Image optimization
<Image src={url} alt="title" priority={false} />

// Zustand for UI state
const { sidebarOpen } = useUIStore()
```

## 🎬 Component Usage Examples

```javascript
// Button
<Button variant="primary" size="lg">Click me</Button>

// Input
<Input label="Email" type="email" required />

// ContentCard
<ContentCard 
  content={content}
  onPlay={() => navigate(`/watch/${content.id}`)}
/>

// VideoPlayer
<VideoPlayer
  src="https://cdn.example.com/video.m3u8"
  onPlay={handlePlay}
/>
```

## 🚀 Deployment Checklist

Before going live:
- [ ] All env variables set
- [ ] Database migrated
- [ ] SSL certificate installed
- [ ] Stripe live keys configured
- [ ] AWS S3 bucket verified
- [ ] Email notifications set up
- [ ] Error tracking enabled (Sentry)
- [ ] Analytics configured
- [ ] Monitoring alerts set up
- [ ] Backup strategy in place

## 📚 Documentation Links

| Document | Purpose |
|----------|---------|
| README.md | Project overview |
| SETUP_GUIDE.md | Step-by-step setup |
| DEPLOYMENT.md | Production deployment |
| docs/API.md | Full API reference |
| CONTRIBUTING.md | Contributing guidelines |
| ONBOARDING.md | Developer checklist |
| PROJECT_SUMMARY.md | Complete project details |

## 🔗 External Resources

- [Next.js Docs](https://nextjs.org)
- [Prisma Docs](https://www.prisma.io)
- [Stripe Docs](https://stripe.com/docs)
- [Tailwind Docs](https://tailwindcss.com)
- [NextAuth Docs](https://next-auth.js.org)

## 💬 Ask Questions

- 📧 Email: dev@streamify.local
- 🐛 Issues: GitHub Issues
- 💬 Discord: [Join Server]
- 📖 Wiki: [Internal Docs]

---

**Keep this handy for quick reference!** 🚀

Last Updated: 2024-05-23
