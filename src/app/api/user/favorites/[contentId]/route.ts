import { getServerSession } from 'next-auth/next';
import {  authOptions  } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function DELETE(
  _request: Request,
  { params }: { params: { contentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await prisma.favorite.deleteMany({
      where: {
        userId: (session.user as any).id,
        contentId: params.contentId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Removed from favorites',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Remove from favorites error:', error);
    return NextResponse.json(
      { error: 'Failed to remove from favorites' },
      { status: 500 }
    );
  }
}
