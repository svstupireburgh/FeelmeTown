import { NextRequest, NextResponse } from 'next/server';

// Global variable to store the interval
let updateInterval: NodeJS.Timeout | null = null;
let isSchedulerRunning = false;

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === 'start') {
      return startScheduler();
    } else if (action === 'stop') {
      return stopScheduler();
    } else if (action === 'status') {
      return getSchedulerStatus();
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Use: start, stop, or status'
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('❌ AI Memory Scheduler Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Scheduler operation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function startScheduler() {
  if (isSchedulerRunning) {
    return NextResponse.json({
      success: false,
      message: 'Scheduler is already running',
      status: 'running'
    });
  }
  
  console.log('🕐 Starting AI Memory Auto-Update Scheduler (1 hour interval)...');
  
  // Update immediately on start
  updateAIMemory();
  
  // Set interval for every 1 hour (3600000 milliseconds)
  updateInterval = setInterval(() => {
    console.log('⏰ Scheduled AI Memory update triggered...');
    updateAIMemory();
  }, 3600000); // 1 hour = 60 * 60 * 1000 = 3600000 ms
  
  isSchedulerRunning = true;
  
  return NextResponse.json({
    success: true,
    message: 'AI Memory Auto-Update Scheduler started',
    status: 'running',
    interval: '1 hour',
    nextUpdate: new Date(Date.now() + 3600000).toISOString()
  });
}

function stopScheduler() {
  if (!isSchedulerRunning) {
    return NextResponse.json({
      success: false,
      message: 'Scheduler is not running',
      status: 'stopped'
    });
  }
  
  console.log('🛑 Stopping AI Memory Auto-Update Scheduler...');
  
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
  
  isSchedulerRunning = false;
  
  return NextResponse.json({
    success: true,
    message: 'AI Memory Auto-Update Scheduler stopped',
    status: 'stopped'
  });
}

function getSchedulerStatus() {
  return NextResponse.json({
    success: true,
    status: isSchedulerRunning ? 'running' : 'stopped',
    interval: isSchedulerRunning ? '1 hour' : 'none',
    nextUpdate: isSchedulerRunning ? new Date(Date.now() + 3600000).toISOString() : null,
    message: isSchedulerRunning ? 'Scheduler is active' : 'Scheduler is inactive'
  });
}

async function updateAIMemory() {
  try {
    console.log('🧠 Auto-updating AI Memory from database...');
    
    const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
    const response = await fetch(`${siteUrl}/api/ai-memory/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ AI Memory auto-update successful:', result.updatedAt);
      console.log('📁 Files updated:', result.files);
    } else {
      console.error('❌ AI Memory auto-update failed:', response.status);
    }
    
  } catch (error) {
    console.error('❌ AI Memory auto-update error:', error);
  }
}
