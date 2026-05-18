import { prisma } from './prisma';
import { hashPassword } from './auth';

export async function seedDatabase() {
  console.log('Seeding database...');

  try {
    // Create sample content
    const sampleContent = await prisma.content.create({
      data: {
        title: 'The Quantum Realm',
        slug: 'the-quantum-realm',
        description: 'An epic sci-fi adventure exploring parallel dimensions',
        type: 'MOVIE',
        genres: ['Sci-Fi', 'Adventure', 'Action'],
        language: 'en',
        releaseYear: 2024,
        durationMins: 148,
        imdbRating: 8.5,
        posterUrl: 'https://via.placeholder.com/300x450',
        backdropUrl: 'https://via.placeholder.com/1920x1080',
        trailerUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        isPremium: true,
        ageRating: 'PG_13',
      },
    });

    console.log('✅ Sample content created:', sampleContent.title);

    // Create sample admin user
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@streamify.local',
        passwordHash: await hashPassword('admin123'),
        name: 'Admin User',
        role: 'ADMIN',
        subscriptionPlan: 'PREMIUM',
        subscriptionStatus: 'ACTIVE',
        trialUsed: true,
      },
    });

    console.log('✅ Admin user created:', adminUser.email);

    // Create sample regular user
    const regularUser = await prisma.user.create({
      data: {
        email: 'user@streamify.local',
        passwordHash: await hashPassword('user123'),
        name: 'Demo User',
        role: 'USER',
        subscriptionPlan: 'FREE_TRIAL',
        subscriptionStatus: 'ACTIVE',
        trialStart: new Date(),
        trialEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        trialUsed: false,
      },
    });

    console.log('✅ Regular user created:', regularUser.email);

    // Add sample to user's favorites
    await prisma.favorite.create({
      data: {
        userId: regularUser.id,
        contentId: sampleContent.id,
      },
    });

    console.log('✅ Database seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}
