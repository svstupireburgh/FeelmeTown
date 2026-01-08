// Simple script to create admin in MongoDB
const { MongoClient } = require('mongodb');

const MONGODB_URI = "mongodb+srv://teamcybershoora_db_user:zO9NCrGjjQG2MsVv@feelmetown.e1vu4ht.mongodb.net/?retryWrites=true&w=majority&appName=feelmetown";
const DB_NAME = 'feelmetown';

async function createAdmin() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    
    
    const db = client.db(DB_NAME);
    
    // Create admin document
    const admin = {
      username: 'admin',
      password: 'FeelMeTown2024!',
      fullName: 'Administrator',
      email: 'admin@feelmetown.com',
      phone: '+1234567890',
      role: 'Administrator',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Check if admin already exists
    const existingAdmin = await db.collection('admin').findOne({});
    
    if (existingAdmin) {
      
      await db.collection('admin').updateOne(
        { _id: existingAdmin._id },
        { 
          $set: { 
            username: admin.username,
            password: admin.password,
            fullName: admin.fullName,
            email: admin.email,
            phone: admin.phone,
            role: admin.role,
            updatedAt: new Date()
          } 
        }
      );
      
    } else {
      
      await db.collection('admin').insertOne(admin);
      
    }
    
    
    
    
    
  } catch (error) {
    
  } finally {
    await client.close();
  }
}

createAdmin();
