import { NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// GET /api/admin/faqs - Get all FAQs
export async function GET() {
  try {
    const result = await database.getAllFAQs();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        faqs: result.faqs,
        total: result.total
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Get FAQs API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch FAQs' },
      { status: 500 }
    );
  }
}

// POST /api/admin/faqs - Add new FAQ
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { question, answer, category } = body;

    console.log('📝 FAQ submission received:', { question, category });

    // Validate required fields
    if (!question || !answer) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: question and answer' },
        { status: 400 }
      );
    }

    // Prepare FAQ data
    const faqData = {
      question: question.trim(),
      answer: answer.trim(),
      category: category ? category.trim() : 'General',
      isActive: true
    };

    // Save to FAQ collection
    const result = await database.addFAQ(faqData);

    if (result.success) {
      console.log('✅ FAQ saved successfully:', result.faqId);
      
      return NextResponse.json({
        success: true,
        message: 'FAQ added successfully!',
        faqId: result.faqId
      });
    } else {
      console.error('❌ Failed to save FAQ:', result.error);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('FAQ API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add FAQ' },
      { status: 500 }
    );
  }
}
