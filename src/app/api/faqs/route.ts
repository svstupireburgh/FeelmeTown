import { NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// GET /api/faqs - Get all active FAQs for public use
export async function GET() {
  try {
    console.log('🔄 Public FAQ API: Fetching FAQs from database...');
    const result = await database.getAllFAQs();
    
    console.log('📊 Public FAQ API: Database result:', {
      success: result.success,
      total: result.faqs?.length || 0,
      error: result.error
    });
    
    if (result.success && Array.isArray(result.faqs)) {
      // Filter only active FAQs and format for public use
      const publicFAQs = result.faqs
        .filter((faq: any) => faq.isActive !== false)
        .sort((a: any, b: any) => (a.order || 1) - (b.order || 1))
        .map((faq: any) => ({
          _id: faq._id,
          question: faq.question,
          answer: faq.answer,
          category: faq.category,
          order: faq.order || 1,
          isActive: faq.isActive !== false
        }));
      
      console.log('✅ Public FAQ API: Returning FAQs:', publicFAQs.length, 'items');
      
      return NextResponse.json({
        success: true,
        faqs: publicFAQs,
        total: publicFAQs.length
      });
    } else {
      console.error('❌ Public FAQ API: Database error:', result.error);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Public FAQ API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch FAQs' },
      { status: 500 }
    );
  }
}
