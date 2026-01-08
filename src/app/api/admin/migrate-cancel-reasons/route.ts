import { NextResponse } from 'next/server';
import { ExportsStorage } from '@/lib/exports-storage';
import fs from 'fs';
import path from 'path';

// POST /api/admin/migrate-cancel-reasons - Migrate cancel-reasons.json to blob storage
export async function POST() {
  try {
    console.log('🔄 Starting cancel reasons migration to blob storage...');
    
    // Check if cancel reasons already exist in blob
    const existingBlob = await ExportsStorage.readArray('cancel-reasons.json');
    if (existingBlob && existingBlob.length > 0) {
      console.log('✅ Cancel reasons already exist in blob storage');
      return NextResponse.json({ 
        success: true, 
        message: 'Cancel reasons already migrated to blob storage',
        reasons: existingBlob,
        source: 'existing-blob'
      });
    }
    
    // Try to read from filesystem first
    const cancelReasonsPath = path.join(process.cwd(), 'public', 'cancel-reasons.json');
    let cancelReasons = null;
    
    if (fs.existsSync(cancelReasonsPath)) {
      try {
        const fileContent = fs.readFileSync(cancelReasonsPath, 'utf8');
        cancelReasons = JSON.parse(fileContent);
        console.log('📁 Found cancel reasons in filesystem:', cancelReasons);
      } catch (error) {
        console.error('❌ Failed to read cancel reasons from filesystem:', error);
      }
    }
    
    // If no filesystem data, use defaults
    if (!cancelReasons || !Array.isArray(cancelReasons)) {
      console.log('🔧 No filesystem cancel reasons found, using defaults...');
      
      cancelReasons = [
        "Change of plans",
        "Booked wrong date/time",
        "Found a better price",
        "Personal emergency",
        "Weather concerns",
        "Transportation issues",
        "Other"
      ];
      console.log('🔧 Using default cancel reasons:', cancelReasons);
    }
    
    // Save to blob storage
    await ExportsStorage.writeArray('cancel-reasons.json', cancelReasons);
    console.log('✅ Cancel reasons migrated to blob storage successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Cancel reasons successfully migrated to blob storage',
      reasons: cancelReasons,
      source: 'migrated',
      count: cancelReasons.length
    });
    
  } catch (error) {
    console.error('❌ Cancel reasons migration failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to migrate cancel reasons to blob storage' 
    }, { status: 500 });
  }
}
