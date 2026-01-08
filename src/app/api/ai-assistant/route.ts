import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory } = await request.json();
    
    console.log('🤖 AI Assistant API called - but AI is disabled');

    // Simple static response - no AI model, no processing
    const staticResponses = [
      'Sorry, AI assistant is currently disabled.',
      'AI service is not available right now.',
      'Please try again later, AI is offline.',
      'AI assistant is temporarily unavailable.'
    ];
    
    const randomResponse = staticResponses[Math.floor(Math.random() * staticResponses.length)];
    
    return NextResponse.json({
      success: true,
      response: randomResponse,
      fallback: true,
      aiDisabled: true
    });

  } catch (error) {
    console.error('❌ AI Assistant API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'AI Assistant service error'
    }, { status: 500 });
  }
}
