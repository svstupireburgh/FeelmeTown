import { NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// GET /api/test-pricing - Test endpoint to check pricing data
export async function GET() {
  try {
    console.log('🔍 Testing pricing data fetch...');
    
    const result = await (database as any).getAllPricing();
    
    console.log('📊 Pricing fetch result:', result);
    
    if (result.success && result.pricing) {
      console.log('✅ Found pricing records:', result.pricing.length);
      
      // Log each pricing record
      result.pricing.forEach((p: any, index: number) => {
        console.log(`\n📋 Pricing Record ${index + 1}:`);
        console.log('  ID:', p._id);
        console.log('  Name:', p.name);
        console.log('  Slot Booking Fee:', p.slotBookingFee);
        console.log('  Decoration Fees:', p.decorationFees);
        console.log('  Extra Guest Fee:', p.extraGuestFee);
        console.log('  Convenience Fee:', p.convenienceFee);
        console.log('  Is Active:', p.isActive);
        console.log('  Created At:', p.createdAt);
      });
      
      return NextResponse.json({
        success: true,
        message: 'Pricing data fetched successfully',
        totalRecords: result.pricing.length,
        pricing: result.pricing,
        database: result.database,
        collection: result.collection
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'No pricing data found',
        database: result.database,
        collection: result.collection
      });
    }
  } catch (error) {
    console.error('❌ Test pricing error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch pricing data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
