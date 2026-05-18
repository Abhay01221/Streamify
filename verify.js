#!/usr/bin/env node

/**
 * Streamify Project Structure Validator
 * Verifies all essential files are in place
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();

const REQUIRED_FILES = [
  // Config files
  'package.json',
  'tsconfig.json',
  'next.config.js',
  'tailwind.config.js',
  'postcss.config.js',
  '.eslintrc.json',
  '.prettierrc',
  '.gitignore',
  'vercel.json',

  // Documentation
  'README.md',
  'README_DETAILED.md',
  'SETUP_GUIDE.md',
  'DEPLOYMENT.md',
  'PROJECT_SUMMARY.md',
  'ONBOARDING.md',
  'CONTRIBUTING.md',
  'LICENSE',
  '.env.local.example',

  // Setup scripts
  'setup.sh',
  'setup.bat',
  'QUICKSTART.sh',

  // Source files
  'src/app/layout.tsx',
  'src/app/page.tsx',
  'src/app/layout-client.tsx',
  'src/middleware.ts',
  
  // Prisma
  'prisma/schema.prisma',
];

const REQUIRED_DIRS = [
  'src',
  'src/app',
  'src/app/api',
  'src/components',
  'src/components/ui',
  'src/components/layout',
  'src/components/content',
  'src/lib',
  'src/types',
  'src/store',
  'src/styles',
  'prisma',
  'docs',
  'scripts',
  '.github/workflows',
];

function checkFile(file) {
  const fullPath = path.join(PROJECT_ROOT, file);
  const exists = fs.existsSync(fullPath);
  const symbol = exists ? '✅' : '❌';
  console.log(`${symbol} ${file}`);
  return exists;
}

function checkDir(dir) {
  const fullPath = path.join(PROJECT_ROOT, dir);
  const exists = fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
  const symbol = exists ? '✅' : '❌';
  console.log(`${symbol} ${dir}/`);
  return exists;
}

console.log('\n╔════════════════════════════════════════════════╗');
console.log('║     Streamify Project Structure Validator      ║');
console.log('╚════════════════════════════════════════════════╝\n');

console.log('📁 Required Directories:');
const dirsValid = REQUIRED_DIRS.map(checkDir).filter(Boolean).length;
console.log(`✓ ${dirsValid}/${REQUIRED_DIRS.length} directories present\n`);

console.log('📄 Required Files:');
const filesValid = REQUIRED_FILES.map(checkFile).filter(Boolean).length;
console.log(`✓ ${filesValid}/${REQUIRED_FILES.length} files present\n`);

const isValid = dirsValid === REQUIRED_DIRS.length && filesValid === REQUIRED_FILES.length;

if (isValid) {
  console.log('✅ Project structure is valid!\n');
  console.log('🚀 Next steps:');
  console.log('  1. npm install');
  console.log('  2. Configure .env.local');
  console.log('  3. npm run db:push');
  console.log('  4. npm run dev\n');
  process.exit(0);
} else {
  console.log('❌ Project structure has issues!\n');
  console.log('Missing files/directories detected.');
  console.log('Please check the output above.\n');
  process.exit(1);
}
