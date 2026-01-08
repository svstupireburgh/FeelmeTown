import { PrismaClient } from '@prisma/client';

// Global Prisma client instance for connection pooling
declare global {
  var prismaGoDaddy: PrismaClient | undefined;
}

// Create Prisma client with optimized settings for GoDaddy
const createPrismaClient = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.GODADDY_DATABASE_URL
      }
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

// Use global instance in development to prevent multiple connections
const prismaGoDaddy = globalThis.prismaGoDaddy ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGoDaddy = prismaGoDaddy;
}

// Fast booking operations using Prisma
export class PrismaGoDaddyService {
  
  // Insert cancelled booking with upsert for fast operations
  static async insertCancelledBooking(bookingData: any) {
    try {
      const result = await prismaGoDaddy.cancelledBooking.upsert({
        where: { bookingId: bookingData.bookingId || bookingData.id },
        update: {
          name: bookingData.name,
          email: bookingData.email,
          phone: bookingData.phone,
          theaterName: bookingData.theaterName,
          bookingDate: bookingData.date ? new Date(bookingData.date) : null,
          bookingTime: bookingData.time,
          occasion: bookingData.occasion,
          numberOfPeople: bookingData.numberOfPeople,
          totalAmount: bookingData.totalAmount,
          cancelledAt: bookingData.cancelledAt ? new Date(bookingData.cancelledAt) : new Date(),
          cancellationReason: bookingData.cancellationReason,
          refundAmount: bookingData.refundAmount,
          refundStatus: bookingData.refundStatus,
          originalBookingData: bookingData,
          updatedAt: new Date()
        },
        create: {
          bookingId: bookingData.bookingId || bookingData.id,
          name: bookingData.name,
          email: bookingData.email,
          phone: bookingData.phone,
          theaterName: bookingData.theaterName,
          bookingDate: bookingData.date ? new Date(bookingData.date) : null,
          bookingTime: bookingData.time,
          occasion: bookingData.occasion,
          numberOfPeople: bookingData.numberOfPeople,
          totalAmount: bookingData.totalAmount,
          cancelledAt: bookingData.cancelledAt ? new Date(bookingData.cancelledAt) : new Date(),
          cancellationReason: bookingData.cancellationReason,
          refundAmount: bookingData.refundAmount,
          refundStatus: bookingData.refundStatus,
          originalBookingData: bookingData
        }
      });
      
      console.log(`✅ Prisma: Cancelled booking upserted: ${bookingData.bookingId}`);
      return { success: true, result };
    } catch (error) {
      console.error('❌ Prisma: Failed to insert cancelled booking:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Insert completed booking with upsert for fast operations
  static async insertCompletedBooking(bookingData: any) {
    try {
      const result = await prismaGoDaddy.completedBooking.upsert({
        where: { bookingId: bookingData.bookingId || bookingData.id },
        update: {
          name: bookingData.name,
          email: bookingData.email,
          phone: bookingData.phone,
          theaterName: bookingData.theaterName,
          bookingDate: bookingData.date ? new Date(bookingData.date) : null,
          bookingTime: bookingData.time,
          occasion: bookingData.occasion,
          numberOfPeople: bookingData.numberOfPeople,
          totalAmount: bookingData.totalAmount,
          completedAt: bookingData.completedAt ? new Date(bookingData.completedAt) : new Date(),
          bookingStatus: bookingData.status || 'completed',
          paymentStatus: bookingData.paymentStatus || 'paid',
          originalBookingData: bookingData,
          updatedAt: new Date()
        },
        create: {
          bookingId: bookingData.bookingId || bookingData.id,
          name: bookingData.name,
          email: bookingData.email,
          phone: bookingData.phone,
          theaterName: bookingData.theaterName,
          bookingDate: bookingData.date ? new Date(bookingData.date) : null,
          bookingTime: bookingData.time,
          occasion: bookingData.occasion,
          numberOfPeople: bookingData.numberOfPeople,
          totalAmount: bookingData.totalAmount,
          completedAt: bookingData.completedAt ? new Date(bookingData.completedAt) : new Date(),
          bookingStatus: bookingData.status || 'completed',
          paymentStatus: bookingData.paymentStatus || 'paid',
          originalBookingData: bookingData
        }
      });
      
      console.log(`✅ Prisma: Completed booking upserted: ${bookingData.bookingId}`);
      return { success: true, result };
    } catch (error) {
      console.error('❌ Prisma: Failed to insert completed booking:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Fast bulk sync with transaction for better performance
  static async bulkSyncJSONData() {
    try {
      console.log('🚀 Prisma: Starting fast bulk sync...');
      
      const { ExportsStorage } = await import('./exports-storage');
      
      const results = {
        cancelledBookings: { synced: 0, errors: 0 },
        completedBookings: { synced: 0, errors: 0 }
      };

      // Use transaction for better performance
      await prismaGoDaddy.$transaction(async (tx: any) => {
        // Sync cancelled bookings
        try {
          const cancelledBookingsData = await ExportsStorage.readArray('cancelled-bookings.json');
          console.log(`📄 Prisma: Found ${cancelledBookingsData.length} cancelled bookings`);
          
          for (const booking of cancelledBookingsData) {
            try {
              await tx.cancelledBooking.upsert({
                where: { bookingId: booking.bookingId || booking.id },
                update: {
                  name: booking.name,
                  email: booking.email,
                  phone: booking.phone,
                  theaterName: booking.theaterName,
                  bookingDate: booking.date ? new Date(booking.date) : null,
                  bookingTime: booking.time,
                  occasion: booking.occasion,
                  numberOfPeople: booking.numberOfPeople,
                  totalAmount: booking.totalAmount,
                  cancelledAt: booking.cancelledAt ? new Date(booking.cancelledAt) : new Date(),
                  cancellationReason: booking.cancellationReason,
                  refundAmount: booking.refundAmount,
                  refundStatus: booking.refundStatus,
                  originalBookingData: booking,
                  updatedAt: new Date()
                },
                create: {
                  bookingId: booking.bookingId || booking.id,
                  name: booking.name,
                  email: booking.email,
                  phone: booking.phone,
                  theaterName: booking.theaterName,
                  bookingDate: booking.date ? new Date(booking.date) : null,
                  bookingTime: booking.time,
                  occasion: booking.occasion,
                  numberOfPeople: booking.numberOfPeople,
                  totalAmount: booking.totalAmount,
                  cancelledAt: booking.cancelledAt ? new Date(booking.cancelledAt) : new Date(),
                  cancellationReason: booking.cancellationReason,
                  refundAmount: booking.refundAmount,
                  refundStatus: booking.refundStatus,
                  originalBookingData: booking
                }
              });
              results.cancelledBookings.synced++;
            } catch (error) {
              results.cancelledBookings.errors++;
              console.error(`❌ Prisma: Failed to sync cancelled booking ${booking.bookingId}:`, error);
            }
          }
        } catch (error) {
          console.error('❌ Prisma: Error reading cancelled-bookings.json:', error);
        }

        // Sync completed bookings
        try {
          const completedBookingsData = await ExportsStorage.readArray('completed-bookings.json');
          console.log(`📄 Prisma: Found ${completedBookingsData.length} completed bookings`);
          
          for (const booking of completedBookingsData) {
            try {
              await tx.completedBooking.upsert({
                where: { bookingId: booking.bookingId || booking.id },
                update: {
                  name: booking.name,
                  email: booking.email,
                  phone: booking.phone,
                  theaterName: booking.theaterName,
                  bookingDate: booking.date ? new Date(booking.date) : null,
                  bookingTime: booking.time,
                  occasion: booking.occasion,
                  numberOfPeople: booking.numberOfPeople,
                  totalAmount: booking.totalAmount,
                  completedAt: booking.completedAt ? new Date(booking.completedAt) : new Date(),
                  bookingStatus: booking.status || 'completed',
                  paymentStatus: booking.paymentStatus || 'paid',
                  originalBookingData: booking,
                  updatedAt: new Date()
                },
                create: {
                  bookingId: booking.bookingId || booking.id,
                  name: booking.name,
                  email: booking.email,
                  phone: booking.phone,
                  theaterName: booking.theaterName,
                  bookingDate: booking.date ? new Date(booking.date) : null,
                  bookingTime: booking.time,
                  occasion: booking.occasion,
                  numberOfPeople: booking.numberOfPeople,
                  totalAmount: booking.totalAmount,
                  completedAt: booking.completedAt ? new Date(booking.completedAt) : new Date(),
                  bookingStatus: booking.status || 'completed',
                  paymentStatus: booking.paymentStatus || 'paid',
                  originalBookingData: booking
                }
              });
              results.completedBookings.synced++;
            } catch (error) {
              results.completedBookings.errors++;
              console.error(`❌ Prisma: Failed to sync completed booking ${booking.bookingId}:`, error);
            }
          }
        } catch (error) {
          console.error('❌ Prisma: Error reading completed-bookings.json:', error);
        }
      });

      console.log('✅ Prisma: Fast bulk sync completed:', results);
      return { success: true, results };
    } catch (error) {
      console.error('❌ Prisma: Bulk sync failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Super fast statistics using optimized queries
  static async getFastBookingStats() {
    try {
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfYear = new Date(today.getFullYear(), 0, 1);

      // Parallel queries for maximum speed
      const [
        cancelledStats,
        completedStats
      ] = await Promise.all([
        // Cancelled bookings stats
        prismaGoDaddy.cancelledBooking.groupBy({
          by: [],
          _count: { id: true },
          _sum: { totalAmount: true },
          where: {
            OR: [
              { cancelledAt: { gte: startOfToday } }, // Today
              { cancelledAt: { gte: startOfWeek } },  // This week
              { cancelledAt: { gte: startOfMonth } }, // This month
              { cancelledAt: { gte: startOfYear } }   // This year
            ]
          }
        }),
        // Completed bookings stats
        prismaGoDaddy.completedBooking.groupBy({
          by: [],
          _count: { id: true },
          _sum: { totalAmount: true },
          where: {
            OR: [
              { completedAt: { gte: startOfToday } }, // Today
              { completedAt: { gte: startOfWeek } },  // This week
              { completedAt: { gte: startOfMonth } }, // This month
              { completedAt: { gte: startOfYear } }   // This year
            ]
          }
        })
      ]);

      // Get detailed counts with separate queries for better performance
      const [
        cancelledToday, cancelledWeek, cancelledMonth, cancelledYear, cancelledTotal,
        completedToday, completedWeek, completedMonth, completedYear, completedTotal
      ] = await Promise.all([
        prismaGoDaddy.cancelledBooking.count({ where: { cancelledAt: { gte: startOfToday } } }),
        prismaGoDaddy.cancelledBooking.count({ where: { cancelledAt: { gte: startOfWeek } } }),
        prismaGoDaddy.cancelledBooking.count({ where: { cancelledAt: { gte: startOfMonth } } }),
        prismaGoDaddy.cancelledBooking.count({ where: { cancelledAt: { gte: startOfYear } } }),
        prismaGoDaddy.cancelledBooking.count(),
        prismaGoDaddy.completedBooking.count({ where: { completedAt: { gte: startOfToday } } }),
        prismaGoDaddy.completedBooking.count({ where: { completedAt: { gte: startOfWeek } } }),
        prismaGoDaddy.completedBooking.count({ where: { completedAt: { gte: startOfMonth } } }),
        prismaGoDaddy.completedBooking.count({ where: { completedAt: { gte: startOfYear } } }),
        prismaGoDaddy.completedBooking.count()
      ]);

      const stats = {
        cancelled: {
          today: cancelledToday,
          this_week: cancelledWeek,
          this_month: cancelledMonth,
          this_year: cancelledYear,
          total: cancelledTotal
        },
        completed: {
          today: completedToday,
          this_week: completedWeek,
          this_month: completedMonth,
          this_year: completedYear,
          total: completedTotal
        }
      };

      console.log('⚡ Prisma: Fast stats retrieved');
      return { success: true, stats };
    } catch (error) {
      console.error('❌ Prisma: Failed to get fast stats:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get recent bookings with pagination
  static async getRecentBookings(type: 'cancelled' | 'completed', limit = 10, offset = 0) {
    try {
      if (type === 'cancelled') {
        const bookings = await prismaGoDaddy.cancelledBooking.findMany({
          orderBy: { cancelledAt: 'desc' },
          take: limit,
          skip: offset,
          select: {
            id: true,
            bookingId: true,
            name: true,
            email: true,
            theaterName: true,
            bookingDate: true,
            bookingTime: true,
            totalAmount: true,
            cancelledAt: true,
            refundStatus: true
          }
        });
        return { success: true, bookings };
      } else {
        const bookings = await prismaGoDaddy.completedBooking.findMany({
          orderBy: { completedAt: 'desc' },
          take: limit,
          skip: offset,
          select: {
            id: true,
            bookingId: true,
            name: true,
            email: true,
            theaterName: true,
            bookingDate: true,
            bookingTime: true,
            totalAmount: true,
            completedAt: true,
            paymentStatus: true
          }
        });
        return { success: true, bookings };
      }
    } catch (error) {
      console.error(`❌ Prisma: Failed to get recent ${type} bookings:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Search bookings by email or booking ID
  static async searchBookings(query: string, type?: 'cancelled' | 'completed') {
    try {
      const searchCondition = {
        OR: [
          { bookingId: { contains: query } },
          { email: { contains: query } },
          { name: { contains: query } }
        ]
      };

      const results: any = {};

      if (!type || type === 'cancelled') {
        results.cancelled = await prismaGoDaddy.cancelledBooking.findMany({
          where: searchCondition,
          orderBy: { cancelledAt: 'desc' },
          take: 20
        });
      }

      if (!type || type === 'completed') {
        results.completed = await prismaGoDaddy.completedBooking.findMany({
          where: searchCondition,
          orderBy: { completedAt: 'desc' },
          take: 20
        });
      }

      return { success: true, results };
    } catch (error) {
      console.error('❌ Prisma: Search failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Test database connection
  static async testConnection() {
    try {
      await prismaGoDaddy.$queryRaw`SELECT 1 as test`;
      console.log('✅ Prisma: Database connection successful');
      return { success: true, message: 'Prisma database connection successful' };
    } catch (error) {
      console.error('❌ Prisma: Database connection failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Disconnect (for cleanup)
  static async disconnect() {
    await prismaGoDaddy.$disconnect();
  }
}

export default PrismaGoDaddyService;
