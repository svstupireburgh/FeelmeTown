import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// GET /api/admin/excel-records - Get all Excel records
export async function GET() {
  try {
    // Excel records are now fetched from JSON files via excel-records-count API
    // This endpoint is kept for compatibility
    return NextResponse.json({
      success: true,
      records: []
    });
  } catch (error) {
    console.error('Error fetching Excel records:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Excel records' },
      { status: 500 }
    );
  }
}

// POST /api/admin/excel-records - Create or update Excel record
export async function POST(request: NextRequest) {
  try {
    // Excel records are now managed via JSON files
    // This endpoint is kept for compatibility
    return NextResponse.json({
      success: true,
      message: 'Excel record management moved to JSON files'
    });
  } catch (error) {
    console.error('Error saving Excel record:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save Excel record' },
      { status: 500 }
    );
  }
}

