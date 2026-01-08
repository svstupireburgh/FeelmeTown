// Script to create admin user in the users collection
const { MongoClient } = require('mongodb');

const MONGODB_URI = "mongodb+srv://teamcybershoora_db_user:zO9NCrGjjQG2MsVv@feelmetown.e1vu4ht.mongodb.net/?retryWrites=true&w=majority&appName=feelmetown";
const DB_NAME = 'feelmetown';

async function createAdminUser() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    
    
    const db = client.db(DB_NAME);
    
    // Create admin user document for users collection
    const adminUser = {
      userId: 'admin-001',
      name: 'Administrator',
      email: 'admin@feelmetown.com',
      phone: '+1234567890',
      role: 'Administrator',
      password: 'FeelMeTown2024!',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Check if admin user already exists in users collection
    const existingAdmin = await db.collection('users').findOne({ role: 'Administrator' });
    
    if (existingAdmin) {
      
      await db.collection('users').updateOne(
        { role: 'Administrator' },
        { 
          $set: { 
            name: adminUser.name,
            email: adminUser.email,
            phone: adminUser.phone,
            password: adminUser.password,
            isActive: true,
            updatedAt: new Date()
          } 
        }
      );
      
    } else {
      
      await db.collection('users').insertOne(adminUser);
      
    }
    
    
    
    
  } catch (error) {
    
  } finally {
    await client.close();
  }
}

createAdminUser();
