import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { amount, currency, receipt } = await request.json();

    // Validate env keys
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return NextResponse.json(
        { success: false, error: 'Missing Razorpay credentials. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.' },
        { status: 400 }
      );
    }

    // Validate amount and currency
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 100) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount. Must be at least 100 paise.' },
        { status: 400 }
      );
    }
    if (!currency || typeof currency !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid currency.' },
        { status: 400 }
      );
    }

    // Initialize Razorpay
    const Razorpay = (await import('razorpay')).default;
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // Create order
    const order = await razorpay.orders.create({
      amount: amt,
      currency: currency,
      receipt: receipt,
    });

    return NextResponse.json({
      success: true,
      order: order,
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create payment order' },
      { status: 500 }
    );
  }
}

