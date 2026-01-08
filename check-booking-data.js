const { MongoClient } = require('mongodb');

// MongoDB connection string - update this with your actual connection string
const MONGODB_URI = 'mongodb://localhost:27017/feelme-town'; // Update this

async function checkBookingData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    
    
    const db = client.db();
    const bookingsCollection = db.collection('bookings');
    
    // Get the latest 5 bookings
    
    
    const latestBookings = await bookingsCollection
      .find({})
      .sort({ _id: -1 })
      .limit(5)
      .toArray();
    
    if (latestBookings.length === 0) {
      
      return;
    }
    
    latestBookings.forEach((booking, index) => {
      
      
      
      
      
      
      
      // Check for occasion-specific fields
      
      
      // Check for dynamic fields (with _label)
      const dynamicFields = Object.keys(booking).filter(key => key.endsWith('_label'));
      if (dynamicFields.length > 0) {
        
        dynamicFields.forEach(labelKey => {
          const fieldKey = labelKey.replace('_label', '');
          const label = booking[labelKey];
          const value = booking[fieldKey];
          
        });
      } else {
        
      }
      
      // Check for legacy fields
      const legacyFields = [
        'occasionPersonName', 'birthdayName', 'birthdayGender',
        'partner1Name', 'partner1Gender', 'partner2Name', 'partner2Gender',
        'dateNightName', 'proposerName', 'proposalPartnerName',
        'valentineName', 'customCelebration'
      ];
      
      const foundLegacyFields = legacyFields.filter(field => 
        booking[field] && booking[field].toString().trim() !== ''
      );
      
      if (foundLegacyFields.length > 0) {
        
        foundLegacyFields.forEach(field => {
          
        });
      } else {
        
      }
      
      // Check for any other custom fields
      const basicFields = [
        '_id', 'customerName', 'email', 'phone', 'theater', 'theaterName',
        'date', 'time', 'status', 'amount', 'occasion', 'bookingDate',
        'bookingType', 'createdAt', 'updatedAt', 'selectedMovies',
        'selectedCakes', 'selectedDecorItems', 'selectedGifts'
      ];
      
      const customFields = Object.keys(booking).filter(key => 
        !basicFields.includes(key) && 
        !key.endsWith('_label') && 
        !key.endsWith('_value') &&
        !legacyFields.includes(key) &&
        booking[key] && 
        booking[key].toString().trim() !== ''
      );
      
      if (customFields.length > 0) {
        
        customFields.forEach(field => {
          
        });
      }
      
      
      Object.keys(booking).forEach(key => {
        const value = booking[key];
        const type = Array.isArray(value) ? 'array' : typeof value;
        
      });
      
      
    });
    
    // Summary
    
    
    
    const withDynamicFields = latestBookings.filter(booking => 
      Object.keys(booking).some(key => key.endsWith('_label'))
    ).length;
    
    const withLegacyFields = latestBookings.filter(booking => {
      const legacyFields = [
        'occasionPersonName', 'birthdayName', 'partner1Name', 
        'dateNightName', 'proposerName', 'valentineName', 'customCelebration'
      ];
      return legacyFields.some(field => booking[field] && booking[field].toString().trim() !== '');
    }).length;
    
    
    
    
    
  } catch (error) {
    
  } finally {
    await client.close();
    
  }
}

// Run the check
