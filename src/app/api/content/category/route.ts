import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const where: any = {};
    if (type) {
      where.type = type;
    }

    const content = await prisma.content.findMany({
      where,
      orderBy: { releaseYear: 'desc' },
      take: 20,
    });

    return NextResponse.json(
      {
        success: true,
        data: content,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get category error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category' },
      { status: 500 }
    );
  }
}
