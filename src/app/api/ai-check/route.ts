import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        status: 'error',
        message: 'OpenRouter API key नहीं मिली! .env.local file में OPENROUTER_API_KEY add करें।',
        solution: 'Add OPENROUTER_API_KEY=your_key_here to .env.local file'
      });
    }

    // Quick test call to OpenRouter
    const testResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'FeelME Town Test'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.2-3b-instruct:free',
        messages: [
          { role: 'user', content: 'Hello, just testing. Respond in Hindi.' }
        ],
        max_tokens: 50
      })
    });

    if (testResponse.ok) {
      const data = await testResponse.json();
      return NextResponse.json({
        status: 'success',
        message: '✅ AI API working perfectly! आपका OpenRouter API key सही है।',
        testResponse: data.choices?.[0]?.message?.content || 'Response received',
        model: 'meta-llama/llama-3.2-3b-instruct:free'
      });
    } else {
      const errorData = await testResponse.text();
      return NextResponse.json({
        status: 'error',
        message: `❌ API Error: ${testResponse.status} - ${testResponse.statusText}`,
        details: errorData,
        solution: testResponse.status === 429 
          ? 'Rate limit exceeded. Wait या OpenRouter में credits add करें.'
          : 'Check your OpenRouter API key.'
      });
    }

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: '❌ Connection error occurred',
      details: error instanceof Error ? error.message : 'Unknown error',
      solution: 'Check internet connection and API key'
    });
  }
}
