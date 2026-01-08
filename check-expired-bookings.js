// Script to check for expired bookings in MongoDB
const { MongoClient } = require('mongodb');

// MongoDB connection string - Use same as in db-connect.ts
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://teamcybershoora_db_user:zO9NCrGjjQG2MsVv@feelmetown.e1vu4ht.mongodb.net/?retryWrites=true&w=majority&appName=feelmetown";
const DB_NAME = process.env.DB_NAME || 'feelmetown';

async function checkExpiredBookings() {
  let client;
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(DB_NAME);
    
    // Try different collection names
    const collections = ['booking', 'bookings'];
    let collection = null;
    let collectionName = null;
    
    for (const colName of collections) {
      try {
        const testCol = db.collection(colName);
        const count = await testCol.countDocuments();
        if (count > 0) {
          collection = testCol;
          collectionName = colName;
          console.log(`✅ Found collection: ${colName} with ${count} documents`);
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (!collection) {
      console.log('⚠️ No booking collection found. Checking all collections...');
      const allCollections = await db.listCollections().toArray();
      console.log('Available collections:', allCollections.map(c => c.name).join(', '));
      return;
    }
    
    console.log(`\n📊 Checking collection: ${collectionName}\n`);
    
    // Get current time in IST
    const now = new Date();
    const currentIST = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    console.log(`🕐 Current Time (IST): ${currentIST}\n`);
    
    // Get all bookings first to see what we have
    const allBookings = await collection.find({}).toArray();
    console.log(`📋 Total bookings in collection: ${allBookings.length}\n`);
    
    // Check status distribution
    const statusCounts = {};
    allBookings.forEach(b => {
      let status = 'unknown';
      if (b.status) status = b.status;
      else if (b.compressedData) status = 'compressed';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    console.log('📊 Status distribution:');
    Object.keys(statusCounts).forEach(status => {
      console.log(`   ${status}: ${statusCounts[status]}`);
    });
    console.log('');
    
    // Get all confirmed bookings
    const confirmedBookings = await collection.find({ 
      status: 'confirmed' 
    }).toArray();
    
    console.log(`✅ Total confirmed bookings: ${confirmedBookings.length}\n`);
    
    if (confirmedBookings.length === 0) {
      console.log('✅ No confirmed bookings found. Nothing to check.');
      return;
    }
    
    const expiredBookings = [];
    const validBookings = [];
    
    // Helper function to decompress data (simplified - may need full implementation)
    function parseBookingData(booking) {
      // If booking has compressedData, we need to decompress it
      // For now, check if data is in top level
      let bookingData = booking;
      
      // Check if we have date and time at top level
      if (!bookingData.date && booking.compressedData) {
        console.log(`⚠️ Booking ${booking._id} has compressed data - may need decompression`);
      }
      
      return bookingData;
    }
    
    // Check each booking
    for (const booking of confirmedBookings) {
      try {
        const bookingData = parseBookingData(booking);
        
        if (!bookingData.date || !bookingData.time) {
          console.log(`⚠️ Booking ${booking._id || booking.bookingId} missing date or time`);
          continue;
        }
        
        // Parse date
        const dateStr = bookingData.date;
        let bookingDate = null;
        
        if (dateStr.includes(',')) {
          const dateParts = dateStr.split(', ');
          if (dateParts.length >= 2) {
            const dateStrPart = dateParts[1]; // "October 31, 2025"
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                              'July', 'August', 'September', 'October', 'November', 'December'];
            const parts = dateStrPart.split(' ');
            
            if (parts.length >= 2) {
              const monthName = parts[0];
              const dayStr = parts[1].replace(',', '');
              const yearStr = parts[2] || new Date().getFullYear();
              
              const monthIndex = monthNames.indexOf(monthName);
              const day = parseInt(dayStr);
              const year = parseInt(String(yearStr));
              
              if (monthIndex !== -1 && !isNaN(day) && !isNaN(year)) {
                bookingDate = new Date(year, monthIndex, day);
              }
            }
          }
        } else {
          bookingDate = new Date(dateStr);
        }
        
        if (!bookingDate || isNaN(bookingDate.getTime())) {
          console.log(`⚠️ Could not parse date for booking: ${bookingData.bookingId || booking._id}`);
          continue;
        }
        
        // Parse time
        const timeStr = bookingData.time;
        const timeParts = timeStr.split(' - ');
        
        if (timeParts.length !== 2) {
          console.log(`⚠️ Invalid time format for booking: ${bookingData.bookingId || booking._id}`);
          continue;
        }
        
        const endTimeStr = timeParts[1].trim();
        const timeMatch = endTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        
        if (!timeMatch) {
          console.log(`⚠️ Could not parse time for booking: ${bookingData.bookingId || booking._id}`);
          continue;
        }
        
        const [, hoursStr, minutesStr, period] = timeMatch;
        let hour24 = parseInt(hoursStr);
        const minutes = parseInt(minutesStr);
        
        if (period.toUpperCase() === 'PM' && hour24 !== 12) {
          hour24 += 12;
        } else if (period.toUpperCase() === 'AM' && hour24 === 12) {
          hour24 = 0;
        }
        
        // Create end date time in IST
        const bookingYear = bookingDate.getFullYear();
        const bookingMonth = bookingDate.getMonth();
        const bookingDay = bookingDate.getDate();
        
        const endTimeISTString = `${bookingYear}-${String(bookingMonth + 1).padStart(2, '0')}-${String(bookingDay).padStart(2, '0')}T${String(hour24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00+05:30`;
        const endDateTimeIST = new Date(endTimeISTString);
        const expiryDateTimeIST = new Date(endDateTimeIST.getTime() + 5 * 60 * 1000); // +5 minutes
        
        // Check if expired
        if (now.getTime() > expiryDateTimeIST.getTime()) {
          const minutesAgo = Math.floor((now.getTime() - expiryDateTimeIST.getTime()) / (60 * 1000));
          
          expiredBookings.push({
            bookingId: bookingData.bookingId || booking._id,
            _id: booking._id,
            name: bookingData.name,
            email: bookingData.email,
            date: bookingData.date,
            time: bookingData.time,
            expiredMinutesAgo: minutesAgo,
            endTimeIST: endDateTimeIST.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            createdAt: bookingData.createdAt || booking.createdAt
          });
        } else {
          validBookings.push({
            bookingId: bookingData.bookingId || booking._id,
            name: bookingData.name,
            date: bookingData.date,
            time: bookingData.time
          });
        }
      } catch (error) {
        console.error(`❌ Error processing booking ${booking._id}:`, error.message);
      }
    }
    
    // Display results
    console.log('='.repeat(80));
    console.log(`📊 RESULTS:`);
    console.log('='.repeat(80));
    console.log(`✅ Valid bookings: ${validBookings.length}`);
    console.log(`⏰ Expired bookings: ${expiredBookings.length}\n`);
    
    if (expiredBookings.length > 0) {
      console.log('🔴 EXPIRED BOOKINGS (Need to be processed):\n');
      expiredBookings.forEach((booking, index) => {
        console.log(`${index + 1}. Booking ID: ${booking.bookingId}`);
        console.log(`   Name: ${booking.name || 'N/A'}`);
        console.log(`   Email: ${booking.email || 'N/A'}`);
        console.log(`   Date: ${booking.date}`);
        console.log(`   Time: ${booking.time}`);
        console.log(`   End Time (IST): ${booking.endTimeIST}`);
        console.log(`   Expired: ${booking.expiredMinutesAgo} minutes ago`);
        console.log(`   MongoDB ID: ${booking._id}`);
        console.log('');
      });
      
      console.log('\n💡 To process these expired bookings, call:');
      console.log('   POST /api/admin/auto-complete-expired');
      console.log('   or use the auto-cleanup scheduler (runs every 5 minutes)');
    } else {
      console.log('✅ No expired bookings found! All bookings are still valid.\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the check
checkExpiredBookings().catch(console.error);

