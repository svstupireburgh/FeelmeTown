import { NextResponse } from 'next/server';
import { ExportsStorage } from '@/lib/exports-storage';
import database from '@/lib/db-connect';

// POST /api/admin/sync-pricing-from-db - Force sync pricing from database to blob
export async function POST() {
  try {
    console.log('🔄 Syncing pricing from database to blob storage...');
    
    // Force fetch from database
    const systemSettings = await database.getSystemSettings();
    
    if (!systemSettings.success || !systemSettings.settings) {
      return NextResponse.json({ 
        success: false, 
        error: 'No system settings found in database',
        message: 'Database does not contain pricing data'
      }, { status: 404 });
    }
    
    const settings = systemSettings.settings;
    console.log('💾 Database settings found:', {
      slotBookingFee: settings.slotBookingFee,
      extraGuestFee: settings.extraGuestFee,
      convenienceFee: settings.convenienceFee,
      decorationFees: settings.decorationFees
    });
    
    // Extract pricing data from database
    const pricingFromDB = {
      slotBookingFee: settings.slotBookingFee || 0,
      extraGuestFee: settings.extraGuestFee || 0,
      convenienceFee: settings.convenienceFee || 0,
      decorationFees: settings.decorationFees || 0
    };
    
    // Force save to blob storage (overwrites existing)
    await ExportsStorage.writeRaw('pricing.json', pricingFromDB);
    console.log('✅ Pricing synced from database to blob storage');
    
    // Verify the save by reading back
    const verifyBlob = await ExportsStorage.readRaw('pricing.json');
    console.log('🔍 Verification - Blob now contains:', verifyBlob);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Pricing successfully synced from database to blob storage',
      databasePricing: pricingFromDB,
      blobPricing: verifyBlob,
      syncedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Database to blob sync failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to sync pricing from database to blob storage',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/admin/sync-pricing-from-db - Check current pricing in database vs blob
export async function GET() {
  try {
    console.log('🔍 Checking pricing in database vs blob...');
    
    // Get from database
    const systemSettings = await database.getSystemSettings();
    let databasePricing = null;
    
    if (systemSettings.success && systemSettings.settings) {
      const settings = systemSettings.settings;
      databasePricing = {
        slotBookingFee: settings.slotBookingFee || 0,
        extraGuestFee: settings.extraGuestFee || 0,
        convenienceFee: settings.convenienceFee || 0,
        decorationFees: settings.decorationFees || 0
      };
    }
    
    // Get from blob
    const blobPricing = await ExportsStorage.readRaw('pricing.json');
    
    // Compare
    const isInSync = JSON.stringify(databasePricing) === JSON.stringify(blobPricing);
    
    return NextResponse.json({ 
      success: true,
      databasePricing: databasePricing,
      blobPricing: blobPricing,
      isInSync: isInSync,
      message: isInSync ? 'Database and blob are in sync' : 'Database and blob are out of sync'
    });
    
  } catch (error) {
    console.error('❌ Pricing comparison failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to compare pricing sources'
    }, { status: 500 });
  }
}
