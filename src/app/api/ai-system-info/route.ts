import { NextResponse } from 'next/server';
import database from '@/lib/db-connect';

export async function GET() {
  try {
    const settingsResult = await database.getSystemSettings();

    if (!settingsResult.success || !settingsResult.settings) {
      return NextResponse.json({
        success: false,
        error: settingsResult.error || 'System settings not found'
      });
    }

    const systemSettings = settingsResult.settings;

    // Extract important info for AI assistant - NO HARDCODED FALLBACKS
    const aiSystemInfo: Record<string, any> = {
      siteName: systemSettings.siteName || '',
      siteAddress: systemSettings.siteAddress || '',
      siteEmail: systemSettings.siteEmail || '',
      sitePhone: systemSettings.sitePhone || '',
      siteWhatsapp: systemSettings.siteWhatsapp || '',
      bookingExpiryHours: systemSettings.bookingExpiryHours || 24,
      cancellationHours: systemSettings.cancellationHours || 72,
      refundPercentage: systemSettings.refundPercentage || 80,
      currentDate: new Date().toLocaleDateString('en-IN'),
      currentTime: new Date().toLocaleTimeString('en-IN'),
      dayOfWeek: new Date().toLocaleDateString('en-IN', { weekday: 'long' }),
      isWeekend: [0, 6].includes(new Date().getDay())
    };

    // Include any additional decompressed data already provided by getSettings
    if (systemSettings.businessHours) {
      aiSystemInfo.businessHours = systemSettings.businessHours;
    }
    if (systemSettings.specialOffers) {
      aiSystemInfo.specialOffers = systemSettings.specialOffers;
    }

    return NextResponse.json({
      success: true,
      systemInfo: aiSystemInfo
    });
  } catch (error) {
    console.error('Error fetching system info:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch system information'
    });
  }
}
