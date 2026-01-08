import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 AI Memory System Startup...');
    
    const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
    
    // 1. Update AI Memory immediately
    console.log('1️⃣ Initial AI Memory update...');
    const updateResponse = await fetch(`${siteUrl}/api/ai-memory/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    let updateResult = null;
    if (updateResponse.ok) {
      updateResult = await updateResponse.json();
      console.log('✅ Initial update successful');
    } else {
      console.log('❌ Initial update failed');
    }
    
    // 2. Start the scheduler
    console.log('2️⃣ Starting auto-update scheduler...');
    const schedulerResponse = await fetch(`${siteUrl}/api/ai-memory/scheduler`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start' })
    });
    
    let schedulerResult = null;
    if (schedulerResponse.ok) {
      schedulerResult = await schedulerResponse.json();
      console.log('✅ Scheduler started successfully');
    } else {
      console.log('❌ Scheduler start failed');
    }
    
    return NextResponse.json({
      success: true,
      message: 'AI Memory System initialized successfully',
      initialUpdate: updateResult,
      scheduler: schedulerResult,
      status: 'ready'
    });
    
  } catch (error) {
    console.error('❌ AI Memory Startup Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to initialize AI Memory System',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
