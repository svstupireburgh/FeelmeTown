import { NextRequest, NextResponse } from 'next/server';
import emailService from '@/lib/email-service';

// Define the return type to match what emailService.sendSupportToCybershoora returns
type EmailResult = { success: true; messageId: string } | { success: false; error: string };

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const subject = (body.subject || 'Support Mail from Administrator').toString();
    const message = (body.message || '').toString();

    if (!message.trim()) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    const result = await emailService.sendSupportToCybershoora({ subject, message }) as EmailResult;

    if (!result?.success) {
      const error = result?.error || 'Failed to send email';
      const status = /credentials not configured/i.test(error) ? 500 : 400;
      return NextResponse.json({ success: false, error }, { status });
    }

    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}