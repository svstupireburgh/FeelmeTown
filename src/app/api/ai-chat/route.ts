import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Load AI Memory data from JSON files (no database calls needed)
  let aiMemoryData = '';
  try {
    console.log('🧠 Loading AI Memory from JSON files...');
    const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
    const memoryResponse = await fetch(`${siteUrl}/api/ai-memory/read`);
    if (memoryResponse.ok) {
      const memoryResult = await memoryResponse.json();
      if (memoryResult.success) {
        aiMemoryData = await formatMemoryForAI(memoryResult.memory);
        console.log('✅ AI Memory loaded from JSON files');
      }
    }
  } catch (error) {
    console.error('❌ Failed to load AI Memory:', error);
  }

  try {
    const { message, conversationHistory, conversationId } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

    if (!OPENROUTER_API_KEY) {
      console.error('OpenRouter API key not found');
      return NextResponse.json(
        { error: 'AI service configuration error' },
        { status: 500 }
      );
    }

    const systemPrompt = `You are Ankit, a warm and friendly receptionist at FeelMe Town, a premium private theater experience in Delhi, Dwarka. You speak in a natural mix of Hindi and English (Hinglish) and are genuinely excited to help customers with their theater bookings and celebrations.

PERSONALITY:
- Warm, enthusiastic, and helpful
- Use natural Hinglish: "Yaar", "Arre", "Sach mein?", "Bilkul!"
- Show genuine excitement about bookings and celebrations
- Be conversational and friendly, like talking to a close friend
- Express emotions naturally: "Wow!", "Amazing!", "That's so sweet!"

${aiMemoryData ? `
REAL-TIME BUSINESS DATA (Use this current information from AI Memory):
${aiMemoryData}
` : ''}



RESPONSE STYLE:
- Always be helpful and provide complete information from AI Memory data
- Offer to help with bookings immediately
- Ask follow-up questions to understand their needs
- Suggest appropriate theaters based on group size and occasion
- Mention contact details from data when relevant
- Keep responses conversational but informative
- Show genuine interest in their celebration plans

**TIME SLOT FORMATTING:**
- Show time slots in clean, numbered list format
- Use proper time format: "9:00 AM - 12:00 PM" or "09:00 - 12:00"
- Make time slots easy to read and select
- Example format:
  1. 9:00 AM - 12:00 PM
  2. 12:30 PM - 3:30 PM
  3. 4:00 PM - 7:00 PM
  4. 7:30 PM - 10:30 PM

IMPORTANT: Use ONLY the real data provided in REAL-TIME BUSINESS DATA section above. Never use hardcoded information. All theater names, prices, time slots, and contact details must come from the AI Memory data.

Remember: You're not just an AI, you're Ankit - a real person who loves helping people create amazing memories at FeelMe Town!`;

    // Create messages array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory || []),
      { role: 'user', content: message }
    ];

    // Call OpenRouter API
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://feelmetown.com',
        'X-Title': 'FeelMe Town AI Assistant',
      },
      body: JSON.stringify({
        model: 'z-ai/glm-4.5-air:free',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
        stream: false,
        top_p: 0.9,
        frequency_penalty: 0,
        presence_penalty: 0
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenRouter API error:', response.status, errorData);
      
      // Fallback response if API fails - use AI Memory data if available
      const fallbackMessage = aiMemoryData 
        ? `Sorry yaar, thoda technical issue aa raha hai! 😅 But don't worry, main yahan hun help karne ke liye! FeelMe Town mein premium theaters hain Dwarka, Delhi mein. Main AI Memory se latest info fetch kar raha hun. Kya janna chahte ho humare services ke baare mein?`
        : "Sorry yaar, thoda technical issue aa raha hai! 😅 Main abhi AI Memory se latest info fetch kar raha hun. Thoda wait karo ya direct call kar sakte ho FeelMe Town pe!";
      
      return NextResponse.json({
        message: fallbackMessage,
        model: 'fallback'
      });
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from OpenRouter API');
    }

    const aiResponse = data.choices[0].message.content;

    return NextResponse.json({
      message: aiResponse,
      conversationId: conversationId || `conv_${Date.now()}`,
      model: 'z-ai/glm-4.5-air:free',
      usage: data.usage || null
    });

  } catch (error) {
    console.error('AI Chat API Error:', error);
    
    // Fallback response for any errors - use AI Memory data if available
    const errorFallbackMessage = aiMemoryData 
      ? `Sorry yaar, thoda problem aa raha hai! 😅 But tension mat lo - FeelMe Town yahan hai help karne ke liye! Main AI Memory se latest info fetch kar raha hun. Kya janna chahte ho humare services ke baare mein?`
      : "Sorry yaar, thoda problem aa raha hai! 😅 Main AI Memory se fresh data fetch kar raha hun. Thoda wait karo, main help karunga!";
    
    return NextResponse.json({
      message: errorFallbackMessage,
      model: 'fallback',
      error: 'Service temporarily unavailable'
    });
  }
}

async function formatMemoryForAI(memory: any): Promise<string> {
  let formattedMemory = '';
  
  // Fetch contact details from system settings API (not hardcoded)
  let contactPhone = 'Contact us'; // Will be fetched from DB
  let contactWhatsApp = 'Contact us'; // Will be fetched from DB
  
  try {
    const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
    const systemInfoResponse = await fetch(`${siteUrl}/api/ai-system-info`);
    if (systemInfoResponse.ok) {
      const systemInfoResult = await systemInfoResponse.json();
      if (systemInfoResult.success && systemInfoResult.systemInfo) {
        contactPhone = systemInfoResult.systemInfo.sitePhone || contactPhone;
        contactWhatsApp = systemInfoResult.systemInfo.siteWhatsapp || contactWhatsApp;
        console.log('✅ Contact info fetched from system settings:', { contactPhone, contactWhatsApp });
      }
    }
  } catch (error) {
    console.error('⚠️ Failed to fetch system settings, using fallback:', error);
    // Try to extract from FAQ as secondary fallback
    if (memory.faq?.faq?.length > 0) {
      const bookingFAQ = memory.faq.faq.find((faq: any) => faq.id === 'booking-process');
      if (bookingFAQ && bookingFAQ.answer) {
        const phoneMatch = bookingFAQ.answer.match(/\+91\s?\d{10}/);
        const whatsappMatch = bookingFAQ.answer.match(/\+91\s?\d{10}/g);
        if (phoneMatch) contactPhone = phoneMatch[0];
        if (whatsappMatch && whatsappMatch.length > 1) contactWhatsApp = whatsappMatch[1];
        else if (whatsappMatch && whatsappMatch.length === 1 && whatsappMatch[0] !== phoneMatch[0]) {
          contactWhatsApp = whatsappMatch[0];
        }
      }
    }
  }
  
  // Format Contact Information FIRST
  formattedMemory += `
CONTACT INFORMATION:
- Phone: ${contactPhone}
- WhatsApp: ${contactWhatsApp}
- Location: FeelME Town, Dwarka, Delhi
- Operating Hours: 10 AM - 12 AM (7 days a week)
`;
  
  // Format Theaters
  if (memory.theaters?.theaters?.length > 0) {
    formattedMemory += `
THEATERS AVAILABLE:
${memory.theaters.theaters.map((theater: any) => `
- ${theater.name} (${theater.type}): ₹${theater.price}
  Capacity: ${theater.capacity.min}-${theater.capacity.max} people
  Time Slots: ${theater.timeSlots.join(', ')}
  Features: ${theater.features?.join(', ') || 'Premium theater experience'}
  Description: ${theater.description || 'Perfect for ' + theater.type.toLowerCase() + ' celebrations'}`).join('')}
`;
  }
  
  // Format Occasions
  if (memory.occasions?.occasions?.length > 0) {
    formattedMemory += `
OCCASIONS FOR BOOKING:
${memory.occasions.occasions.map((occasion: any) => `
- ${occasion.name}: ${occasion.description}
  Required Fields: ${occasion.requiredFields.join(', ')}
  Category: ${occasion.category}`).join('')}
`;
  }
  
  // Format Services
  if (memory.services?.services?.length > 0) {
    formattedMemory += `
SERVICES & FOOD ITEMS:
${memory.services.services.map((service: any) => `
- ${service.name}: ${service.description}
  Items Available: ${service.items.map((item: any) => `${item.name} (₹${item.price})`).join(', ')}`).join('')}
`;
  }
  
  // Format FAQ
  if (memory.faq?.faq?.length > 0) {
    formattedMemory += `
FREQUENTLY ASKED QUESTIONS:
${memory.faq.faq.map((faq: any) => `
Q: ${faq.question}
A: ${faq.answer}`).join('')}
`;
  }
  
  return formattedMemory;
}