// FeelME Town Database Collections
export interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string;
  theaterName: string;
  date: string;
  time: string;
  occasion: string;
  selectedCakes: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  selectedDecorItems: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  selectedGifts: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  totalAmount: number;
  createdAt: string;
  status: 'pending' | 'confirmed' | 'cancelled';
}

export interface IncompleteBooking {
  id: string;
  name?: string;
  email: string;
  phone?: string;
  theaterName?: string;
  date?: string;
  time?: string;
  occasion?: string;
  selectedCakes?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  selectedDecorItems?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  selectedGifts?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  totalAmount?: number;
  createdAt: string;
  expiresAt: string; // 24 hours from creation
  status: 'incomplete';
}

// FeelME Town Database Collections
const feelmeTownDatabase = {
  // Collection: booking
  booking: [] as Booking[],
  
  // Collection: incompleteBooking
  incompleteBooking: [] as IncompleteBooking[],
  
  // Collection: theaters (for future use)
  theaters: [] as object[],
  
  // Collection: items (for future use)
  items: [] as object[]
};

let nextBookingId = 1;
let nextIncompleteBookingId = 1;

// Database functions
export const db = {
  // Create new booking in 'booking' collection
  createBooking: (bookingData: Omit<Booking, 'id' | 'createdAt' | 'status'>): Booking => {
    const booking: Booking = {
      ...bookingData,
      id: `booking_${nextBookingId++}`,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };
    
    // Save to 'booking' collection in FeelME Town database
    feelmeTownDatabase.booking.push(booking);
    
    
    
    return booking;
  },

  // Get all bookings from 'booking' collection
  getBookings: (): Booking[] => {
    return [...feelmeTownDatabase.booking];
  },

  // Get theaters - NOTE: This is mock data, real capacity comes from database
  getTheaters: () => {
    return [
      { id: 'theater1', name: 'EROS (COUPLES) (FMT-Hall-1)', price: '₹1399', type: 'Couples' },
      { id: 'theater2', name: 'PHILIA (FRIENDS) (FMT-Hall-2)', price: '₹1999', type: 'Friends' },
      { id: 'theater3', name: 'PRAGMA (LOVE) (FMT-Hall-3)', price: '₹2999', type: 'Love' },
      { id: 'theater4', name: 'STORGE (FAMILY) (FMT-Hall-4)', price: '₹3999', type: 'Family' }
    ];
  },

  // Get items (cakes, decor, gifts)
  getItems: (category?: string) => {
    // Mock items data
    const allItems = [
      // Cakes
      { id: 'cake1', name: 'Chocolate Cake', price: 1500, category: 'cakes', image: '🎂' },
      { id: 'cake2', name: 'Vanilla Cake', price: 1200, category: 'cakes', image: '🧁' },
      { id: 'cake3', name: 'Strawberry Cake', price: 1800, category: 'cakes', image: '🍰' },
      
      // Decor Items
      { id: 'decor1', name: 'Balloons', price: 500, category: 'decor', image: '🎈' },
      { id: 'decor2', name: 'Flowers', price: 800, category: 'decor', image: '🌸' },
      { id: 'decor3', name: 'Banner', price: 300, category: 'decor', image: '🎊' },
      
      // Gifts
      { id: 'gift1', name: 'Photo Frame', price: 99, category: 'gifts', image: '🖼️' },
      { id: 'gift2', name: 'Perfume', price: 599, category: 'gifts', image: '🌸' },
      { id: 'gift3', name: 'Jewelry', price: 899, category: 'gifts', image: '💎' }
    ];
    
    if (category) {
      return allItems.filter(item => item.category === category);
    }
    
    return allItems;
  },

  // Create incomplete booking
  createIncompleteBooking: (bookingData: Omit<IncompleteBooking, 'id' | 'createdAt' | 'expiresAt' | 'status'>): IncompleteBooking => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 24 hours from now
    
    const incompleteBooking: IncompleteBooking = {
      ...bookingData,
      id: `incomplete_${nextIncompleteBookingId++}`,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: 'incomplete'
    };
    
    // Save to 'incompleteBooking' collection
    feelmeTownDatabase.incompleteBooking.push(incompleteBooking);
    
    
    
    return incompleteBooking;
  },

  // Get all incomplete bookings
  getIncompleteBookings: (): IncompleteBooking[] => {
    return [...feelmeTownDatabase.incompleteBooking];
  },

  // Delete expired incomplete bookings (24+ hours old)
  deleteExpiredIncompleteBookings: (): number => {
    const now = new Date();
    const initialLength = feelmeTownDatabase.incompleteBooking.length;
    
    // Filter out expired bookings
    feelmeTownDatabase.incompleteBooking = feelmeTownDatabase.incompleteBooking.filter(booking => {
      const expiresAt = new Date(booking.expiresAt);
      return expiresAt > now; // Keep only non-expired bookings
    });
    
    const deletedCount = initialLength - feelmeTownDatabase.incompleteBooking.length;
    
    if (deletedCount > 0) {
      
    }
    
    return deletedCount;
  },

  // Clean up expired bookings (called automatically)
  cleanupExpiredBookings: () => {
    const deletedCount = db.deleteExpiredIncompleteBookings();
    return deletedCount;
  },

  // Get database info
  getDatabaseInfo: () => {
    return {
      databaseName: 'FeelME Town',
      collections: {
        booking: feelmeTownDatabase.booking.length,
        incompleteBooking: feelmeTownDatabase.incompleteBooking.length,
        theaters: feelmeTownDatabase.theaters.length,
        items: feelmeTownDatabase.items.length
      },
      totalBookings: feelmeTownDatabase.booking.length,
      totalIncompleteBookings: feelmeTownDatabase.incompleteBooking.length
    };
  }
};

export default db;
