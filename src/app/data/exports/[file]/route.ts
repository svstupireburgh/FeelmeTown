import { NextRequest, NextResponse } from 'next/server';

// GET /data/exports/[file]
// DISABLED: JSON exports no longer used - data now in GoDaddy SQL
export async function GET(request: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const resolvedParams = await params;
  const fileName = resolvedParams.file || '';
  
  return NextResponse.json({
    success: false,
    error: 'JSON exports disabled - data now in GoDaddy SQL database',
    note: `Requested file: ${fileName}`,
    message: 'Please use SQL API endpoints instead'
  }, { status: 410 }); // 410 Gone - resource permanently removed
}
