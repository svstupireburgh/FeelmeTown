import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';
import { gunzip } from 'zlib';
import { promisify } from 'util';

const gunzipAsync = promisify(gunzip);

// Function to decompress booking data
async function decompressBookingData(compressedData: string) {
  try {
    const buffer = Buffer.from(compressedData, 'base64');
    const decompressed = await gunzipAsync(buffer);
    const jsonString = decompressed.toString('utf8');
    return JSON.parse(jsonString);
  } catch (error) {
    
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    
    
    // Step 1: Get all occasions from database to know what fields to look for
    
    const occasions = await database.getAllOccasions();
    
    
    // Create a map of occasion names to their required fields
    const occasionFieldsMap: any = {};
    occasions.forEach(occasion => {
      if (occasion.requiredFields && occasion.requiredFields.length > 0) {
        occasionFieldsMap[occasion.name] = {
          requiredFields: occasion.requiredFields,
          fieldLabels: occasion.fieldLabels || {}
        };
        
      }
    });
    
    // Step 2: Get latest 5 bookings
    
    const bookings = await database.getLatestBookings(5);
    
    if (!bookings || bookings.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No bookings found in database',
        data: []
      });
    }
    
    const analysis = await Promise.all(bookings.map(async (booking: any, index: number) => {
      let actualBookingData = booking;
      
      // Check if booking has compressed data
      if (booking.compressedData) {
        
        const decompressedData = await decompressBookingData(booking.compressedData);
        if (decompressedData) {
          // Merge decompressed data with existing booking data
          actualBookingData = { ...booking, ...decompressedData };
          
        }
      }
      
      // Check for dynamic fields (with _label)
      const dynamicFields = Object.keys(actualBookingData).filter(key => key.endsWith('_label'));
      const dynamicFieldsData: any = {};
      
      dynamicFields.forEach(labelKey => {
        const fieldKey = labelKey.replace('_label', '');
        const label = actualBookingData[labelKey];
        const value = actualBookingData[fieldKey];
        dynamicFieldsData[fieldKey] = { label, value };
      });
      
      // Check for occasion-specific fields based on database occasions
      
      const bookingOccasion = actualBookingData.occasion || booking.occasion;
      const occasionInfo = occasionFieldsMap[bookingOccasion];
      
      const occasionSpecificFields: any = {};
      if (occasionInfo && occasionInfo.requiredFields) {
        
        
        // Get all non-basic fields from booking that might be occasion fields
        const basicFields = [
          '_id', 'id', 'customerName', 'email', 'phone', 'theater', 'theaterName',
          'date', 'time', 'status', 'amount', 'occasion', 'bookingDate',
          'bookingType', 'createdAt', 'updatedAt', 'selectedMovies',
          'selectedCakes', 'selectedDecorItems', 'selectedGifts', 'compressedData',
          'bookingId', 'name', 'totalAmount', 'occasionPersonName', 'createdBy',
          'staffId', 'staffName', 'notes', 'isManualBooking', 'expiredAt'
        ];
        
        const possibleOccasionFields = Object.keys(actualBookingData).filter(key => 
          !basicFields.includes(key) && 
          !key.endsWith('_label') && 
          !key.endsWith('_value') &&
          actualBookingData[key] && 
          actualBookingData[key].toString().trim() !== ''
        );
        
        
        
        
        // Map found fields to expected fields
        possibleOccasionFields.forEach((bookingFieldKey, index) => {
          const fieldValue = actualBookingData[bookingFieldKey];
          
          // Try to match with database field by position or name similarity
          let matchedDbField = null;
          let fieldLabel = bookingFieldKey;
          
          // Method 1: Direct match
          if (occasionInfo.requiredFields.includes(bookingFieldKey)) {
            matchedDbField = bookingFieldKey;
            fieldLabel = occasionInfo.fieldLabels[bookingFieldKey] || bookingFieldKey;
          }
          
          // Method 2: Position-based match (first booking field -> first db field)
          if (!matchedDbField && index < occasionInfo.requiredFields.length) {
            matchedDbField = occasionInfo.requiredFields[index];
            fieldLabel = occasionInfo.fieldLabels[matchedDbField] || matchedDbField;
          }
          
          // Method 3: Use booking field name as label
          if (!matchedDbField) {
            matchedDbField = bookingFieldKey;
            fieldLabel = bookingFieldKey;
          }
          
          occasionSpecificFields[bookingFieldKey] = {
            value: fieldValue,
            label: fieldLabel,
            dbField: matchedDbField,
            source: 'booking_data'
          };
          
          
        });
      } else {
        
      }
      
      // Check for other custom fields
      const basicFields = [
        '_id', 'id', 'customerName', 'email', 'phone', 'theater', 'theaterName',
        'date', 'time', 'status', 'amount', 'occasion', 'bookingDate',
        'bookingType', 'createdAt', 'updatedAt', 'selectedMovies',
        'selectedCakes', 'selectedDecorItems', 'selectedGifts', 'compressedData'
      ];
      
      const customFields: any = {};
      // Skip occasion-specific fields that we already processed
      const occasionFieldKeys = occasionInfo ? occasionInfo.requiredFields : [];
      
      Object.keys(actualBookingData).forEach(key => {
        if (!basicFields.includes(key) && 
            !key.endsWith('_label') && 
            !key.endsWith('_value') &&
            !occasionFieldKeys.includes(key) &&
            actualBookingData[key] && 
            actualBookingData[key].toString().trim() !== '') {
          customFields[key] = actualBookingData[key];
        }
      });
      
      return {
        bookingIndex: index + 1,
        bookingId: booking._id || booking.id,
        customerName: actualBookingData.customerName || booking.customerName,
        occasion: actualBookingData.occasion || booking.occasion,
        date: actualBookingData.date || booking.date,
        status: actualBookingData.status || booking.status,
        hasCompressedData: !!booking.compressedData,
        decompressedSuccessfully: !!booking.compressedData && !!actualBookingData,
        dynamicFields: dynamicFieldsData,
        occasionSpecificFields: occasionSpecificFields,
        customFields: customFields,
        allFields: Object.keys(actualBookingData),
        totalFields: Object.keys(actualBookingData).length,
        hasDynamicFields: dynamicFields.length > 0,
        hasOccasionFields: Object.keys(occasionSpecificFields).length > 0,
        hasCustomFields: Object.keys(customFields).length > 0
      };
    }));
    
    // Summary
    const summary = {
      totalBookings: bookings.length,
      withDynamicFields: analysis.filter((a: any) => a.hasDynamicFields).length,
      withOccasionFields: analysis.filter((a: any) => a.hasOccasionFields).length,
      withCustomFields: analysis.filter((a: any) => a.hasCustomFields).length,
      withNoOccasionData: analysis.filter((a: any) => !a.hasDynamicFields && !a.hasOccasionFields && !a.hasCustomFields).length,
      occasionsFound: Object.keys(occasionFieldsMap).length,
      occasionFieldsMap: occasionFieldsMap
    };
    
    return NextResponse.json({
      success: true,
      message: 'Booking data analysis completed',
      summary,
      bookings: analysis
    });
    
  } catch (error) {
    
    return NextResponse.json({
      success: false,
      message: 'Error checking booking data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

