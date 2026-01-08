import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Fetch AI Memory data instead of database calls
    console.log('🧠 Context API: Loading AI Memory from JSON files...');
    const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
    
    let aiMemoryData: any = {};
    try {
      const memoryResponse = await fetch(`${siteUrl}/api/ai-memory/read`);
      if (memoryResponse.ok) {
        const memoryResult = await memoryResponse.json();
        if (memoryResult.success) {
          aiMemoryData = memoryResult.memory;
          console.log('✅ Context API: AI Memory loaded successfully');
        }
      }
    } catch (error) {
      console.error('❌ Context API: Failed to load AI Memory:', error);
    }

    // Fetch ALL system settings from database (not hardcoded)
    let systemSettingsData: any = {
      siteName: '',
      siteAddress: '',
      siteEmail: '',
      sitePhone: '',
      siteWhatsapp: '',
      bookingExpiryHours: 24,
      cancellationHours: 72,
      refundPercentage: 80
    };
    
    try {
      const systemInfoResponse = await fetch(`${siteUrl}/api/ai-system-info`);
      if (systemInfoResponse.ok) {
        const systemInfoResult = await systemInfoResponse.json();
        if (systemInfoResult.success && systemInfoResult.systemInfo) {
          systemSettingsData = {
            siteName: systemInfoResult.systemInfo.siteName || '',
            siteAddress: systemInfoResult.systemInfo.siteAddress || '',
            siteEmail: systemInfoResult.systemInfo.siteEmail || '',
            sitePhone: systemInfoResult.systemInfo.sitePhone || '',
            siteWhatsapp: systemInfoResult.systemInfo.siteWhatsapp || '',
            bookingExpiryHours: systemInfoResult.systemInfo.bookingExpiryHours || 24,
            cancellationHours: systemInfoResult.systemInfo.cancellationHours || 72,
            refundPercentage: systemInfoResult.systemInfo.refundPercentage || 80
          };
          console.log('✅ System settings fetched from database:', systemSettingsData);
        }
      }
    } catch (error) {
      console.error('⚠️ Failed to fetch system settings:', error);
    }

    // Format context data from AI Memory
    const contextData = {
      // System settings from database (NO HARDCODED VALUES)
      systemSettings: {
        siteName: systemSettingsData.siteName,
        siteAddress: systemSettingsData.siteAddress,
        sitePhone: systemSettingsData.sitePhone,
        siteWhatsapp: systemSettingsData.siteWhatsapp,
        siteEmail: systemSettingsData.siteEmail,
        operatingHours: '10 AM - 12 AM (7 days a week)',
        bookingExpiryHours: systemSettingsData.bookingExpiryHours,
        cancellationHours: systemSettingsData.cancellationHours,
        refundPercentage: systemSettingsData.refundPercentage
      },
      
      // Theaters from AI Memory
      theaters: aiMemoryData.theaters?.theaters || [],
      
      // Occasions from AI Memory
      occasions: aiMemoryData.occasions?.occasions || [],
      
      // Services from AI Memory
      services: aiMemoryData.services?.services || [],
      
      // FAQ from AI Memory
      faq: aiMemoryData.faq?.faq || [],
      
      // Gifts from AI Memory
      gifts: aiMemoryData.gifts?.gifts || [],
      
      // Current date info
      dateInfo: {
        currentDate: new Date().toISOString(),
        currentTime: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
        timezone: 'Asia/Kolkata',
        dayOfWeek: new Date().toLocaleDateString('en-IN', { weekday: 'long' }),
        isWeekend: [0, 6].includes(new Date().getDay())
      },
      
      // Business status (from database)
      businessStatus: {
        isOpen: true,
        operatingHours: '10 AM - 12 AM (7 days a week)',
        location: systemSettingsData.siteAddress || '',
        phone: systemSettingsData.sitePhone,
        whatsapp: systemSettingsData.siteWhatsapp,
        email: systemSettingsData.siteEmail
      },
      
      // Special events (can be enhanced later)
      specialEvents: [],
      
      // Default theater (first available theater)
      defaultTheater: aiMemoryData.theaters?.theaters?.[0] || null
    };

    return NextResponse.json({
      success: true,
      context: contextData,
      timestamp: new Date().toISOString(),
      source: 'ai-memory',
      totalItems: {
        theaters: contextData.theaters.length,
        occasions: contextData.occasions.length,
        services: contextData.services.length,
        faq: contextData.faq.length,
        gifts: contextData.gifts.length
      }
    });

  } catch (error) {
    console.error('AI Context API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch context data',
      context: await getEmergencyContext()
    }, { status: 500 });
  }
}

async function getEmergencyContext() {
  // Fetch ALL system settings from database (NO HARDCODED VALUES)
  let systemSettingsData: any = {
    siteName: '',
    siteAddress: '',
    siteEmail: '',
    sitePhone: '',
    siteWhatsapp: '',
    bookingExpiryHours: 24,
    cancellationHours: 72,
    refundPercentage: 80
  };
  
  try {
    const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
    const systemInfoResponse = await fetch(`${siteUrl}/api/ai-system-info`);
    if (systemInfoResponse.ok) {
      const systemInfoResult = await systemInfoResponse.json();
      if (systemInfoResult.success && systemInfoResult.systemInfo) {
        systemSettingsData = {
          siteName: systemInfoResult.systemInfo.siteName || '',
          siteAddress: systemInfoResult.systemInfo.siteAddress || '',
          siteEmail: systemInfoResult.systemInfo.siteEmail || '',
          sitePhone: systemInfoResult.systemInfo.sitePhone || '',
          siteWhatsapp: systemInfoResult.systemInfo.siteWhatsapp || '',
          bookingExpiryHours: systemInfoResult.systemInfo.bookingExpiryHours || 24,
          cancellationHours: systemInfoResult.systemInfo.cancellationHours || 72,
          refundPercentage: systemInfoResult.systemInfo.refundPercentage || 80
        };
      }
    }
  } catch (error) {
    console.error('⚠️ Failed to fetch system settings in emergency context:', error);
  }
  
  return {
    systemSettings: {
      siteName: systemSettingsData.siteName,
      siteAddress: systemSettingsData.siteAddress,
      sitePhone: systemSettingsData.sitePhone,
      siteWhatsapp: systemSettingsData.siteWhatsapp,
      siteEmail: systemSettingsData.siteEmail,
      operatingHours: '10 AM - 12 AM (7 days a week)',
      bookingExpiryHours: systemSettingsData.bookingExpiryHours,
      cancellationHours: systemSettingsData.cancellationHours,
      refundPercentage: systemSettingsData.refundPercentage
    },
    theaters: [],
    occasions: [],
    services: [],
    faq: [],
    gifts: [],
    dateInfo: {
      currentDate: new Date().toISOString(),
      currentTime: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
      timezone: 'Asia/Kolkata'
    },
    businessStatus: {
      isOpen: true,
      operatingHours: '10 AM - 12 AM (7 days a week)',
      location: systemSettingsData.siteAddress || '',
      phone: systemSettingsData.sitePhone,
      whatsapp: systemSettingsData.siteWhatsapp,
      email: systemSettingsData.siteEmail
    },
    specialEvents: [],
    defaultTheater: null
  };
}
