import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// PUT /api/admin/faqs/[id] - Update FAQ
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { question, answer, category } = body;
    const { id } = await params;
    const faqId = id;

    console.log('📝 FAQ update received:', { faqId, question, category });

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

    // Update FAQ in database
    const result = await database.updateFAQ(faqId, faqData);

    if (result.success) {
      console.log('✅ FAQ updated successfully:', faqId);
      
      return NextResponse.json({
        success: true,
        message: 'FAQ updated successfully!'
      });
    } else {
      console.error('❌ Failed to update FAQ:', result.error);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('FAQ Update API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update FAQ' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/faqs/[id] - Delete FAQ
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const faqId = id;

    console.log('🗑️ FAQ deletion requested:', faqId);

    // Delete FAQ from database
    const result = await database.deleteFAQ(faqId);

    if (result.success) {
      console.log('✅ FAQ deleted successfully:', faqId);
      
      return NextResponse.json({
        success: true,
        message: 'FAQ deleted successfully!'
      });
    } else {
      console.error('❌ Failed to delete FAQ:', result.error);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('FAQ Delete API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete FAQ' },
      { status: 500 }
    );
  }
}
