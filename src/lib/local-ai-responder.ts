// Local AI Responder - Uses AI Memory to respond like Ankit without external AI models

interface AIMemory {
  theaters?: { theaters: any[] };
  occasions?: { occasions: any[] };
  services?: { services: any[] };
  faq?: { faq: any[] };
  gifts?: { gifts: any[] };
  adminChatbotMemory?: any;
}

interface SystemInfo {
  sitePhone?: string;
  siteWhatsapp?: string;
  siteEmail?: string;
  siteAddress?: string;
}

interface LocalAIOptions {
  origin?: string;
  lastAssistantMessage?: string;
}

// Hinglish response templates
const hinglishGreetings = [
  "Arre yaar",
  "Waah bhai",
  "Oho",
  "Sach mein",
  "Yaar",
  "Arre waah"
];

const hinglishExpressions = [
  "kitna amazing hai",
  "so sweet",
  "that's so exciting",
  "perfect choice",
  "main toh emotional ho gaya",
  "tumhara celebration successful hoga pakka"
];

// Generate Hinglish response
function generateHinglishResponse(baseMessage: string): string {
  const randomGreeting = hinglishGreetings[Math.floor(Math.random() * hinglishGreetings.length)];
  const randomExpression = hinglishExpressions[Math.floor(Math.random() * hinglishExpressions.length)];
  
  // Sometimes add Hinglish flavor
  if (Math.random() > 0.5) {
    return `${randomGreeting}, ${baseMessage.toLowerCase()}! ${randomExpression}! 😊`;
  }
  return baseMessage;
}

function shortenText(text: string, maxChars: number): string {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  if (cleaned.length <= maxChars) return cleaned;

  const slice = cleaned.slice(0, maxChars);
  const lastStop = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('? '), slice.lastIndexOf('! '));
  const cut = lastStop > 60 ? slice.slice(0, lastStop + 1) : slice;
  return cut.trimEnd() + '…';
}

function normalizeForCompare(text: string): string {
  return String(text || '')
    .toLowerCase()
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '') // remove emoji surrogate pairs
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function pickNonRepeating(variants: string[], lastAssistantMessage?: string): string {
  if (!variants.length) return '';
  const lastNorm = normalizeForCompare(lastAssistantMessage || '');
  if (!lastNorm) return variants[Math.floor(Math.random() * variants.length)];

  const nonRepeating = variants.filter((v) => normalizeForCompare(v) !== lastNorm);
  const pool = nonRepeating.length ? nonRepeating : variants;
  return pool[Math.floor(Math.random() * pool.length)];
}

function isBusinessQuery(message: string): boolean {
  const m = String(message || '').toLowerCase();
  if (!m.trim()) return false;

  return /(feel\s*me|feelme|fmt|feelme\s*town|town\b|private\s*theatre|private\s*theater|theatre|theater|slot|slots|timeslot|availability|available|book|booking|reserve|reservation|price|pricing|cost|charges|fee|offer|discount|deal|package|decor|decoration|cake|food|menu|add\s*on|addon|gift|surprise|location|address|contact|phone|whatsapp|email|timing|time\s*slots|refund|cancel|cancellation|policy|rules|capacity|guests|people|persons|payment|upi|advance|deposit)/i.test(
    message,
  );
}

function flattenJsonToSnippets(value: any, path: string[] = [], out: Array<{ path: string; text: string }> = []): Array<{ path: string; text: string }> {
  if (value === null || value === undefined) return out;

  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') {
    const p = path.join('.');
    out.push({ path: p, text: `${p ? p + ': ' : ''}${String(value)}`.trim() });
    return out;
  }

  if (Array.isArray(value)) {
    value.forEach((v, idx) => {
      flattenJsonToSnippets(v, [...path, String(idx)], out);
    });
    return out;
  }

  if (t === 'object') {
    Object.entries(value).forEach(([k, v]) => {
      flattenJsonToSnippets(v, [...path, k], out);
    });
  }

  return out;
}

function pickRelevantSnippets(message: string, memoryObj: any, maxItems: number): string[] {
  const snippets = flattenJsonToSnippets(memoryObj);
  if (!snippets.length) return [];

  const query = String(message || '').toLowerCase();
  const words = query
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3)
    .slice(0, 12);

  const scored = snippets
    .map((s) => {
      const hay = (s.text + ' ' + s.path).toLowerCase();
      const score = words.reduce((sum, w) => sum + (hay.includes(w) ? 1 : 0), 0);
      return { ...s, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, maxItems).map((s) => s.text);
}

// Find relevant FAQ
function findRelevantFAQ(message: string, faqList: any[]): any | null {
  if (!faqList || faqList.length === 0) return null;
  
  const lowerMessage = message.toLowerCase();
  
  // Check for keywords
  const keywords: { [key: string]: string[] } = {
    'booking': ['book', 'booking', 'reserve', 'reservation', 'how to book'],
    'cancellation': ['cancel', 'cancellation', 'refund', 'cancel booking'],
    'capacity': ['capacity', 'people', 'persons', 'how many', 'accommodate'],
    'timing': ['time', 'timing', 'slot', 'when', 'hours', 'available'],
    'payment': ['payment', 'pay', 'price', 'cost', 'fee', 'charges'],
    'food': ['food', 'eat', 'bring food', 'outside food'],
    'decorations': ['decoration', 'decor', 'decoration package'],
    'location': ['location', 'where', 'address', 'place']
  };
  
  for (const [category, words] of Object.entries(keywords)) {
    if (words.some(word => lowerMessage.includes(word))) {
      const relevantFAQ = faqList.find((faq: any) => 
        faq.category === category || 
        faq.question.toLowerCase().includes(category) ||
        faq.answer.toLowerCase().includes(category)
      );
      if (relevantFAQ) return relevantFAQ;
    }
  }
  
  // Try to find by question similarity
  for (const faq of faqList) {
    const questionWords = faq.question.toLowerCase().split(' ');
    if (
      questionWords.some(
        (word: string) => lowerMessage.includes(word) && word.length > 3,
      )
    ) {
      return faq;
    }
  }
  
  return null;
}

// Find theaters by query
function findTheaters(message: string, theaters: any[]): any[] {
  if (!theaters || theaters.length === 0) return [];
  
  const lowerMessage = message.toLowerCase();
  const matched: any[] = [];
  
  // Check for theater names
  for (const theater of theaters) {
    const theaterName = theater.name?.toLowerCase() || '';
    const theaterType = theater.type?.toLowerCase() || '';
    
    if (
      lowerMessage.includes(theaterName.split(' ')[0]) ||
      lowerMessage.includes(theaterType) ||
      theaterName
        .split(' ')
        .some((word: string) => lowerMessage.includes(word))
    ) {
      matched.push(theater);
    }
  }
  
  // Check for capacity requirements
  const capacityMatch = lowerMessage.match(/(\d+)\s*(people|persons|guests|members)/i);
  if (capacityMatch) {
    const requiredCapacity = parseInt(capacityMatch[1]);
    const suitable = theaters.filter((theater: any) => 
      theater.capacity?.min <= requiredCapacity && 
      theater.capacity?.max >= requiredCapacity
    );
    if (suitable.length > 0) {
      return suitable;
    }
  }
  
  // Check for occasion type
  const occasionTypes = ['couple', 'couples', 'romantic', 'date', 'friends', 'family', 'birthday', 'anniversary', 'proposal'];
  for (const type of occasionTypes) {
    if (lowerMessage.includes(type)) {
      const suitable = theaters.filter((theater: any) => 
        theater.type?.toLowerCase().includes(type) ||
        theater.description?.toLowerCase().includes(type)
      );
      if (suitable.length > 0) {
        return suitable;
      }
    }
  }
  
  return matched.length > 0 ? matched : theaters.slice(0, 3); // Return top 3 if no match
}

// Find occasions by query
function findOccasions(message: string, occasions: any[]): any[] {
  if (!occasions || occasions.length === 0) return [];
  
  const lowerMessage = message.toLowerCase();
  const matched: any[] = [];
  
  for (const occasion of occasions) {
    const occasionName = occasion.name?.toLowerCase() || '';
    const occasionDesc = occasion.description?.toLowerCase() || '';
    
    if (
      lowerMessage.includes(occasionName) ||
      occasionName.split(' ').some((word: string) => lowerMessage.includes(word)) ||
      lowerMessage.includes(occasionDesc.split(' ')[0])
    ) {
      matched.push(occasion);
    }
  }
  
  return matched.length > 0 ? matched : occasions.slice(0, 2);
}

// Generate response based on message and memory
export async function generateLocalResponse(
  message: string, 
  memory: AIMemory,
  systemInfo?: SystemInfo,
  options?: LocalAIOptions
): Promise<string> {
  const lowerMessage = message.toLowerCase().trim();
  const lastAssistantMessage = options?.lastAssistantMessage;

  const wantsDetails = Boolean(
    lowerMessage.match(
      /(detail|details|option|options|list|full|explain|elaborate|compare|all|price list|theater list|theatre list|show me|batao|btao|pura)/,
    ),
  );

  const normalizeDateToYMD = (input?: string | null): string | null => {
    if (!input) return null;
    const raw = String(input).trim();
    if (!raw) return null;
    try {
      let candidate = raw;
      candidate = candidate.replace(/^[A-Za-z]+\s*,\s*/,'').trim();
      const d = new Date(candidate);
      if (Number.isNaN(d.getTime())) return null;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2,'0');
      const day = String(d.getDate()).padStart(2,'0');
      return `${y}-${m}-${day}`;
    } catch {
      return null;
    }
  };

  const parseSlotsDateFromMessage = (): string | null => {
    if (lowerMessage.includes('today') || lowerMessage.includes('aaj')) {
      return normalizeDateToYMD(new Date().toISOString());
    }
    if (lowerMessage.includes('tomorrow') || lowerMessage.includes('kal')) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return normalizeDateToYMD(d.toISOString());
    }

    const ymd = message.match(/\b\d{4}-\d{1,2}-\d{1,2}\b/);
    if (ymd?.[0]) return normalizeDateToYMD(ymd[0]);

    const dmy = message.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/);
    if (dmy?.[0]) return normalizeDateToYMD(dmy[0]);

    const monthName = message.match(
      /\b\d{1,2}\s*(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s*(\d{4})?\b/i,
    );
    if (monthName?.[0]) return normalizeDateToYMD(monthName[0]);

    return null;
  };

  const wantsBookingHelp = /(how\s*to\s*book|booking\s*process|process|steps|confirm|confirmation|book\s*kaise|kaise\s*book)/i.test(
    message,
  );
  const wantsCancelHelp = /(cancel|cancellation|refund|reschedule|change\s*date|modify)/i.test(message);
  const wantsPaymentHelp = /(payment|advance|deposit|upi|cash|venue\s*payment|paid|receipt)/i.test(message);

  const businessQuery =
    isBusinessQuery(message) ||
    wantsBookingHelp ||
    wantsCancelHelp ||
    wantsPaymentHelp;
  
  // Greetings
  if (lowerMessage.match(/^(hi|hello|hey|namaste|namaskar|hii|hlo)/)) {
 const variants = !wantsDetails
      ? [
          `Welcome! I'm Ankit. I'm here to help you.`,
          `Hi! I'm Ankit. How can I help you?`,
          `Hello! I'm Ankit. Tell me what you need.`,
        ]
      : [
          `Welcome! I'm Ankit. I'm here to help you.`,
          `Hi! I'm Ankit. What would you like details on?`,
        ];
    return pickNonRepeating(variants, lastAssistantMessage);
  }

  if (!businessQuery) {
    const isIdentityQuery = /(who\s*are\s*you|who\s*r\s*you|your\s*name|tum\s*kaun|aap\s*kaun|name\s*kya)/i.test(message);
    if (isIdentityQuery) {
      return pickNonRepeating(
        [
          `Main Ankit hun 😊\nAap kaise ho?`,
          `Main Ankit hun 😊\nAapko kis cheez me help chahiye?`,
        ],
        lastAssistantMessage,
      );
    }

    const smallTalkVariants = [
      `Hi 😊 Main theek hun.\nAapko kis cheez me help chahiye?`,
      `Hello 😊 Main yahin hun.\nAap kya puchna chahte ho?`,
      `I’m good �\nAap booking, pricing ya slots me se kispe help chahte ho?`,
      `Bilkul 😊\nAap apna question thoda detail me bata doge?`,
    ];
    return pickNonRepeating(smallTalkVariants, lastAssistantMessage);
  }
  
  // Contact info requests
  if (
    lowerMessage.match(/(contact|phone|number|call|whatsapp|email|address|location)/) ||
    /where\s+.*(located|location|address|feel\s*me|feelme|town|theater|theatre)/i.test(message)
  ) {
    // Fetch contact info - use provided systemInfo or fetch from API
    let phone = systemInfo?.sitePhone || '';
    let whatsapp = systemInfo?.siteWhatsapp || '';
    let email = systemInfo?.siteEmail || '';
    let address = systemInfo?.siteAddress || '';
    
    console.log('📞 Contact request - systemInfo provided:', {
      hasSystemInfo: !!systemInfo,
      systemInfoKeys: systemInfo ? Object.keys(systemInfo) : [],
      phone: phone,
      whatsapp: whatsapp,
      email: email,
      address: address,
      fullSystemInfo: systemInfo
    });
    
    // If systemInfo is empty or missing values, try to fetch from API (for server-side calls)
    // Check for both empty string and falsy values
    if ((!phone || phone.trim() === '' || !whatsapp || whatsapp.trim() === '') && typeof fetch !== 'undefined') {
      try {
        const siteUrl = process.env.BASE_URL || process.env.SITE_URL || 'http://localhost:3000';
        console.log('🔄 Fetching contact info from API...');
        const response = await fetch(`${siteUrl}/api/ai-system-info`);
        if (response.ok) {
          const data = await response.json();
          console.log('📥 System info API response:', data);
          if (data.success && data.systemInfo) {
            phone = data.systemInfo.sitePhone || phone || '';
            whatsapp = data.systemInfo.siteWhatsapp || whatsapp || '';
            email = data.systemInfo.siteEmail || email || '';
            address = data.systemInfo.siteAddress || address || '';
            console.log('✅ Contact info fetched:', { phone, whatsapp, email, address });
          }
        } else {
          console.error('❌ System info API response not ok:', response.status);
        }
      } catch (error) {
        console.error('❌ Failed to fetch contact info:', error);
      }
    }
    
    // Trim and check for empty strings
    phone = (phone || '').trim();
    whatsapp = (whatsapp || '').trim();
    email = (email || '').trim();
    address = (address || '').trim();
    
    // If still empty, show message to contact
    if (!phone && !whatsapp) {
      console.warn('⚠️ No contact info available after all attempts');
      console.warn('⚠️ Final values:', { phone, whatsapp, email, address });
      return `Arre yaar, contact info abhi available nahi hai! 😅 Please check our website ya phir admin se contact karo for contact details.`;
    }
    
    // Ensure we have values - if empty string, show N/A
    const displayPhone = phone || 'N/A';
    const displayWhatsapp = whatsapp || 'N/A';
    const displayEmail = email || 'N/A';
    const displayAddress = address || 'N/A';
    
    console.log('📞 Returning contact info:', { 
      phone: displayPhone, 
      whatsapp: displayWhatsapp, 
      email: displayEmail, 
      address: displayAddress 
    });
    
    const variants = [
      `Bilkul! 😊\n📞 ${displayPhone} | 💬 ${displayWhatsapp}\n📍 ${displayAddress}\nAap booking karna chahte ho ya pricing/time slots puchne hain?`,
      `Sure 😊\n📞 ${displayPhone} | 💬 ${displayWhatsapp}\n📍 ${displayAddress}\nDate + theater name bata doge?`,
      `Done 😊\n📞 ${displayPhone} | 💬 ${displayWhatsapp}\n📍 ${displayAddress}\nAapko aaj ke slots check karu?`,
    ];
    return pickNonRepeating(variants, lastAssistantMessage);
  }

  // Slot availability (today/date-wise)
  if (lowerMessage.match(/(slot|slots|time slot|timeslot|availability|available\s+slot|available\s+time)/)) {
    const dateYMD = parseSlotsDateFromMessage();
    if (!dateYMD) {
      return pickNonRepeating(
        [
          `Haan ji 😊 Slots check ho jayenge.\nKaunsi date chahiye? (e.g. 2026-01-05)`,
          `Slots dekh leta hun 😊\nKaunsi date aur kaunsa theater?`,
          `Okay 😊 Date bata do (YYYY-MM-DD).\nTheater kaunsa chahiye?`,
        ],
        lastAssistantMessage,
      );
    }

    const origin = options?.origin;
    if (!origin) {
      return pickNonRepeating(
        [
          `Slots dekhne ke liye date mil gayi (${dateYMD}).\nKaunsa theater chahiye?`,
          `Date noted: ${dateYMD}.\nTheater name bata do 😊`,
        ],
        lastAssistantMessage,
      );
    }

    const allTheaters = memory.theaters?.theaters || [];
    const matched = findTheaters(message, allTheaters);
    const theatersToCheck = matched.length > 0 ? matched.slice(0, 1) : allTheaters.slice(0, 6);

    if (theatersToCheck.length === 0) {
      return pickNonRepeating(
        [
          `Date noted (${dateYMD}).\nKaunsa theater name chahiye?`,
          `Okay (${dateYMD}).\nTheater kaunsa check karun?`,
        ],
        lastAssistantMessage,
      );
    }

    const fetchForTheater = async (theaterName: string) => {
      try {
        const params = new URLSearchParams({ date: dateYMD, theater: theaterName });
        const res = await fetch(`${origin}/api/time-slots-with-bookings?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) return null;
        const data = await res.json();
        if (!data?.success) return null;
        const timeSlots = Array.isArray(data.timeSlots) ? data.timeSlots : [];
        const available = timeSlots
          .filter((s: any) => s?.bookingStatus === 'available')
          .map((s: any) => s?.timeRange)
          .filter(Boolean);
        return { theaterName, available };
      } catch {
        return null;
      }
    };

    const results = (await Promise.all(theatersToCheck.map((t: any) => fetchForTheater(t.name)))).filter(Boolean) as Array<{
      theaterName: string;
      available: string[];
    }>;

    if (results.length === 0) {
      return pickNonRepeating(
        [
          `Yaar abhi slots load nahi ho paye 😅\nKaunsa theater chahiye?`,
          `Abhi slots fetch nahi ho rahe 😅\nTheater ka naam bata do, main dobara try karun?`,
        ],
        lastAssistantMessage,
      );
    }

    // If user didn't specify theater, keep it very short by default
    if (matched.length === 0 && !wantsDetails) {
      const totalAvail = results.reduce((sum, r) => sum + (r.available?.length || 0), 0);
      return pickNonRepeating(
        [
          `Aaj (${dateYMD}) slots available hain (total ~${totalAvail}).\nKaunsa theater check karun?`,
          `${dateYMD} ko slots mil rahe hain (~${totalAvail}).\nKaunsa theater chahiye?`,
        ],
        lastAssistantMessage,
      );
    }

    // Theater specified OR details requested
    const first = results[0];
    const slots = (first.available || []).slice(0, wantsDetails ? 4 : 2);
    if (slots.length === 0) {
      return pickNonRepeating(
        [
          `${first.theaterName} me ${dateYMD} ko abhi slots booked/going hain.\nAap alternate time/date chahoge?`,
          `${first.theaterName} (${dateYMD}) me availability tight hai.\nAap next slot/date batao?`,
        ],
        lastAssistantMessage,
      );
    }
    return pickNonRepeating(
      [
        `${first.theaterName} (${dateYMD}) available: ${slots.join(', ')}\nBooking kar du?`,
        `${first.theaterName} (${dateYMD}) slots: ${slots.join(', ')}\nKaunsa slot confirm karna hai?`,
      ],
      lastAssistantMessage,
    );
  }
  
  // FAQ matching
  if (memory.faq?.faq) {
    const relevantFAQ = findRelevantFAQ(message, memory.faq.faq);
    if (relevantFAQ) {
      const answer = String(relevantFAQ.answer || '').trim();
      if (!answer) {
        return `Haan ji 😊 Aapko exactly kya puchna hai?\nDate + theater bata doge?`;
      }

      if (wantsDetails) {
        return generateHinglishResponse(answer);
      }

      const followUpVariants = wantsCancelHelp
        ? ['BookingId aur date share kar doge?', 'Kis date ka booking hai? BookingId bata do.']
        : wantsPaymentHelp
          ? ['Payment UPI/cash me karna hai?', 'Advance payment kaunse mode me karoge?']
          : wantsBookingHelp
            ? ['Date + time slot bata doge?', 'Kaunsi date aur kaunsa slot chahiye?']
            : ['Aapki booking date aur theater kaunsa hai?', 'Date aur theater name bata do?'];

      const short = shortenText(answer, 160);
      const followUp = pickNonRepeating(followUpVariants, lastAssistantMessage);
      return `${short}\n${followUp}`;
    }
  }
  
  // Theater queries
  if (lowerMessage.match(/(theater|hall|cinema|movie|screen|booking|book)/)) {
    const theaters = memory.theaters?.theaters || [];
    if (theaters.length > 0) {
      const matchedTheaters = findTheaters(message, theaters);
      
      if (matchedTheaters.length > 0) {
        if (!wantsDetails) {
          return `Haan ji 😊 Private theaters available hain.\nKitne log (couple/friends) aur date/time kya chahiye?`;
        }

        const top = matchedTheaters.slice(0, 2);
        let response = `Perfect! 😊 Top options:`;
        top.forEach((theater: any, index: number) => {
          response += `\n${index + 1}) ${theater.name} (₹${theater.price})`;
        });
        response += `\nKitne log hain aur kaunsi date/time chahiye?`;
        return response;
      }

      if (!wantsDetails) {
        return `Haan ji 😊 Private theater booking ho jayegi.\nKitne log hain aur budget approx kya hai?`;
      }
    }
  }
  
  // Occasion queries
  if (lowerMessage.match(/(occasion|celebration|birthday|anniversary|proposal|date|romantic)/)) {
    const occasions = memory.occasions?.occasions || [];
    if (occasions.length > 0) {
      const matchedOccasions = findOccasions(message, occasions);
      
      if (matchedOccasions.length > 0) {
        if (!wantsDetails) {
          return `Aww nice! 🎉\nOccasion kaunsa hai aur kitne log aa rahe hain?`;
        }

        const top = matchedOccasions.slice(0, 2);
        let response = `Aww nice! 🎉 Options:`;
        top.forEach((occasion: any, index: number) => {
          response += `\n${index + 1}) ${occasion.name}`;
        });
        response += `\nOccasion kaunsa hai aur kitne log?`;
        return response;
      }

      if (!wantsDetails) {
        return `Done 😊 Occasion kaunsa hai (birthday/anniversary/proposal) aur kitne log?`;
      }
    }
  }
  
  // Pricing queries
  if (lowerMessage.match(/(price|cost|fee|charges|how much|pricing|rate)/)) {
    const theaters = memory.theaters?.theaters || [];
    if (theaters.length > 0) {
      const prices = theaters
        .map((t: any) => Number(t?.price))
        .filter((p: any) => Number.isFinite(p));
      const minPrice = prices.length ? Math.min(...prices) : null;

      if (!wantsDetails) {
        return `Pricing starts from ₹${minPrice ?? '...'} (theater pe depend).\nKitne log aur kaunsa time slot chahiye?`;
      }

      const top = theaters.slice(0, 3);
      let response = `Pricing quick view (base):`;
      top.forEach((theater: any) => {
        response += `\n- ${theater.name}: ₹${theater.price}`;
      });
      response += `\nKaunsa theater aur kitne log?`;
      return response;
    }
  }
  
  // Services queries
  if (lowerMessage.match(/(service|food|decoration|gift|cake|add.on|extra)/)) {
    const services = memory.services?.services || [];
    const gifts = memory.gifts?.gifts || [];
    
    if (services.length > 0 || gifts.length > 0) {
      if (!wantsDetails) {
        return `Haan ji 😊 Add-ons available hain (decoration/cake/food/gifts).\nAapko exactly kya chahiye?`;
      }

      let response = `Haan ji 😊 Options:`;
      if (services.length > 0) {
        const topServices = services.slice(0, 2);
        response += `\nServices: ${topServices.map((s: any) => s.name).join(', ')}`;
      }
      if (gifts.length > 0) {
        const topGifts = gifts.slice(0, 2);
        response += `\nAdd-ons: ${topGifts.map((g: any) => `${g.name} (₹${g.price})`).join(', ')}`;
      }
      response += `\nAapko decoration chahiye ya cake/food?`;
      return response;
    }
  }

  if (businessQuery && memory.adminChatbotMemory) {
    const lines = pickRelevantSnippets(message, memory.adminChatbotMemory, wantsDetails ? 4 : 2);
    if (lines.length) {
      const short = lines.map((l) => shortenText(l, wantsDetails ? 220 : 140)).join('\n');
      const variants = [
        `${short}\nAap kis cheez pe focus karna chahte ho?`,
        `${short}\nAapko booking/pricing/slots me se kispe help chahiye?`,
      ];
      return pickNonRepeating(variants, lastAssistantMessage);
    }
  }
  
  // Default friendly response
  const defaultResponses = [
    "Haan ji 😊 Aap kya puchna chahte ho — price, time slot ya booking?",
    "Achha 😊 Kitne log hain aur date/time kya chahiye?",
    "Done! 😊 Aap birthday/anniversary/proposal me se kya plan kar rahe ho?",
    "Okay 😊 Aapko theater, pricing ya slots me se kiski info chahiye?"
  ];
  
  return pickNonRepeating(defaultResponses, lastAssistantMessage);
}

// Stream response character by character (simulates typing)
export function* streamResponse(response: string): Generator<string, void, unknown> {
  const words = response.split(' ');
  let currentText = '';
  
  for (const word of words) {
    currentText += (currentText ? ' ' : '') + word;
    yield currentText;
    
    // Small delay simulation (can be adjusted)
    if (word.endsWith('.') || word.endsWith('!') || word.endsWith('?')) {
      // Longer pause after sentences
    }
  }
}

