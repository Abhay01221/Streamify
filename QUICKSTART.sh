#!/bin/bash
# Streamify Quick Start Guide

echo "╔════════════════════════════════════════════════╗"
echo "║          🎬 Streamify Quick Start              ║"
echo "║      Full-Stack Video Streaming Platform       ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check Node.js
echo -e "${BLUE}1. Checking prerequisites...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠ PostgreSQL not found. Install: brew install postgresql${NC}"
else
    echo -e "${GREEN}✓ PostgreSQL installed${NC}"
fi

# Install dependencies
echo ""
echo -e "${BLUE}2. Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Create .env.local
echo ""
echo -e "${BLUE}3. Setting up environment...${NC}"
if [ ! -f .env.local ]; then
    cp .env.local.example .env.local
    echo -e "${YELLOW}⚠ Created .env.local - please configure with your API keys${NC}"
else
    echo -e "${GREEN}✓ .env.local exists${NC}"
fi

# Database setup
echo ""
echo -e "${BLUE}4. Setting up database...${NC}"

# Check if database exists
if psql -lqt | cut -d \| -f 1 | grep -qw streamify; then
    echo -e "${GREEN}✓ Database 'streamify' exists${NC}"
else
    echo -e "${YELLOW}Creating database 'streamify'...${NC}"
    createdb streamify
    echo -e "${GREEN}✓ Database created${NC}"
fi

npm run prisma:generate
echo -e "${GREEN}✓ Prisma client generated${NC}"

npm run db:push
echo -e "${GREEN}✓ Database tables created${NC}"

# Optional seed
echo ""
read -p "$(echo -e ${YELLOW})Seed database with sample data? (y/n):$(echo -e ${NC}) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run db:seed
    echo -e "${GREEN}✓ Database seeded${NC}"
fi

# Summary
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗"
echo "║           ✅ Setup Complete!                  ║"
echo "╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Update .env.local with your API keys:"
echo "   - Google OAuth: https://console.cloud.google.com"
echo "   - GitHub OAuth: https://github.com/settings/developers"
echo "   - Stripe: https://dashboard.stripe.com"
echo "   - AWS S3: https://aws.amazon.com"
echo ""
echo "2. Start the dev server:"
echo -e "   ${YELLOW}npm run dev${NC}"
echo ""
echo "3. Open your browser:"
echo -e "   ${YELLOW}http://localhost:3000${NC}"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "- Setup: SETUP_GUIDE.md"
echo "- Deployment: DEPLOYMENT.md"
echo "- API: docs/API.md"
echo ""
echo -e "${GREEN}Happy Streaming! 🎥${NC}"
echo ""
