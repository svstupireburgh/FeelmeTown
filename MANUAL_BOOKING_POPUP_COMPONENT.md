# ManualBookingPopup Component - Complete Documentation

## Overview 🎯

**ManualBookingPopup** ek dedicated component hai jo **BookingPopup** ka full copy hai with proper dynamic fields support. Ye specifically manual bookings ke liye design kiya gaya hai aur hamesha `isManualMode = true` mode mein kaam karta hai.

---

## Component Details 📋

### File Location
```
src/components/ManualBookingPopup.tsx
```

### What's Different from BookingPopup?

| Feature | BookingPopup | ManualBookingPopup |
|---------|--------------|-------------------|
| **isManualMode prop** | Optional (default: false) | Always true (hardcoded) |
| **Use Case** | Regular + Manual bookings | Only Manual bookings |
| **Props** | `isManualMode?: boolean` | No manual mode prop needed |
| **Status in DB** | "completed" or "manual" | Always "manual" |
| **Component Name** | BookingPopup | ManualBookingPopup |

---

## Props Interface 📝

```typescript
interface ManualBookingPopupProps {
  isOpen: boolean;        // Show/hide popup
  onClose: () => void;    // Close callback
  onSuccess?: () => void; // Success callback (optional)
}
```

**No need for `isManualMode` prop** - it's always true internally!

---

## Usage Example 🚀

### Simple Usage

```typescript
import ManualBookingPopup from '@/components/ManualBookingPopup';
import { BookingProvider } from '@/contexts/BookingContext';
import { DatePickerProvider } from '@/contexts/DatePickerContext';

export default function AdminPage() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Manual Booking
      </button>

      <BookingProvider>
        <DatePickerProvider>
          <ManualBookingPopup
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            onSuccess={() => {
              console.log('Manual booking created!');
              // Refresh bookings list
            }}
          />
        </DatePickerProvider>
      </BookingProvider>
    </>
  );
}
```

---

## Features Included ✨

ManualBookingPopup includes **ALL** features of BookingPopup:

### 1. **Dynamic Occasion Fields** 🎂
- Birthday → Name + Gender
- Anniversary → Partner 1 & 2 Names + Genders
- Proposal → Proposer + Partner names
- Valentine's Day → Valentine name
- Date Night → Person name
- **All database-configured occasions supported!**

### 2. **Theater Selection** 🎭
- Real-time theater data from database
- Time slot selection with availability
- Date picker with booked slots check

### 3. **Add-on Services** 🎁
- Cakes selection
- Decor items selection
- Gifts selection
- Movies selection

### 4. **Pricing Calculation** 💰
- Base theater price
- Extra guest charges
- Service add-ons
- Coupon code support
- Real-time total calculation

### 5. **Form Validation** ✅
- Required fields check
- Email format validation
- Phone number validation
- Theater capacity check
- Time slot availability

### 6. **Beautiful UI** 🎨
- Multi-tab interface
- Smooth animations
- Progress tracking
- Success animation
- Error handling

---

## Database Saved Data 💾

When booking is created via ManualBookingPopup:

```json
{
  "bookingId": "FMT-2025-1001-001",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+919876543210",
  "theaterName": "EROS - COUPLES",
  "date": "2025-12-25",
  "time": "07:30 PM - 10:30 PM",
  "occasion": "Birthday",
  "occasionData": {
    "birthdayName": "John",
    "birthdayGender": "Male"
  },
  "numberOfPeople": 2,
  "status": "manual",           // ✅ Always manual
  "isManualBooking": true,      // ✅ Always true
  "bookingType": "Manual",      // ✅ Always Manual
  "totalAmount": 2500,
  "advancePayment": 600,
  "venuePayment": 1900,
  "selectedCakes": [...],
  "selectedDecorItems": [...],
  "selectedGifts": [...],
  "selectedMovies": [...],
  "createdAt": "2025-10-18T10:30:00Z"
}
```

---

## Integration with Administrator 🔧

### Step 1: Import

```typescript
import ManualBookingPopup from '@/components/ManualBookingPopup';
import { BookingProvider } from '@/contexts/BookingContext';
import { DatePickerProvider } from '@/contexts/DatePickerContext';
```

### Step 2: State

```typescript
const [isManualBookingOpen, setIsManualBookingOpen] = useState(false);
```

### Step 3: Button

```typescript
<button onClick={() => setIsManualBookingOpen(true)}>
  ➕ Manual Booking
</button>
```

### Step 4: Component

```typescript
<BookingProvider>
  <DatePickerProvider>
    <ManualBookingPopup
      isOpen={isManualBookingOpen}
      onClose={() => setIsManualBookingOpen(false)}
      onSuccess={() => {
        fetchBookings(); // Refresh list
        setTimeout(() => setIsManualBookingOpen(false), 3000);
      }}
    />
  </DatePickerProvider>
</BookingProvider>
```

---

## Comparison with BookingPopup 🔄

### When to Use BookingPopup

```typescript
// Use BookingPopup when you need flexibility:
<BookingPopup
  isOpen={isOpen}
  onClose={onClose}
  isManualMode={isManual}  // Can be true or false
  onSuccess={onSuccess}
/>

// Regular customer booking
<BookingPopup isOpen={...} onClose={...} />

// Manual booking (admin controlled)
<BookingPopup isOpen={...} onClose={...} isManualMode={true} />
```

### When to Use ManualBookingPopup

```typescript
// Use ManualBookingPopup when it's ALWAYS manual:
<ManualBookingPopup
  isOpen={isOpen}
  onClose={onClose}
  onSuccess={onSuccess}
  // No isManualMode prop needed!
/>

// Simpler, cleaner code for admin manual bookings
```

---

## Benefits ✨

### Using ManualBookingPopup:

✅ **Cleaner Code**
- No need to pass `isManualMode={true}` every time
- Less prone to errors
- Clear intention (it's for manual bookings only)

✅ **Consistency**
- Always creates manual bookings
- Status always "manual"
- No confusion about mode

✅ **Same Features**
- Full BookingPopup functionality
- All dynamic fields
- All add-on services
- Beautiful UI

✅ **Easy Maintenance**
- Independent component
- Can be customized for admin-specific needs
- Won't affect regular BookingPopup

---

## Code Structure 📁

```
ManualBookingPopup.tsx
├── Imports (same as BookingPopup)
├── Interfaces
│   ├── OccasionOption
│   ├── BookingForm
│   └── ManualBookingPopupProps ✨ (simplified)
├── Component
│   ├── const isManualMode = true ✨ (hardcoded)
│   ├── All state management (same)
│   ├── All functions (same)
│   ├── Validation logic (same)
│   ├── Pricing calculations (same)
│   └── UI rendering (same)
└── Export
```

---

## Internal Logic 🔧

### Line 75: Manual Mode

```typescript
const isManualMode = true; // Always manual
```

This ensures:
- Status is always "manual"
- `isManualBooking` flag is always true
- `bookingType` is always "Manual"

### Booking Save Logic (Line 1667)

```typescript
status: isManualMode ? 'manual' : 'completed',
// Since isManualMode = true, status will ALWAYS be 'manual'
```

---

## Testing Checklist ✅

- [ ] Import ManualBookingPopup
- [ ] Wrap with BookingProvider & DatePickerProvider
- [ ] Open popup
- [ ] Fill all required fields
- [ ] Select theater, date, time
- [ ] Choose occasion
- [ ] Fill dynamic occasion fields
- [ ] Add services (optional)
- [ ] Submit booking
- [ ] Check database: status = "manual"
- [ ] Check database: isManualBooking = true
- [ ] Check database: bookingType = "Manual"
- [ ] Verify onSuccess callback triggers

---

## Troubleshooting 🔧

### Issue: Popup doesn't show
**Solution**: Check BookingProvider & DatePickerProvider are wrapping the component

### Issue: Status not "manual"
**Solution**: This shouldn't happen! Check line 75 in ManualBookingPopup.tsx

### Issue: Missing context error
**Solution**: Make sure both providers are imported and wrapping:
```typescript
<BookingProvider>
  <DatePickerProvider>
    <ManualBookingPopup ... />
  </DatePickerProvider>
</BookingProvider>
```

### Issue: Can't see dynamic occasion fields
**Solution**: 
1. Check occasion is selected
2. Verify occasion database has `requiredFields` and `fieldLabels`
3. Check browser console for errors

---

## API Endpoints Used 🔌

### POST /api/booking
Creates the booking with manual status

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "status": "manual",
  "isManualBooking": true,
  "bookingType": "Manual",
  // ... rest of data
}
```

### GET /api/occasions
Fetches dynamic occasion configurations

### GET /api/admin/theaters
Fetches theater data for selection

### GET /api/pricing
Fetches pricing configuration

---

## File Size & Performance 📊

- **File Size**: ~600KB (same as BookingPopup)
- **Load Time**: Lazy loaded, only when imported
- **Memory**: Shared with BookingPopup if both used
- **Performance**: Identical to BookingPopup

---

## Future Customization Ideas 💡

Since it's a separate component, you can:

1. **Add Admin-Only Features**
   - Internal notes field
   - Staff assignment
   - Custom pricing override
   - Payment tracking

2. **Simplify UI**
   - Remove payment step (manual payment)
   - Skip terms & conditions
   - Direct submit

3. **Add Admin Validations**
   - Check for duplicate bookings
   - Verify customer details
   - Admin approval workflow

---

## Summary 📝

### What You Got:

| Feature | Status |
|---------|--------|
| Full BookingPopup code | ✅ Copied |
| Component renamed | ✅ ManualBookingPopup |
| Manual mode hardcoded | ✅ Always true |
| Props simplified | ✅ No isManualMode needed |
| All features included | ✅ 100% same |
| Ready to use | ✅ Yes! |

### Files Created:

- ✅ `src/components/ManualBookingPopup.tsx` (Full component)
- ✅ Documentation (this file)

### How to Use:

```typescript
// Simple 3-step integration:

// 1. Import
import ManualBookingPopup from '@/components/ManualBookingPopup';

// 2. Wrap with providers
<BookingProvider>
  <DatePickerProvider>
    
    // 3. Use it!
    <ManualBookingPopup
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onSuccess={() => console.log('Done!')}
    />
    
  </DatePickerProvider>
</BookingProvider>
```

---

**Status**: ✅ READY TO USE!

ManualBookingPopup is a complete, dedicated component with all BookingPopup features, specifically designed for manual bookings! 🎉

