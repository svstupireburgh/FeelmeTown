import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

interface CloudinaryResource {
  public_id?: string;
  filename?: string;
  secure_url?: string;
  url?: string;
  created_at?: string;
}

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
  'Surrogate-Control': 'no-store',
};

async function searchCloudinaryForBooking(params: {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folderPath: string;
  bookingId: string;
}): Promise<CloudinaryResource[]> {
  const { cloudName, apiKey, apiSecret, folderPath, bookingId } = params;
  const authHeader = 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  const sanitizedId = bookingId.replace(/[^a-zA-Z0-9_-]/g, '');
  const searchPrefix = `Invoice-${sanitizedId}`;
  const expressionParts = [
    `folder="${folderPath}"`,
    'format="pdf"',
    `public_id:${searchPrefix}*`,
  ];
  const fallbackExpressionParts = [
    `folder="${folderPath}"`,
    'format="pdf"',
    `filename:${searchPrefix}*`,
  ];

  const fetchSearchResults = async (expression: string) => {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/resources/search`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expression,
        max_results: 30,
        sort_by: [{ created_at: 'desc' }],
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Cloudinary search failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as { resources?: CloudinaryResource[] };
    return Array.isArray(data.resources) ? data.resources : [];
  };

  let resources = await fetchSearchResults(expressionParts.join(' AND '));

  if (!resources.length) {
    resources = await fetchSearchResults(fallbackExpressionParts.join(' AND '));
  }

  return resources;
}

export async function GET(request: NextRequest) {
  try {
    const bookingId = request.nextUrl.searchParams.get('bookingId');

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: 'bookingId is required' },
        { status: 400, headers: NO_CACHE_HEADERS },
      );
    }

    const settings = await database.getSettings();
    const cloudName = settings?.cloudinaryCloudName || '';
    const apiKey = settings?.cloudinaryApiKey || '';
    const apiSecret = settings?.cloudinaryApiSecret || '';
    const baseFolder = settings?.cloudinaryFolder || 'feelmetown';
    const folderPath = `${baseFolder.replace(/\/$/, '')}/invoices`;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, error: 'Cloudinary is not configured' },
        { status: 500, headers: NO_CACHE_HEADERS },
      );
    }

    const resources = await searchCloudinaryForBooking({
      cloudName,
      apiKey,
      apiSecret,
      folderPath,
      bookingId,
    });

    const invoice = resources.find((resource) => resource.secure_url || resource.url);

    return NextResponse.json(
      {
        success: true,
        invoiceUrl: invoice?.secure_url || invoice?.url || null,
        resource: invoice || null,
      },
      { status: 200, headers: NO_CACHE_HEADERS },
    );
  } catch (error: any) {
    console.error('❌ [invoice lookup] Error searching Cloudinary:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to look up invoice' },
      { status: 500, headers: NO_CACHE_HEADERS },
    );
  }
}
