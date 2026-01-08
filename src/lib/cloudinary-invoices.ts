import crypto from 'crypto';
import FormData from 'form-data';
import database from '@/lib/db-connect';

/**
 * Upload an invoice PDF buffer to Cloudinary as a raw file with signed parameters.
 */
interface CloudinaryInvoiceUpload {
  secureUrl?: string;
  inlineUrl?: string;
}

type CloudinaryCredentials = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

const resolveCloudinaryCredentials = async (): Promise<CloudinaryCredentials> => {
  const settings = await database.getSettings().catch(() => null as any);

  const cloudName =
    settings?.cloudinaryCloudName ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    process.env.CLOUDINARY_CLOUD_NAME ||
    '';

  const apiKey =
    settings?.cloudinaryApiKey ||
    process.env.CLOUDINARY_API_KEY ||
    '';

  const apiSecret =
    settings?.cloudinaryApiSecret ||
    process.env.CLOUDINARY_API_SECRET ||
    '';

  return {
    cloudName: String(cloudName || '').trim(),
    apiKey: String(apiKey || '').trim(),
    apiSecret: String(apiSecret || '').trim(),
  };
};

export const extractCloudinaryPublicIdFromUrl = (rawUrl: string): string | null => {
  try {
    if (!rawUrl) return null;
    const url = new URL(rawUrl);
    const marker = '/upload/';
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;

    let after = url.pathname.substring(idx + marker.length);
    after = after.replace(/^v\d+\//, '');
    after = after.replace(/\.[a-z0-9]+$/i, '');
    after = decodeURIComponent(after);

    return after || null;
  } catch {
    return null;
  }
};

export async function deleteInvoiceFromCloudinaryByUrl(invoiceUrl: string): Promise<boolean> {
  try {
    const publicId = extractCloudinaryPublicIdFromUrl(invoiceUrl);
    if (!publicId) {
      return false;
    }

    const fetch = (await import('node-fetch')).default as unknown as typeof globalThis.fetch;
    const { cloudName, apiKey, apiSecret } = await resolveCloudinaryCredentials();

    if (!cloudName || !apiKey || !apiSecret) {
      console.warn('[Cloudinary] Cloudinary credentials not fully configured, skipping delete', {
        hasCloudName: !!cloudName,
        hasApiKey: !!apiKey,
        hasApiSecret: !!apiSecret,
      });
      return false;
    }

    const timestamp = Math.round(Date.now() / 1000);
    const invalidate = 'true';
    const paramsToSign = `invalidate=${invalidate}&public_id=${publicId}&timestamp=${timestamp}`;
    const signature = crypto.createHash('sha1').update(paramsToSign + apiSecret).digest('hex');

    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('timestamp', String(timestamp));
    formData.append('api_key', apiKey);
    formData.append('invalidate', invalidate);
    formData.append('signature', signature);

    const destroyUrl = `https://api.cloudinary.com/v1_1/${cloudName}/raw/destroy`;
    const res = await fetch(destroyUrl, {
      method: 'POST',
      body: formData as any,
      headers: (formData as any).getHeaders?.() || undefined,
    });

    const data = await res.json().catch(() => ({} as any));

    if (!res.ok) {
      console.warn('[Cloudinary] Invoice delete failed', { status: res.status, data, publicId });
      return false;
    }

    const result = String((data as any)?.result || '').toLowerCase();
    return result === 'ok' || result === 'not found';
  } catch (error) {
    console.warn('[Cloudinary] Error while deleting invoice', error);
    return false;
  }
}

export async function uploadInvoiceToCloudinary(
  filename: string,
  pdfBuffer: Buffer
): Promise<CloudinaryInvoiceUpload> {
  try {
    // Basic buffer + PDF sanity checks
    if (!pdfBuffer?.length) {
      console.warn('[Cloudinary] Empty PDF buffer, skipping upload');
      return {};
    }

    const pdfHeader = pdfBuffer.subarray(0, 4).toString('ascii');
    if (pdfHeader !== '%PDF') {
      console.error('[Cloudinary] Invoice buffer is not a PDF, aborting upload');
      return {};
    }

    // Use node-fetch explicitly in Node runtime
    const fetch = (await import('node-fetch')).default as unknown as typeof globalThis.fetch;

    // Load Cloudinary settings from DB (preferred) and fall back to env vars
    const settings = await database.getSettings().catch(() => null as any);
    const { cloudName, apiKey, apiSecret } = await resolveCloudinaryCredentials();

    const baseFolder =
      settings?.cloudinaryFolder ||
      process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER ||
      'feelmetown';

    console.log('[Cloudinary] Resolved credentials source:', {
      fromSettings: {
        hasCloudName: !!settings?.cloudinaryCloudName,
        hasApiKey: !!settings?.cloudinaryApiKey,
        hasApiSecret: !!settings?.cloudinaryApiSecret,
        folder: settings?.cloudinaryFolder,
      },
      fromEnv: {
        nextPublicCloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ? 'set' : undefined,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME ? 'set' : undefined,
        apiKey: process.env.CLOUDINARY_API_KEY ? 'set' : undefined,
        apiSecret: process.env.CLOUDINARY_API_SECRET ? 'set' : undefined,
        folder: process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER,
      },
      resolved: {
        cloudName,
        apiKey: apiKey ? 'set' : undefined,
        apiSecret: apiSecret ? 'set' : undefined,
        baseFolder,
      },
    });
    const folder = `${baseFolder.replace(/\/$/, '')}/invoices`;

    if (!cloudName || !apiKey || !apiSecret) {
      console.warn('[Cloudinary] Cloudinary credentials not fully configured, skipping upload', {
        hasCloudName: !!cloudName,
        hasApiKey: !!apiKey,
        hasApiSecret: !!apiSecret,
      });
      return {};
    }

    const publicId = filename.replace(/\.pdf$/i, '');
    const timestamp = Math.round(Date.now() / 1000);

    // Signed params for raw upload
    const paramsToSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}`;
    const signature = crypto.createHash('sha1').update(paramsToSign + apiSecret).digest('hex');

    const formData = new FormData();
    formData.append('file', pdfBuffer, {
      filename,
      contentType: 'application/pdf',
    });
    formData.append('folder', folder);
    formData.append('public_id', publicId);
    formData.append('timestamp', String(timestamp));
    formData.append('api_key', apiKey);
    formData.append('signature', signature);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`;

    const res = await fetch(uploadUrl, {
      method: 'POST',
      body: formData as any,
      headers: (formData as any).getHeaders?.() || undefined,
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[Cloudinary] Invoice upload failed', { status: res.status, data });
      return {};
    }

    if (data.secure_url) {
      const secureUrl = data.secure_url as string;
      const inlineUrl = secureUrl; // Use direct URL for both inline preview and download

      console.log('[Cloudinary] Uploaded invoice PDF', {
        secureUrl,
        inlineUrl,
        publicId: data.public_id,
      });
      return { secureUrl, inlineUrl };
    }

    console.warn('[Cloudinary] Upload response did not contain secure_url', data);
    return {};
  } catch (error) {
    console.error('[Cloudinary] Error while uploading invoice PDF', error);
    return {};
  }
}
