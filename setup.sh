#!/bin/bash
# Streamify Setup Script

set -e

echo "🎬 Streamify Setup Script"
echo "========================="
echo ""

# Check Node.js
echo "✓ Checking Node.js..."
node --version

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Setup environment
echo ""
echo "⚙️  Setting up environment..."
if [ ! -f .env.local ]; then
  cp .env.local.example .env.local
  echo "✓ Created .env.local - please configure it"
else
  echo "✓ .env.local already exists"
fi

# Setup Prisma
echo ""
echo "🗄️  Setting up Prisma..."
npm run prisma:generate

# Create database tables
echo ""
echo "📊 Creating database tables..."
npm run db:push

# Seed database (optional)
read -p "Seed database with sample data? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  npm run db:seed
  echo "✓ Database seeded!"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure .env.local with your API keys"
echo "2. Start development server: npm run dev"
echo "3. Open http://localhost:3000"
echo ""
echo "Happy streaming! 🎥"
