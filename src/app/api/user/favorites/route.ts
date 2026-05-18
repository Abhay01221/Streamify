import { getServerSession } from 'next-auth/next';
import {  authOptions  } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId: (session.user as any).id },
      include: { content: true },
      orderBy: { addedAt: 'desc' },
    });

    return NextResponse.json(
      {
        success: true,
        data: favorites,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fetch favorites error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch favorites' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { contentId } = await request.json();

    const favorite = await prisma.favorite.create({
      data: {
        userId: (session.user as any).id,
        contentId,
      },
      include: { content: true },
    });

    return NextResponse.json(
      {
        success: true,
        data: favorite,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Add to favorites error:', error);
    return NextResponse.json(
      { error: 'Failed to add to favorites' },
      { status: 500 }
    );
  }
}
