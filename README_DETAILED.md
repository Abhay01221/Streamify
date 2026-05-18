# 🎬 Streamify - Full-Stack OTT Platform

> "Stream Everything. Anywhere."

A Netflix/Prime Video/Hotstar-style video streaming platform built with Next.js 14, Node.js, PostgreSQL, and Stripe.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![Status](https://img.shields.io/badge/status-beta-yellow.svg)

## 🚀 Features

### User Features
- 👤 Email/OAuth Authentication (Google, GitHub)
- 🎥 Multi-format Content (Movies, TV Shows, Anime, K-Dramas)
- 📺 Responsive Design (Mobile, Tablet, TV)
- 🎬 HD Streaming (360p - 4K)
- 🌐 Multi-Language Subtitles
- ⭐ Favorites & Watchlist
- 📱 Continue Watching (Cross-device sync)
- 💳 Multiple Subscription Plans
- 🆓 30-Day Free Trial
- 📥 Download & Watch Offline
- 🔐 Parental Controls (Coming Soon)

### Admin Features
- 📊 Dashboard with Analytics
- 🎬 Content Management
- 👥 User Management
- 💰 Revenue Tracking
- 📈 Statistics

## 📋 Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **State**: Zustand + React Query
- **Player**: Video.js + HLS.js
- **Forms**: React Hook Form + Zod

### Backend
- **Runtime**: Node.js
- **Framework**: Next.js API Routes
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Auth**: NextAuth.js
- **Payments**: Stripe
- **CDN**: AWS CloudFront
- **Storage**: AWS S3 + Cloudinary

### DevOps
- **Frontend Deploy**: Vercel
- **Database**: PostgreSQL (Railway/Render)
- **CI/CD**: GitHub Actions (Coming Soon)

## 🏗️ Project Structure

```
Streamify/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── api/               # API routes
│   │   ├── (auth)/            # Auth pages
│   │   ├── browse/            # Content browsing
│   │   ├── watch/             # Video player
│   │   ├── admin/             # Admin dashboard
│   │   ├── profile/           # User profile
│   │   └── page.tsx           # Home
│   ├── components/             # React components
│   │   ├── ui/                # Base UI components
│   │   ├── layout/            # Layout components
│   │   └── content/           # Content components
│   ├── lib/                    # Utilities & helpers
│   ├── types/                  # TypeScript types
│   ├── store/                  # Zustand stores
│   ├── styles/                 # Global styles
│   └── middleware.ts           # Auth middleware
├── prisma/
│   └── schema.prisma          # Database schema
└── scripts/                    # Utility scripts
```

## 🚀 Quick Start

### 1. Prerequisites
```bash
Node.js 18+
PostgreSQL 12+
Git
```

### 2. Clone Repository
```bash
git clone https://github.com/yourusername/streamify.git
cd Streamify
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Setup Environment
```bash
cp .env.local.example .env.local
# Edit .env.local with your configuration
```

### 5. Setup Database
```bash
# Create PostgreSQL database
createdb streamify

# Generate Prisma client
npm run prisma:generate

# Create tables
npm run db:push

# (Optional) Seed with sample data
npm run db:seed
```

### 6. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📱 Available Routes

### Public Routes
- `/` - Landing page
- `/auth/login` - Login page
- `/auth/signup` - Signup page
- `/plans` - Pricing page

### Protected Routes
- `/browse` - Home feed
- `/browse/movies` - Movies
- `/browse/tvshows` - TV Shows
- `/browse/anime` - Anime
- `/browse/kdrama` - K-Dramas
- `/search` - Search
- `/watch/[id]` - Video player
- `/mylist` - My Lists
- `/profile` - Profile settings
- `/admin` - Admin dashboard

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/signup         - Register
POST   /api/auth/login          - Login
GET    /api/auth/session        - Get session
```

### Content
```
GET    /api/content             - List content
GET    /api/content/:id         - Get details
GET    /api/content/trending    - Trending
GET    /api/content/search      - Search
```

### User
```
GET    /api/user/profile        - Get profile
PUT    /api/user/profile        - Update profile
GET    /api/user/favorites      - Get favorites
POST   /api/user/favorites      - Add favorite
DELETE /api/user/favorites/:id  - Remove favorite
```

### Subscriptions
```
GET    /api/subscription/plans      - List plans
GET    /api/subscription/status     - Get status
POST   /api/subscription/create-checkout - Checkout
```

[Full API Documentation](./docs/API.md)

## 🗄️ Database Schema

### Key Tables
- **User** - User accounts & subscriptions
- **Content** - Movies, shows, anime, K-dramas
- **Episode** - Individual episodes
- **VideoSource** - HLS streams (different qualities)
- **Subtitle** - Multi-language subtitles
- **WatchHistory** - Viewing progress
- **Favorite** - User favorites
- **PlanToWatch** - Watchlist
- **Subscription** - Stripe integration

[Full Schema](./prisma/schema.prisma)

## 🔐 Authentication

### Supported Methods
1. **Email/Password** - Traditional signup/login
2. **Google OAuth** - Google account login
3. **GitHub OAuth** - GitHub account login

### Security
- JWT tokens (15-min access, 7-day refresh)
- httpOnly cookies
- Password hashing (bcryptjs)
- CSRF protection
- Rate limiting

## 💳 Subscription System

### Plans
| Plan | Price | Screens | Quality | Downloads |
|------|-------|---------|---------|-----------|
| Free Trial | $0 | 1 | 720p | ❌ |
| Basic | $4.99/mo | 1 | 1080p | ❌ |
| Standard | $9.99/mo | 2 | 1080p | 10/mo |
| Premium | $14.99/mo | 4 | 4K | Unlimited |

### Trial Logic
- 30-day free trial on signup
- No payment required initially
- Auto-downgrade after expiry
- Can upgrade anytime

## 🎨 Design System

### Colors
- **Primary**: `#7F77DD` (Purple)
- **Accent**: `#D4537E` (Pink)
- **Background**: `#0a0a0a` (Dark)
- **Card**: `#141414` (Dark Card)

### Animations
- Card hover scale
- Row infinite scroll
- Modal fade in
- Gradient transitions

## 📦 Dependencies

See [package.json](./package.json) for full dependency list.

Key packages:
- `next@14` - React framework
- `prisma@5` - ORM
- `next-auth@4` - Authentication
- `stripe@14` - Payments
- `framer-motion@10` - Animations
- `zustand@4` - State management
- `tailwindcss@3` - Styling

## 🚀 Deployment

### Vercel (Frontend)
```bash
vercel --prod
```

### Railway/Render (Database)
1. Create PostgreSQL instance
2. Set `DATABASE_URL` in environment
3. Run migrations

[Full Deployment Guide](./DEPLOYMENT.md)

## 📖 Documentation

- [Setup Guide](./SETUP_GUIDE.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [API Documentation](./docs/API.md)
- [Database Schema](./prisma/schema.prisma)
- [Contributing Guide](./CONTRIBUTING.md)

## 🤝 Contributing

Contributions welcome! Please follow these steps:

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -am 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## ⚠️ Important Notes

### Not Yet Implemented
- ⏳ Stripe webhook integration
- ⏳ Full video player with HLS
- ⏳ AWS S3 video upload
- ⏳ Multi-profile support
- ⏳ Download feature
- ⏳ Advanced search

### Next Priorities
1. Stripe payment processing
2. Video player implementation
3. S3 integration
4. Multi-profile support
5. Advanced analytics

## 🐛 Known Issues

None currently. Report issues on [GitHub Issues](https://github.com/yourusername/streamify/issues)

## 📝 License

MIT License - see [LICENSE](./LICENSE)

## 👨‍💻 Author

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your@email.com

## 🙏 Acknowledgments

- Inspired by Netflix, Prime Video, Hotstar
- Built with amazing open-source tools
- Special thanks to the Next.js community

## 📞 Support

- 📧 Email: support@streamify.local
- 💬 Discord: [Join Community](#)
- 🐛 Issues: [GitHub Issues](#)
- 📖 Docs: [Documentation](./SETUP_GUIDE.md)

---

**Made with ❤️ for streaming lovers**

🌟 Star us on GitHub if you like the project!
