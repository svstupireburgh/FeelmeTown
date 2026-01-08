import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

interface CloudinarySearchResponse {
  resources?: Array<{
    public_id: string;
    filename?: string;
    format?: string;
    secure_url?: string;
    url?: string;
    created_at?: string;
    bytes?: number;
    resource_type?: string;
    folder?: string;
  }>;
  next_cursor?: string;
}

async function searchCloudinaryInvoices(params: {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folderPath: string;
  maxPages?: number;
  pageSize?: number;
}) {
  const { cloudName, apiKey, apiSecret, folderPath, maxPages = 10, pageSize = 200 } = params;
  const authHeader = 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  let nextCursor: string | undefined = undefined;
  const all: NonNullable<CloudinarySearchResponse['resources']> = [];

  for (let i = 0; i < maxPages; i++) {
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/search`;
    const body: any = {
      expression: `folder="${folderPath}" AND format="pdf"`,
      sort_by: [{ created_at: 'desc' }],
      max_results: pageSize,
    };
    if (nextCursor) body.next_cursor = nextCursor;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Cloudinary search failed (${res.status}): ${text}`);
    }
    const json = (await res.json()) as CloudinarySearchResponse;
    if (Array.isArray(json.resources)) {
      all.push(...json.resources);
    }
    if (!json.next_cursor) break;
    nextCursor = json.next_cursor;
  }
  return all;
}

export async function GET(_request: NextRequest) {
  try {
    const noCacheHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      'Surrogate-Control': 'no-store',
    };

    const settings = await database.getSettings();
    const cloudName = settings?.cloudinaryCloudName || '';
    const apiKey = settings?.cloudinaryApiKey || '';
    const apiSecret = settings?.cloudinaryApiSecret || '';
    const baseFolder = settings?.cloudinaryFolder || 'feelmetown';
    const folderPath = `${baseFolder.replace(/\/$/, '')}/invoices`;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, error: 'Cloudinary is not configured' },
        { status: 500, headers: noCacheHeaders }
      );
    }

    const resources = await searchCloudinaryInvoices({
      cloudName,
      apiKey,
      apiSecret,
      folderPath,
    });

    const invoices = resources
      .filter((r) => !!r.secure_url || !!r.url)
      .map((r) => ({
        publicId: r.public_id,
        filename: r.filename || r.public_id.split('/').pop() || r.public_id,
        secureUrl: r.secure_url || r.url || '',
        createdAt: r.created_at || null,
        bytes: r.bytes || 0,
        resourceType: r.resource_type || 'raw',
      }));

    return NextResponse.json({ success: true, invoices }, { status: 200, headers: noCacheHeaders });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to list invoices' },
      { status: 500, headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        'Surrogate-Control': 'no-store',
      } }
    );
  }
}

