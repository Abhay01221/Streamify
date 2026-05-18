import { NextResponse } from 'next/server';

export async function GET() {
  try {
    return NextResponse.json(
      {
        success: true,
        data: [
          {
            id: 'basic',
            name: 'Basic',
            price: 4.99,
            screens: 1,
            quality: '1080p',
            downloads: false,
          },
          {
            id: 'standard',
            name: 'Standard',
            price: 9.99,
            screens: 2,
            quality: '1080p',
            downloads: true,
            downloadLimit: 10,
          },
          {
            id: 'premium',
            name: 'Premium',
            price: 14.99,
            screens: 4,
            quality: '4K',
            downloads: true,
            downloadLimit: -1,
          },
        ],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get plans error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}
