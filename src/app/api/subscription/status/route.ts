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

    const subscription = await prisma.subscription.findUnique({
      where: { userId: (session.user as any).id },
    });

    if (!subscription) {
      return NextResponse.json(
        {
          success: true,
          data: null,
          message: 'No active subscription',
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: subscription,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fetch subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}
