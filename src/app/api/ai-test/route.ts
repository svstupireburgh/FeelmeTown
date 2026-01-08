import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    console.log('🔍 Testing AI Configuration:');
    console.log('API Key exists:', !!apiKey);
    console.log('API Key length:', apiKey?.length || 0);
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'OPENROUTER_API_KEY not found in environment variables',
        solution: 'Please add OPENROUTER_API_KEY=your_key_here to .env.local file'
      });
    }

    // Test simple API call
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
          {
            role: 'system',
            content: 'आपको हिंदी में जवाब देना है। You must respond in Hindi.'
          },
          {
            role: 'user',
            content: 'नमस्ते, आप कैसे हैं?'
          }
        ],
        max_tokens: 100
      })
    });

    console.log('🚀 Test API Response Status:', testResponse.status);

    if (!testResponse.ok) {
      const errorData = await testResponse.text();
      console.error('❌ API Error:', errorData);
      
      return NextResponse.json({
        success: false,
        error: 'OpenRouter API call failed',
        status: testResponse.status,
        details: errorData,
        solution: testResponse.status === 429 
          ? 'Rate limit exceeded. Wait or add credits to OpenRouter account.'
          : 'Check your OpenRouter API key or try different model.'
      });
    }

    const data = await testResponse.json();
    console.log('✅ API Response received');

    return NextResponse.json({
      success: true,
      message: 'AI API is working!',
      testResponse: data.choices?.[0]?.message?.content || 'No response content',
      model: 'meta-llama/llama-3.2-3b-instruct:free',
      apiKeyStatus: 'Valid'
    });

  } catch (error) {
    console.error('❌ Test Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      solution: 'Check console logs for detailed error information'
    });
  }
}
