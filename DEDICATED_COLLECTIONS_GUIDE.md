# 🗄️ Dedicated MongoDB Collections Guide

## ✅ **Separate Collections Created!**

आपके लिए dedicated collections बना दिए गए हैं जो easily fetch और update हो सकते हैं।

### 📊 **Collection Structure:**

| Collection Name | Purpose | Document Structure |
|----------------|---------|-------------------|
| **`pricing`** | Theater pricing data | `{ type: 'current', theaterBasePrice, extraGuestFee, ... }` |
| **`cancelReasons`** | Cancel reasons list | `{ type: 'current', reasons: [...], totalReasons }` |
| **`bookings`** | Active bookings | Existing booking documents |
| **`cancelledBookings`** | Cancelled bookings | Existing cancelled booking documents |
| **`completedBookings`** | Completed bookings | Existing completed booking documents |

### 🚀 **API Endpoints:**

#### **1. Pricing Collection (`/api/mongo-pricing`)**

**GET** - Fetch pricing data:
```javascript
const response = await fetch('/api/mongo-pricing');
const data = await response.json();
// Returns: { success: true, pricing: {...}, source: 'pricing_collection' }
```

**POST** - Update pricing data:
```javascript
const response = await fetch('/api/mongo-pricing', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    theaterBasePrice: 1499,
    extraGuestFee: 299,
    slotBookingFee: 599
  })
});
```

#### **2. Cancel Reasons Collection (`/api/mongo-cancel-reasons`)**

**GET** - Fetch cancel reasons:
```javascript
const response = await fetch('/api/mongo-cancel-reasons');
const data = await response.json();
// Returns: { success: true, reasons: [...], totalReasons: 10 }
```

**POST** - Manage cancel reasons:
```javascript
// Add new reason
await fetch('/api/mongo-cancel-reasons', {
  method: 'POST',
  body: JSON.stringify({ action: 'add', newReason: 'New reason' })
});

// Remove reason
await fetch('/api/mongo-cancel-reasons', {
  method: 'POST', 
  body: JSON.stringify({ action: 'remove', removeReason: 'Old reason' })
});

// Update entire list
await fetch('/api/mongo-cancel-reasons', {
  method: 'POST',
  body: JSON.stringify({ action: 'update', reasons: ['Reason 1', 'Reason 2'] })
});
```

### 📋 **Collection Documents:**

#### **Pricing Collection Document:**
```json
{
  "_id": "ObjectId",
  "type": "current",
  "theaterBasePrice": 1399,
  "extraGuestFee": 299,
  "slotBookingFee": 499,
  "movies": [],
  "cakes": [],
  "decorations": [],
  "gifts": [],
  "createdAt": "2025-10-29T05:03:00.000Z",
  "lastUpdated": "2025-10-29T05:03:00.000Z",
  "updatedAt": "2025-10-29T05:03:00.000Z",
  "version": "1.0"
}
```

#### **Cancel Reasons Collection Document:**
```json
{
  "_id": "ObjectId",
  "type": "current",
  "reasons": [
    "Customer requested cancellation",
    "Payment issues",
    "Schedule conflict",
    "Emergency situation",
    "Weather conditions",
    "Technical issues",
    "Venue unavailable",
    "Personal reasons",
    "Medical emergency",
    "Other"
  ],
  "createdAt": "2025-10-29T05:03:00.000Z",
  "lastUpdated": "2025-10-29T05:03:00.000Z",
  "updatedAt": "2025-10-29T05:03:00.000Z",
  "totalReasons": 10
}
```

### ⚡ **Benefits of Dedicated Collections:**

✅ **Fast Queries** - Direct collection access
✅ **Easy Indexing** - Create indexes on specific fields
✅ **Better Performance** - No need to search through settings
✅ **Scalability** - Each collection can grow independently
✅ **Clean Structure** - Organized data storage
✅ **Easy Backup** - Export specific collections

### 🔍 **MongoDB Queries:**

#### **Direct MongoDB Queries:**
```javascript
// Get pricing
db.pricing.findOne({ type: 'current' })

// Get cancel reasons
db.cancelReasons.findOne({ type: 'current' })

// Update pricing
db.pricing.updateOne(
  { type: 'current' },
  { $set: { theaterBasePrice: 1599 } }
)

// Add cancel reason
db.cancelReasons.updateOne(
  { type: 'current' },
  { $push: { reasons: 'New reason' } }
)
```

### 🖥️ **Management Interface:**

Navigate to: **`http://localhost:3001/mongo-manager`**

**Features:**
- 💰 **Pricing Tab** - Edit all pricing data
- 📋 **Cancel Reasons Tab** - Add/remove reasons
- 📊 **Bookings Tab** - View booking data

### 🔄 **Migration from Settings Collection:**

The system automatically creates default data if collections don't exist:

1. **First API call** creates collection with defaults
2. **Upsert operations** ensure data consistency
3. **Automatic timestamps** for tracking changes

### 📈 **Performance Comparison:**

| Operation | Settings Collection | Dedicated Collections |
|-----------|-------------------|---------------------|
| **Get Pricing** | Find settings → Extract pricing | Direct find on pricing |
| **Update Pricing** | Update entire settings | Update only pricing fields |
| **Search Reasons** | Filter within settings | Direct array operations |
| **Add Reason** | Modify settings object | Array push operation |

### 🎯 **Usage Examples:**

#### **Frontend Integration:**
```typescript
// Pricing management
const loadPricing = async () => {
  const response = await fetch('/api/mongo-pricing');
  const data = await response.json();
  if (data.success) {
    setPricing(data.pricing);
  }
};

// Cancel reasons management
const addReason = async (newReason: string) => {
  const response = await fetch('/api/mongo-cancel-reasons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'add', newReason })
  });
  const data = await response.json();
  if (data.success) {
    loadReasons(); // Refresh list
  }
};
```

### 🔧 **Database Indexes (Recommended):**

```javascript
// Create indexes for better performance
db.pricing.createIndex({ type: 1 })
db.cancelReasons.createIndex({ type: 1 })
db.pricing.createIndex({ lastUpdated: -1 })
db.cancelReasons.createIndex({ totalReasons: 1 })
```

## ✅ **Ready to Use!**

Your dedicated collections are now ready:
- **Fast fetch** operations
- **Easy updates** with upsert
- **Clean data structure**
- **Better performance**

**अब आपका data easily fetch और update हो सकेगा dedicated collections से!** 🎉
