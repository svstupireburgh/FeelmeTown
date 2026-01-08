# Booking Popup Component

A comprehensive booking popup component for FeelME Town theater booking system.

## Features

### 🎯 Multi-Tab Interface
- **Overview Tab**: Basic booking information (name, people count, contact details, decoration preference)
- **Occasion Tab**: Special occasion selection (Birthday, Anniversary, Date Night, etc.)
- **Cakes Tab**: Cake selection with pricing
- **Decor Items Tab**: Decoration items selection
- **Gifts Items Tab**: Gift selection for special occasions

### 💰 Dynamic Pricing
- Real-time cart calculation
- Theater base price: ₹1399.00
- Decoration cost: ₹750.00 (optional)
- Individual item pricing for cakes, decor, and gifts
- Advance payment calculation (28% of total)
- Balance amount calculation

### 🎨 Modern UI/UX
- Clean, responsive design
- Smooth animations and transitions
- Interactive elements with hover effects
- Professional color scheme
- Mobile-friendly layout

## Usage

### Basic Implementation

```tsx
import BookingPopup from '@/components/BookingPopup';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Book Theater
      </button>
      
      <BookingPopup 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        theaterName="EROS (COUPLES) Theatre"
        slotDate="18, Sep-2025"
        slotTime="9:00 am to 12:00 pm"
        slotId="slot1"
      />
    </>
  );
}
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | ✅ | Controls popup visibility |
| `onClose` | `() => void` | ✅ | Callback when popup is closed |
| `theaterName` | `string` | ❌ | Name of the theater (default: "EROS (COUPLES) Theatre") |
| `slotDate` | `string` | ❌ | Booking date (default: "18, Sep-2025") |
| `slotTime` | `string` | ❌ | Time slot (default: "9:00 am to 12:00 pm") |
| `slotId` | `string` | ❌ | Slot identifier (default: "slot1") |

## Integration Points

### 1. Hero Section
The booking popup is integrated into the main hero section with the "Book Your Show" button.

### 2. Theater Page
Available on the theater selection page with dynamic theater information.

## Form Data Structure

```typescript
interface BookingForm {
  bookingName: string;
  numberOfPeople: number;
  whatsappNumber: string;
  emailAddress: string;
  decoration: 'Yes' | 'No';
  occasion: string;
  selectedCakes: string[];
  selectedDecorItems: string[];
  selectedGifts: string[];
  promoCode: string;
}
```

## Available Options

### Occasions
- Birthday Party
- Anniversary
- Date Night
- Proposal
- Valentine's Day
- Custom Celebration

### Cakes
- Chocolate Cake (₹299)
- Vanilla Cake (₹249)
- Red Velvet Cake (₹349)
- Strawberry Cake (₹299)
- Black Forest Cake (₹399)
- Cheesecake (₹449)

### Decor Items
- Balloons (₹150)
- Flowers (₹200)
- Candles (₹100)
- Banner (₹120)
- Photo Booth (₹500)
- LED Lights (₹180)

### Gifts
- Chocolate Box (₹199)
- Flower Bouquet (₹299)
- Teddy Bear (₹149)
- Photo Frame (₹99)
- Perfume (₹599)
- Jewelry (₹899)

## Styling

The component uses Tailwind CSS classes and includes:
- Responsive design for all screen sizes
- Smooth animations using CSS transitions
- Professional color scheme
- Interactive hover effects
- Modern card-based layout

## Dependencies

- React 19.1.0
- Next.js 15.5.2
- Lucide React (for icons)
- Tailwind CSS (for styling)

## Future Enhancements

- [ ] Payment gateway integration
- [ ] Email confirmation system
- [ ] Booking confirmation page
- [ ] Admin dashboard for managing bookings
- [ ] Real-time availability checking
- [ ] Multi-language support
- [ ] Accessibility improvements (ARIA labels, keyboard navigation)
