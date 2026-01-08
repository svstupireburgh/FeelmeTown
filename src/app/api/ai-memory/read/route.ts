import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // theaters, occasions, gifts, services, faq, or 'all'
    
    const memoryPath = join(process.cwd(), 'src', 'ai-memory');
    
    if (type && type !== 'all') {
      // Return specific type
      const filePath = join(memoryPath, `${type}.json`);
      
      if (!existsSync(filePath)) {
        return NextResponse.json({
          success: false,
          error: `Memory file for ${type} not found`,
          suggestion: 'Run /api/ai-memory/update to create memory files'
        }, { status: 404 });
      }
      
      const data = JSON.parse(readFileSync(filePath, 'utf8'));
      
      return NextResponse.json({
        success: true,
        type,
        data,
        lastUpdated: data.lastUpdated
      });
    }
    
    // Return all memory data
    const memoryFiles = ['theaters', 'occasions', 'gifts', 'services', 'faq'];
    const allMemory: any = {};
    
    for (const file of memoryFiles) {
      const filePath = join(memoryPath, `${file}.json`);
      
      if (existsSync(filePath)) {
        try {
          allMemory[file] = JSON.parse(readFileSync(filePath, 'utf8'));
        } catch (error) {
          console.error(`Error reading ${file}.json:`, error);
          allMemory[file] = { [file]: [], lastUpdated: '', source: 'error' };
        }
      } else {
        allMemory[file] = { [file]: [], lastUpdated: '', source: 'not_found' };
      }
    }
    
    return NextResponse.json({
      success: true,
      memory: allMemory,
      files: memoryFiles,
      totalItems: {
        theaters: allMemory.theaters?.theaters?.length || 0,
        occasions: allMemory.occasions?.occasions?.length || 0,
        gifts: allMemory.gifts?.gifts?.length || 0,
        services: allMemory.services?.services?.length || 0,
        faq: allMemory.faq?.faq?.length || 0
      }
    });
    
  } catch (error) {
    console.error('❌ AI Memory read error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to read AI Memory',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to get formatted memory for AI
async function getAIMemoryForPrompt() {
  try {
    const memoryPath = join(process.cwd(), 'src', 'ai-memory');
    const memoryFiles = ['theaters', 'occasions', 'gifts', 'services', 'faq'];
    
    let formattedMemory = '';
    
    for (const file of memoryFiles) {
      const filePath = join(memoryPath, `${file}.json`);
      
      if (existsSync(filePath)) {
        try {
          const data = JSON.parse(readFileSync(filePath, 'utf8'));
          formattedMemory += formatMemoryForAI(file, data);
        } catch (error) {
          console.error(`Error reading ${file}.json for AI:`, error);
        }
      }
    }
    
    return formattedMemory;
  } catch (error) {
    console.error('Error getting AI memory:', error);
    return '';
  }
}

function formatMemoryForAI(type: string, data: any): string {
  const items = data[type] || [];
  if (items.length === 0) return '';
  
  switch (type) {
    case 'theaters':
      return `
THEATERS INFORMATION:
${items.map((theater: any) => `
- ${theater.name} (${theater.type}): ₹${theater.price}
  Capacity: ${theater.capacity.min}-${theater.capacity.max} people
  Time Slots: ${theater.timeSlots.join(', ')}
  Features: ${theater.features.join(', ')}
  Description: ${theater.description}`).join('')}
`;

    case 'occasions':
      return `
AVAILABLE OCCASIONS:
${items.map((occasion: any) => `
- ${occasion.name}: ${occasion.description}
  Required Fields: ${occasion.requiredFields.join(', ')}
  Category: ${occasion.category}`).join('')}
`;

    case 'gifts':
      return `
AVAILABLE GIFTS & ADD-ONS:
${items.map((gift: any) => `
- ${gift.name}: ${gift.price}
  Description: ${gift.description}
  Category: ${gift.category}`).join('')}
`;

    case 'services':
      return `
OUR SERVICES:
${items.map((service: any) => `
- ${service.name}: ${service.description}
  Features: ${service.features.join(', ')}
  Pricing: ${service.pricing}`).join('')}
`;

    case 'faq':
      return `
FREQUENTLY ASKED QUESTIONS:
${items.map((faq: any) => `
Q: ${faq.question}
A: ${faq.answer}
Category: ${faq.category}`).join('')}
`;

    default:
      return '';
  }
}
