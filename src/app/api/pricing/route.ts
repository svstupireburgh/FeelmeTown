import { NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// GET /api/pricing - Get current pricing settings from database only
export async function GET() {
  try {
    console.log('💰 Fetching pricing from database...');
    
    // Get pricing from database
    const result = await (database as any).getAllPricing();
    
    console.log('💰 Pricing fetch result:', result);
    
    if (!result.success || !result.pricing || result.pricing.length === 0) {
      console.error('❌ No pricing found in database');
      return NextResponse.json({ 
        success: false, 
        error: 'No pricing data found in database. Please configure pricing in admin panel.',
        source: 'database'
      }, { status: 404 });
    }

    // Use first pricing configuration
    const firstPricing = result.pricing[0];
    const pricing = {
      id: firstPricing._id || firstPricing.id || null,
      name: firstPricing.name || 'Pricing',
      slotBookingFee: firstPricing.slotBookingFee ?? 0,
      extraGuestFee: firstPricing.extraGuestFee ?? 0,
      convenienceFee: firstPricing.convenienceFee ?? 0,
      decorationFees: firstPricing.decorationFees ?? 0
    };

    console.log('✅ Pricing loaded from database:', pricing);
    return NextResponse.json({ 
      success: true, 
      pricing: pricing,
      source: 'database'
    });
  } catch (error) {
    console.error(' GET Pricing API Error:', error);
    
    // Emergency fallback
    const fallbackPricing = {
      slotBookingFee: 600,
      extraGuestFee: 400,
      convenienceFee: 0,
      decorationFees: 750
    };
    
    return NextResponse.json({ 
      success: true, 
      pricing: fallbackPricing,
      source: 'fallback'
    });
  }
}
