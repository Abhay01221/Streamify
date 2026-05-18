import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const content = await prisma.content.findUnique({
      where: { id: params.id },
      include: {
        episodes: {
          orderBy: [{ season: 'asc' }, { episodeNumber: 'asc' }],
        },
        videoSources: true,
        subtitles: true,
      },
    });

    if (!content) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: content,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fetch content detail error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    );
  }
}
