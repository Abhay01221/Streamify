@echo off
REM Streamify Setup Script for Windows

echo 🎬 Streamify Setup Script
echo =======================
echo.

REM Check Node.js
echo ✓ Checking Node.js...
node --version

REM Install dependencies
echo.
echo 📦 Installing dependencies...
call npm install

REM Setup environment
echo.
echo ⚙️  Setting up environment...
if not exist .env.local (
  copy .env.local.example .env.local
  echo ✓ Created .env.local - please configure it
) else (
  echo ✓ .env.local already exists
)

REM Setup Prisma
echo.
echo 🗄️  Setting up Prisma...
call npm run prisma:generate

REM Create database tables
echo.
echo 📊 Creating database tables...
call npm run db:push

REM Seed database
echo.
set /p seed="Seed database with sample data? (y/n): "
if /i "%seed%"=="y" (
  call npm run db:seed
  echo ✓ Database seeded!
)

echo.
echo ✅ Setup complete!
echo.
echo Next steps:
echo 1. Configure .env.local with your API keys
echo 2. Start development server: npm run dev
echo 3. Open http://localhost:3000
echo.
echo Happy streaming! 🎥
