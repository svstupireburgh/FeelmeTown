# 🗄️ GoDaddy SQL Database Integration Setup

## 📋 Overview
This system syncs your JSON booking data (cancelled-bookings.json, completed-bookings.json) from Vercel Blob storage to your GoDaddy cPanel SQL database.

## 🔧 Environment Variables Setup

Add these variables to your `.env.local` file:

```env
# GoDaddy SQL Database Configuration
GODADDY_DB_HOST=your-database-host.godaddy.com
GODADDY_DB_USER=your-database-username
GODADDY_DB_PASSWORD=your-database-password
GODADDY_DB_NAME=your-database-name
GODADDY_DB_PORT=3306
```

## 🏗️ Database Tables Created

### 1. **cancelled_bookings** Table
```sql
CREATE TABLE cancelled_bookings (
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 2. **completed_bookings** Table
```sql
CREATE TABLE completed_bookings (
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## 🚀 How to Use

### 1. **Setup Database Credentials**
1. Login to your GoDaddy cPanel
2. Go to **MySQL Databases**
3. Create a new database or use existing one
4. Create a database user with full permissions
5. Add the credentials to your `.env.local` file

### 2. **Access Sync Interface**
Navigate to: **`http://localhost:3001/godaddy-sync`**

### 3. **Sync Process**
1. **Test Connection** - Verify database connectivity
2. **Create Tables** - Create required database tables
3. **Sync JSON to SQL** - Transfer all JSON data to SQL database

## 📊 Features

### ✅ **Automatic Sync**
- Reads `cancelled-bookings.json` from blob storage
- Reads `completed-bookings.json` from blob storage
- Inserts/updates records in SQL database
- Handles duplicate entries with `ON DUPLICATE KEY UPDATE`

### ✅ **Data Integrity**
- Preserves original JSON data in `original_booking_data` field
- Extracts key fields for easy SQL querying
- Maintains timestamps for tracking

### ✅ **Statistics**
- Real-time booking statistics from SQL database
- Today, This Week, This Month, This Year counts
- Total booking counts

## 🔄 API Endpoints

### **GET /api/sync-to-godaddy**
Get sync status and database statistics

### **POST /api/sync-to-godaddy**
Perform sync operations

**Request Body:**
```json
{
  "action": "sync",        // "test" | "sync"
  "createTables": true     // Create tables if they don't exist
}
```

## 📈 Benefits

### **1. SQL Database Storage**
- All booking data stored in your GoDaddy SQL database
- Easy to query with standard SQL commands
- Backup and export capabilities

### **2. Data Analytics**
- Generate reports using SQL queries
- Track booking trends over time
- Customer behavior analysis

### **3. Integration Ready**
- Connect with other applications
- API access to booking data
- Third-party tool integration

## 🔍 Example SQL Queries

### **Get Today's Cancelled Bookings**
```sql
SELECT * FROM cancelled_bookings 
WHERE DATE(cancelled_at) = CURDATE();
```

### **Get Monthly Revenue from Completed Bookings**
```sql
SELECT 
  YEAR(completed_at) as year,
  MONTH(completed_at) as month,
  SUM(total_amount) as revenue,
  COUNT(*) as bookings
FROM completed_bookings 
GROUP BY YEAR(completed_at), MONTH(completed_at)
ORDER BY year DESC, month DESC;
```

### **Get Top Theaters by Bookings**
```sql
SELECT 
  theater_name,
  COUNT(*) as total_bookings,
  SUM(total_amount) as total_revenue
FROM completed_bookings 
GROUP BY theater_name 
ORDER BY total_bookings DESC;
```

## 🛠️ Troubleshooting

### **Connection Issues**
- Verify GoDaddy database credentials
- Check if database server allows external connections
- Ensure SSL settings are correct

### **Permission Issues**
- Database user needs CREATE, INSERT, UPDATE, SELECT permissions
- Check GoDaddy cPanel database user permissions

### **Data Issues**
- JSON data must be valid format
- Booking IDs should be unique
- Date formats should be consistent

## 🎯 Next Steps

1. **Setup Environment Variables** - Add database credentials
2. **Test Connection** - Use the sync interface to test
3. **Create Tables** - Initialize database structure
4. **Sync Data** - Transfer JSON data to SQL
5. **Verify Results** - Check database for synced data

Your JSON booking data will now be available in your GoDaddy SQL database for advanced analytics and reporting! 🎉
