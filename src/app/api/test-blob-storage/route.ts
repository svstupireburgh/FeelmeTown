import { NextRequest, NextResponse } from 'next/server';
import { ExportsStorage } from '@/lib/exports-storage';

export async function POST(request: NextRequest) {
  try {
    const { action, fileName, testData } = await request.json();

    if (action === 'read') {
      console.log(`🧪 Testing read for ${fileName}`);
      const data = await ExportsStorage.readArray(fileName);
      return NextResponse.json({
        success: true,
        action: 'read',
        fileName,
        data,
        count: data.length
      });
    }

    if (action === 'write') {
      console.log(`🧪 Testing write for ${fileName}`);
      const record = testData || {
        testId: Date.now(),
        message: 'Test record from blob storage test',
        createdAt: new Date().toISOString()
      };
      
      await ExportsStorage.appendToArray(fileName, record);
      
      return NextResponse.json({
        success: true,
        action: 'write',
        fileName,
        record,
        message: 'Test record added successfully'
      });
    }

    if (action === 'check-config') {
      const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN;
      const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
      
      return NextResponse.json({
        success: true,
        action: 'check-config',
        blobEnabled: hasToken || isVercel,
        hasToken,
        isVercel,
        environment: process.env.NODE_ENV
      });
    }

    if (action === 'cleanup') {
      console.log(`🧹 Testing cleanup for ${fileName}`);
      const cleanupFn = (ExportsStorage as any)?.cleanupDuplicateFiles;
      if (typeof cleanupFn === 'function') {
        await cleanupFn(fileName);
      }
      
      return NextResponse.json({
        success: true,
        action: 'cleanup',
        fileName,
        message: `Cleanup completed for ${fileName}`
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use: read, write, check-config, or cleanup'
    });

  } catch (error) {
    console.error('❌ Blob storage test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
