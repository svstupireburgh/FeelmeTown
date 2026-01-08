import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Checking for AI Memory auto-update...');
    
    const memoryPath = join(process.cwd(), 'src', 'ai-memory');
    let shouldUpdate = false;
    const updateReasons = [];
    
    // Check if memory files exist
    const memoryFiles = ['theaters', 'occasions', 'gifts', 'services', 'faq'];
    for (const file of memoryFiles) {
      const filePath = join(memoryPath, `${file}.json`);
      if (!existsSync(filePath)) {
        shouldUpdate = true;
        updateReasons.push(`${file}.json does not exist`);
      }
    }
    
    // Check last update times against database
    if (!shouldUpdate) {
      const lastUpdateTimes = await getLastUpdateTimes();
      
      for (const file of memoryFiles) {
        const filePath = join(memoryPath, `${file}.json`);
        try {
          const fileData = JSON.parse(readFileSync(filePath, 'utf8'));
          const fileLastUpdated = new Date(fileData.lastUpdated || 0);
          const dbLastUpdated = new Date(lastUpdateTimes[file] || 0);
          
          if (dbLastUpdated > fileLastUpdated) {
            shouldUpdate = true;
            updateReasons.push(`${file} database updated: ${dbLastUpdated.toISOString()}`);
          }
        } catch (error) {
          shouldUpdate = true;
          updateReasons.push(`Error reading ${file}.json: ${error}`);
        }
      }
    }
    
    if (shouldUpdate) {
      console.log('🚀 Auto-updating AI Memory...', updateReasons);
      
      // Trigger update
      const updateResponse = await fetch(`${process.env.SITE_URL || 'http://localhost:3000'}/api/ai-memory/update`, {
        method: 'POST'
      });
      
      const updateResult = await updateResponse.json();
      
      return NextResponse.json({
        success: true,
        updated: true,
        reasons: updateReasons,
        updateResult
      });
    }
    
    return NextResponse.json({
      success: true,
      updated: false,
      message: 'AI Memory is up to date'
    });
    
  } catch (error) {
    console.error('❌ AI Memory auto-update error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check AI Memory updates',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function getLastUpdateTimes() {
  const times: any = {};
  
  try {
    // Get theaters last update
    const theaters = await (database as any).getTheaterList();
    if (theaters && theaters.length > 0) {
      times.theaters = Math.max(...theaters.map((t: any) => new Date(t.updatedAt || t.createdAt || 0).getTime()));
    }
    
    // Get occasions last update
    const occasions = await (database as any).getOccasionsList();
    if (occasions && occasions.length > 0) {
      times.occasions = Math.max(...occasions.map((o: any) => new Date(o.updatedAt || o.createdAt || 0).getTime()));
    }
    
    // Get services last update
    const services = await (database as any).getServicesList?.() || [];
    if (services && services.length > 0) {
      times.services = Math.max(...services.map((s: any) => new Date(s.updatedAt || s.createdAt || 0).getTime()));
    }
    
    // Get FAQ last update
    const faqs = await (database as any).getFAQList?.() || [];
    if (faqs && faqs.length > 0) {
      times.faq = Math.max(...faqs.map((f: any) => new Date(f.updatedAt || f.createdAt || 0).getTime()));
    }
    
    // For gifts, we'll use a default time since it's mostly static
    times.gifts = Date.now();
    
  } catch (error) {
    console.error('Error getting last update times:', error);
  }
  
  return times;
}
