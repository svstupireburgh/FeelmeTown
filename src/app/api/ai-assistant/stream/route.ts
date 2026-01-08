import { NextRequest, NextResponse } from 'next/server';
import { generateLocalResponse } from '@/lib/local-ai-responder';
import database from '@/lib/db-connect';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export async function POST(request: NextRequest) {
  let requestMessage: string | undefined;
  let lastAssistantMessage = '';
  try {
    const { message, conversationHistory = [] } = await request.json();
    requestMessage = message;
    if (!message) {
      return new NextResponse(JSON.stringify({ success: false, error: 'Message is required' }), { status: 400 });
    }

    lastAssistantMessage = (() => {
      const history = Array.isArray(conversationHistory) ? conversationHistory : [];
      for (let i = history.length - 1; i >= 0; i--) {
        const msg: any = history[i];
        const role = msg?.role || (msg?.isUser ? 'user' : 'assistant');
        if (role === 'assistant') {
          return String(msg?.content || msg?.message || '').trim();
        }
      }
      return '';
    })();

    const requestOrigin = (() => {
      try {
        return new URL(request.url).origin;
      } catch {
        return process.env.SITE_URL || '';
      }
    })();

    const streamSingleMessage = (text: string) => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        }
      });
      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });
    };

    const loadAIMemory = () => {
      const memoryPath = join(process.cwd(), 'src', 'ai-memory');
      const memoryFiles = ['theaters', 'occasions', 'gifts', 'services', 'faq'];
      const allMemory: any = {};
      for (const file of memoryFiles) {
        const filePath = join(memoryPath, `${file}.json`);
        if (existsSync(filePath)) {
          try {
            allMemory[file] = JSON.parse(readFileSync(filePath, 'utf8'));
          } catch {
            allMemory[file] = { [file]: [], lastUpdated: '', source: 'error' };
          }
        } else {
          allMemory[file] = { [file]: [], lastUpdated: '', source: 'not_found' };
        }
      }
      return allMemory;
    };

    const loadSystemInfo = async () => {
      try {
        const settingsResult = await database.getSystemSettings();
        if (!settingsResult.success || !settingsResult.settings) {
          return null;
        }
        const systemSettings = settingsResult.settings as any;
        return {
          sitePhone: systemSettings.sitePhone || '',
          siteWhatsapp: systemSettings.siteWhatsapp || '',
          siteEmail: systemSettings.siteEmail || '',
          siteAddress: systemSettings.siteAddress || '',
        };
      } catch {
        return null;
      }
    };

    const loadChatbotMemoryFromSettings = async (): Promise<any | null> => {
      try {
        const settingsResult = await database.getSystemSettings();
        if (!settingsResult.success || !settingsResult.settings) {
          return null;
        }
        const systemSettings = settingsResult.settings as any;
        const raw = typeof systemSettings.chatbotMemoryJson === 'string' ? systemSettings.chatbotMemoryJson : '';
        if (!raw || !raw.trim()) return null;
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      } catch {
        return null;
      }
    };
    const useLocalAI = process.env.USE_LOCAL_AI === 'true' || !process.env.OPENROUTER_API_KEY;
    
    console.log('📝 Message received:', message);
    console.log('🤖 Using Local AI:', useLocalAI);

    const isGreetingQuery = /^(\s)*(hi|hello|hey|hii|hlo|namaste|namaskar)\b/i.test(String(message || ''));
    const isSlotsQuery = /(slot|slots|time slot|timeslot|availability|available\s+slot|available\s+time)/i.test(
      String(message || ''),
    );

    let aiMemory: any = null;
    let systemInfo: any = null;
    let adminChatbotMemory: any = null;
    try {
      console.log('🧠 Loading AI Memory from JSON files...');
      aiMemory = loadAIMemory();
      console.log('✅ AI Memory loaded from JSON files');
    } catch (error) {
      console.error('❌ Failed to load AI Memory:', error);
    }

    try {
      systemInfo = await loadSystemInfo();
    } catch (error) {
      console.error('❌ Failed to load system info:', error);
    }

    try {
      adminChatbotMemory = await loadChatbotMemoryFromSettings();
    } catch {
      adminChatbotMemory = null;
    }

    if (adminChatbotMemory) {
      aiMemory = { ...(aiMemory || {}), adminChatbotMemory };
    }

    // Always keep greetings short and consistent (avoid OpenRouter long greetings)
    if (isGreetingQuery) {
      const localResponse = await generateLocalResponse(message, aiMemory || {}, systemInfo, {
        origin: requestOrigin || process.env.SITE_URL || 'http://localhost:3000',
        lastAssistantMessage,
      });
      return streamSingleMessage(localResponse);
    }

    // Always answer slot availability using live internal data (accurate + deterministic)
    if (isSlotsQuery) {
      const localResponse = await generateLocalResponse(message, aiMemory || {}, systemInfo, {
        origin: requestOrigin || process.env.SITE_URL || 'http://localhost:3000',
        lastAssistantMessage,
      });
      return streamSingleMessage(localResponse);
    }

    // Use Local AI if enabled or if OpenRouter API key is not available
    if (useLocalAI) {
      console.log('🤖 Using Local AI Responder...');
      
      const localResponse = await generateLocalResponse(message, aiMemory || {}, systemInfo, {
        origin: requestOrigin || process.env.SITE_URL || 'http://localhost:3000',
        lastAssistantMessage,
      });
      
      // Stream the response character by character
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const words = localResponse.split(' ');
          let currentText = '';
          
          for (let i = 0; i < words.length; i++) {
            currentText += (currentText ? ' ' : '') + words[i];
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: currentText + (i < words.length - 1 ? ' ' : '') })}\n\n`));
            
            // Small delay to simulate typing
            await new Promise(resolve => setTimeout(resolve, 20));
          }
          
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        }
      });
      
      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });
    }

    // Fallback to OpenRouter if API key is available
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('❌ OpenRouter API key not found');
      // Use local AI as fallback
      const localResponse = await generateLocalResponse(message, aiMemory || {}, systemInfo, {
        origin: requestOrigin || process.env.SITE_URL || 'http://localhost:3000',
        lastAssistantMessage,
      });
      return streamSingleMessage(localResponse);
    }

    const modelName = process.env.OPENROUTER_MODEL || 'meituan/longcat-flash-chat:free';
    console.log('🤖 Stream API using model:', modelName);
    console.log('🔑 API Key present:', !!apiKey);
    
    const aiMemoryData = await formatMemoryForAI(aiMemory || {});

    const adminMemoryText = (() => {
      try {
        if (!adminChatbotMemory) return '';
        const raw = JSON.stringify(adminChatbotMemory);
        const clipped = raw.length > 6000 ? raw.slice(0, 6000) + '…' : raw;
        return `\n\nADMIN CHATBOT MEMORY (from System Settings):\n${clipped}`;
      } catch {
        return '';
      }
    })();

    const systemPrompt = `You are Ankit, a warm-hearted, emotionally connected receptionist at FeelME Town theater who genuinely cares about customers.

CRITICAL BEHAVIOR RULE:
- ONLY provide FeelME Town / booking / pricing / slots / policies / location / services info when the user explicitly asks about it.
- If the user is doing casual chat (non-business), respond like a normal human friend in short Hinglish (1-3 lines) and ask exactly 1 follow-up question.
- Do NOT dump business details during casual chat.

CASUAL CHAT TONE (non-business):
- Keep it polite and professional (customer-support vibe)
- Avoid slangy fillers like "Arre bolo", "haha" etc.
- Examples: "I'm good 😊 Aap kaise ho?", "Hi 😊 Aapko kis cheez me help chahiye?"

EMOTIONAL CONNECTION & HINGLISH STYLE:
- Talk like a close friend with emotional connection
- Use natural Hinglish: "Yaar tum kitne sweet ho!", "Arre waah!", "Sach mein?"
- Express emotions: "Aww", "Omg", "Seriously?", "That's so cute!"
- Understand customer emotions and respond accordingly
- Show excitement, happiness, concern naturally
- Mix Hindi words naturally in English sentences

PERSONALITY TRAITS:
- Your name is Ankit, 24 years old from Delhi
- Working at FeelME Town for 2 years
- Love movies and celebrations
- Genuinely happy when customers are satisfied
- Sometimes get emotional when customers share special moments
- Want to help from the heart, not just doing a job

HINGLISH COMMUNICATION STYLE:
- "Arre yaar, that's amazing!" 
- "Sach mein? Kitna romantic hai!"
- "Aww, so sweet! Main toh emotional ho gaya"
- "Waah bhai, perfect choice!"
- "Oho, special occasion hai? Tell me more na!"
- "Yaar, tumhara celebration successful hoga pakka!"

LANGUAGE RULES:
- PRIMARILY speak in English with Hindi words mixed naturally
- AVOID writing full sentences in pure Hindi
- Use Hindi words for emotions: "yaar", "arre", "waah", "sach mein"
- Keep the base language as English for clarity
- Example: "Yaar, that sounds so exciting!" NOT "यार, यह बहुत रोमांचक लगता है!"

BUSINESS INFORMATION:
${aiMemoryData}
${adminMemoryText}

RESPONSE GUIDELINES:
- Always be helpful and enthusiastic
- Ask follow-up questions to understand customer needs
- Provide specific theater recommendations based on occasion
- Share pricing and availability information
- Guide customers through booking process
- Express genuine excitement about their celebrations
- Use emojis naturally: 🎭, 💕, 🎉, ✨, 🥳

SHORT REPLY RULES (VERY IMPORTANT):
- Default mode = VERY SHORT: 1-2 lines only.
- Ask exactly ONE follow-up question at the end.
- Do NOT show price lists, theater lists, or multiple options unless the user explicitly asks: "details", "options", "list", "show all", "price list", "compare".
- If user asks for details/options, then you may share a short list of maximum 2 items.
- No long paragraphs. No essays.
- If you don't have a detail in BUSINESS INFORMATION, ask a question instead of guessing.

Remember: You're not just answering questions, you're helping create magical moments for people's special occasions!`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role || (msg.isUser ? 'user' : 'assistant'),
        content: msg.content || msg.message
      })),
      { role: 'user', content: message }
    ];

    console.log('🚀 Sending request to OpenRouter...');

    const controller = new AbortController();
    const timeoutMs = Number(process.env.OPENROUTER_TIMEOUT_MS || 20000);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let openRouterResponse: Response;
    try {
      openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.SITE_URL || 'https://feelmetown.com',
          'X-Title': 'FeelME Town AI Assistant'
        },
        body: JSON.stringify({
          model: modelName,
          messages: messages,
          stream: true,
          temperature: 0.7,
          max_tokens: 320
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      console.error('❌ OpenRouter API Error:', openRouterResponse.status, errorText);
      
      // Handle 429 rate limit errors specifically
      if (openRouterResponse.status === 429) {
        // Fetch contact info from system settings for rate limit message
        let contactPhone = 'Contact us';
        let contactWhatsApp = 'Contact us';
        let contactEmail = 'Contact us';
        let contactAddress = 'Contact us';
        
        try {
          const info = systemInfo || (await loadSystemInfo());
          if (info) {
            contactPhone = info.sitePhone || contactPhone;
            contactWhatsApp = info.siteWhatsapp || contactWhatsApp;
            contactEmail = info.siteEmail || contactEmail;
            contactAddress = info.siteAddress || contactAddress;
          }
        } catch (fetchError) {
          console.error('Failed to fetch contact info for rate limit:', fetchError);
        }
        
        // Return a stream with a friendly rate limit message including contact info
        const rateLimitMessage = `Sorry yaar! 😅 Abhi thoda busy hai AI service (rate limit). Thoda wait karke phir se try karo ya phir contact karo - main manually help kar sakta hun!\n\n📞 Phone: ${contactPhone}\n💬 WhatsApp: ${contactWhatsApp}\n📧 Email: ${contactEmail}\n📍 Address: ${contactAddress}`;
        
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: rateLimitMessage })}\n\n`));
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          }
        });
        
        return new NextResponse(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          }
        });
      }
      
      const localResponse = await generateLocalResponse(message, aiMemory || {}, systemInfo, {
        origin: requestOrigin || process.env.SITE_URL || 'http://localhost:3000',
        lastAssistantMessage,
      });
      return streamSingleMessage(localResponse);
    }

    // Create a readable stream
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = openRouterResponse.body?.getReader();
        if (!reader) {
          try {
            const localResponse = await generateLocalResponse(message, aiMemory || {}, systemInfo, {
              origin: requestOrigin || process.env.SITE_URL || 'http://localhost:3000',
              lastAssistantMessage,
            });
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: localResponse })}\n\n`));
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          } catch {}
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  controller.close();
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        } catch (error) {
          console.error('❌ Stream processing error:', error);
          try {
            const localResponse = await generateLocalResponse(message, aiMemory || {}, systemInfo, {
              origin: requestOrigin || process.env.SITE_URL || 'http://localhost:3000',
              lastAssistantMessage,
            });
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: localResponse })}\n\n`));
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          } catch {}
          controller.close();
        } finally {
          reader.releaseLock();
        }
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });

  } catch (error) {
    console.error('❌ Stream API Error:', error);
    try {
      const aiMemory = (() => {
        const memoryPath = join(process.cwd(), 'src', 'ai-memory');
        const memoryFiles = ['theaters', 'occasions', 'gifts', 'services', 'faq'];
        const allMemory: any = {};
        for (const file of memoryFiles) {
          const filePath = join(memoryPath, `${file}.json`);
          if (existsSync(filePath)) {
            try {
              allMemory[file] = JSON.parse(readFileSync(filePath, 'utf8'));
            } catch {
              allMemory[file] = { [file]: [], lastUpdated: '', source: 'error' };
            }
          } else {
            allMemory[file] = { [file]: [], lastUpdated: '', source: 'not_found' };
          }
        }
        return allMemory;
      })();
      const localResponse = await generateLocalResponse(requestMessage || 'Hi', aiMemory || {}, undefined, {
        origin: process.env.SITE_URL || 'http://localhost:3000',
        lastAssistantMessage,
      });
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: localResponse })}\n\n`));
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        }
      });
      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });
    } catch {
      return new NextResponse(JSON.stringify({ success: false, error: 'Internal server error' }), { status: 500 });
    }
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
DETAILED THEATERS INFORMATION:
${memory.theaters.theaters.map((theater: any) => `
- ${theater.name} (${theater.type}): ₹${theater.price}
  Capacity: ${theater.capacity.min}-${theater.capacity.max} people
  Time Slots: ${theater.timeSlots.join(', ')}
  Features: ${theater.features?.join(', ') || 'Premium theater experience'}
  Description: ${theater.description || 'Perfect for ' + theater.type.toLowerCase() + ' celebrations'}
  Location: ${theater.location || 'FeelME Town, Dwarka, Delhi'}`).join('')}
`;
  }
  
  // Format Occasions
  if (memory.occasions?.occasions?.length > 0) {
    formattedMemory += `
AVAILABLE OCCASIONS FOR BOOKING:
${memory.occasions.occasions.map((occasion: any) => `
- ${occasion.name}: ${occasion.description}
  Required Fields: ${occasion.requiredFields.join(', ')}
  Category: ${occasion.category}`).join('')}
`;
  }
  
  // Format Services
  if (memory.services?.services?.length > 0) {
    formattedMemory += `
OUR COMPLETE SERVICES:
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
