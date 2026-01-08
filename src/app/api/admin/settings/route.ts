import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

export async function GET() {
  try {
    const settings = await database.getSettings();
    
    return NextResponse.json({
      success: true,
      settings: settings
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const result = await database.saveSettings(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully'
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}

