/**
 * Streamify - Full-Stack Video Streaming Platform
 * Build Setup & Deployment Guide
 */

# Streamify Setup Guide

## Prerequisites

- Node.js 18+
- PostgreSQL 12+
- Git
- npm or yarn

## Local Development Setup

### 1. Clone & Install Dependencies

```bash
git clone <repo-url>
cd Streamify
npm install
```

### 2. Database Setup

```bash
# Install PostgreSQL (if not already installed)
# macOS:
brew install postgresql

# Windows: Download from https://www.postgresql.org/download/windows/
# Linux: sudo apt-get install postgresql

# Create database
createdb streamify

# Set DATABASE_URL in .env.local
DATABASE_URL="postgresql://user:password@localhost:5432/streamify"
DIRECT_URL="postgresql://user:password@localhost:5432/streamify"
```

### 3. Environment Variables

Copy .env.local.example to .env.local and fill in your keys:

```bash
cp .env.local.example .env.local
```

Required services:
- Stripe: https://dashboard.stripe.com
- Google OAuth: https://console.cloud.google.com
- GitHub OAuth: https://github.com/settings/developers
- AWS S3: https://aws.amazon.com
- Cloudinary: https://cloudinary.com
- NextAuth Secret: `openssl rand -base64 32`

### 4. Initialize Database

```bash
# Generate Prisma client
npm run prisma:generate

# Create tables
npm run db:push

# (Optional) Seed with sample data
npm run db:seed
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run db:push      # Push schema to database
npm run db:seed      # Seed database with sample data
npm run prisma:studio    # Open Prisma Studio
```

## Project Structure

```
Streamify/
├── src/
│   ├── app/
│   │   ├── api/              # API routes
│   │   ├── auth/             # Auth pages
│   │   ├── browse/           # Browse pages
│   │   ├── watch/            # Video player page
│   │   ├── admin/            # Admin dashboard
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Home page
│   ├── components/
│   │   ├── ui/               # Base components
│   │   ├── layout/           # Layout components
│   │   └── content/          # Content components
│   ├── lib/
│   │   ├── api-client.ts     # API utilities
│   │   ├── auth.ts           # Auth helpers
│   │   ├── prisma.ts         # Prisma client
│   │   └── constants.ts      # App constants
│   ├── types/                # TypeScript types
│   ├── store/                # Zustand stores
│   └── styles/               # Global styles
├── prisma/
│   └── schema.prisma         # Database schema
├── public/                   # Static assets
└── package.json

```

## Authentication

### Supported Methods
- Email/Password (local)
- Google OAuth
- GitHub OAuth

### How It Works
1. NextAuth.js handles all auth flows
2. Sessions stored in JWT tokens
3. Credentials provider validates with database
4. OAuth providers auto-create users

### Trial System
- 30-day free trial on signup
- Stored in `User.trialStart` and `User.trialEnd`
- Trial status checked on each request
- Automatic downgrade after expiry

## Deployment

### Frontend (Vercel)

```bash
# Connect GitHub repo to Vercel
# Set environment variables in Vercel dashboard
# Auto-deploys on push to main
vercel --prod
```

### Backend Database (Railway/Render)

1. Create PostgreSQL database
2. Set DATABASE_URL in production
3. Deploy Prisma migrations:
```bash
npm run db:push -- --force-reset
```

### Environment Variables for Production

```
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=<generate-new>
DATABASE_URL=<production-db>
GOOGLE_ID=<your-id>
GOOGLE_SECRET=<your-secret>
GITHUB_ID=<your-id>
GITHUB_SECRET=<your-secret>
STRIPE_SECRET_KEY=<your-key>
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
```

## Features Implemented

✅ User Authentication (Email, Google, GitHub)
✅ Free Trial System (30 days)
✅ Database Schema (PostgreSQL + Prisma)
✅ API Routes (Content, User, Watch History)
✅ UI Components (Cards, Buttons, Forms)
✅ Browse Pages (Movies, TV Shows, Anime, K-Dramas)
✅ Search Functionality
✅ Favorites & Plan-to-Watch
✅ Profile Management
✅ Admin Dashboard (Skeleton)
✅ Landing Page with Animations
✅ Dark Theme with Gradient Accents

## Features Not Yet Implemented

⏳ Stripe Payment Integration
⏳ Video Player (HLS Streaming)
⏳ AWS S3 Video Upload
⏳ Download Feature (encrypted storage)
⏳ Multi-Profile Support
⏳ Parental Controls
⏳ Advanced Search/Algolia Integration
⏳ Email Notifications
⏳ Analytics Dashboard

## API Endpoints

### Auth
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/session` - Get session (NextAuth)

### Content
- `GET /api/content` - List all content
- `GET /api/content/:id` - Get content details
- `GET /api/content/trending` - Trending content
- `GET /api/content/search` - Search content
- `GET /api/content/category` - Content by category

### User
- `GET /api/user/profile` - Get profile
- `PUT /api/user/profile` - Update profile
- `GET /api/user/favorites` - Get favorites
- `POST /api/user/favorites` - Add favorite
- `DELETE /api/user/favorites/:id` - Remove favorite
- `GET /api/user/plantowatch` - Get watchlist
- `POST /api/user/plantowatch` - Add to watchlist
- `DELETE /api/user/plantowatch/:id` - Remove from watchlist

### Subscriptions
- `GET /api/subscription/plans` - List plans
- `GET /api/subscription/status` - Get current subscription
- `POST /api/subscription/create-checkout` - Create Stripe checkout

### Watch Progress
- `GET /api/watch-progress` - Get watch history
- `POST /api/watch-progress` - Update progress

## Troubleshooting

### Database Connection Issues
```bash
# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL

# Reset database
npm run db:push -- --force-reset
```

### NextAuth Issues
- Ensure NEXTAUTH_SECRET is set
- Check OAuth provider credentials
- Clear cookies and try again
- Check NextAuth logs: `console.log` in auth routes

### Prisma Issues
```bash
# Regenerate client
npm run prisma:generate

# View database: 
npm run prisma:studio

# Reset database (CAREFUL!)
npx prisma migrate reset
```

## Next Steps

1. **Payment Integration**: Implement Stripe webhooks
2. **Video Player**: Integrate Video.js + HLS.js
3. **Content Upload**: Implement admin upload with AWS S3
4. **Email System**: Setup Resend for transactional emails
5. **Search**: Integrate Algolia for advanced search
6. **Analytics**: Add server-side analytics
7. **Performance**: Setup Redis caching
8. **Testing**: Add Jest + React Testing Library tests

## Support

For issues or questions:
1. Check the [Streamify Issues](https://github.com/yourusername/streamify/issues)
2. Read the [Tech Stack Documentation](#tech-stack)
3. Review the [Database Schema](prisma/schema.prisma)

## License

MIT

---

**Happy Streaming! 🎬**
