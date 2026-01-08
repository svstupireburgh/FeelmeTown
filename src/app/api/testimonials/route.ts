import { NextResponse } from 'next/server';
import crypto from 'crypto';
import database from '@/lib/db-connect';

const isCloudinaryUrl = (url?: string | null) =>
  typeof url === 'string' && url.includes('res.cloudinary.com');

const extractCloudinaryPublicId = (url: string) => {
  const match = url.match(/\/upload\/(?:v\d+\/)?([^.#?]+)/);
  return match ? match[1] : null;
};

const deleteCloudinaryImage = async (imageUrl?: string | null) => {
  if (!imageUrl || !isCloudinaryUrl(imageUrl)) return;
  const publicId = extractCloudinaryPublicId(imageUrl);
  if (!publicId) return;

  const settings = (await (database as any).getSettings?.()) || {};
  const cloudName =
    settings.cloudinaryCloudName ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = settings.cloudinaryApiKey || process.env.CLOUDINARY_API_KEY;
  const apiSecret = settings.cloudinaryApiSecret || process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.warn('⚠️ Missing Cloudinary credentials; skipping remote delete');
    return;
  }

  const timestamp = Math.round(Date.now() / 1000);
  const signature = crypto
    .createHash('sha1')
    .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
    .digest('hex');

  const formData = new FormData();
  formData.append('public_id', publicId);
  formData.append('timestamp', timestamp.toString());
  formData.append('api_key', apiKey);
  formData.append('signature', signature);

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    if (!response.ok || (data.result !== 'ok' && data.result !== 'not found')) {
      console.error('❌ Cloudinary deletion failed:', data);
    }
  } catch (error) {
    console.error('❌ Error deleting Cloudinary image:', error);
  }
};

const normalizeMongoId = (value: any): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'object') {
    if (typeof value.toHexString === 'function') {
      return value.toHexString();
    }
    if (typeof value.$oid === 'string') {
      return value.$oid;
    }
    if (typeof value.toString === 'function') {
      const asString = value.toString();
      const match = asString.match(/[a-f0-9]{24}/i);
      if (match) return match[0];
      return asString;
    }
  }
  return undefined;
};

export async function GET() {
  try {
    let source: 'sql' | 'mongo' = 'mongo';
    let result: any = null;

    try {
      const { getFeedbackListFromSQL } = await import('@/lib/godaddy-sql');
      const sqlResult = await getFeedbackListFromSQL({ limit: 50, testimonialsOnly: true });
      if (sqlResult?.success) {
        result = sqlResult;
        source = 'sql';
      }
    } catch (e) {
      console.warn('⚠️ Failed to fetch testimonials from GoDaddy SQL; falling back to Mongo:', e);
    }

    if (!result) {
      result = await (database as any).getFeedbackList();
      source = 'mongo';
    }

    const rawFeedback = Array.isArray(result?.feedback) ? result.feedback : [];
    const testimonials = rawFeedback
      .filter((feedback: any) => feedback?.isTestimonial === true || feedback?.is_testimonial === 1)
      .map((feedback: any) => {
        const dbId = normalizeMongoId(feedback._id ?? feedback.mongoId ?? feedback.mongo_id);
        const submittedAt = feedback.submittedAt ?? feedback.submitted_at ?? null;

        return {
          id: feedback.feedbackId || feedback.feedback_id || dbId,
          dbId,
          name: feedback.name,
          text: feedback.message,
          rating: feedback.rating,
          image: feedback.avatar,
          position: feedback.socialPlatform ? `${feedback.socialPlatform} User` : 'Customer',
          email: feedback.email,
          socialHandle: feedback.socialHandle,
          socialPlatform: feedback.socialPlatform,
          submittedAt,
          message: feedback.message,
          feedback: feedback.message,
          avatar: feedback.avatar,
          date: submittedAt
            ? new Date(submittedAt).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
          source
        };
      });

    return NextResponse.json({ success: true, testimonials, count: testimonials.length, source });
  } catch (error) {
    console.error('❌ Error fetching testimonials:', error);
    return NextResponse.json(
      {
        success: false,
        testimonials: [],
        count: 0,
        error: 'Failed to fetch testimonials from database'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, message, rating, avatar, email, phone, socialHandle, socialPlatform } = body;

    if (!name || !message || !rating) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, message, rating' },
        { status: 400 }
      );
    }

    const feedbackData = {
      name: name.trim(),
      email: email ? email.trim().toLowerCase() : `${name.toLowerCase().replace(/\s+/g, '')}@feelmetown.com`,
      phone: phone ? phone.trim() : null,
      avatar: avatar || '/images/Avatars/FMT.svg',
      avatarType: 'random',
      socialHandle: socialHandle ? socialHandle.trim() : null,
      socialPlatform: socialPlatform || null,
      message: message.trim(),
      rating: parseInt(rating, 10),
      submittedAt: new Date(),
      status: 'active',
      isTestimonial: true,
      feedbackId: Date.now()
    };

    const result = await (database as any).saveFeedbackWithLimit(feedbackData);
    if (!result.success) {
      console.error('❌ Failed to save testimonial:', result.error);
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    try {
      const { syncFeedbackToSQL } = await import('@/lib/godaddy-sql');
      await syncFeedbackToSQL({
        ...feedbackData,
        _id: result.feedbackId,
        mongoId: result.feedbackId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } catch (e) {
      console.warn('⚠️ Testimonial saved to Mongo but failed to sync to GoDaddy SQL:', e);
    }

    return NextResponse.json({
      success: true,
      testimonial: {
        id: result.feedbackId,
        name: feedbackData.name,
        avatar: feedbackData.avatar,
        rating: feedbackData.rating,
        message: feedbackData.message,
        feedback: feedbackData.message,
        date: new Date().toISOString().split('T')[0]
      },
      message: 'Testimonial added successfully to database'
    });
  } catch (error) {
    console.error('❌ Error adding testimonial:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to add testimonial'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { id, dbId } = body;
    const identifiers = [dbId, id].filter((value) => typeof value === 'string' && value.trim().length > 0);

    if (!identifiers.length) {
      return NextResponse.json({ success: false, error: 'Feedback ID is required' }, { status: 400 });
    }

    let deletion = null;
    for (const lookupId of identifiers) {
      deletion = await (database as any).deleteFeedbackById(lookupId);
      if (deletion?.success) {
        await deleteCloudinaryImage(deletion.deleted?.avatar);

        try {
          const { deleteFeedbackFromSQL } = await import('@/lib/godaddy-sql');
          await deleteFeedbackFromSQL({ mongoId: lookupId, feedbackId: lookupId });
        } catch (e) {
          console.warn('⚠️ Testimonial deleted from Mongo but failed to delete from GoDaddy SQL:', e);
        }

        return NextResponse.json({ success: true, deletedId: lookupId });
      }
    }

    try {
      const { deleteFeedbackFromSQL } = await import('@/lib/godaddy-sql');
      const sqlDelete = await deleteFeedbackFromSQL({ mongoId: dbId, feedbackId: id });
      if (sqlDelete?.success) {
        return NextResponse.json({ success: true, deletedId: identifiers[identifiers.length - 1], source: 'sql' });
      }
    } catch (e) {
      console.warn('⚠️ Failed to delete testimonial from GoDaddy SQL as fallback:', e);
    }

    if (deletion?.error === 'Feedback not found') {
      return NextResponse.json({
        success: true,
        deletedId: identifiers[identifiers.length - 1],
        message: 'Feedback already removed'
      });
    }

    return NextResponse.json(
      { success: false, error: deletion?.error || 'Failed to delete testimonial' },
      { status: 400 }
    );
  } catch (error) {
    console.error('❌ Error deleting testimonial:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete testimonial' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { id, name, message, rating, email, socialHandle, socialPlatform } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Feedback ID is required' }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (typeof name === 'string') updates.name = name.trim();
    if (typeof message === 'string') updates.message = message.trim();
    if (typeof email === 'string') updates.email = email.trim();
    if (typeof socialHandle === 'string') updates.socialHandle = socialHandle.trim();
    if (typeof socialPlatform === 'string') updates.socialPlatform = socialPlatform.trim();

    if (typeof rating !== 'undefined') {
      const ratingValue = Number(rating);
      if (Number.isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
        return NextResponse.json(
          { success: false, error: 'Rating must be a number between 1 and 5' },
          { status: 400 }
        );
      }
      updates.rating = ratingValue;
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json(
        { success: false, error: 'No valid fields provided to update' },
        { status: 400 }
      );
    }

    const updateResult = await (database as any).updateFeedbackById(id, updates);

    if (updateResult?.success) {
      try {
        const updated = updateResult?.testimonial;
        const { syncFeedbackToSQL } = await import('@/lib/godaddy-sql');
        await syncFeedbackToSQL({
          ...updated,
          _id: updated?._id ?? id,
          mongoId: normalizeMongoId(updated?._id ?? id) ?? id,
          feedbackId: updated?.feedbackId,
          message: updated?.message,
          rating: updated?.rating,
          email: updated?.email,
          socialHandle: updated?.socialHandle,
          socialPlatform: updated?.socialPlatform,
          isTestimonial: updated?.isTestimonial ?? true,
          submittedAt: updated?.submittedAt,
          createdAt: updated?.createdAt,
          updatedAt: updated?.updatedAt ?? new Date()
        });
      } catch (e) {
        console.warn('⚠️ Testimonial updated in Mongo but failed to sync update to GoDaddy SQL:', e);
      }

      return NextResponse.json({ success: true, testimonial: updateResult.testimonial, source: 'mongo' });
    }

    if (updateResult?.error === 'Feedback not found') {
      try {
        const { updateFeedbackInSQL } = await import('@/lib/godaddy-sql');
        const sqlUpdate = await updateFeedbackInSQL({
          mongoId: id,
          feedbackId: id,
          updates: {
            name: updates.name,
            message: updates.message,
            rating: updates.rating,
            email: updates.email,
            socialHandle: updates.socialHandle,
            socialPlatform: updates.socialPlatform,
            updatedAt: new Date(),
            isTestimonial: true
          }
        });

        if (sqlUpdate?.success) {
          return NextResponse.json({
            success: true,
            testimonial: {
              id,
              name: updates.name,
              message: updates.message,
              rating: updates.rating,
              email: updates.email,
              socialHandle: updates.socialHandle,
              socialPlatform: updates.socialPlatform
            },
            source: 'sql'
          });
        }
      } catch (e) {
        console.warn('⚠️ Mongo missing, and SQL update fallback failed:', e);
      }
    }

    return NextResponse.json(
      { success: false, error: updateResult?.error || 'Failed to update testimonial' },
      { status: 400 }
    );
  } catch (error) {
    console.error('❌ Error updating testimonial:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update testimonial' },
      { status: 500 }
    );
  }
}
