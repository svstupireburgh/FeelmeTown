import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import database from '@/lib/db-connect';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl } = body;

    console.log('🗑️ Cloudinary delete request received for:', imageUrl);

    if (!imageUrl) {
      console.error('❌ No image URL provided');
      return NextResponse.json(
        { success: false, error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Extract public_id from Cloudinary URL
    // URL format: https://res.cloudinary.com/CLOUD_NAME/image/upload/VERSION/PUBLIC_ID.ext
    const matches = imageUrl.match(/\/v\d+\/(.+)\.\w+$/);
    if (!matches || !matches[1]) {
      console.error('❌ Invalid Cloudinary URL format:', imageUrl);
      return NextResponse.json(
        { success: false, error: 'Invalid Cloudinary URL' },
        { status: 400 }
      );
    }

    const publicId = matches[1];
    console.log('🔍 Extracted public_id:', publicId);

    // Fetch Cloudinary credentials from database settings
    const settings = await database.getSettings();
    const cloudName = settings?.cloudinaryCloudName || '';
    const apiKey = settings?.cloudinaryApiKey || '';
    const apiSecret = settings?.cloudinaryApiSecret || '';

    console.log('🔑 Cloudinary credentials check:', {
      cloudName: cloudName ? '✅ Found' : '❌ Missing',
      apiKey: apiKey ? '✅ Found' : '❌ Missing',
      apiSecret: apiSecret ? '✅ Found' : '❌ Missing'
    });

    if (!cloudName || !apiKey || !apiSecret) {
      console.warn('⚠️ Cloudinary credentials not configured, skipping cloud deletion');
      return NextResponse.json({
        success: true,
        message: 'Image deleted from database only (Cloudinary credentials not configured in DB)'
      });
    }

    // Generate signature for Cloudinary deletion
    const timestamp = Math.round(Date.now() / 1000);
    const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('timestamp', timestamp.toString());
    formData.append('api_key', apiKey);
    formData.append('signature', signature);

    const deleteUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`;

    console.log('🌐 Making Cloudinary delete request to:', deleteUrl);
    
    const response = await fetch(deleteUrl, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    
    console.log('📡 Cloudinary response:', data);

    if (data.result === 'ok' || data.result === 'not found') {
      console.log('✅ Cloudinary deletion successful');
      return NextResponse.json({
        success: true,
        message: 'Image deleted from Cloudinary successfully'
      });
    } else {
      console.error('❌ Cloudinary deletion failed:', data);
      return NextResponse.json(
        { success: false, error: 'Failed to delete from Cloudinary', details: data },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Error in Cloudinary delete API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete from Cloudinary' },
      { status: 500 }
    );
  }
}

