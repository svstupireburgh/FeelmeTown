import { NextResponse } from 'next/server';
import { ExportsStorage } from '@/lib/exports-storage';
import database from '@/lib/db-connect';
import fs from 'fs';
import path from 'path';

// POST /api/admin/migrate-pricing - Migrate pricing.json to blob storage
export async function POST() {
  try {
    console.log('🔄 Starting pricing migration to blob storage...');
    
    // Check if pricing already exists in blob
    const existingBlob = await ExportsStorage.readRaw('pricing.json');
    if (existingBlob) {
      console.log('✅ Pricing already exists in blob storage');
      return NextResponse.json({ 
        success: true, 
        message: 'Pricing already migrated to blob storage',
        pricing: existingBlob,
        source: 'existing-blob'
      });
    }
    
    // Try to read from filesystem first
    const pricingPath = path.join(process.cwd(), 'public', 'pricing.json');
    let pricingData = null;
    
    if (fs.existsSync(pricingPath)) {
      try {
        pricingData = JSON.parse(fs.readFileSync(pricingPath, 'utf8'));
        console.log('📁 Found pricing in filesystem:', pricingData);
      } catch (error) {
        console.error('❌ Failed to read pricing from filesystem:', error);
      }
    }
    
    // If no filesystem data, try database
    if (!pricingData) {
      console.log('🔄 No filesystem pricing found, checking database...');
      
      try {
        const systemSettings = await database.getSystemSettings();
        
        if (systemSettings.success && systemSettings.settings) {
          const settings = systemSettings.settings;
          pricingData = {
            slotBookingFee: settings.slotBookingFee || 400,
            extraGuestFee: settings.extraGuestFee || 600,
            convenienceFee: settings.convenienceFee || 0,
            decorationFees: settings.decorationFees || 750
          };
          console.log('💾 Found pricing in database:', pricingData);
        }
      } catch (dbError) {
        console.error('❌ Database fetch failed:', dbError);
      }
    }
    
    // If still no data, use defaults
    if (!pricingData) {
      pricingData = {
        slotBookingFee: 400,
        extraGuestFee: 600,
        convenienceFee: 0,
        decorationFees: 750
      };
      console.log('🔧 Using default pricing:', pricingData);
    }
    
    // Save to blob storage
    await ExportsStorage.writeRaw('pricing.json', pricingData);
    console.log('✅ Pricing migrated to blob storage successfully');
    
    // Also save to database for persistence
    try {
      await database.saveSettings({
        slotBookingFee: pricingData.slotBookingFee,
        extraGuestFee: pricingData.extraGuestFee,
        convenienceFee: pricingData.convenienceFee,
        decorationFees: pricingData.decorationFees
      });
      console.log('✅ Pricing also saved to database');
    } catch (dbError) {
      console.error('⚠️ Failed to save pricing to database:', dbError);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Pricing successfully migrated to blob storage',
      pricing: pricingData,
      source: 'migrated'
    });
    
  } catch (error) {
    console.error('❌ Pricing migration failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to migrate pricing to blob storage' 
    }, { status: 500 });
  }
}
