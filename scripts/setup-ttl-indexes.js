// MongoDB TTL Index Setup Script for FeelME Town
// This script creates TTL indexes for automatic deletion of expired entries

const { MongoClient } = require('mongodb');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://teamcybershoora_db_user:zO9NCrGjjQG2MsVv@feelmetown.e1vu4ht.mongodb.net/?retryWrites=true&w=majority&appName=feelmetown";
const DB_NAME = 'feelmetown';

async function setupTTLIndexes() {
  let client;
  
  try {
    
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(DB_NAME);
    
    
    // 1. TTL Index for regular bookings (expiredAt field)
    
    const bookingCollection = db.collection('booking');
    
    try {
      await bookingCollection.createIndex(
        { "expiredAt": 1 },
        { 
          expireAfterSeconds: 0, // Delete immediately when expiredAt time is reached
          name: "expiredAt_ttl",
          background: true
        }
      );
      
    } catch (error) {
      if (error.code === 85) {
        
      } else {
        
      }
    } 
    
    // 2. TTL Index for incomplete bookings (expiresAt field)
    
    const incompleteBookingCollection = db.collection('incomplete_booking');
    
    try {
      await incompleteBookingCollection.createIndex(
        { "expiresAt": 1 },
        { 
          expireAfterSeconds: 0, // Delete immediately when expiresAt time is reached
          name: "expiresAt_ttl",
          background: true
        }
      );
      
    } catch (error) {
      if (error.code === 85) {
        
      } else {
        
      }
    }

    // 3. TTL Index for edit booking requests (createdAt field, 12 hours)
    const editRequestCollection = db.collection('edit_booking_request');
    try {
      await editRequestCollection.createIndex(
        { "createdAt": 1 },
        {
          expireAfterSeconds: 43200, // 12 hours in seconds
          name: "createdAt_12h_ttl",
          background: true
        }
      );
      
    } catch (error) {
      if (error.code === 85) {
        
      } else {
        
      }
    }
    
    // 4. List all indexes to verify
    
    const bookingIndexes = await bookingCollection.indexes();
    bookingIndexes.forEach(index => {
      
      if (index.expireAfterSeconds !== undefined) {
        
      }
    });
    
    
    const incompleteIndexes = await incompleteBookingCollection.indexes();
    incompleteIndexes.forEach(index => {
      
      if (index.expireAfterSeconds !== undefined) {
        
      }
    });

    const editRequestIndexes = await editRequestCollection.indexes();
    editRequestIndexes.forEach(index => {
      
      if (index.expireAfterSeconds !== undefined) {
        
      }
    });
    
    
    
    
    
    
    
    
    
  } catch (error) {
    
  } finally {
    if (client) {
      await client.close();
      
    }
  }
}

// Run the setup
setupTTLIndexes()
  .then(() => {
    console.log('TTL index setup completed for booking, incomplete_booking, and edit_booking_request');
    process.exit(0);
  })
  .catch((err) => {
    console.error('TTL index setup failed:', err);
    process.exit(1);
  });

