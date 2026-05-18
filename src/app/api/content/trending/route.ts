import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const trending = await prisma.content.findMany({
      where: { isPremium: true },
      take: 10,
      orderBy: { releaseYear: 'desc' },
    });

    return NextResponse.json(
      {
        success: true,
        data: trending,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fetch trending error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending' },
      { status: 500 }
    );
  }
}
