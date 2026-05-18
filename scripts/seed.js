const { PrismaClient } = require('@prisma/client');
const { seedDatabase } = require('./src/lib/seed');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting database seed...');
    await seedDatabase();
    console.log('✅ Seed completed successfully');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
