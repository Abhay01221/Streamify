import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { razorpay, PLAN_PRICES } from '@/lib/razorpay';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const { plan } = await request.json();

    // Validate plan
    const amount = PLAN_PRICES[plan as string];
    if (!amount) {
      return NextResponse.json(
        {
          error: `Unknown plan: ${plan}. Valid values: BASIC, STANDARD, PREMIUM`,
        },
        { status: 400 }
      );
    }

    // Fetch user to include their name/email in the order notes
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create a Razorpay order
    // receipt must be ≤ 40 chars and unique — use a short timestamp suffix
    const receipt = `rcpt_${userId.slice(0, 12)}_${Date.now().toString(36)}`;

    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt,
      notes: {
        userId: user.id,
        plan,
        userEmail: user.email,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          // Send the public key to the frontend so it can open the modal
          keyId: process.env.RAZORPAY_KEY_ID,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[create-order] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
