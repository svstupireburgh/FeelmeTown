import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { gunzipSync } from 'zlib';

export async function POST(request: NextRequest) {
  try {
    console.log('🧠 Starting AI Memory update...');
    
    const memoryPath = join(process.cwd(), 'src', 'ai-memory');
    const currentTime = new Date().toISOString();
    
    // Fetch Theaters Data
    console.log('🏛️ Fetching theaters data...');
    const theatersData = await fetchTheatersData();
    writeFileSync(
      join(memoryPath, 'theaters.json'),
      JSON.stringify({
        theaters: theatersData,
        lastUpdated: currentTime,
        source: 'database'
      }, null, 2)
    );
    
    // Fetch Occasions Data
    console.log('🎉 Fetching occasions data...');
    const occasionsData = await fetchOccasionsData();
    writeFileSync(
      join(memoryPath, 'occasions.json'),
      JSON.stringify({
        occasions: occasionsData,
        lastUpdated: currentTime,
        source: 'database'
      }, null, 2)
    );
    
    // Fetch Gifts Data
    console.log('🎁 Fetching gifts data...');
    const giftsData = await fetchGiftsData();
    writeFileSync(
      join(memoryPath, 'gifts.json'),
      JSON.stringify({
        gifts: giftsData,
        lastUpdated: currentTime,
        source: 'database'
      }, null, 2)
    );
    
    // Fetch Services Data
    console.log('⚙️ Fetching services data...');
    const servicesData = await fetchServicesData();
    writeFileSync(
      join(memoryPath, 'services.json'),
      JSON.stringify({
        services: servicesData,
        lastUpdated: currentTime,
        source: 'database'
      }, null, 2)
    );
    
    // Fetch FAQ Data
    console.log('❓ Fetching FAQ data...');
    const faqData = await fetchFAQData();
    writeFileSync(
      join(memoryPath, 'faq.json'),
      JSON.stringify({
        faq: faqData,
        lastUpdated: currentTime,
        source: 'database'
      }, null, 2)
    );
    
    
    console.log('✅ AI Memory updated successfully!');
    
    return NextResponse.json({
      success: true,
      message: 'AI Memory updated successfully',
      updatedAt: currentTime,
      files: ['theaters.json', 'occasions.json', 'gifts.json', 'services.json', 'faq.json']
    });
    
  } catch (error) {
    console.error('❌ AI Memory update error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update AI Memory',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function fetchTheatersData() {
  try {
    console.log('🏛️ Calling database.getAllTheaters()...');
    const theaterResult = await (database as any).getAllTheaters();
    console.log('🏛️ Theater result received:', theaterResult);
    
    // Extract theaters array from result object
    const theaterData = theaterResult?.success ? theaterResult.theaters : [];
    console.log('🏛️ Theater data extracted:', theaterData?.length || 0, 'theaters');
    console.log('🏛️ First theater sample:', theaterData?.[0]);
    
    if (theaterData && theaterData.length > 0) {
      return theaterData.map((theater: any) => {
        // Decompress compressed data if exists
        let decompressedData = {};
        if (theater.compressedData) {
          try {
            const buffer = Buffer.from(theater.compressedData.buffer);
            const decompressed = gunzipSync(buffer);
            decompressedData = JSON.parse(decompressed.toString());
            console.log(`✅ Decompressed data for theater: ${theater.name}`);
          } catch (error) {
            console.error(`❌ Failed to decompress data for theater: ${theater.name}`, error);
          }
        }

        // Process time slots to readable format
        const processedTimeSlots = (theater.timeSlots || []).map((slot: any) => {
          if (typeof slot === 'string') {
            return slot;
          } else if (slot.startTime && slot.endTime) {
            return `${slot.startTime} - ${slot.endTime}`;
          } else if (slot.timeRange) {
            return slot.timeRange;
          }
          return slot;
        });

        return {
          id: theater.theaterId || theater.id,
          name: theater.name,
          type: theater.type || 'Private Theater',
          capacity: theater.capacity || { min: 2, max: 8 },
          price: theater.price || 'Contact for pricing',
          timeSlots: processedTimeSlots,
          description: theater.description || '',
          features: theater.features || [],
          amenities: theater.amenities || [],
          location: theater.location || 'FeelME Town, Delhi',
          specialFeatures: theater.specialFeatures || [],
          bookingAvailable: theater.isActive !== false,
          displayOrder: theater.displayOrder || 0,
          // Include decompressed data
          ...decompressedData,
          lastUpdated: theater.updatedAt,
          createdAt: theater.createdAt
        };
      });
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching theaters:', error);
    return [];
  }
}

async function fetchOccasionsData() {
  try {
    console.log('🎉 Calling database.getAllOccasions()...');
    const occasionsData = await (database as any).getAllOccasions();
    console.log('🎉 Occasions data received:', occasionsData?.length || 0, 'occasions');
    
    if (occasionsData && occasionsData.length > 0) {
      return occasionsData.map((occasion: any) => {
        // Decompress compressed data if exists
        let decompressedData = {};
        if (occasion.compressedData) {
          try {
            const buffer = Buffer.from(occasion.compressedData.buffer);
            const decompressed = gunzipSync(buffer);
            decompressedData = JSON.parse(decompressed.toString());
            console.log(`✅ Decompressed data for occasion: ${occasion.name}`);
          } catch (error) {
            console.error(`❌ Failed to decompress data for occasion: ${occasion.name}`, error);
          }
        }

        return {
          id: occasion._id || occasion.id,
          occasionId: occasion.occasionId,
          name: occasion.name,
          description: occasion.description || '',
          requiredFields: occasion.requiredFields || [],
          fieldLabels: occasion.fieldLabels || {},
          isActive: occasion.isActive !== false,
          category: occasion.category || 'celebration',
          popular: occasion.popular || false,
          imageUrl: occasion.imageUrl || '',
          // Include decompressed data
          ...decompressedData,
          lastUpdated: occasion.updatedAt,
          createdAt: occasion.createdAt
        };
      });
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching occasions:', error);
    return [];
  }
}

async function fetchGiftsData() {
  try {
    // Assuming you have a gifts collection
    const giftsData = await (database as any).getGiftsList?.() || [];
    
    if (giftsData && giftsData.length > 0) {
      return giftsData.map((gift: any) => ({
        id: gift._id || gift.id,
        name: gift.name,
        description: gift.description || '',
        price: gift.price || 'Contact for pricing',
        category: gift.category || 'general',
        availability: gift.availability !== false,
        image: gift.image || '',
        features: gift.features || []
      }));
    }
    
    return [
      {
        id: 'cake1',
        name: 'Chocolate Cake',
        description: 'Delicious chocolate cake for celebrations',
        price: '₹500',
        category: 'cakes',
        availability: true
      },
      {
        id: 'flowers1',
        name: 'Rose Bouquet',
        description: 'Beautiful red roses bouquet',
        price: '₹300',
        category: 'flowers',
        availability: true
      },
      {
        id: 'decoration1',
        name: 'Balloon Decoration',
        description: 'Colorful balloon decoration setup',
        price: '₹800',
        category: 'decorations',
        availability: true
      }
    ];
  } catch (error) {
    console.error('Error fetching gifts:', error);
    return [];
  }
}

async function fetchServicesData() {
  try {
    // Fetch from services collection
    const servicesData = await (database as any).getAllServices?.() || [];
    
    if (servicesData && servicesData.length > 0) {
      return servicesData.map((service: any) => {
        // Decompress compressed data if exists
        let decompressedData = {};
        if (service.compressedData) {
          try {
            const buffer = Buffer.from(service.compressedData.buffer);
            const decompressed = gunzipSync(buffer);
            decompressedData = JSON.parse(decompressed.toString());
            console.log(`✅ Decompressed data for service: ${service.name}`);
          } catch (error) {
            console.error(`❌ Failed to decompress data for service: ${service.name}`, error);
          }
        }

        // Process items if they exist
        const processedItems = (service.items || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          imageUrl: item.imageUrl || '',
          description: item.description || ''
        }));

        return {
          id: service._id || service.serviceId,
          serviceId: service.serviceId,
          name: service.name,
          description: service.description || '',
          items: processedItems,
          isActive: service.isActive !== false,
          // Include decompressed data
          ...decompressedData,
          lastUpdated: service.updatedAt,
          createdAt: service.createdAt
        };
      });
    }
    
    // Fallback to static services if no database services found
    return [
      {
        id: 'booking',
        name: 'Theater Booking',
        description: 'Private theater booking for movies and celebrations',
        features: ['Private screening', 'Custom decorations', 'Food & beverages'],
        pricing: 'Varies by theater'
      },
      {
        id: 'celebration',
        name: 'Celebration Packages',
        description: 'Complete celebration packages for special occasions',
        features: ['Decoration', 'Cake', 'Photography', 'Music'],
        pricing: 'Starting from ₹2000'
      }
    ];
  } catch (error) {
    console.error('Error fetching services:', error);
    return [];
  }
}

async function fetchFAQData() {
  try {
    // Fetch from FAQ collection
    const faqData = await (database as any).getAllFAQs?.() || [];
    
    if (faqData && faqData.length > 0) {
      return faqData.map((faq: any) => {
        // Decompress compressed data if exists
        let decompressedData = {};
        if (faq.compressedData) {
          try {
            const buffer = Buffer.from(faq.compressedData.buffer);
            const decompressed = gunzipSync(buffer);
            decompressedData = JSON.parse(decompressed.toString());
            console.log(`✅ Decompressed data for FAQ: ${faq._id}`);
          } catch (error) {
            console.error(`❌ Failed to decompress data for FAQ: ${faq._id}`, error);
          }
        }

        return {
          id: faq._id,
          question: (decompressedData as any).question || 'Question not available',
          answer: (decompressedData as any).answer || 'Answer not available',
          category: (decompressedData as any).category || 'general',
          isActive: faq.isActive !== false,
          order: faq.order || 0,
          // Include any other decompressed data
          ...decompressedData,
          lastUpdated: faq.updatedAt,
          createdAt: faq.createdAt
        };
      });
    }
    
    // Fallback to static FAQs if no database FAQs found
    // Fetch contact details from system settings (not hardcoded)
    let contactPhone = 'Contact us'; // Will be fetched from DB
    let contactWhatsApp = 'Contact us'; // Will be fetched from DB
    
    try {
      const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
      const systemInfoResponse = await fetch(`${siteUrl}/api/ai-system-info`);
      if (systemInfoResponse.ok) {
        const systemInfoResult = await systemInfoResponse.json();
        if (systemInfoResult.success && systemInfoResult.systemInfo) {
          contactPhone = systemInfoResult.systemInfo.sitePhone || contactPhone;
          contactWhatsApp = systemInfoResult.systemInfo.siteWhatsapp || contactWhatsApp;
          console.log('✅ Contact info fetched from system settings for FAQ:', { contactPhone, contactWhatsApp });
        }
      }
    } catch (error) {
      console.error('⚠️ Failed to fetch system settings for FAQ fallback:', error);
    }
    
    return [
      {
        id: 'booking-process',
        question: 'How do I book a theater?',
        answer: `You can book through our website, call ${contactPhone}, or WhatsApp ${contactWhatsApp}. Choose your theater, date, time, and complete the booking.`,
        category: 'booking'
      },
      {
        id: 'cancellation',
        question: 'What is the cancellation policy?',
        answer: 'You can cancel up to 72 hours before your show time and get 80% refund. Cancellations within 72 hours are not eligible for refund.',
        category: 'policy'
      },
      {
        id: 'capacity',
        question: 'How many people can each theater accommodate?',
        answer: 'EROS (Couples): 2 people, PHILIA (Friends): 4-40 people, PRAGMA (Love): 4-8 people, STORGE (Family): 4-12 people.',
        category: 'theaters'
      },
      {
        id: 'timing',
        question: 'What are the available time slots?',
        answer: 'We have multiple time slots throughout the day from 9:00 AM to 10:30 PM. Exact slots vary by theater and date.',
        category: 'timing'
      },
      {
        id: 'payment',
        question: 'What payment methods do you accept?',
        answer: 'We accept cash, UPI, credit/debit cards, and online payments. Advance booking requires payment confirmation.',
        category: 'payment'
      },
      {
        id: 'food',
        question: 'Can we bring outside food?',
        answer: 'We have our own catering services. Outside food policies vary by theater. Please check with our staff.',
        category: 'food'
      },
      {
        id: 'decorations',
        question: 'Do you provide decorations?',
        answer: 'Yes! We offer various decoration packages for birthdays, anniversaries, proposals, and other celebrations.',
        category: 'services'
      },
      {
        id: 'location',
        question: 'Where are you located?',
        answer: 'We are located in Delhi, Dwarka. Contact us for exact address and directions.',
        category: 'location'
      }
    ];
  } catch (error) {
    console.error('Error fetching FAQ:', error);
    return [];
  }
}
