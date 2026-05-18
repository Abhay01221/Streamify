# Streamify - Video Streaming Platform

A Netflix/Prime Video/Hotstar-style OTT website built with Next.js 14, Node.js, PostgreSQL, Stripe, and AWS.

## Features

- 🎬 Multiple content types: Movies, TV Shows, Anime, K-Dramas
- 👤 User authentication with NextAuth (Email, Google, GitHub)
- 💰 Stripe subscription system with free trial
- 🎥 HLS adaptive bitrate video streaming
- 📱 Responsive design (mobile to TV screens)
- 🌐 Multi-language subtitle support
- ⭐ Favorites and Plan-to-Watch lists
- 📊 Admin dashboard for content management
- 🎨 Dark mode with gradient accents
- ⚡ Framer Motion animations

## Tech Stack

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion
- Zustand (State Management)
- React Query (Data Fetching)
- Video.js / Plyr.js (Video Player)

### Backend
- Node.js + Express.js
- PostgreSQL + Prisma ORM
- Redis (Caching)
- NextAuth.js (Authentication)

### External Services
- AWS S3 + CloudFront (Video Storage & CDN)
- Cloudinary (Image CDN)
- Stripe (Payments)
- Resend (Email)

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL
- AWS account
- Stripe account

### Installation

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.local.example .env.local

# Generate Prisma client
npm run prisma:generate

# Push schema to database
npm run db:push

# Seed database (optional)
npm run db:seed
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
streamify/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── api/               # API routes
│   │   ├── auth/              # Authentication pages
│   │   ├── browse/            # Content browsing
│   │   ├── watch/             # Video player
│   │   └── ...
│   ├── components/             # React components
│   ├── lib/                    # Utilities & helpers
│   ├── types/                  # TypeScript types
│   └── store/                  # Zustand stores
├── prisma/
│   └── schema.prisma          # Database schema
└── public/                     # Static assets
```

## Database Schema

Key models:
- **User**: Authentication & subscription data
- **Content**: Movies, TV shows, anime, K-dramas
- **Episode**: Individual episodes for series
- **WatchHistory**: Track viewing progress
- **Favorite**: User favorites
- **PlanToWatch**: Watchlist
- **Subscription**: Stripe subscription data

## API Routes

See documentation for all available endpoints.

## Deployment

### Frontend (Vercel)
```bash
vercel deploy
```

### Backend (Railway/Render)
Deploy Node.js API separately with PostgreSQL.

## License

MIT
