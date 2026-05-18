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

    const planToWatch = await prisma.planToWatch.findMany({
      where: { userId: (session.user as any).id },
      include: { content: true },
      orderBy: { addedAt: 'desc' },
    });

    return NextResponse.json(
      {
        success: true,
        data: planToWatch,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fetch plan-to-watch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plan-to-watch' },
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

    const planToWatch = await prisma.planToWatch.create({
      data: {
        userId: (session.user as any).id,
        contentId,
      },
      include: { content: true },
    });

    return NextResponse.json(
      {
        success: true,
        data: planToWatch,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Add to plan-to-watch error:', error);
    return NextResponse.json(
      { error: 'Failed to add to plan-to-watch' },
      { status: 500 }
    );
  }
}
