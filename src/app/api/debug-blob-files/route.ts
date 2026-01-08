import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check if we have blob storage enabled
    const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN;
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
    const blobEnabled = hasToken || isVercel;

    if (!blobEnabled) {
      return NextResponse.json({
        success: false,
        error: 'Blob storage not enabled',
        hasToken,
        isVercel
      });
    }

    // List all files in blob storage
    const blobApi = await (Function('return import("@vercel/blob")'))();
    if (!blobApi || !blobApi.list) {
      return NextResponse.json({
        success: false,
        error: 'Blob API not available'
      });
    }

    const listRes = await blobApi.list({ 
      prefix: 'data/exports/',
      token: process.env.BLOB_READ_WRITE_TOKEN 
    });

    const files = listRes?.blobs?.map((blob: any) => ({
      name: blob.pathname || blob.key || blob.name,
      url: blob.url,
      size: blob.size,
      uploadedAt: blob.uploadedAt
    })) || [];

    // Try to read each JSON file
    const fileContents: any = {};
    for (const file of files) {
      try {
        const response = await fetch(file.url);
        if (response.ok) {
          const text = await response.text();
          const data = JSON.parse(text);
          fileContents[file.name] = {
            isArray: Array.isArray(data),
            length: Array.isArray(data) ? data.length : (data?.records?.length || 0),
            sample: Array.isArray(data) ? data.slice(0, 2) : data
          };
        }
      } catch (error) {
        fileContents[file.name] = { error: error instanceof Error ? error.message : 'Parse error' };
      }
    }

    return NextResponse.json({
      success: true,
      blobEnabled,
      hasToken,
      isVercel,
      totalFiles: files.length,
      files,
      fileContents
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
