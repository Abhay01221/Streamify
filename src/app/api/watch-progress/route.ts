import { getServerSession } from 'next-auth/next';
import {  authOptions  } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const watchHistory = await prisma.watchHistory.findMany({
      where: { userId: (session.user as any).id },
      include: { content: true },
      orderBy: { watchedAt: 'desc' },
      take: 20,
    });

    return NextResponse.json(
      {
        success: true,
        data: watchHistory,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fetch watch history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch watch history' },
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

    const body = await request.json();
    const { contentId, episodeId, progressSeconds, completed } = body;

    const existingHistory = await prisma.watchHistory.findUnique({
      where: {
        userId_contentId_episodeId: {
          userId: (session.user as any).id,
          contentId,
          episodeId: episodeId || null,
        },
      },
    });

    const watchHistory = existingHistory
      ? await prisma.watchHistory.update({
          where: { id: existingHistory.id },
          data: {
            progressSeconds,
            completed,
            watchedAt: new Date(),
          },
        })
      : await prisma.watchHistory.create({
          data: {
            userId: (session.user as any).id,
            contentId,
            episodeId,
            progressSeconds,
            completed,
          },
        });

    return NextResponse.json(
      {
        success: true,
        data: watchHistory,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update watch history error:', error);
    return NextResponse.json(
      { error: 'Failed to update watch history' },
      { status: 500 }
    );
  }
}
