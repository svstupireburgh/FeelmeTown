import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

export async function GET(request: NextRequest) {
  try {
    // Get comprehensive FeelMe Town information
    const knowledgeBase = {
      // Basic Information
      businessInfo: {
        name: "FeelMe Town",
        tagline: "Premium Private Theater Experience",
        description: "FeelMe Town is a luxury private theater venue offering premium movie experiences, special celebrations, and corporate events in Delhi.",
        established: "2024",
        location: {
          address: "Builtup Plot No.G-123-A, Extn-I, Sector 7 Dwarka, Southwest Delhi, DL 110045, India",
          area: "Dwarka, Delhi",
          pincode: "110045"
        }
      },

      // Contact Information
      contactInfo: {
        phone: "+91 87006 71099",
        whatsapp: "+91 88826 69755",
        email: "svstupireburgh@gmail.com",
        website: "https://feelmetown.com",
        operatingHours: {
          days: "Monday - Sunday",
          time: "10:00 AM - 12:00 AM (Midnight)",
          note: "Open 7 days a week"
        }
      },

      // Social Media
      socialMedia: {
        facebook: "https://www.facebook.com/feelmetown",
        instagram: "https://www.instagram.com/feelmetown/",
        youtube: "https://www.youtube.com/feelmetown-mrss"
      },

      // Theater Information (fetched from database theaters collection)
      theaters: [],

      // Time Slots Information (will be populated from database)
      timeSlots: [],

      // Dynamic Data Fields (populated from database)
      occasionDetails: [],
      coupons: [],
      gallery: [],
      settings: {},

      // Services Available (fetched from database services collection)
      services: {
        dynamicServices: [],
        // Basic service categories (will be enhanced with database data)
        foodBeverages: {
          name: "Food & Beverages",
          description: "Delectable food offerings and carefully chosen drink options",
          items: "Dynamic items from database"
        },
        gifts: {
          name: "Gifts",
          description: "Carefully chosen assortment of presents for celebrations",
          items: "Dynamic items from database"
        },
        decorations: {
          name: "Party Place & Decorations", 
          description: "Versatile party room with modern facilities and configurable layouts",
          items: "Dynamic items from database"
        }
      },

      // Pricing Information
      pricing: {
        slotBookingFee: 600,
        extraGuestFee: 400,
        convenienceFee: 0,
        decorationCost: 750,
        advancePaymentPercentage: 28
      },

      // Booking Information
      bookingInfo: {
        process: [
          "Select theater and time slot",
          "Choose occasion and add-ons",
          "Provide contact details",
          "Make advance payment (28% of total)",
          "Receive confirmation",
          "Enjoy your experience"
        ],
        paymentMethods: [
          "Online payment gateway",
          "UPI payments",
          "Credit/Debit cards",
          "Net banking"
        ],
        cancellationPolicy: "24-hour advance notice required for cancellations",
        reschedulingPolicy: "Free rescheduling up to 24 hours before booking"
      },

      // Special Occasions Supported (fetched from database occasions collection)
      occasions: [],

      // Facilities & Amenities
      facilities: [
        "Premium 4K Projection System",
        "Dolby Atmos Surround Sound",
        "Luxury Reclining Seats", 
        "Climate Control",
        "High-Speed WiFi",
        "Parking Available",
        "Wheelchair Accessible",
        "Clean Restrooms",
        "Security Staff",
        "24/7 Customer Support"
      ],

      // Frequently Asked Questions
      faqs: [
        {
          question: "How do I book a theater?",
          answer: "You can book through our website by selecting your preferred theater, date, and time slot. Complete the booking form and make the advance payment."
        },
        {
          question: "What is included in the booking?",
          answer: "Your booking includes the theater rental, basic amenities, and access to our premium facilities. Additional services like food, decorations, and gifts can be added."
        },
        {
          question: "Can I bring my own food?",
          answer: "We have a comprehensive food and beverage menu. Outside food may be allowed for special dietary requirements - please contact us in advance."
        },
        {
          question: "What is the cancellation policy?",
          answer: "We require 24-hour advance notice for cancellations. Rescheduling is free up to 24 hours before your booking time."
        },
        {
          question: "Do you provide decorations?",
          answer: "Yes, we offer themed decorations and party setup services. You can choose from our decoration packages or customize according to your needs."
        }
      ]
    };

    // Try to get ALL dynamic data from database
    try {
      console.log('🔄 Fetching all data from database...');
      
      const [dynamicData, services, occasions, coupons, galleryImages, settings] = await Promise.all([
        // Fetch theaters and time slots from dynamic endpoint
        fetch(`${request.nextUrl.origin}/api/theaters-dynamic`).then(res => res.json()).catch(() => ({ success: false, data: null })),
        database.getAllServices().catch(() => []),
        database.getAllOccasions().catch(() => []),
        database.getAllCoupons().catch(() => []),
        database.getAllGalleryImages().catch(() => []),
        database.getSettings().catch(() => ({}))
      ]);

      // Add dynamic theater and time slot data to knowledge base
      if (dynamicData.success && dynamicData.data) {
        knowledgeBase.theaters = dynamicData.data.theaters || [];
        knowledgeBase.timeSlots = dynamicData.data.timeSlots || [];
        
        // Log detailed theater data structure
        console.log('✅ Fetched dynamic theater data from database:', {
          theaters: knowledgeBase.theaters.length,
          timeSlots: knowledgeBase.timeSlots.length,
          source: dynamicData.data.source,
          theaterStructure: knowledgeBase.theaters.map((theater: any) => ({
            id: theater.theaterId || theater.id,
            name: theater.name,
            type: theater.type,
            price: theater.price,
            capacity: theater.capacity,
            features: theater.features,
            description: theater.description,
            images: theater.images,
            isActive: theater.isActive,
            displayOrder: theater.displayOrder,
            allFields: Object.keys(theater)
          }))
        });
      } else {
        console.log('⚠️ No dynamic theater data available, using empty arrays');
        knowledgeBase.theaters = [];
        knowledgeBase.timeSlots = [];
      }

      // Add dynamic services data
      if (services.length > 0) {
        (knowledgeBase.services as any).dynamicServices = services;
        // Update static service descriptions with dynamic data
        (knowledgeBase.services as any).foodBeverages = {
          ...knowledgeBase.services.foodBeverages,
          items: services.find((s: any) => s.name?.toLowerCase().includes('food'))?.items || knowledgeBase.services.foodBeverages.items
        };
        (knowledgeBase.services as any).gifts = {
          ...knowledgeBase.services.gifts,
          items: services.find((s: any) => s.name?.toLowerCase().includes('gift'))?.items || knowledgeBase.services.gifts.items
        };
        (knowledgeBase.services as any).decorations = {
          ...knowledgeBase.services.decorations,
          items: services.find((s: any) => s.name?.toLowerCase().includes('decor'))?.items || knowledgeBase.services.decorations.items
        };
      }

      // Add dynamic occasions data from database
      if (occasions.length > 0) {
        (knowledgeBase as any).occasions = occasions.map((o: any) => o.name);
        // Add occasion details
        (knowledgeBase as any).occasionDetails = occasions.map((occasion: any) => ({
          id: occasion.occasionId || occasion._id,
          name: occasion.name,
          imageUrl: occasion.imageUrl,
          requiredFields: occasion.requiredFields || [],
          isActive: occasion.isActive
        }));
        console.log('✅ Fetched occasions from database:', occasions.length);
      } else {
        console.log('⚠️ No occasions data available from database');
        (knowledgeBase as any).occasions = [];
        (knowledgeBase as any).occasionDetails = [];
      }

      // Process coupons and gallery data
      const couponsData = Array.isArray(coupons) ? coupons : (coupons as any)?.coupons || [];
      const galleryData = Array.isArray(galleryImages) ? galleryImages : (galleryImages as any)?.images || [];

      // Add dynamic coupons data
      if (couponsData.length > 0) {
        (knowledgeBase as any).coupons = couponsData.map((coupon: any) => ({
          id: coupon._id,
          code: coupon.code,
          discount: coupon.discount,
          type: coupon.type,
          isActive: coupon.isActive,
          validUntil: coupon.validUntil
        }));
      }

      // Add dynamic gallery data
      if (galleryData.length > 0) {
        (knowledgeBase as any).gallery = galleryData.map((image: any) => ({
          id: image._id,
          url: image.url,
          caption: image.caption,
          category: image.category,
          isActive: image.isActive
        }));
      }

      // Add dynamic settings data
      if (settings && Object.keys(settings).length > 0) {
        knowledgeBase.settings = settings;
      }

      console.log('✅ Complete dynamic data fetched from database:', {
        theaters: knowledgeBase.theaters.length,
        timeSlots: knowledgeBase.timeSlots?.length || 0,
        services: services.length,
        occasions: occasions.length,
        coupons: couponsData.length,
        galleryImages: galleryData.length,
        hasSettings: Object.keys(settings || {}).length > 0
      });
    } catch (error) {
      console.log('⚠️ Using static knowledge base data due to error:', error);
    }

    return NextResponse.json({
      success: true,
      data: knowledgeBase,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Knowledge Base API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch knowledge base',
        data: null 
      },
      { status: 500 }
    );
  }
}
