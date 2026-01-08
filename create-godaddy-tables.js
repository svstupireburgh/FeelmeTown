// Create tables in GoDaddy SQL database
const mysql = require('mysql2/promise');

async function createTables() {
  console.log('🔧 Creating GoDaddy SQL Tables...\n');
  
  const config = {
    host: '72.167.70.199',
    user: 'feelme-town-cybershoora',
    password: 'feelmetown@123',
    database: 'feelme-town-by-cybershooora',
    port: 3306,
    connectTimeout: 10000
  };
  
  try {
    const connection = await mysql.createConnection(config);
    console.log('✅ Connected to database\n');
    
    // Create completed_bookings table
    console.log('📋 Creating completed_bookings table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS completed_bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        theater_name VARCHAR(255),
        booking_date DATE,
        booking_time VARCHAR(50),
        occasion VARCHAR(255),
        number_of_people INT,
        total_amount DECIMAL(10,2),
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        booking_status VARCHAR(50) DEFAULT 'completed',
        payment_status VARCHAR(50),
        original_booking_data JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_booking_id (booking_id),
        INDEX idx_email (email),
        INDEX idx_booking_date (booking_date),
        INDEX idx_completed_at (completed_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ completed_bookings table created!\n');
    
    // Create cancelled_bookings table
    console.log('📋 Creating cancelled_bookings table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS cancelled_bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        theater_name VARCHAR(255),
        booking_date DATE,
        booking_time VARCHAR(50),
        occasion VARCHAR(255),
        number_of_people INT,
        total_amount DECIMAL(10,2),
        cancelled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        cancellation_reason TEXT,
        refund_amount DECIMAL(10,2),
        refund_status VARCHAR(50),
        original_booking_data JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_booking_id (booking_id),
        INDEX idx_email (email),
        INDEX idx_booking_date (booking_date),
        INDEX idx_cancelled_at (cancelled_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ cancelled_bookings table created!\n');
    
    // Verify tables
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 Tables in database:');
    tables.forEach((table, index) => {
      console.log(`   ${index + 1}. ${Object.values(table)[0]}`);
    });
    console.log('\n');
    
    await connection.end();
    console.log('🎉 All tables created successfully!\n');
    console.log('✅ GoDaddy SQL database is ready to use!');
    console.log('✅ Bookings will now automatically sync to SQL database!');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to create tables!\n');
    console.error('Error:', error.message);
    return false;
  }
}

createTables().then(success => {
  process.exit(success ? 0 : 1);
});
