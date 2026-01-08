// Database Connection for FeelME Town
// This file connects to the real MongoDB database

import { MongoClient, Db, ObjectId } from 'mongodb';
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

// Helper function to extract dynamic service items for database storage
function getDynamicServiceItemsForDB(bookingData: any): Record<string, any> {
  const dynamicServiceItems: Record<string, any> = {};

  // Look for all fields that start with "selected" and contain service items
  Object.keys(bookingData).forEach(key => {
    if (key.startsWith('selected') && Array.isArray(bookingData[key])) {
      // Skip movies as it's handled separately
      if (key === 'selectedMovies') {
        return;
      }

      // Store dynamic service items
      dynamicServiceItems[key] = bookingData[key];
      console.log(`📦 DB: Dynamic service items: ${key}:`, bookingData[key]);
    }
  });

  return dynamicServiceItems;
}

interface BookingData {
  name: string;
  email: string;
  phone: string;
  theaterName: string;
  date: string;
  time: string;
  occasion: string;
  numberOfPeople: number;
  // Movies kept static
  selectedMovies?: Array<{ id: string; name: string; price: number; quantity: number }>;
  // Dynamic service items (can be any service name)
  [key: string]: any;
  totalAmount?: number;
  advancePayment?: number;
  venuePayment?: number;
  status?: string;
  // Timestamps
  createdAt?: Date;
  expiredAt?: Date;
  // Manual booking specific fields
  isManualBooking?: boolean;
  bookingType?: string;
  createdBy?: string;
  staffId?: string;
  staffName?: string;
  notes?: string;
  // Occasion specific fields
  birthdayName?: string;
  birthdayGender?: string;
  partner1Name?: string;
  partner1Gender?: string;
  partner2Name?: string;
  partner2Gender?: string;
  dateNightName?: string;
  proposerName?: string;
  proposalPartnerName?: string;
  valentineName?: string;
  customCelebration?: string;
  extraGuestsCount?: number;
  extraGuestCharges?: number;
  pricingData?: any;
  occasionData?: Record<string, string>;
}

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || "";
const DB_NAME = 'feelmetown';
const COLLECTION_NAME = 'booking';
const INCOMPLETE_COLLECTION_NAME = 'incomplete_booking';
const CANCELLED_COLLECTION_NAME = 'cancelled_booking';
const MANUAL_BOOKING_COLLECTION_NAME = 'manual_booking';
const THEATER_COLLECTION_NAME = 'theaters';
const GALLERY_COLLECTION_NAME = 'gallery';
const COUPON_COLLECTION_NAME = 'coupons';
const OCCASION_COLLECTION_NAME = 'occasions';
const SERVICE_COLLECTION_NAME = 'services';
const USER_COLLECTION_NAME = 'staff';
const ADMIN_COLLECTION_NAME = 'admin';
const REQUESTS_COLLECTION_NAME = 'password_change_requests';
const SETTINGS_COLLECTION_NAME = 'settings';
const COUNTERS_COLLECTION_NAME = 'counters';
const TIME_SLOTS_COLLECTION_NAME = 'time_slots';
const FAQ_COLLECTION_NAME = 'faqs';
const PRICING_COLLECTION_NAME = 'pricing';
const CANCEL_REASONS_COLLECTION_NAME = 'cancel_reasons';
const TRUSTED_CUSTOMERS_COLLECTION_NAME = 'trusted_customers';
const ORDERS_COLLECTION_NAME = 'orders';

let client: MongoClient | null = null;
let db: Db | null = null;

// Database connection status
let isConnected = false;
let lastBookingSequence: number | null = null;

// Compression utilities
const compressData = async (data: unknown): Promise<Buffer> => {
  try {
    const jsonString = JSON.stringify(data);
    const inputBuffer = Buffer.from(jsonString, 'utf8');

    // Use Zlib compression (gzip is a zlib format)
    const compressed = await gzipAsync(inputBuffer);

    // Removed excessive logging for performance
    return compressed;
  } catch (error) {
    console.error('❌ Error compressing data:', error);
    throw error;
  }
};

const getOrderCounts = async (filter: Record<string, any> = {}) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(ORDERS_COLLECTION_NAME);
    const totalPromise = collection.countDocuments(filter);
    const byStatusPromise = collection
      .aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const [total, byStatusRaw] = await Promise.all([totalPromise, byStatusPromise]);
    const byStatus: Record<string, number> = {};
    byStatusRaw.forEach((entry) => {
      const key = typeof entry._id === 'string' ? entry._id : 'unknown';
      byStatus[key] = entry.count || 0;
    });

    return {
      success: true,
      total,
      byStatus,
    };
  } catch (error) {
    console.error('❌ Error counting order records:', error);
    return { success: false, error: 'Failed to count order records' };
  }
};

const ORDER_AUTO_DELETE_MINUTES = 30;

const updateOrderStatusByTicket = async (
  ticketNumber: string,
  status?: string,
  metadata?: Record<string, any>,
) => {
  try {
    if (!ticketNumber) {
      return { success: false, error: 'Ticket number is required' };
    }

    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(ORDERS_COLLECTION_NAME);
    const updateDoc: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (typeof status === 'string' && status.trim()) {
      updateDoc.status = status.trim().toLowerCase();
    }

    if (metadata && typeof metadata === 'object') {
      Object.entries(metadata).forEach(([key, value]) => {
        if (value === undefined) return;
        updateDoc[key] = value;
      });
    }

    const result = await collection.updateMany(
      { ticketNumber },
      {
        $set: updateDoc,
      },
    );

    return { success: true, modifiedCount: result.modifiedCount };
  } catch (error) {
    console.error('❌ Error updating order status by ticket:', error);
    return { success: false, error: 'Failed to update order status' };
  }
};

const markOrderReadyForAutoDeletion = async (ticketNumber: string, minutesUntilDelete = ORDER_AUTO_DELETE_MINUTES) => {
  try {
    if (!ticketNumber) {
      return { success: false, error: 'Ticket number is required for auto-delete scheduling' };
    }

    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(ORDERS_COLLECTION_NAME);
    const now = new Date();
    const autoDeleteAt = new Date(now.getTime() + minutesUntilDelete * 60 * 1000);

    const result = await collection.updateMany(
      { ticketNumber },
      {
        $set: {
          readyMarkedAt: now,
          autoDeleteAt,
          updatedAt: now,
        },
      },
    );

    return { success: true, modifiedCount: result.modifiedCount, autoDeleteAt };
  } catch (error) {
    console.error('❌ Error scheduling order auto-delete:', error);
    return { success: false, error: 'Failed to schedule order auto-delete' };
  }
};

const cleanupReadyOrdersPastAutoDelete = async () => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(ORDERS_COLLECTION_NAME);
    const now = new Date();
    const result = await collection.deleteMany({
      status: 'ready',
      autoDeleteAt: { $lte: now },
    });

    if (result.deletedCount) {
      console.log(`🧹 Auto-deleted ${result.deletedCount} ready orders past expiry`);
    }

    return { success: true, deletedCount: result.deletedCount || 0 };
  } catch (error) {
    console.error('❌ Error cleaning up ready orders:', error);
    return { success: false, error: 'Failed to clean up ready orders' };
  }
};

// Delete manual booking from manual_booking collection
const deleteManualBooking = async (bookingId: string) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }
    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(MANUAL_BOOKING_COLLECTION_NAME);
    let result;
    if (ObjectId.isValid(bookingId) && bookingId.length === 24) {
      result = await collection.deleteOne({ _id: new ObjectId(bookingId) });
    } else {
      result = await collection.deleteOne({ bookingId });
    }
    if (result.deletedCount === 0) {
      return { success: false, error: 'Manual booking not found or already deleted' };
    }
    console.log(`✅ [DELETE] Manual booking deleted: ${bookingId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ [DELETE] Error deleting manual booking:', error);
    return { success: false, error: 'Failed to delete manual booking' };
  }
};

const saveOrderRecord = async (orderData: Record<string, any>) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(ORDERS_COLLECTION_NAME);
    const timestamp = new Date();

    const filter: Record<string, any> = {
      bookingId: orderData.bookingId,
      serviceField: orderData.serviceField || orderData.canonicalField,
    };

    if (!filter.bookingId || !filter.serviceField) {
      throw new Error('Order record requires bookingId and serviceField for upsert');
    }

    const updateDoc: Record<string, any> = {
      ...orderData,
      items: Array.isArray(orderData.items) ? orderData.items : [],
      updatedAt: timestamp,
    };

    const result = await collection.findOneAndUpdate(
      filter,
      {
        $set: updateDoc,
        $setOnInsert: {
          createdAt: orderData.createdAt ? new Date(orderData.createdAt) : timestamp,
        },
      },
      { upsert: true, returnDocument: 'after' },
    );

    const updatedRecord = result?.value || {
      ...updateDoc,
      _id: result?.lastErrorObject?.upserted,
      createdAt: result?.value?.createdAt || new Date(),
    };

    console.log('🧾 Order record upserted:', {
      bookingId: updatedRecord.bookingId,
      serviceName: updatedRecord.serviceName,
      serviceField: updatedRecord.serviceField,
    });

    return {
      success: true,
      orderId: updatedRecord?._id?.toString?.(),
      order: updatedRecord,
    };
  } catch (error) {
    console.error('❌ Error saving order record to MongoDB:', error);
    return { success: false, error: 'Failed to save order record' };
  }
};

const getOrders = async (filter: Record<string, any> = {}, limit = 200) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(ORDERS_COLLECTION_NAME);
    const orders = await collection
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    const needsMeta = orders.filter(
      (order) =>
        !order.theaterName ||
        typeof order.numberOfPeople !== 'number' ||
        !order.bookingDate ||
        !order.bookingTime,
    );

    const bookingIdsForCleanup: string[] = [];

    if (needsMeta.length) {
      const bookingCollection = db.collection(COLLECTION_NAME);
      const manualCollection = db.collection(MANUAL_BOOKING_COLLECTION_NAME);

      const bookingIds = Array.from(
        new Set(
          needsMeta
            .map((order) => (typeof order.bookingId === 'string' ? order.bookingId : undefined))
            .filter((id): id is string => Boolean(id)),
        ),
      );
      const ticketNumbers = Array.from(
        new Set(
          needsMeta
            .map((order) => (typeof order.ticketNumber === 'string' ? order.ticketNumber : undefined))
            .filter((ticket): ticket is string => Boolean(ticket)),
        ),
      );
      const mongoIds = Array.from(
        new Set(
          needsMeta
            .map((order) => {
              const idValue = order.mongoBookingId || order.mongoId;
              if (typeof idValue === 'string' && ObjectId.isValid(idValue)) {
                return idValue;
              }
              return undefined;
            })
            .filter((id): id is string => Boolean(id)),
        ),
      );

      const orFilters: Record<string, any>[] = [];
      if (bookingIds.length) {
        orFilters.push({ bookingId: { $in: bookingIds } });
      }
      if (ticketNumbers.length) {
        orFilters.push({ ticketNumber: { $in: ticketNumbers } });
      }
      if (mongoIds.length) {
        orFilters.push({ _id: { $in: mongoIds.map((id) => new ObjectId(id)) } });
      }

      const bookingMetaMap = new Map<
        string,
        { theaterName?: string; numberOfPeople?: number; bookingDate?: string; bookingTime?: string }
      >();

      const getPeopleCount = (record: Record<string, any> = {}) => {
        const candidates = [
          record.numberOfPeople,
          record.number_of_people,
          record.noOfPeople,
          record.no_of_people,
          record.peopleCount,
          record.people_count,
          record.totalGuests,
          record.total_guests,
        ];
        for (const value of candidates) {
          if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
            return value;
          }
        }
        return undefined;
      };

      const mergeMeta = (
        key: string,
        meta: { theaterName?: string; numberOfPeople?: number; bookingDate?: string; bookingTime?: string },
      ) => {
        if (!key) return;
        const existing = bookingMetaMap.get(key) || {};
        bookingMetaMap.set(key, {
          theaterName: meta.theaterName || existing.theaterName,
          numberOfPeople:
            typeof meta.numberOfPeople === 'number' ? meta.numberOfPeople : existing.numberOfPeople,
          bookingDate: meta.bookingDate || existing.bookingDate,
          bookingTime: meta.bookingTime || existing.bookingTime,
        });
      };

      if (orFilters.length) {
        const bookingDocs = await bookingCollection
          .find({ $or: orFilters })
          .project({
            bookingId: 1,
            ticketNumber: 1,
            theaterName: 1,
            numberOfPeople: 1,
            totalGuests: 1,
            date: 1,
            time: 1,
            timeSlot: 1,
            selectedTimeSlot: 1,
          })
          .toArray();

        bookingDocs.forEach((doc) => {
          if (!doc) return;
          const meta = {
            theaterName: doc.theaterName,
            numberOfPeople: getPeopleCount(doc),
            bookingDate: typeof doc.date === 'string' ? doc.date : undefined,
            bookingTime: typeof doc.time === 'string'
              ? doc.time
              : typeof (doc as any).timeSlot === 'string'
              ? (doc as any).timeSlot
              : typeof (doc as any).selectedTimeSlot === 'string'
              ? (doc as any).selectedTimeSlot
              : undefined,
          };
          if (doc.bookingId) {
            mergeMeta(`bookingId:${doc.bookingId}`, meta);
          }
          if (doc.ticketNumber) {
            mergeMeta(`ticket:${doc.ticketNumber}`, meta);
          }
          if (doc._id) {
            mergeMeta(`mongo:${doc._id.toString()}`, meta);
          }
        });

        const manualDocs = await manualCollection
          .find({ $or: orFilters })
          .project({
            bookingId: 1,
            ticketNumber: 1,
            theaterName: 1,
            theater: 1,
            numberOfPeople: 1,
            date: 1,
            time: 1,
            timeSlot: 1,
            selectedTimeSlot: 1,
          })
          .toArray();

        manualDocs.forEach((doc) => {
          if (!doc) return;
          const meta = {
            theaterName: doc.theaterName || doc.theater,
            numberOfPeople: getPeopleCount(doc),
            bookingDate: typeof doc.date === 'string' ? doc.date : undefined,
            bookingTime: typeof doc.time === 'string'
              ? doc.time
              : typeof (doc as any).timeSlot === 'string'
              ? (doc as any).timeSlot
              : typeof (doc as any).selectedTimeSlot === 'string'
              ? (doc as any).selectedTimeSlot
              : undefined,
          };
          if (doc.bookingId) {
            mergeMeta(`bookingId:${doc.bookingId}`, meta);
          }
          if (doc.ticketNumber) {
            mergeMeta(`ticket:${doc.ticketNumber}`, meta);
          }
          if (doc._id) {
            mergeMeta(`mongo:${doc._id.toString()}`, meta);
          }
        });
      }

      if (bookingMetaMap.size) {
        for (const order of orders) {
          const meta =
            (order.bookingId && bookingMetaMap.get(`bookingId:${order.bookingId}`)) ||
            (order.ticketNumber && bookingMetaMap.get(`ticket:${order.ticketNumber}`)) ||
            (order.mongoBookingId && bookingMetaMap.get(`mongo:${order.mongoBookingId}`)) ||
            (order.mongoId && bookingMetaMap.get(`mongo:${order.mongoId}`));
          if (!meta) continue;
          if (!order.theaterName && meta.theaterName) {
            order.theaterName = meta.theaterName;
          }
          if (typeof order.numberOfPeople !== 'number' && typeof meta.numberOfPeople === 'number') {
            order.numberOfPeople = meta.numberOfPeople;
          }
          if (!order.bookingDate && meta.bookingDate) {
            order.bookingDate = meta.bookingDate;
          }
          if (!order.bookingTime && meta.bookingTime) {
            order.bookingTime = meta.bookingTime;
          }
        }
      }
    }

    const missingTheaterOrders = orders.filter((order) => !order.theaterName && (order.bookingId || order.mongoBookingId || order.ticketNumber));

    if (missingTheaterOrders.length) {
      const bookingCollection = db.collection(COLLECTION_NAME);
      const manualCollection = db.collection(MANUAL_BOOKING_COLLECTION_NAME);

      const referencesToCheck = missingTheaterOrders.map((order) => ({
        bookingId: order.bookingId,
        mongoBookingId: order.mongoBookingId,
        ticketNumber: order.ticketNumber,
      }));

      const uniqueBookingIds = Array.from(new Set(referencesToCheck.map((ref) => ref.bookingId).filter((id): id is string => Boolean(id))));
      const uniqueMongoIds = Array.from(new Set(referencesToCheck.map((ref) => ref.mongoBookingId).filter((id): id is string => Boolean(id && ObjectId.isValid(id)))));
      const uniqueTicketNumbers = Array.from(new Set(referencesToCheck.map((ref) => ref.ticketNumber).filter((id): id is string => Boolean(id))));

      const existenceOrFilters: Record<string, any>[] = [];
      if (uniqueBookingIds.length) existenceOrFilters.push({ bookingId: { $in: uniqueBookingIds } });
      if (uniqueTicketNumbers.length) existenceOrFilters.push({ ticketNumber: { $in: uniqueTicketNumbers } });
      if (uniqueMongoIds.length) existenceOrFilters.push({ _id: { $in: uniqueMongoIds.map((id) => new ObjectId(id)) } });

      let existingReferences = new Set<string>();

      if (existenceOrFilters.length) {
        const [bookingDocs, manualDocs] = await Promise.all([
          bookingCollection
            .find({ $or: existenceOrFilters })
            .project({ bookingId: 1, ticketNumber: 1 })
            .toArray(),
          manualCollection
            .find({ $or: existenceOrFilters })
            .project({ bookingId: 1, ticketNumber: 1 })
            .toArray(),
        ]);

        bookingDocs.forEach((doc) => {
          if (!doc) return;
          if (doc.bookingId) existingReferences.add(`bookingId:${doc.bookingId}`);
          if (doc.ticketNumber) existingReferences.add(`ticket:${doc.ticketNumber}`);
          if (doc._id) existingReferences.add(`mongo:${doc._id.toString()}`);
        });

        manualDocs.forEach((doc) => {
          if (!doc) return;
          if (doc.bookingId) existingReferences.add(`bookingId:${doc.bookingId}`);
          if (doc.ticketNumber) existingReferences.add(`ticket:${doc.ticketNumber}`);
          if (doc._id) existingReferences.add(`mongo:${doc._id.toString()}`);
        });
      }

      missingTheaterOrders.forEach((order) => {
        const keys = [
          order.bookingId ? `bookingId:${order.bookingId}` : undefined,
          order.ticketNumber ? `ticket:${order.ticketNumber}` : undefined,
          order.mongoBookingId ? `mongo:${order.mongoBookingId}` : undefined,
        ].filter((key): key is string => Boolean(key));

        const hasReference = keys.some((key) => existingReferences.has(key));
        if (!hasReference) {
          bookingIdsForCleanup.push(order.bookingId || order.ticketNumber || order._id?.toString?.() || '');
        }
      });
    }

    if (bookingIdsForCleanup.length) {
      await deleteOrdersByBookingReference({
        bookingId: bookingIdsForCleanup.find((id) => id)?.toString(),
      });
    }

    return {
      success: true,
      orders,
      total: orders.length,
    };
  } catch (error) {
    console.error('❌ Error fetching order records:', error);
    return {
      success: false,
      error: 'Failed to fetch order records',
    };
  }
};

const deleteOrdersByBookingReference = async ({
  bookingId,
  mongoBookingId,
  ticketNumber,
}: {
  bookingId?: string;
  mongoBookingId?: string;
  ticketNumber?: string;
}) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const orFilters: Record<string, any>[] = [];
    if (bookingId) {
      orFilters.push({ bookingId });
    }
    if (mongoBookingId && ObjectId.isValid(mongoBookingId)) {
      orFilters.push({ mongoBookingId });
    }
    if (ticketNumber) {
      orFilters.push({ ticketNumber });
    }

    if (!orFilters.length) {
      return { success: false, error: 'No booking reference provided for order cleanup' };
    }

    const collection = db.collection(ORDERS_COLLECTION_NAME);
    const result = await collection.deleteMany({ $or: orFilters });

    console.log('🧹 Orders deleted for booking:', {
      bookingId,
      mongoBookingId,
      ticketNumber,
      deleted: result.deletedCount,
    });

    return {
      success: true,
      deletedCount: result.deletedCount,
    };
  } catch (error) {
    console.error('❌ Error deleting order records:', error);
    return { success: false, error: 'Failed to delete order records' };
  }
};

const deleteOrdersByBookingAndService = async ({
  bookingId,
  mongoBookingId,
  ticketNumber,
  serviceField,
  serviceName,
}: {
  bookingId?: string;
  mongoBookingId?: string;
  ticketNumber?: string;
  serviceField?: string;
  serviceName?: string;
}) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const orFilters: Record<string, any>[] = [];
    if (bookingId) orFilters.push({ bookingId });
    if (mongoBookingId && ObjectId.isValid(mongoBookingId)) orFilters.push({ mongoBookingId });
    if (ticketNumber) orFilters.push({ ticketNumber });

    if (!orFilters.length) {
      return { success: false, error: 'No booking reference provided for order cleanup' };
    }

    const serviceOr: Record<string, any>[] = [];
    if (serviceField) serviceOr.push({ serviceField });
    if (serviceName) serviceOr.push({ serviceName });

    const query: any = serviceOr.length
      ? { $or: orFilters, $and: [{ $or: serviceOr }] }
      : { $or: orFilters };

    const collection = db.collection(ORDERS_COLLECTION_NAME);
    const result = await collection.deleteMany(query);

    return { success: true, deletedCount: result.deletedCount };
  } catch (error) {
    console.error('❌ Error deleting order records by service:', error);
    return { success: false, error: 'Failed to delete order records by service' };
  }
};

const updateOrdersRemoveItems = async ({
  bookingId,
  mongoBookingId,
  ticketNumber,
  serviceField,
  serviceName,
  itemIds,
}: {
  bookingId?: string;
  mongoBookingId?: string;
  ticketNumber?: string;
  serviceField?: string;
  serviceName?: string;
  itemIds: string[];
}) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return { success: true, updated: 0, deletedEmpties: 0 };
    }

    const orFilters: Record<string, any>[] = [];
    if (bookingId) orFilters.push({ bookingId });
    if (mongoBookingId && ObjectId.isValid(mongoBookingId)) orFilters.push({ mongoBookingId });
    if (ticketNumber) orFilters.push({ ticketNumber });

    if (!orFilters.length) {
      return { success: false, error: 'No booking reference provided for order item removal' };
    }

    const serviceOr: Record<string, any>[] = [];
    if (serviceField) serviceOr.push({ serviceField });
    if (serviceName) serviceOr.push({ serviceName });

    const collection = db.collection(ORDERS_COLLECTION_NAME);

    const baseQuery: any = serviceOr.length
      ? { $or: orFilters, $and: [{ $or: serviceOr }] }
      : { $or: orFilters };

    // Only pull from append/update type records; keep remove/clear audit intact
    const query = { ...baseQuery, actionType: { $in: ['append', 'update'] } } as any;

    const pullResult = await collection.updateMany(query, {
      $pull: { items: { id: { $in: itemIds } } },
      $set: { updatedAt: new Date() },
    } as any);

    // Clean up any records that have no items left
    const deleteEmpty = await collection.deleteMany({ ...baseQuery, items: { $size: 0 } });

    return {
      success: true,
      updated: pullResult.modifiedCount || 0,
      deletedEmpties: deleteEmpty.deletedCount || 0,
    };
  } catch (error) {
    console.error('❌ Error updating order records (remove items):', error);
    return { success: false, error: 'Failed to update order records (remove items)' };
  }
};

const decompressData = async (compressedData: Buffer | unknown): Promise<unknown> => {
  try {
    // Handle MongoDB Binary objects by converting to Buffer
    let bufferData: Buffer;

    // Check if it's a MongoDB Binary object with buffer property
    if (compressedData && typeof compressedData === 'object' && 'buffer' in compressedData) {
      // This is a MongoDB Binary object
      const binaryData = compressedData as { buffer: ArrayBuffer };
      bufferData = Buffer.from(binaryData.buffer);
    } else if (Buffer.isBuffer(compressedData)) {
      // This is already a Buffer
      bufferData = compressedData;
    } else {
      // Try to convert to Buffer - handle the unknown type properly
      if (typeof compressedData === 'string') {
        bufferData = Buffer.from(compressedData, 'utf8');
      } else if (compressedData instanceof ArrayBuffer) {
        bufferData = Buffer.from(compressedData);
      } else if (Array.isArray(compressedData)) {
        bufferData = Buffer.from(compressedData);
      } else {
        // Fallback: convert to string first, then to buffer
        bufferData = Buffer.from(String(compressedData), 'utf8');
      }
    }

    const decompressed = await gunzipAsync(bufferData);
    const jsonString = decompressed.toString('utf8');

    console.log(`📦 Data decompressed: ${bufferData.length} bytes → ${decompressed.length} bytes`);

    return JSON.parse(jsonString);
  } catch (error) {
    console.error('❌ Error decompressing data:', error);
    throw error;
  }
};

// Connect to FeelME Town MongoDB database (optimized for speed)
const connectToDatabase = async () => {
  try {
    if (isConnected && client) {
      return {
        success: true,
        message: 'Already connected to FeelME Town MongoDB database',
        database: DB_NAME,
        collections: [COLLECTION_NAME]
      };
    }

    console.log('🔄 Connecting to FeelME Town MongoDB database...');

    // Create MongoDB client with optimized settings
    client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000, // Increased timeout
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000, // Added connection timeout
      retryWrites: true,
      retryReads: true,
    });

    // Connect to MongoDB
    await client.connect();

    // Get database
    db = client.db(DB_NAME);

    isConnected = true;

    console.log('✅ Connected to FeelME Town MongoDB database successfully!');

    return {
      success: true,
      message: 'Connected to FeelME Town MongoDB database',
      database: DB_NAME,
      collections: [COLLECTION_NAME, INCOMPLETE_COLLECTION_NAME, CANCELLED_COLLECTION_NAME]
    };

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    isConnected = false;
    if (client) {
      try {
        await client.close();
      } catch (closeError) {
        console.error('Error closing client:', closeError);
      }
      client = null;
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect to MongoDB database'
    };
  }
};

// Check database connection
const checkConnection = async () => {
  try {
    if (!isConnected) {
      return {
        connected: false,
        database: DB_NAME,
        collections: {
          booking: 0,
          incomplete_booking: 0
        }
      };
    }

    // Get collection count
    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(COLLECTION_NAME);
    const incompleteCollection = db.collection(INCOMPLETE_COLLECTION_NAME);
    const cancelledCollection = db.collection(CANCELLED_COLLECTION_NAME);

    const bookingCount = await collection.countDocuments();
    const incompleteBookingCount = await incompleteCollection.countDocuments();
    const cancelledBookingCount = await cancelledCollection.countDocuments();

    return {
      connected: isConnected,
      database: DB_NAME,
      collections: {
        booking: bookingCount,
        incomplete_booking: incompleteBookingCount,
        cancelled_booking: cancelledBookingCount
      }
    };
  } catch (error) {
    return {
      connected: false,
      database: DB_NAME,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Generate custom booking ID (FMT-YYYY-001, FMT-YYYY-002, etc.)
const generateBookingId = async () => {
  try {
    if (!isConnected || !db) {
      const connectionResult = await connectToDatabase();
      if (!connectionResult.success) {
        throw new Error('Failed to connect to database');
      }
    }

    const currentYear = new Date().getFullYear();
    const prefix = `FMT-${currentYear}-`;

    if (!db) {
      throw new Error('Database not connected');
    }

    // bookingId numeric part must be based on stored TOTAL (confirmed + manual) + 1,
    // and must be monotonic (never decrease) even under concurrency.
    const counterModule = await import('./counter-system');
    const totals = await counterModule.getTotalCounters();
    const totalBookings = (totals?.confirmed || 0) + (totals?.manual || 0);

    const countersCollection = db.collection(COUNTERS_COLLECTION_NAME);
    const counterId = 'booking_sequence_global';

    let sequentialNumber: number;
    try {
      // Atomic: seq = max(existingSeq, totalBookings) + 1
      const updated = await countersCollection.findOneAndUpdate(
        { _id: counterId } as any,
        [
          {
            $set: {
              seq: {
                $add: [
                  {
                    $max: [
                      { $ifNull: ['$seq', totalBookings] },
                      totalBookings,
                    ],
                  },
                  1,
                ],
              },
            },
          },
        ] as any,
        { upsert: true, returnDocument: 'after' } as any,
      );

      sequentialNumber = Number((updated as any)?.value?.seq || totalBookings + 1);
    } catch (e) {
      // Fallback for environments without pipeline updates
      const existing = (await countersCollection.findOne({ _id: counterId } as any)) as any;
      const base = Math.max(Number(existing?.seq || 0), totalBookings);
      await countersCollection.updateOne(
        { _id: counterId } as any,
        { $set: { seq: base } } as any,
        { upsert: true } as any,
      );
      const res = await countersCollection.findOneAndUpdate(
        { _id: counterId } as any,
        { $inc: { seq: 1 } } as any,
        { returnDocument: 'after' } as any,
      );
      sequentialNumber = Number((res as any)?.value?.seq || base + 1);
    }

    const bookingId = `${prefix}${sequentialNumber}`;
    lastBookingSequence = sequentialNumber;

    console.log('🎫 Generated unique booking ID:', bookingId);
    return bookingId;
  } catch (error) {
    console.error('❌ Error generating booking ID:', error);
    const currentYear = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `FMT-${currentYear}-FALLBACK-${timestamp}`;
  }
};

// Generate custom incomplete booking ID (INC0001, INC0002, etc.)
const generateIncompleteBookingId = async () => {
  try {
    if (!isConnected || !db) {
      const connectionResult = await connectToDatabase();
      if (!connectionResult.success) {
        throw new Error('Failed to connect to database');
      }
    }

    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(INCOMPLETE_COLLECTION_NAME);

    // Get the count of existing incomplete bookings
    const count = await collection.countDocuments();

    // Generate incomplete booking ID with INC prefix and 4-digit number
    const bookingNumber = (count + 1).toString().padStart(4, '0');
    const bookingId = `INC${bookingNumber}`;

    console.log('🎫 Generated incomplete booking ID:', bookingId);
    return bookingId;

  } catch (error) {
    console.error('❌ Error generating incomplete booking ID:', error);
    // Fallback to timestamp-based ID
    const timestamp = Date.now().toString().slice(-6);
    return `INC${timestamp}`;
  }
};

// Generate custom ticket number (FMT0001, FMT0002, etc.)
const generateTicketNumber = async () => {
  try {
    if (!isConnected || !db) {
      const connectionResult = await connectToDatabase();
      if (!connectionResult.success) {
        throw new Error('Failed to connect to database');
      }
    }

    if (!db) {
      throw new Error('Database not connected');
    }
    let ticketSequence: number | null = lastBookingSequence;

    if (ticketSequence === null) {
      // Fallback to using total confirmed counter to keep sequence close to booking IDs
      try {
        const counterModule = await import('./counter-system');
        const totals = await counterModule.getTotalCounters();
        if (totals && typeof totals.confirmed === 'number') {
          ticketSequence = (totals.confirmed || 0) + (totals.manual || 0) + 1;
        }
      } catch (counterError) {
        console.warn('⚠️ Failed to read total confirmed counter for ticket number:', counterError);
      }
    }

    if (ticketSequence === null) {
      const collection = db.collection(COLLECTION_NAME);
      const count = await collection.countDocuments();
      ticketSequence = count + 1;
    }

    const ticketNumber = `FMT${ticketSequence.toString().padStart(4, '0')}`;

    console.log('🎟️ Generated unique ticket number:', ticketNumber);
    return ticketNumber;

  } catch (error) {
    console.error('❌ Error generating ticket number:', error);
    // Fallback to timestamp-based ticket number
    const timestamp = Date.now().toString().slice(-6);
    return `FMT${timestamp.padStart(4, '0')}`;
  }
};


// Helper function to normalize occasion data (trim values and keep within occasionData only)
const normalizeOccasionData = async (bookingData: any) => {
  try {
    // Fetch occasions from database to get required fields
    const occasions = await getAllOccasions();
    const occasion = occasions.find((occ: any) => occ.name === bookingData.occasion);

    const dynamicFields: Record<string, string> = {};

    const assignField = (fieldName: string, rawValue: unknown) => {
      if (rawValue === undefined || rawValue === null) {
        return;
      }
      const trimmed = rawValue.toString().trim();
      if (!trimmed) {
        return;
      }
      dynamicFields[fieldName] = trimmed;
    };

    if (bookingData.occasionData && typeof bookingData.occasionData === 'object') {
      Object.entries(bookingData.occasionData).forEach(([key, value]) => {
        assignField(key, value);
      });
    }

    if (occasion?.requiredFields && occasion.requiredFields.length > 0) {
      occasion.requiredFields.forEach((fieldName: string) => {
        if (!(fieldName in dynamicFields) && bookingData[fieldName] !== undefined) {
          assignField(fieldName, bookingData[fieldName]);
        }
      });
    }

    return dynamicFields;
  } catch (error) {
    console.error('❌ Error normalizing occasion data:', error);
    return {};
  }
};

// Save booking to MongoDB database
const saveBooking = async (bookingData: BookingData) => {
  try {
    // Ensure database connection
    if (!isConnected || !db) {
      const connectionResult = await connectToDatabase();
      if (!connectionResult.success) {
        throw new Error('Failed to connect to database');
      }
    }

    console.log('💾 Saving booking to FeelME Town MongoDB database...');

    // Generate booking ID, but preserve provided one if present
    const customBookingId = (bookingData as any)?.bookingId && String((bookingData as any).bookingId).trim()
      ? String((bookingData as any).bookingId).trim()
      : await generateBookingId();

    // Generate ticket number
    const ticketNumber = await generateTicketNumber();

    // Add timestamp, status, custom booking ID, and ticket number
    const booking = {
      ...bookingData,
      bookingId: customBookingId,
      ticketNumber: ticketNumber,
      createdAt: new Date(),
      status: bookingData.status || 'confirmed',
      paymentStatus: (bookingData as any).paymentStatus || 'unpaid'
    };

    // Prevent MongoDB TTL deletion: do not persist expiredAt in booking collection.
    const bookingForInsert: any = { ...booking };
    delete bookingForInsert.expiredAt;

    const normalizedOccasionData = await normalizeOccasionData(booking);
    booking.occasionData = normalizedOccasionData;
    const dynamicServiceItems = getDynamicServiceItemsForDB(booking);

    const documentToInsert = {
      _id: new ObjectId(),
      ...bookingForInsert,
      bookingId: customBookingId,
      ticketNumber: ticketNumber,
      createdAt: booking.createdAt ?? new Date(),
      updatedAt: new Date(),
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      occasionData: normalizedOccasionData,
      selectedMovies: booking.selectedMovies || [],
      ...dynamicServiceItems,
      isManualBooking: booking.isManualBooking || false,
      bookingType: booking.bookingType || 'Online',
      createdBy: booking.createdBy || 'Customer',
      staffId: (bookingData as any).staffId ?? null,
      staffName: (bookingData as any).staffName ?? null,
      adminName: (bookingData as any).adminName ?? null,
      notes: bookingData.notes || '',
      slotBookingFee: Number((bookingData as any)?.slotBookingFee ?? bookingData.pricingData?.slotBookingFee ?? bookingData.advancePayment ?? 0),
      decorationFee: Number((bookingData as any)?.decorationFee ?? (bookingData as any)?.decorationAppliedFee ?? 0)
    };

    // Get collection
    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(COLLECTION_NAME);

    // Insert booking into MongoDB
    const result = await collection.insertOne(documentToInsert);

    // Log occasion fields that were saved
    const savedOccasionFields = normalizedOccasionData;

    console.log('📝 New booking saved to FeelME Town MongoDB database:', {
      database: DB_NAME,
      collection: COLLECTION_NAME,
      bookingId: customBookingId,
      mongoId: result.insertedId,
      customerName: booking.name,
      numberOfPeople: booking.numberOfPeople,
      theater: booking.theaterName,
      date: booking.date,
      time: booking.time,
      occasion: booking.occasion,
      totalAmount: booking.totalAmount,
      occasionFieldsCount: Object.keys(savedOccasionFields).length
    });

    // Log specific occasion fields that were saved
    if (Object.keys(savedOccasionFields).length > 0) {
      console.log('🎪 Occasion-specific fields saved to database:');
      Object.keys(savedOccasionFields).forEach(key => {
        if (key.endsWith('_label')) {
          const baseKey = key.replace('_label', '');
          const label = savedOccasionFields[key];
          const value = savedOccasionFields[baseKey];
          if (value) {
            console.log(`  🏷️ ${label}: "${value}"`);
          }
        } else if (!key.endsWith('_value') && !key.endsWith('_label')) {
          console.log(`  📝 ${key}: "${savedOccasionFields[key]}"`);
        }
      });
    } else {
      console.log('⚠️ No occasion-specific fields were saved to database');
    }

    // Import the new counter system
    const { incrementCounter: incrementNewCounter } = await import('./counter-system');

    // Increment appropriate counter based on booking status
    if (booking.status === 'confirmed') {
      await incrementNewCounter('confirmed');
    } else if (booking.status === 'completed') {
      await incrementNewCounter('completed');
    } else if (booking.status === 'manual') {
      await incrementNewCounter('manual');

      // Also increment staff-specific counter if staffId is provided
      if (bookingData.staffId) {
        await incrementStaffCounter(bookingData.staffId);
      }
    }

    return {
      success: true,
      message: 'Booking saved to FeelME Town MongoDB database',
      booking: {
        id: customBookingId,
        mongoId: result.insertedId,
        ...booking
      }
    };

  } catch (error) {
    console.error('❌ Error saving booking to MongoDB:', error);
    return {
      success: false,
      error: 'Failed to save booking to MongoDB database'
    };
  }
};

const syncManualBookingToGoDaddy = async (bookingData: any) => {
  try {
    const { syncManualBookingToSQL } = await import('./godaddy-sql');
    await syncManualBookingToSQL(bookingData);
  } catch (error) {
    console.warn('⚠️ Unable to sync manual booking to GoDaddy SQL:', {
      bookingId: bookingData?.bookingId || bookingData?.id,
      error
    });
  }
};

// Save manual booking but persist only in main booking collection
const saveManualBooking = async (bookingData: BookingData) => {
  try {
    // Determine creator metadata so manual bookings show who created them
    const deriveCreatorInfo = () => {
      const rawCreator = (bookingData as any).createdBy;
      if (rawCreator && typeof rawCreator === 'object') {
        return rawCreator;
      }
      if ((bookingData as any).staffName || (bookingData as any).staffId) {
        return {
          type: 'staff' as const,
          staffName: (bookingData as any).staffName,
          staffId: (bookingData as any).staffId
        };
      }
      return {
        type: 'admin' as const,
        adminName: (bookingData as any).adminName || 'Administrator'
      };
    };

    const creatorInfo = deriveCreatorInfo();

    const normalizedBookingData: BookingData = {
      ...bookingData,
      status: bookingData.status || 'manual',
      isManualBooking: true,
      bookingType: 'Manual',
      createdBy: creatorInfo,
      paymentStatus: (bookingData as any).paymentStatus || 'unpaid'
    };

    // Reuse primary booking saver so manual bookings live in the main collection
    const saveResult = await saveBooking(normalizedBookingData);

    if (!saveResult.success || !saveResult.booking) {
      return saveResult;
    }

    const persistedBooking = saveResult.booking as any;

    // Auto-save to Excel database (staff dashboards rely on this)
    try {
      if (!isConnected || !db) {
        const connectionResult = await connectToDatabase();
        if (!connectionResult.success) {
          throw new Error('Failed to connect to database for Excel sync');
        }
      }

      if (!db) {
        throw new Error('Database not connected');
      }

      const excelCollection = db.collection('excel_staff_bookings');
      const excelEntry = {
        bookingId: persistedBooking.bookingId || persistedBooking.id,
        staffId: bookingData.staffId || persistedBooking.staffId || 'UNKNOWN',
        staffName:
          bookingData.staffName ||
          (creatorInfo as any)?.staffName ||
          (creatorInfo as any)?.adminName ||
          'Unknown Staff',
        customerName: persistedBooking.name,
        email: persistedBooking.email,
        phone: persistedBooking.phone,
        theaterName: persistedBooking.theaterName,
        date: persistedBooking.date,
        time: persistedBooking.time,
        occasion: persistedBooking.occasion,
        numberOfPeople: persistedBooking.numberOfPeople,
        totalAmount: persistedBooking.totalAmount,
        status: persistedBooking.status,
        bookingType: 'Manual Booking',
        originalBookingData: persistedBooking,
        excelCreatedAt: new Date(),
        excelUpdatedAt: new Date(),
        isExported: true,
        autoSaved: true
      };

      await excelCollection.insertOne(excelEntry);
      console.log(`📊 Auto-saved manual booking ${excelEntry.bookingId} to Excel database`);
    } catch (excelError) {
      console.error('⚠️ Failed to auto-save manual booking to Excel database:', excelError);
      // Do not fail the main booking if Excel save fails
    }

    console.log('✅ Manual booking saved to primary booking collection:', {
      bookingId: persistedBooking.bookingId || persistedBooking.id,
      name: persistedBooking.name,
      theater: persistedBooking.theaterName,
      date: persistedBooking.date,
      time: persistedBooking.time
    });

    return saveResult;
  } catch (error) {
    console.error('❌ Error saving manual booking to MongoDB:', error);
    return {
      success: false,
      error: 'Failed to save manual booking to MongoDB database'
    };
  }
};

// Save incomplete booking to MongoDB database
const saveIncompleteBooking = async (bookingData: Partial<BookingData> & { email: string }) => {
  try {
    // Ensure database connection
    if (!isConnected || !db) {
      const connectionResult = await connectToDatabase();
      if (!connectionResult.success) {
        throw new Error('Failed to connect to database');
      }
    }

    console.log('💾 Saving incomplete booking to FeelME Town MongoDB database...');

    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(INCOMPLETE_COLLECTION_NAME);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + (12 * 60 * 60 * 1000));

    const matchFilter: Record<string, unknown> = { status: 'incomplete' };

    if ('bookingId' in bookingData && bookingData.bookingId) {
      matchFilter.bookingId = bookingData.bookingId;
    }

    if (bookingData.email) {
      matchFilter.email = bookingData.email;
    }

    const potentialMatchKeys: Array<keyof typeof bookingData> = ['theaterName', 'date', 'time'];
    potentialMatchKeys.forEach((key) => {
      const value = bookingData[key];
      if (value !== undefined && value !== null && value !== '') {
        matchFilter[key as string] = value;
      }
    });

    const existingBooking = await collection.findOne(matchFilter);

    if (existingBooking) {
      const updatePayload: Record<string, unknown> = {
        expiresAt,
        status: 'incomplete',
        updatedAt: now,
        paymentStatus: (bookingData as any)?.paymentStatus || existingBooking.paymentStatus || 'unpaid'
      };

      Object.entries(bookingData).forEach(([key, value]) => {
        if (value !== undefined) {
          updatePayload[key] = value;
        }
      });

      const incomingBookingId = ('bookingId' in bookingData && bookingData.bookingId) ? bookingData.bookingId : undefined;
      updatePayload.bookingId = existingBooking.bookingId || incomingBookingId || existingBooking.id;

      await collection.updateOne({ _id: existingBooking._id }, { $set: updatePayload });

      const mergedBooking = {
        ...existingBooking,
        ...updatePayload
      };

      console.log('ℹ️ Incomplete booking already existed. Updated existing record instead of inserting a duplicate.', {
        bookingId: mergedBooking.bookingId,
        mongoId: existingBooking._id,
        customerEmail: mergedBooking.email,
        expiresAt: mergedBooking.expiresAt
      });

      return {
        success: true,
        message: 'Incomplete booking already existed. Updated existing record.',
        booking: {
          id: mergedBooking.bookingId,
          mongoId: existingBooking._id,
          ...mergedBooking
        }
      };
    }

    // Generate custom incomplete booking ID
    const incomingBookingId = ('bookingId' in bookingData && bookingData.bookingId) ? bookingData.bookingId : undefined;
    const customBookingId = incomingBookingId || await generateIncompleteBookingId();

    // Add timestamp, status, custom booking ID, and expiry
    const incompleteBooking = {
      ...bookingData,
      bookingId: customBookingId,
      createdAt: bookingData.createdAt || now, // Use booking date if provided, otherwise current time
      expiresAt: expiresAt,
      status: 'incomplete',
      paymentStatus: (bookingData as any)?.paymentStatus || 'unpaid'
    };

    // Insert incomplete booking into MongoDB
    const result = await collection.insertOne(incompleteBooking);

    console.log('📝 New incomplete booking saved to FeelME Town MongoDB database:', {
      database: DB_NAME,
      collection: INCOMPLETE_COLLECTION_NAME,
      bookingId: customBookingId,
      mongoId: result.insertedId,
      customerEmail: incompleteBooking.email,
      expiresAt: incompleteBooking.expiresAt,
      status: incompleteBooking.status
    });

    // Import the new counter system
    const { incrementCounter: incrementNewCounter } = await import('./counter-system');

    // Increment incomplete booking counter
    await incrementNewCounter('incomplete');

    return {
      success: true,
      message: 'Incomplete booking saved to FeelME Town MongoDB database',
      booking: {
        id: customBookingId,
        mongoId: result.insertedId,
        ...incompleteBooking
      }
    };

  } catch (error) {
    console.error('❌ Error saving incomplete booking to MongoDB:', error);
    return {
      success: false,
      error: 'Failed to save incomplete booking to MongoDB database'
    };
  }
};

// Get all incomplete bookings from MongoDB database
const getAllIncompleteBookings = async () => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    // Get collection
    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(INCOMPLETE_COLLECTION_NAME);

    // Find all incomplete bookings
    const incompleteBookings = await collection.find({}).toArray();

    return {
      success: true,
      incompleteBookings: incompleteBookings,
      total: incompleteBookings.length,
      database: DB_NAME,
      collection: INCOMPLETE_COLLECTION_NAME
    };

  } catch (error) {
    console.error('❌ Error getting incomplete bookings from MongoDB:', error);
    return {
      success: false,
      error: 'Failed to get incomplete bookings from MongoDB'
    };
  }
};

// Delete specific incomplete booking by ID
const deleteIncompleteBooking = async (bookingId: string) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    // Get collection
    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(INCOMPLETE_COLLECTION_NAME);

    // Delete specific incomplete booking
    const result = await collection.deleteOne({
      bookingId: bookingId
    });

    if (result.deletedCount > 0) {
      console.log(`🗑️ Deleted incomplete booking ${bookingId} from MongoDB`);

      return {
        success: true,
        deletedCount: result.deletedCount,
        message: `Deleted incomplete booking ${bookingId}`
      };
    } else {
      return {
        success: false,
        message: `Incomplete booking ${bookingId} not found`
      };
    }

  } catch (error) {
    console.error('❌ Error deleting incomplete booking:', error);
    return {
      success: false,
      error: 'Failed to delete incomplete booking'
    };
  }
};

// Delete expired incomplete bookings (24+ hours old)
const deleteExpiredIncompleteBookings = async () => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    // Get collection
    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(INCOMPLETE_COLLECTION_NAME);

    // Find and delete expired bookings
    const now = new Date();
    const result = await collection.deleteMany({
      expiresAt: { $lt: now }
    });

    console.log(`🗑️ Deleted ${result.deletedCount} expired incomplete bookings from MongoDB`);

    return {
      success: true,
      deletedCount: result.deletedCount,
      message: `Deleted ${result.deletedCount} expired incomplete bookings`
    };

  } catch (error) {
    console.error('❌ Error deleting expired incomplete bookings:', error);
    return {
      success: false,
      error: 'Failed to delete expired incomplete bookings'
    };
  }
};

// Increment staff-specific counter in counters collection
const incrementStaffCounter = async (staffId: string) => {
  try {
    if (!isConnected || !db) {
      await connectToDatabase();
    }

    const collection = db!.collection<any>(COUNTERS_COLLECTION_NAME);
    const staffCounterId = `staff_${staffId}`;

    // Get current IST date for reset logic
    const now = new Date();
    const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const currentDay = istNow.getDate();
    const currentMonth = istNow.getMonth();
    const currentYear = istNow.getFullYear();

    // Calculate week start
    const currentWeekStart = new Date(istNow);
    currentWeekStart.setDate(istNow.getDate() - istNow.getDay());
    const currentWeekStartDay = currentWeekStart.getDate();
    const currentWeekStartMonth = currentWeekStart.getMonth();
    const currentWeekStartYear = currentWeekStart.getFullYear();

    // Check if staff counter exists
    const existingCounter = await collection.findOne({ _id: staffCounterId as any });

    if (!existingCounter) {
      // Create new staff counter
      const newStaffCounter = {
        _id: staffCounterId,
        staffId: staffId,
        type: 'staff_manual',
        dailyCount: 1,
        weeklyCount: 1,
        monthlyCount: 1,
        yearlyCount: 1,
        totalCount: 1,
        count: 1, // Legacy support
        lastResetDay: currentDay,
        lastResetWeekDay: currentWeekStartDay,
        lastResetWeekMonth: currentWeekStartMonth,
        lastResetWeekYear: currentWeekStartYear,
        lastResetMonth: currentMonth,
        lastResetYear: currentYear,
        createdAt: new Date(),
        lastUpdated: new Date()
      };

      await collection.insertOne(newStaffCounter);
      console.log(`✅ Created new staff counter for ${staffId}: 1 booking`);
      return { success: true, message: 'Staff counter created and incremented' };
    }

    // Check if counters need reset (same logic as main counters)
    let resetDaily = false, resetWeekly = false, resetMonthly = false, resetYearly = false;

    if (existingCounter.lastResetDay !== currentDay ||
      existingCounter.lastResetMonth !== currentMonth ||
      existingCounter.lastResetYear !== currentYear) {
      resetDaily = true;
    }

    if (existingCounter.lastResetWeekDay !== currentWeekStartDay ||
      existingCounter.lastResetWeekMonth !== currentWeekStartMonth ||
      existingCounter.lastResetWeekYear !== currentWeekStartYear) {
      resetWeekly = true;
    }

    if (existingCounter.lastResetMonth !== currentMonth ||
      existingCounter.lastResetYear !== currentYear) {
      resetMonthly = true;
    }

    if (existingCounter.lastResetYear !== currentYear) {
      resetYearly = true;
    }

    // Update counter with reset logic
    const updateDoc: any = {
      $inc: {
        totalCount: 1,
        count: 1 // Legacy support
      },
      $set: {
        lastUpdated: new Date()
      }
    };

    if (resetDaily) {
      updateDoc.$set.dailyCount = 1;
      updateDoc.$set.lastResetDay = currentDay;
    } else {
      updateDoc.$inc.dailyCount = 1;
    }

    if (resetWeekly) {
      updateDoc.$set.weeklyCount = 1;
      updateDoc.$set.lastResetWeekDay = currentWeekStartDay;
      updateDoc.$set.lastResetWeekMonth = currentWeekStartMonth;
      updateDoc.$set.lastResetWeekYear = currentWeekStartYear;
    } else {
      updateDoc.$inc.weeklyCount = 1;
    }

    if (resetMonthly) {
      updateDoc.$set.monthlyCount = 1;
      updateDoc.$set.lastResetMonth = currentMonth;
    } else {
      updateDoc.$inc.monthlyCount = 1;
    }

    if (resetYearly) {
      updateDoc.$set.yearlyCount = 1;
      updateDoc.$set.lastResetYear = currentYear;
    } else {
      updateDoc.$inc.yearlyCount = 1;
    }

    await collection.updateOne({ _id: staffCounterId }, updateDoc);

    console.log(`✅ Incremented staff counter for ${staffId}`);
    return { success: true, message: 'Staff counter incremented' };

  } catch (error) {
    console.error(`❌ Error incrementing staff counter for ${staffId}:`, error);
    return { success: false, error: 'Failed to increment staff counter' };
  }
};


// Get all bookings from MongoDB database
const getAllBookings = async () => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    // Get collection
    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(COLLECTION_NAME);

    // Find all bookings
    const bookings = await collection.find({}).toArray();

    // Decompress all booking data
    const decompressedBookings = [];
    for (const booking of bookings) {
      if (booking.compressedData) {
        try {
          const decompressed: any = await decompressData(booking.compressedData);
          // Merge decompressed data with database fields
          const mergedBooking = {
            ...decompressed,
            _id: booking._id,
            bookingId: booking.bookingId || decompressed.bookingId,
            createdAt: booking.createdAt || decompressed.createdAt,
            status: booking.status || decompressed.status,
            expiredAt: booking.expiredAt || decompressed.expiredAt,
            updatedAt: booking.updatedAt || decompressed.updatedAt,
            // Override with database fields if they exist
            name: booking.name || decompressed.name || decompressed.customerName,
            email: booking.email || decompressed.email,
            phone: decompressed.phone,
            theaterName: booking.theaterName || decompressed.theaterName || decompressed.theater,
            date: booking.date || decompressed.date,
            time: booking.time || decompressed.time,
            occasion: booking.occasion || decompressed.occasion,
            totalAmount: booking.totalAmount || decompressed.totalAmount || decompressed.amount,
            // Guest-related fields
            numberOfPeople: booking.numberOfPeople || decompressed.numberOfPeople,
            extraGuestsCount: booking.extraGuestsCount || decompressed.extraGuestsCount,
            extraGuestCharges: booking.extraGuestCharges || decompressed.extraGuestCharges,
            pricingData: booking.pricingData || decompressed.pricingData
          };
          decompressedBookings.push(mergedBooking);
        } catch (error) {
          console.error('❌ Error decompressing booking:', booking.bookingId, error);
          // Fall back to uncompressed data
          decompressedBookings.push(booking);
        }
      } else {
        // Already uncompressed
        decompressedBookings.push(booking);
      }
    }

    return {
      success: true,
      bookings: decompressedBookings,
      total: decompressedBookings.length,
      database: DB_NAME,
      collection: COLLECTION_NAME
    };

  } catch (error) {
    console.error('❌ Error getting bookings from MongoDB:', error);
    return {
      success: false,
      error: 'Failed to get bookings from MongoDB'
    };
  }
};

// Get booking by ID from MongoDB database
const getBookingById = async (bookingId: string) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    // Get collection
    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(COLLECTION_NAME);

    // Try to find booking by ID (handle both ObjectId and custom ID formats)
    let booking;

    // First try as ObjectId if it's a valid format
    if (ObjectId.isValid(bookingId) && bookingId.length === 24) {
      booking = await collection.findOne({ _id: new ObjectId(bookingId) });
    } else {
      // Try as custom ID field
      booking = await collection.findOne({ bookingId: bookingId });
    }

    if (!booking) {
      return {
        success: false,
        error: 'Booking not found'
      };
    }

    // Check if booking data is compressed
    let decompressedBooking = booking;
    if (booking.compressedData) {
      try {
        // Decompress the booking data
        const decompressedData = await decompressData(booking.compressedData) as Record<string, unknown>;
        // Prioritize uncompressed fields over compressed data (for updated fields)
        decompressedBooking = { ...decompressedData, ...booking } as typeof booking;
        console.log('📦 Decompressed booking data for:', booking.bookingId);
      } catch (error) {
        console.error('❌ Error decompressing booking data:', error);
        // Fall back to uncompressed data if decompression fails
        decompressedBooking = booking;
      }
    }

    return {
      success: true,
      booking: decompressedBooking,
      database: DB_NAME,
      collection: COLLECTION_NAME
    };

  } catch (error) {
    console.error('❌ Error getting booking by ID from MongoDB:', error);
    return {
      success: false,
      error: 'Failed to get booking from MongoDB'
    };
  }
};

// Get booking by ticket number from MongoDB database
const getBookingByTicketNumber = async (ticketNumber: string) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    // Get collection
    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(COLLECTION_NAME);

    // Find booking by ticketNumber (unique per booking)
    const booking = await collection.findOne({ ticketNumber: ticketNumber });

    if (!booking) {
      return {
        success: false,
        error: 'Booking not found'
      };
    }

    // Check if booking data is compressed
    let decompressedBooking = booking;
    if (booking.compressedData) {
      try {
        const decompressedData = await decompressData(booking.compressedData) as Record<string, unknown>;
        decompressedBooking = { ...decompressedData, ...booking } as typeof booking;
        console.log('📦 Decompressed booking data for ticket number:', ticketNumber);
      } catch (error) {
        console.error('❌ Error decompressing booking data by ticket number:', error);
        // Fall back to uncompressed data if decompression fails
        decompressedBooking = booking;
      }
    }

    return {
      success: true,
      booking: decompressedBooking,
      database: DB_NAME,
      collection: COLLECTION_NAME
    };

  } catch (error) {
    console.error('❌ Error getting booking by ticket number from MongoDB:', error);
    return {
      success: false,
      error: 'Failed to get booking from MongoDB'
    };
  }
};

// Update booking status in MongoDB database
const updateBookingStatus = async (bookingId: string, status: string) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    // Get collection
    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(COLLECTION_NAME);

    // Update booking status (handle both ObjectId and custom ID formats)
    let result;

    // First try as ObjectId if it's a valid format
    if (ObjectId.isValid(bookingId) && bookingId.length === 24) {
      result = await collection.updateOne(
        { _id: new ObjectId(bookingId) },
        {
          $set: {
            status: status,
            updatedAt: new Date()
          }
        }
      );
    } else {
      // Try as custom ID field
      result = await collection.updateOne(
        { bookingId: bookingId },
        {
          $set: {
            status: status,
            updatedAt: new Date()
          }
        }
      );
    }

    if (result.matchedCount === 0) {
      return {
        success: false,
        error: 'Booking not found'
      };
    }

    if (result.modifiedCount === 0) {
      return {
        success: false,
        error: 'Booking status not updated'
      };
    }

    console.log(`✅ Booking status updated to ${status} in MongoDB:`, bookingId);

    return {
      success: true,
      message: `Booking status updated to ${status}`,
      database: DB_NAME,
      collection: COLLECTION_NAME
    };

  } catch (error) {
    console.error('❌ Error updating booking status in MongoDB:', error);
    return {
      success: false,
      error: 'Failed to update booking status in MongoDB'
    };
  }
};

// Update booking in MongoDB database
const updateBooking = async (bookingId: string, bookingData: Record<string, unknown>) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    // Get collection
    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(COLLECTION_NAME);

    // Get the original booking data first to preserve existing fields
    console.log(`🔍 Getting original booking data for ID: ${bookingId}`);
    const originalBookingResult = await getBookingById(bookingId);
    const originalBooking = originalBookingResult.booking;

    console.log(`🔍 Original booking result:`, {
      success: originalBookingResult.success,
      hasBooking: !!originalBooking,
      bookingId: originalBooking?.bookingId,
      mongoId: originalBooking?._id
    });

    if (!originalBooking) {
      console.error(`❌ Original booking not found for ID: ${bookingId}`);
      return {
        success: false,
        error: 'Original booking not found'
      };
    }

    // Prepare update object with explicit fields and timestamps
    const updateData: any = {
      updatedAt: new Date()
    };

    // Only update uncompressed fields if they are provided, otherwise preserve original values
    if (bookingData.customerName !== undefined || bookingData.name !== undefined) {
      updateData.name = bookingData.customerName || bookingData.name;
    } else {
      updateData.name = originalBooking.name;
    }
    if (bookingData.email !== undefined) {
      updateData.email = bookingData.email;
    } else {
      updateData.email = originalBooking.email;
    }
    if (bookingData.phone !== undefined) {
      updateData.phone = bookingData.phone;
    } else {
      updateData.phone = originalBooking.phone;
    }
    if (bookingData.theater !== undefined || bookingData.theaterName !== undefined) {
      updateData.theaterName = bookingData.theater || bookingData.theaterName;
    } else {
      updateData.theaterName = originalBooking.theaterName;
    }
    if (bookingData.date !== undefined) {
      updateData.date = bookingData.date;
    } else {
      updateData.date = originalBooking.date;
    }
    if (bookingData.time !== undefined) {
      updateData.time = bookingData.time;
    } else {
      updateData.time = originalBooking.time;
    }
    if (bookingData.occasion !== undefined) {
      updateData.occasion = bookingData.occasion;
    } else {
      updateData.occasion = originalBooking.occasion;
    }
    let normalizedOccasionData: Record<string, string> | undefined;
    if (bookingData.occasionData !== undefined) {
      normalizedOccasionData = await normalizeOccasionData({
        ...originalBooking,
        ...bookingData,
        occasionData: bookingData.occasionData
      });
      updateData.occasionData = normalizedOccasionData;
    } else if ((originalBooking as any).occasionData !== undefined) {
      normalizedOccasionData = await normalizeOccasionData(originalBooking);
      updateData.occasionData = normalizedOccasionData;
    }
    if (bookingData.amount !== undefined || bookingData.totalAmount !== undefined) {
      updateData.totalAmount = bookingData.amount || bookingData.totalAmount;
    } else {
      updateData.totalAmount = originalBooking.totalAmount;
    }
    if (bookingData.advancePayment !== undefined) {
      updateData.advancePayment = bookingData.advancePayment;
    } else {
      updateData.advancePayment = (originalBooking as any).advancePayment;
    }
    if (bookingData.slotBookingFee !== undefined) {
      updateData.slotBookingFee = bookingData.slotBookingFee;
    } else if ((originalBooking as any).slotBookingFee !== undefined) {
      updateData.slotBookingFee = (originalBooking as any).slotBookingFee;
    }
    if (bookingData.venuePayment !== undefined) {
      updateData.venuePayment = bookingData.venuePayment;
    } else if ((originalBooking as any).venuePayment !== undefined) {
      updateData.venuePayment = (originalBooking as any).venuePayment;
    }
    if (bookingData.status !== undefined) {
      updateData.status = bookingData.status;
    } else {
      updateData.status = originalBooking.status;
    }
    if (bookingData.numberOfPeople !== undefined) {
      updateData.numberOfPeople = bookingData.numberOfPeople;
    } else {
      updateData.numberOfPeople = originalBooking.numberOfPeople;
    }
    if (bookingData.extraGuestsCount !== undefined) {
      updateData.extraGuestsCount = bookingData.extraGuestsCount;
    } else if ((originalBooking as any).extraGuestsCount !== undefined) {
      updateData.extraGuestsCount = (originalBooking as any).extraGuestsCount;
    }
    if (bookingData.extraGuestCharges !== undefined) {
      updateData.extraGuestCharges = bookingData.extraGuestCharges;
    } else if ((originalBooking as any).extraGuestCharges !== undefined) {
      updateData.extraGuestCharges = (originalBooking as any).extraGuestCharges;
    }
    if (bookingData.extraGuestFee !== undefined) {
      updateData.extraGuestFee = bookingData.extraGuestFee;
    } else if ((originalBooking as any).extraGuestFee !== undefined) {
      updateData.extraGuestFee = (originalBooking as any).extraGuestFee;
    }
    // Persist decoration and penalty charges top-level
    if ((bookingData as any).decorationFee !== undefined) {
      (updateData as any).decorationFee = (bookingData as any).decorationFee;
    } else if ((originalBooking as any).decorationFee !== undefined) {
      (updateData as any).decorationFee = (originalBooking as any).decorationFee;
    }
    if ((bookingData as any).appliedDecorationFee !== undefined) {
      (updateData as any).appliedDecorationFee = (bookingData as any).appliedDecorationFee;
    } else if ((originalBooking as any).appliedDecorationFee !== undefined) {
      (updateData as any).appliedDecorationFee = (originalBooking as any).appliedDecorationFee;
    }
    if ((bookingData as any).penaltyCharges !== undefined || (bookingData as any).penaltyCharge !== undefined) {
      const penalty = (bookingData as any).penaltyCharges ?? (bookingData as any).penaltyCharge;
      (updateData as any).penaltyCharges = penalty;
      (updateData as any).penaltyCharge = penalty;
    } else if (
      (originalBooking as any).penaltyCharges !== undefined ||
      (originalBooking as any).penaltyCharge !== undefined
    ) {
      const penalty = (originalBooking as any).penaltyCharges ?? (originalBooking as any).penaltyCharge;
      (updateData as any).penaltyCharges = penalty;
      (updateData as any).penaltyCharge = penalty;
    }
    if ((bookingData as any).penaltyReason !== undefined) {
      (updateData as any).penaltyReason = (bookingData as any).penaltyReason;
    } else if ((originalBooking as any).penaltyReason !== undefined) {
      (updateData as any).penaltyReason = (originalBooking as any).penaltyReason;
    }
    if ((bookingData as any).DiscountByCoupon !== undefined || (bookingData as any).discountByCoupon !== undefined) {
      (updateData as any).DiscountByCoupon = (bookingData as any).DiscountByCoupon ?? (bookingData as any).discountByCoupon;
    } else if (
      (originalBooking as any).DiscountByCoupon !== undefined ||
      (originalBooking as any).discountByCoupon !== undefined
    ) {
      (updateData as any).DiscountByCoupon = (originalBooking as any).DiscountByCoupon ?? (originalBooking as any).discountByCoupon;
    }
    if ((bookingData as any).Discount !== undefined || (bookingData as any).discount !== undefined) {
      (updateData as any).Discount = (bookingData as any).Discount ?? (bookingData as any).discount;
    } else if (
      (originalBooking as any).Discount !== undefined ||
      (originalBooking as any).discount !== undefined
    ) {
      (updateData as any).Discount = (originalBooking as any).Discount ?? (originalBooking as any).discount;
    }
    // Persist specialDiscount (mapped from adminDiscount if provided)
    if ((bookingData as any).specialDiscount !== undefined || (bookingData as any).adminDiscount !== undefined) {
      const special = (bookingData as any).specialDiscount ?? (bookingData as any).adminDiscount;
      (updateData as any).specialDiscount = special;
    } else if ((originalBooking as any).specialDiscount !== undefined) {
      (updateData as any).specialDiscount = (originalBooking as any).specialDiscount;
    }
    if (bookingData.paymentStatus !== undefined) {
      updateData.paymentStatus = bookingData.paymentStatus;
    } else {
      updateData.paymentStatus = originalBooking.paymentStatus || 'unpaid';
    }
    if (bookingData.venuePaymentMethod !== undefined || bookingData.paymentMethod !== undefined) {
      updateData.venuePaymentMethod = bookingData.venuePaymentMethod ?? bookingData.paymentMethod;
      updateData.paymentMethod = bookingData.paymentMethod ?? bookingData.venuePaymentMethod ?? updateData.paymentMethod;
    } else if ((originalBooking as any).venuePaymentMethod !== undefined) {
      updateData.venuePaymentMethod = (originalBooking as any).venuePaymentMethod;
      if ((originalBooking as any).paymentMethod !== undefined) {
        updateData.paymentMethod = (originalBooking as any).paymentMethod;
      }
    }

    // Add payment tracking fields as uncompressed for easy querying
    if (bookingData.paidBy !== undefined) {
      updateData.paidBy = bookingData.paidBy;
    } else if ((originalBooking as any).paidBy !== undefined) {
      updateData.paidBy = (originalBooking as any).paidBy;
    }
    if (bookingData.staffName !== undefined) {
      updateData.staffName = bookingData.staffName;
    } else if ((originalBooking as any).staffName !== undefined) {
      updateData.staffName = (originalBooking as any).staffName;
    }
    if (bookingData.userId !== undefined) {
      updateData.userId = bookingData.userId;
      updateData.staffId = bookingData.userId; // Also save as staffId for backward compatibility
    } else if ((originalBooking as any).userId !== undefined) {
      updateData.userId = (originalBooking as any).userId;
      updateData.staffId = (originalBooking as any).userId;
    }
    if (bookingData.paidAt !== undefined) {
      updateData.paidAt = bookingData.paidAt;
    } else if ((originalBooking as any).paidAt !== undefined) {
      updateData.paidAt = (originalBooking as any).paidAt;
    }

    // Persist dynamic service selections in top-level document for easier querying
    const dynamicServiceItemsForUpdate = getDynamicServiceItemsForDB({
      ...originalBooking,
      ...bookingData,
    });
    Object.entries(dynamicServiceItemsForUpdate).forEach(([key, value]) => {
      updateData[key] = value;
    });

    const fieldsToUnset: Record<string, ''> = {};
    const originalOccasionKeys = Object.keys((originalBooking as any).occasionData || {});
    originalOccasionKeys.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(originalBooking, key)) {
        fieldsToUnset[key] = '';
      }
      fieldsToUnset[`${key}_label`] = '';
      fieldsToUnset[`${key}_value`] = '';
    });
    if (normalizedOccasionData) {
      Object.keys(normalizedOccasionData).forEach((key) => {
        fieldsToUnset[key] = '';
        fieldsToUnset[`${key}_label`] = '';
        fieldsToUnset[`${key}_value`] = '';
      });
    }

    // Try to update by ObjectId first, then by custom bookingId
    let updateResult;
    const updateOperators: Record<string, unknown> = { $set: updateData };
    const unsetKeys = Object.keys(fieldsToUnset).filter((key) => fieldsToUnset[key] !== undefined);
    if (unsetKeys.length > 0) {
      updateOperators.$unset = fieldsToUnset;
    }

    // First try as ObjectId if it's a valid format
    if (ObjectId.isValid(bookingId) && bookingId.length === 24) {
      console.log(`🔍 Trying to update by ObjectId: ${bookingId}`);
      updateResult = await collection.updateOne(
        { _id: new ObjectId(bookingId) },
        updateOperators
      );
      console.log(`🔍 ObjectId update result:`, {
        matchedCount: updateResult.matchedCount,
        modifiedCount: updateResult.modifiedCount
      });
    } else {
      // Try as custom ID field
      console.log(`🔍 Trying to update by bookingId: ${bookingId}`);
      updateResult = await collection.updateOne(
        { bookingId: bookingId },
        updateOperators
      );
      console.log(`🔍 bookingId update result:`, {
        matchedCount: updateResult.matchedCount,
        modifiedCount: updateResult.modifiedCount
      });
    }

    // If no documents matched, the booking doesn't exist
    if (updateResult.matchedCount === 0) {
      console.error(`❌ No booking found with ID: ${bookingId}`);
      return {
        success: false,
        error: 'Booking not found'
      };
    }

    // Log the update result for debugging
    console.log(`📝 Update result for booking ${bookingId}:`, {
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount,
      acknowledged: updateResult.acknowledged
    });

    // It's possible that no fields actually changed (modifiedCount === 0).
    // Treat this as success and return the current booking state.

    // Get the updated booking
    let updatedBooking;

    // First try as ObjectId if it's a valid format
    if (ObjectId.isValid(bookingId) && bookingId.length === 24) {
      updatedBooking = await collection.findOne({ _id: new ObjectId(bookingId) });
    } else {
      // Try as custom ID field
      updatedBooking = await collection.findOne({ bookingId: bookingId });
    }

    if (!updatedBooking) {
      return {
        success: false,
        error: 'Updated booking not found'
      };
    }

    // Decompress the booking data to get the full booking information
    let fullBookingData: any;
    if (updatedBooking.compressedData) {
      try {
        const decompressedData = await decompressData(updatedBooking.compressedData);
        // Prioritize uncompressed fields over compressed data (for updated fields)
        fullBookingData = { ...(decompressedData as any), ...updatedBooking };

        // Verify that the time slot was correctly updated in compressed data
        console.log('🔍 Compressed data verification after update:', {
          bookingId: bookingId,
          originalTime: (originalBooking as any).time,
          newTime: bookingData.time,
          decompressedTime: (decompressedData as any).time,
          finalTime: fullBookingData.time,
          decompressedDate: (decompressedData as any).date,
          finalDate: fullBookingData.date,
          decompressedTheater: (decompressedData as any).theaterName,
          finalTheater: fullBookingData.theaterName,
          timeSlotUpdated: (decompressedData as any).time === bookingData.time
        });
      } catch (error) {
        console.error('❌ Error decompressing booking data:', error);
        fullBookingData = updatedBooking; // Fallback to uncompressed data
      }
    } else {
      fullBookingData = updatedBooking;
    }

    console.log(`✅ Booking updated in MongoDB:`, bookingId);

    // Import the new counter system
    const { incrementCounter: incrementNewCounter } = await import('./counter-system');
    const { decrementCounter: decrementNewCounter } = await import('./counter-system');

    // Increment appropriate counter if status changed
    if (bookingData.status === 'completed') {
      await incrementNewCounter('completed');
      // Decrement incomplete counter when a booking is completed
      await decrementNewCounter('incomplete');
      console.log('📉 Decremented incomplete counter after booking completion');
    }

    return {
      success: true,
      booking: {
        id: fullBookingData.bookingId || fullBookingData._id,
        name: fullBookingData.name,
        email: fullBookingData.email,
        phone: fullBookingData.phone,
        theaterName: fullBookingData.theaterName,
        date: fullBookingData.date,
        time: fullBookingData.time,
        occasion: fullBookingData.occasion,
        numberOfPeople: fullBookingData.numberOfPeople,
        totalAmount: fullBookingData.totalAmount,
        createdAt: fullBookingData.createdAt,
        updatedAt: fullBookingData.updatedAt,
        // Include all other fields from the decompressed data
        ...fullBookingData
      }
    };

  } catch (error) {
    console.error('❌ Error updating booking in MongoDB:', error);
    return {
      success: false,
      error: 'Failed to update booking in MongoDB'
    };
  }
};

// Update manual booking in MongoDB
const updateManualBooking = async (bookingId: string, bookingData: Record<string, unknown>) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    // Get collection
    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(MANUAL_BOOKING_COLLECTION_NAME);

    // Get the original manual booking data first to preserve existing fields
    const normalizedBookingId = String(bookingId).replace(/^#/, '').trim();
    const manualBookings = await getAllManualBookings();
    let originalBooking = manualBookings.manualBookings?.find((b: any) =>
      (b.bookingId === normalizedBookingId) ||
      (b.id && String(b.id) === normalizedBookingId) ||
      (b._id && String(b._id) === normalizedBookingId)
    );

    if (!originalBooking) {
      // Try direct lookup in collection by bookingId or _id
      const directByCustomId = await collection.findOne({ bookingId: normalizedBookingId });
      if (directByCustomId) {
        if ((directByCustomId as any).compressedData) {
          try {
            const decompressed = await decompressData((directByCustomId as any).compressedData);
            originalBooking = { ...(decompressed as any), ...directByCustomId } as any;
          } catch {
            originalBooking = directByCustomId as any;
          }
        } else {
          originalBooking = directByCustomId as any;
        }
      } else if (ObjectId.isValid(normalizedBookingId) && normalizedBookingId.length === 24) {
        const directByObjectId = await collection.findOne({ _id: new ObjectId(normalizedBookingId) });
        if (directByObjectId) {
          if ((directByObjectId as any).compressedData) {
            try {
              const decompressed = await decompressData((directByObjectId as any).compressedData);
              originalBooking = { ...(decompressed as any), ...directByObjectId } as any;
            } catch {
              originalBooking = directByObjectId as any;
            }
          } else {
            originalBooking = directByObjectId as any;
          }
        }
      }
    }

    if (!originalBooking) {
      // Fallback: Some manual entries might exist only in main booking collection
      try {
        const fallbackResult = await updateBooking(normalizedBookingId, bookingData);
        if (fallbackResult && (fallbackResult as any).success) {
          console.warn('⚠️ [Fallback] Manual booking not found in manual collection; updated main booking instead:', normalizedBookingId);
          return fallbackResult as any;
        }
      } catch (fallbackError) {
        console.warn('⚠️ [Fallback] Failed to update main booking for manual booking:', fallbackError);
      }
      return {
        success: false,
        error: 'Original manual booking not found'
      };
    }

    const updateData: any = {
      updatedAt: new Date(),
      name: bookingData.customerName || bookingData.name || (originalBooking as any).name,
      email: bookingData.email || (originalBooking as any).email,
      phone: bookingData.phone || (originalBooking as any).phone,
      theaterName: bookingData.theater || bookingData.theaterName || (originalBooking as any).theaterName,
      date: bookingData.date || (originalBooking as any).date,
      time: bookingData.time || (originalBooking as any).time,
      occasion: bookingData.occasion || (originalBooking as any).occasion,
      totalAmount: bookingData.amount || bookingData.totalAmount || (originalBooking as any).totalAmount,
      // Persist decoration and penalty for manual bookings as well
      decorationFee: (bookingData as any).decorationFee ?? (originalBooking as any).decorationFee ?? null,
      appliedDecorationFee: (bookingData as any).appliedDecorationFee ?? (originalBooking as any).appliedDecorationFee ?? null,
      penaltyCharges:
        (bookingData as any).penaltyCharges ??
        (bookingData as any).penaltyCharge ??
        (originalBooking as any).penaltyCharges ??
        (originalBooking as any).penaltyCharge ??
        null,
      penaltyReason:
        (bookingData as any).penaltyReason ??
        (originalBooking as any).penaltyReason ??
        null,
      specialDiscount: (bookingData as any).specialDiscount ?? (bookingData as any).adminDiscount ?? (originalBooking as any).specialDiscount ?? null,
      Discount: (bookingData as any).Discount ?? (bookingData as any).discount ?? (originalBooking as any).Discount ?? (originalBooking as any).discount ?? null,
      DiscountByCoupon: (bookingData as any).DiscountByCoupon ?? (bookingData as any).discountByCoupon ?? (originalBooking as any).DiscountByCoupon ?? (originalBooking as any).discountByCoupon ?? null,
      occasionPersonName: bookingData.occasionPersonName ?? (originalBooking as any).occasionPersonName ?? null,
      occasionData: bookingData.occasionData ?? (originalBooking as any).occasionData ?? null,
      numberOfPeople: bookingData.numberOfPeople || (originalBooking as any).numberOfPeople,
      paymentStatus: bookingData.paymentStatus || (originalBooking as any).paymentStatus || 'unpaid',
      venuePaymentMethod: bookingData.venuePaymentMethod ?? bookingData.paymentMethod ?? (originalBooking as any).venuePaymentMethod ?? (originalBooking as any).paymentMethod ?? null,
      paymentMethod: bookingData.paymentMethod ?? bookingData.venuePaymentMethod ?? (originalBooking as any).paymentMethod ?? (originalBooking as any).venuePaymentMethod ?? null,
      paidBy: bookingData.paidBy ?? (originalBooking as any).paidBy ?? null,
      staffName: bookingData.staffName ?? (originalBooking as any).staffName ?? null,
      userId: bookingData.userId ?? (originalBooking as any).userId ?? null,
      staffId: bookingData.userId ?? (originalBooking as any).userId ?? null,
      paidAt: bookingData.paidAt ?? (originalBooking as any).paidAt ?? null
    };

    // Try to update by ObjectId first, then by custom bookingId
    let updateResult;

    // First try as ObjectId if it's a valid format
    if (ObjectId.isValid(normalizedBookingId) && normalizedBookingId.length === 24) {
      updateResult = await collection.updateOne(
        { _id: new ObjectId(normalizedBookingId) },
        { $set: updateData }
      );
    } else {
      // Try as custom ID field
      updateResult = await collection.updateOne(
        { bookingId: normalizedBookingId },
        { $set: updateData }
      );
    }

    if (updateResult.matchedCount === 0) {
      return {
        success: false,
        error: 'Manual booking not found'
      };
    }

    if (updateResult.modifiedCount === 0) {
      return {
        success: false,
        error: 'Manual booking not found or no changes made'
      };
    }

    // Keep main bookings collection in sync so manual behaves like confirmed booking
    try {
      await updateBooking(normalizedBookingId, bookingData);
    } catch (syncError) {
      console.warn('⚠️ [Sync] Failed to mirror manual booking update to main collection:', {
        bookingId: normalizedBookingId,
        error: syncError
      });
    }

    // Get the updated booking
    let updatedBooking;

    // First try as ObjectId if it's a valid format
    if (ObjectId.isValid(bookingId) && bookingId.length === 24) {
      updatedBooking = await collection.findOne({ _id: new ObjectId(bookingId) });
    } else {
      // Try as custom ID field
      updatedBooking = await collection.findOne({ bookingId: bookingId });
    }

    if (!updatedBooking) {
      return {
        success: false,
        error: 'Updated manual booking not found'
      };
    }

    // Decompress the booking data to get the full booking information
    const fullBookingData: any = updatedBooking;

    console.log(`✅ Manual booking updated in MongoDB:`, normalizedBookingId);

    await syncManualBookingToGoDaddy(fullBookingData);

    return {
      success: true,
      booking: {
        id: fullBookingData.bookingId || fullBookingData._id,
        customerName: fullBookingData.name,
        email: fullBookingData.email,
        phone: fullBookingData.phone,
        theater: fullBookingData.theaterName,
        date: fullBookingData.date,
        time: fullBookingData.time,
        occasion: fullBookingData.occasion,
        totalAmount: fullBookingData.totalAmount,
        status: fullBookingData.status,
        createdAt: fullBookingData.createdAt,
        updatedAt: fullBookingData.updatedAt,
        // Include all other fields from the decompressed data
        ...fullBookingData
      }
    };

  } catch (error) {
    console.error('❌ Error updating manual booking in MongoDB:', error);
    return {
      success: false,
      error: 'Failed to update manual booking'
    };
  }
};

// Update incomplete booking in MongoDB
const updateIncompleteBooking = async (bookingId: string, bookingData: Record<string, unknown>) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    // Get collection
    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(INCOMPLETE_COLLECTION_NAME);

    // Compress the updated booking data
    const compressedData = await compressData(bookingData);

    // Create update object with compressed data
    const updateData: any = {
      compressedData: compressedData,
      updatedAt: new Date()
    };

    // Only update uncompressed fields if they are provided
    if (bookingData.customerName !== undefined || bookingData.name !== undefined) {
      updateData.name = bookingData.customerName || bookingData.name;
    }
    if (bookingData.email !== undefined) {
      updateData.email = bookingData.email;
    }
    if (bookingData.theater !== undefined || bookingData.theaterName !== undefined) {
      updateData.theaterName = bookingData.theater || bookingData.theaterName;
    }
    if (bookingData.date !== undefined) {
      updateData.date = bookingData.date;
    }
    if (bookingData.time !== undefined) {
      updateData.time = bookingData.time;
    }
    if (bookingData.occasion !== undefined) {
      updateData.occasion = bookingData.occasion;
    }
    if (bookingData.amount !== undefined || bookingData.totalAmount !== undefined) {
      updateData.totalAmount = bookingData.amount || bookingData.totalAmount;
    }
    if (bookingData.status !== undefined) {
      updateData.status = bookingData.status;
    }
    if (bookingData.paymentStatus !== undefined) {
      updateData.paymentStatus = bookingData.paymentStatus;
    }

    // Try to update by ObjectId first, then by custom bookingId
    let updateResult;

    // First try as ObjectId if it's a valid format
    if (ObjectId.isValid(bookingId) && bookingId.length === 24) {
      updateResult = await collection.updateOne(
        { _id: new ObjectId(bookingId) },
        { $set: updateData }
      );
    } else {
      // Try as custom ID field
      updateResult = await collection.updateOne(
        { bookingId: bookingId },
        { $set: updateData }
      );
    }

    if (updateResult.matchedCount === 0) {
      return {
        success: false,
        error: 'Incomplete booking not found'
      };
    }

    // Get the updated booking
    let updatedBooking;
    if (ObjectId.isValid(bookingId) && bookingId.length === 24) {
      updatedBooking = await collection.findOne({ _id: new ObjectId(bookingId) });
    } else {
      // Try as custom ID field
      updatedBooking = await collection.findOne({ bookingId: bookingId });
    }

    if (!updatedBooking) {
      return {
        success: false,
        error: 'Updated incomplete booking not found'
      };
    }

    console.log(`✅ Incomplete booking updated in MongoDB:`, bookingId);

    return {
      success: true,
      booking: {
        id: updatedBooking.bookingId || updatedBooking._id,
        name: updatedBooking.name,
        email: updatedBooking.email,
        phone: updatedBooking.phone,
        theater: updatedBooking.theaterName,
        date: updatedBooking.date,
        time: updatedBooking.time,
        occasion: updatedBooking.occasion,
        totalAmount: updatedBooking.totalAmount,
        status: updatedBooking.status,
        createdAt: updatedBooking.createdAt,
        updatedAt: updatedBooking.updatedAt
      }
    };

  } catch (error) {
    console.error('❌ Error updating incomplete booking in MongoDB:', error);
    return {
      success: false,
      error: 'Failed to update incomplete booking'
    };
  }
};

// Move booking to cancelled collection instead of deleting
const moveBookingToCancelled = async (bookingId: string, cancellationData: { cancelledAt: Date; refundAmount: number; refundStatus: string; cancellationReason?: string }) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    // Get collections
    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(COLLECTION_NAME);
    const cancelledCollection = db.collection(CANCELLED_COLLECTION_NAME);

    // First, get the booking to move
    let booking;

    // First try as ObjectId if it's a valid format
    if (ObjectId.isValid(bookingId) && bookingId.length === 24) {
      booking = await collection.findOne({ _id: new ObjectId(bookingId) });
    } else {
      // Try as custom ID field
      booking = await collection.findOne({ bookingId: bookingId });
    }

    if (!booking) {
      return {
        success: false,
        error: 'Booking not found'
      };
    }

    // Decompress booking data to extract important fields
    let decompressedData: any = {};
    if (booking.compressedData) {
      try {
        decompressedData = await decompressData(booking.compressedData);
        console.log(`📋 Moving booking ${bookingId} to cancelled - fields present in compressed data:`, {
          phone: decompressedData.phone,
          numberOfPeople: decompressedData.numberOfPeople,
          advancePayment: decompressedData.advancePayment,
          venuePayment: decompressedData.venuePayment,
          totalAmount: decompressedData.totalAmount
        });
      } catch (err) {
        console.error(`⚠️ Could not decompress booking ${bookingId}`, err);
      }
    }

    // Add cancellation data to the booking AND explicitly preserve key fields from decompressed data
    // This ensures phone, payment fields etc are available at database level for querying
    const cancelledBooking = {
      ...booking,
      status: 'cancelled',
      cancelledAt: cancellationData.cancelledAt,
      refundAmount: cancellationData.refundAmount,
      refundStatus: cancellationData.refundStatus,
      cancellationReason: cancellationData.cancellationReason || 'Customer requested cancellation',
      originalCollection: COLLECTION_NAME,
      // Explicitly copy key fields from decompressed data to database level for easy access
      name: booking.name || decompressedData.name || decompressedData.customerName,
      email: booking.email || decompressedData.email,
      phone: booking.phone || decompressedData.phone,
      theaterName: booking.theaterName || decompressedData.theaterName || decompressedData.theater,
      date: booking.date || decompressedData.date,
      time: booking.time || decompressedData.time,
      occasion: booking.occasion || decompressedData.occasion,
      numberOfPeople: booking.numberOfPeople || decompressedData.numberOfPeople,
      advancePayment: booking.advancePayment || decompressedData.advancePayment,
      venuePayment: booking.venuePayment || decompressedData.venuePayment,
      totalAmount: booking.totalAmount || decompressedData.totalAmount || decompressedData.amount
    };

    // Insert into cancelled collection
    const insertResult = await cancelledCollection.insertOne(cancelledBooking);

    // Delete from original collection
    let deleteResult;
    if (ObjectId.isValid(bookingId) && bookingId.length === 24) {
      deleteResult = await collection.deleteOne({ _id: new ObjectId(bookingId) });
    } else {
      deleteResult = await collection.deleteOne({ bookingId: bookingId });
    }

    if (deleteResult.deletedCount === 0) {
      return {
        success: false,
        error: 'Failed to remove booking from original collection'
      };
    }

    console.log(`✅ Booking moved to cancelled collection:`, bookingId);

    // Import the new counter system
    const { incrementCounter: incrementNewCounter } = await import('./counter-system');

    // Increment cancelled counter
    await incrementNewCounter('cancelled');

    return {
      success: true,
      message: 'Booking moved to cancelled collection successfully',
      cancelledBooking: {
        id: (cancelledBooking as Record<string, unknown>).bookingId,
        mongoId: insertResult.insertedId,
        ...cancelledBooking
      },
      database: DB_NAME,
      originalCollection: COLLECTION_NAME,
      cancelledCollection: CANCELLED_COLLECTION_NAME
    };

  } catch (error) {
    console.error('❌ Error moving booking to cancelled collection:', error);
    return {
      success: false,
      error: 'Failed to move booking to cancelled collection'
    };
  }
};

// Delete booking from MongoDB database (legacy function - now moves to cancelled)
const deleteBooking = async (bookingId: string) => {
  try {
    console.log(`🗑️ [DELETE] Attempting to delete booking with ID: ${bookingId}`);

    if (!isConnected) {
      await connectToDatabase();
    }

    // Get collection
    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(COLLECTION_NAME);

    // Delete booking (handle both ObjectId and custom ID formats)
    let result;
    let bookingDocument: any = null;

    // First try as ObjectId if it's a valid format
    if (ObjectId.isValid(bookingId) && bookingId.length === 24) {
      console.log(`🔍 [DELETE] Trying to delete by ObjectId: ${bookingId}`);
      bookingDocument = await collection.findOne({ _id: new ObjectId(bookingId) });
      result = await collection.deleteOne({ _id: new ObjectId(bookingId) });
    } else {
      // Try as custom ID field
      console.log(`🔍 [DELETE] Trying to delete by bookingId field: ${bookingId}`);
      bookingDocument = await collection.findOne({ bookingId: bookingId });
      result = await collection.deleteOne({ bookingId: bookingId });
    }

    console.log(`📊 [DELETE] Delete result:`, result);

    if (result.deletedCount === 0) {
      console.log(`⚠️ [DELETE] No booking found with ID: ${bookingId}`);
      return {
        success: false,
        error: 'Booking not found or already deleted'
      };
    }

    console.log(`✅ [DELETE] Booking deleted from MongoDB:`, bookingId);

    // Cascade delete orders linked to this booking
    try {
      await deleteOrdersByBookingReference({
        bookingId: bookingDocument?.bookingId || bookingId,
        mongoBookingId: bookingDocument?._id?.toString?.(),
        ticketNumber: bookingDocument?.ticketNumber,
      });
    } catch (orderCleanupError) {
      console.warn('⚠️ [DELETE] Failed to delete related orders:', orderCleanupError);
    }

    return {
      success: true,
      message: 'Booking deleted successfully',
      database: DB_NAME,
      collection: COLLECTION_NAME
    };

  } catch (error) {
    console.error('❌ [DELETE] Error deleting booking from MongoDB:', error);
    return {
      success: false,
      error: 'Failed to delete booking from MongoDB'
    };
  }
};

// Delete expired bookings (bookings past their date/time)
const deleteExpiredBookings = async (currentDateTime: Date) => {
  try {
    if (process.env.ENABLE_EXPIRED_BOOKING_CLEANUP !== 'true') {
      return {
        success: true,
        deletedCount: 0,
        completedCount: 0,
        processedBookings: [],
        message: 'Expired booking cleanup is disabled'
      };
    }

    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(COLLECTION_NAME);

    console.log('🔍 Finding expired bookings...');

    // Get all bookings
    const allBookings = await collection.find({}).toArray();
    const expiredBookings: Array<{
      bookingId: any;
      mongoId: any;
      name: any;
      date: any;
      time: any;
      status: any;
      endDateTime: string;
    }> = [];

    const manualCollection = db.collection(MANUAL_BOOKING_COLLECTION_NAME);
    const allManualBookings = await manualCollection.find({}).toArray();
    const expiredManualBookings: Array<{
      bookingId: any;
      mongoId: any;
      name: any;
      date: any;
      time: any;
      status: any;
      endDateTime: string;
    }> = [];

    // Check each booking to see if it's expired
    for (const booking of allBookings) {
      try {
        // Parse the booking date and time
        const bookingDate = new Date(booking.date);
        const timeSlot = booking.time;

        // Extract end time from time slot (e.g., "04:00 PM - 07:00 PM" -> "07:00 PM")
        const timeMatch = timeSlot.match(/(\d{1,2}:\d{2}\s*(AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(AM|PM))/);
        if (timeMatch) {
          const endTimeStr = timeMatch[3] + ' ' + timeMatch[4];

          // Create end datetime
          const endDateTime = new Date(bookingDate);
          const [time, period] = endTimeStr.split(' ');
          const [hours, minutes] = time.split(':');
          let hour24 = parseInt(hours);

          if (period === 'PM' && hour24 !== 12) {
            hour24 += 12;
          } else if (period === 'AM' && hour24 === 12) {
            hour24 = 0;
          }

          endDateTime.setHours(hour24, parseInt(minutes), 0, 0);

          // Check if booking has expired (current time > end time)
          if (currentDateTime > endDateTime) {
            expiredBookings.push({
              bookingId: booking.bookingId,
              mongoId: booking._id,
              name: booking.name,
              date: booking.date,
              time: booking.time,
              status: booking.status,
              endDateTime: endDateTime.toISOString()
            });
          }
        }
      } catch (error) {
        console.log('⚠️ Error parsing booking date/time:', booking.bookingId, error);
      }
    }

    for (const booking of allManualBookings) {
      try {
        let bookingData: any = booking;
        if (booking?.compressedData) {
          try {
            const decompressed = await decompressData(booking.compressedData);
            bookingData = { ...(decompressed as Record<string, unknown>), ...booking };
          } catch (error) {
            bookingData = booking;
          }
        }

        const bookingDateRaw = (bookingData as any).date;
        const bookingDate = new Date(bookingDateRaw);
        if (Number.isNaN(bookingDate.getTime())) {
          continue;
        }

        const timeSlotRaw =
          (bookingData as any).time || (bookingData as any).timeSlot || (bookingData as any).selectedTimeSlot;
        const timeSlot = typeof timeSlotRaw === 'string' ? timeSlotRaw : '';
        if (!timeSlot) {
          continue;
        }

        const timeMatch = timeSlot.match(/(\d{1,2}:\d{2}\s*(AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(AM|PM))/);
        if (timeMatch) {
          const endTimeStr = timeMatch[3] + ' ' + timeMatch[4];

          const endDateTime = new Date(bookingDate);
          const [time, period] = endTimeStr.split(' ');
          const [hours, minutes] = time.split(':');
          let hour24 = parseInt(hours);

          if (period === 'PM' && hour24 !== 12) {
            hour24 += 12;
          } else if (period === 'AM' && hour24 === 12) {
            hour24 = 0;
          }

          endDateTime.setHours(hour24, parseInt(minutes), 0, 0);

          if (currentDateTime > endDateTime) {
            expiredManualBookings.push({
              bookingId: (bookingData as any).bookingId,
              mongoId: booking._id,
              name: (bookingData as any).name,
              date: (bookingData as any).date,
              time: timeSlot,
              status: (bookingData as any).status,
              endDateTime: endDateTime.toISOString(),
            });
          }
        }
      } catch (error) {
        console.log('⚠️ Error parsing manual booking date/time:', booking.bookingId, error);
      }
    }

    if (expiredBookings.length === 0 && expiredManualBookings.length === 0) {
      console.log('✅ No expired bookings found');
      return {
        success: true,
        deletedCount: 0,
        message: 'No expired bookings found'
      };
    }

    console.log(`🗑️ Found ${expiredBookings.length + expiredManualBookings.length} expired bookings to process`);

    let completedCount = 0;
    let deletedCount = 0;

    // First, change status to completed for confirmed bookings, then delete
    for (const expiredBooking of expiredBookings) {
      try {
        // If booking is still confirmed, change to completed first
        if (expiredBooking.status === 'confirmed') {
          await collection.updateOne(
            { _id: expiredBooking.mongoId },
            {
              $set: {
                status: 'completed',
                autoCompleted: true,
                autoCompletedAt: currentDateTime,
                updatedAt: currentDateTime
              }
            }
          );

          // Import the new counter system
          const { incrementCounter: incrementNewCounter } = await import('./counter-system');

          // Increment completed counter
          await incrementNewCounter('completed');
          completedCount++;

          console.log(`✅ Auto-completed expired booking: ${expiredBooking.bookingId}`);

          // Wait a moment to let the completed status be visible
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Then delete the booking
        await collection.deleteOne({ _id: expiredBooking.mongoId });
        deletedCount++;

        console.log(`🗑️ Deleted expired booking: ${expiredBooking.bookingId}`);

      } catch (error) {
        console.error(`❌ Error processing expired booking ${expiredBooking.bookingId}:`, error);
      }
    }

    for (const expiredBooking of expiredManualBookings) {
      try {
        if (expiredBooking.status === 'confirmed') {
          await manualCollection.updateOne(
            { _id: expiredBooking.mongoId },
            {
              $set: {
                status: 'completed',
                autoCompleted: true,
                autoCompletedAt: currentDateTime,
                updatedAt: currentDateTime,
              },
            },
          );

          const { incrementCounter: incrementNewCounter } = await import('./counter-system');
          await incrementNewCounter('completed');
          completedCount++;

          console.log(`✅ Auto-completed expired manual booking: ${expiredBooking.bookingId}`);

          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        await manualCollection.deleteOne({ _id: expiredBooking.mongoId });
        deletedCount++;

        console.log(`🗑️ Deleted expired manual booking: ${expiredBooking.bookingId}`);

      } catch (error) {
        console.error(`❌ Error processing expired manual booking ${expiredBooking.bookingId}:`, error);
      }
    }

    console.log(`✅ Processed ${expiredBookings.length + expiredManualBookings.length} expired bookings: ${completedCount} completed, ${deletedCount} deleted`);

    return {
      success: true,
      deletedCount: deletedCount,
      completedCount: completedCount,
      processedBookings: [...expiredBookings, ...expiredManualBookings],
      message: `Successfully processed ${expiredBookings.length + expiredManualBookings.length} expired bookings: ${completedCount} completed, ${deletedCount} deleted`
    };

  } catch (error) {
    console.error('❌ Error deleting expired bookings:', error);
    return {
      success: false,
      error: 'Failed to delete expired bookings'
    };
  }
};

// Get expired bookings without deleting
const getExpiredBookings = async (currentDateTime: Date) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(COLLECTION_NAME);

    // Get all bookings
    const allBookings = await collection.find({}).toArray();
    const expiredBookings = [];

    // Check each booking to see if it's expired
    for (const booking of allBookings) {
      try {
        // Parse the booking date and time
        const bookingDate = new Date(booking.date);
        const timeSlot = booking.time;

        // Extract end time from time slot
        const timeMatch = timeSlot.match(/(\d{1,2}:\d{2}\s*(AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(AM|PM))/);
        if (timeMatch) {
          const endTimeStr = timeMatch[3] + ' ' + timeMatch[4];

          // Create end datetime
          const endDateTime = new Date(bookingDate);
          const [time, period] = endTimeStr.split(' ');
          const [hours, minutes] = time.split(':');
          let hour24 = parseInt(hours);

          if (period === 'PM' && hour24 !== 12) {
            hour24 += 12;
          } else if (period === 'AM' && hour24 === 12) {
            hour24 = 0;
          }

          endDateTime.setHours(hour24, parseInt(minutes), 0, 0);

          // Check if booking has expired
          if (currentDateTime > endDateTime) {
            expiredBookings.push({
              bookingId: booking.bookingId,
              name: booking.name,
              email: booking.email,
              date: booking.date,
              time: booking.time,
              endDateTime: endDateTime.toISOString(),
              theaterName: booking.theaterName,
              totalAmount: booking.totalAmount
            });
          }
        }
      } catch (error) {
        console.log('⚠️ Error parsing booking date/time:', booking.bookingId, error);
      }
    }

    return {
      success: true,
      expiredCount: expiredBookings.length,
      expiredBookings: expiredBookings,
      message: `Found ${expiredBookings.length} expired bookings`
    };

  } catch (error) {
    console.error('❌ Error getting expired bookings:', error);
    return {
      success: false,
      error: 'Failed to get expired bookings'
    };
  }
};

// Move booking to completed collection (for archiving completed bookings)
const moveBookingToCompleted = async (bookingId: string) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    // Get collections
    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(COLLECTION_NAME);
    const completedCollection = db.collection('completed_booking');

    // First, get the booking to move
    let booking;

    // First try as ObjectId if it's a valid format
    if (ObjectId.isValid(bookingId) && bookingId.length === 24) {
      booking = await collection.findOne({ _id: new ObjectId(bookingId) });
    } else {
      // Try as custom ID field
      booking = await collection.findOne({ bookingId: bookingId });
    }

    if (!booking) {
      return {
        success: false,
        error: 'Booking not found'
      };
    }

    // Decompress booking data to extract important fields
    let decompressedData: any = {};
    if (booking.compressedData) {
      try {
        decompressedData = await decompressData(booking.compressedData);
        console.log(`📋 Moving booking ${bookingId} to completed - fields present:`, {
          phone: decompressedData.phone,
          numberOfPeople: decompressedData.numberOfPeople,
          advancePayment: decompressedData.advancePayment,
          venuePayment: decompressedData.venuePayment,
          totalAmount: decompressedData.totalAmount
        });
      } catch (err) {
        console.error(`⚠️ Could not decompress booking ${bookingId}`, err);
      }
    }

    // Add completion data to the booking AND explicitly preserve key fields
    const completedBooking = {
      ...booking,
      status: 'completed',
      completedAt: new Date(),
      originalCollection: COLLECTION_NAME,
      // Explicitly copy key fields from decompressed data to database level
      name: booking.name || decompressedData.name || decompressedData.customerName,
      email: booking.email || decompressedData.email,
      phone: booking.phone || decompressedData.phone,
      theaterName: booking.theaterName || decompressedData.theaterName || decompressedData.theater,
      date: booking.date || decompressedData.date,
      time: booking.time || decompressedData.time,
      occasion: booking.occasion || decompressedData.occasion,
      numberOfPeople: booking.numberOfPeople || decompressedData.numberOfPeople,
      advancePayment: booking.advancePayment || decompressedData.advancePayment,
      venuePayment: booking.venuePayment || decompressedData.venuePayment,
      totalAmount: booking.totalAmount || decompressedData.totalAmount || decompressedData.amount
    };

    // Insert into completed collection
    const insertResult = await completedCollection.insertOne(completedBooking);

    // Delete from original collection
    let deleteResult;
    if (ObjectId.isValid(bookingId) && bookingId.length === 24) {
      deleteResult = await collection.deleteOne({ _id: new ObjectId(bookingId) });
    } else {
      deleteResult = await collection.deleteOne({ bookingId: bookingId });
    }

    if (deleteResult.deletedCount === 0) {
      return {
        success: false,
        error: 'Failed to remove booking from original collection'
      };
    }

    console.log(`✅ Booking moved to completed collection:`, bookingId);

    // Import the new counter system
    const { incrementCounter: incrementNewCounter } = await import('./counter-system');

    // Increment completed counter
    await incrementNewCounter('completed');

    return {
      success: true,
      message: 'Booking moved to completed collection successfully',
      completedBooking: {
        id: (completedBooking as Record<string, unknown>).bookingId,
        mongoId: insertResult.insertedId,
        ...completedBooking
      },
      database: DB_NAME,
      originalCollection: COLLECTION_NAME,
      completedCollection: 'completed_booking'
    };

  } catch (error) {
    console.error('❌ Error moving booking to completed collection:', error);
    return {
      success: false,
      error: 'Failed to move booking to completed collection'
    };
  }
};

// Get all completed bookings from completed_booking collection
const getAllCompletedBookings = async () => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection('completed_booking');

    const rawCompleted = await collection.find({}).toArray();

    // Decompress and merge like getAllBookings
    const completedBookings = [] as any[];
    for (const booking of rawCompleted) {
      if (booking.compressedData) {
        try {
          const decompressed: any = await decompressData(booking.compressedData);
          const merged = {
            ...decompressed,
            _id: booking._id,
            bookingId: booking.bookingId || decompressed.bookingId,
            createdAt: booking.createdAt || decompressed.createdAt,
            completedAt: booking.completedAt || decompressed.completedAt,
            status: 'completed',
            name: booking.name || decompressed.name || decompressed.customerName,
            email: booking.email || decompressed.email,
            phone: booking.phone || decompressed.phone || decompressed.whatsappNumber,
            theaterName: booking.theaterName || decompressed.theaterName || decompressed.theater,
            date: booking.date || decompressed.date,
            time: booking.time || decompressed.time,
            occasion: booking.occasion || decompressed.occasion,
            numberOfPeople: booking.numberOfPeople || decompressed.numberOfPeople || decompressed.peopleCount,
            advancePayment: booking.advancePayment || decompressed.advancePayment || 0,
            venuePayment: booking.venuePayment || decompressed.venuePayment || 0,
            totalAmount: booking.totalAmount || decompressed.totalAmount || decompressed.amount || 0
          };
          completedBookings.push(merged);
        } catch (err) {
          console.error(`❌ Failed to decompress completed booking`, err);
          completedBookings.push({ ...booking, status: 'completed' });
        }
      } else {
        completedBookings.push({ ...booking, status: 'completed' });
      }
    }

    return {
      success: true,
      completedBookings,
      total: completedBookings.length,
      database: DB_NAME,
      collection: 'completed_booking'
    };

  } catch (error) {
    console.error('❌ Error getting completed bookings from MongoDB:', error);
    return {
      success: false,
      error: 'Failed to get completed bookings from MongoDB'
    };
  }
};

// Get all cancelled bookings from MongoDB database (decompressed + merged fields)
const getAllCancelledBookings = async () => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    // Get collection
    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(CANCELLED_COLLECTION_NAME);

    // Find all cancelled bookings
    const rawCancelled = await collection.find({}).toArray();

    // Decompress and merge like getAllBookings to expose important fields
    const cancelledBookings = [] as any[];
    for (const booking of rawCancelled) {
      if (booking.compressedData) {
        try {
          const decompressed: any = await decompressData(booking.compressedData);
          const merged = {
            ...decompressed,
            _id: booking._id,
            bookingId: booking.bookingId || decompressed.bookingId,
            createdAt: booking.createdAt || decompressed.createdAt,
            updatedAt: booking.updatedAt || decompressed.updatedAt,
            status: 'cancelled',
            // cancellation specific
            cancelledAt: booking.cancelledAt || decompressed.cancelledAt,
            refundAmount: booking.refundAmount || decompressed.refundAmount,
            refundStatus: booking.refundStatus || decompressed.refundStatus,
            cancellationReason: booking.cancellationReason || decompressed.cancellationReason,
            // key visible fields
            name: booking.name || decompressed.name || decompressed.customerName,
            email: booking.email || decompressed.email,
            phone: booking.phone || decompressed.phone || decompressed.whatsappNumber,
            theaterName: booking.theaterName || decompressed.theaterName || decompressed.theater,
            date: booking.date || decompressed.date,
            time: booking.time || decompressed.time,
            occasion: booking.occasion || decompressed.occasion,
            numberOfPeople: booking.numberOfPeople || decompressed.numberOfPeople || decompressed.peopleCount,
            advancePayment: booking.advancePayment || decompressed.advancePayment || 0,
            venuePayment: booking.venuePayment || decompressed.venuePayment || 0,
            totalAmount: booking.totalAmount || decompressed.totalAmount || decompressed.amount || 0
          };
          console.log(`📦 Cancelled booking ${merged.bookingId} decompressed:`, {
            phone: merged.phone,
            numberOfPeople: merged.numberOfPeople,
            advancePayment: merged.advancePayment,
            venuePayment: merged.venuePayment,
            totalAmount: merged.totalAmount
          });
          cancelledBookings.push(merged);
        } catch (err) {
          console.error(`❌ Failed to decompress cancelled booking`, err);
          // Fallback to raw booking if decompression fails
          cancelledBookings.push({ ...booking, status: 'cancelled' });
        }
      } else {
        console.log(`⚠️ Cancelled booking has no compressedData, using raw:`, booking.bookingId);
        cancelledBookings.push({ ...booking, status: 'cancelled' });
      }
    }

    return {
      success: true,
      cancelledBookings,
      total: cancelledBookings.length,
      database: DB_NAME,
      collection: CANCELLED_COLLECTION_NAME
    };

  } catch (error) {
    console.error('❌ Error getting cancelled bookings from MongoDB:', error);
    return {
      success: false,
      error: 'Failed to get cancelled bookings from MongoDB'
    };
  }
};

// Delete cancelled bookings older than 12 hours
const deleteOldCancelledBookings = async () => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    // Get collection
    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(CANCELLED_COLLECTION_NAME);

    // Calculate 12 hours ago from current time
    const twelveHoursAgo = new Date();
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);

    console.log(`🗑️ [CLEANUP] Deleting cancelled bookings older than: ${twelveHoursAgo.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);

    // Find and delete cancelled bookings older than 12 hours
    const result = await collection.deleteMany({
      cancelledAt: { $lt: twelveHoursAgo }
    });

    console.log(`🗑️ [CLEANUP] Deleted ${result.deletedCount} old cancelled bookings from MongoDB`);

    return {
      success: true,
      deletedCount: result.deletedCount,
      message: `Deleted ${result.deletedCount} cancelled bookings older than 12 hours`,
      cutoffTime: twelveHoursAgo.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    };

  } catch (error) {
    console.error('❌ Error deleting old cancelled bookings:', error);
    return {
      success: false,
      error: 'Failed to delete old cancelled bookings'
    };
  }
};

// Get all manual bookings from manual_booking collection
const getAllManualBookings = async () => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(MANUAL_BOOKING_COLLECTION_NAME);
    const bookings = await collection.find({}).sort({ createdAt: -1 }).toArray();

    // Decompress all bookings
    const decompressedBookings = [];
    for (const booking of bookings) {
      try {
        const decompressedData = await decompressData(booking.compressedData);
        decompressedBookings.push({
          ...(decompressedData as Record<string, unknown>),
          _id: booking._id,
          bookingId: booking.bookingId,
          createdAt: booking.createdAt,
          status: booking.status
        });
      } catch (error) {
        console.error('❌ Error decompressing manual booking:', booking.bookingId, error);
      }
    }

    return {
      success: true,
      manualBookings: decompressedBookings,
      total: decompressedBookings.length,
      database: DB_NAME,
      collection: MANUAL_BOOKING_COLLECTION_NAME
    };

  } catch (error) {
    console.error('❌ Error getting manual bookings from MongoDB:', error);
    return {
      success: false,
      error: 'Failed to get manual bookings from MongoDB'
    };
  }
};

// Database operations
// Theater Management Functions
const saveTheater = async (theaterData: any) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(THEATER_COLLECTION_NAME);
    const compressedData = await compressData(theaterData);

    // Determine default display order (append to end)
    const activeCount = await collection.countDocuments({ isActive: { $ne: false } });
    const defaultOrder = (activeCount || 0) + 1;

    const theater = {
      theaterId: `THEATER-${Date.now()}`,
      compressedData: compressedData,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Store key fields for easy querying
      name: theaterData.name,
      price: theaterData.price,
      capacity: theaterData.capacity,
      isActive: theaterData.isActive !== false,
      displayOrder: typeof theaterData.displayOrder === 'number' ? theaterData.displayOrder : defaultOrder,
      decorationCompulsory: theaterData.decorationCompulsory || false,
      youtubeLink: theaterData.youtubeLink || null
      // No expiredAt field - theaters are manually deleted only
    };

    const result = await collection.insertOne(theater);
    console.log(`✅ Theater saved to MongoDB:`, theater.theaterId);

    return {
      success: true,
      theaterId: theater.theaterId,
      insertedId: result.insertedId
    };
  } catch (error) {
    console.error('❌ Error saving theater to MongoDB:', error);
    return { success: false, error: 'Failed to save theater' };
  }
};

const getAllTheaters = async () => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(THEATER_COLLECTION_NAME);
    const theaters = await collection.find({ isActive: true }).toArray();

    const decompressedTheaters = [];
    for (const theater of theaters) {
      if (theater.compressedData) {
        try {
          const decompressed: any = await decompressData(theater.compressedData);
          const mergedTheater = {
            ...decompressed,
            _id: theater._id,
            theaterId: theater.theaterId || decompressed.theaterId,
            createdAt: theater.createdAt || decompressed.createdAt,
            updatedAt: theater.updatedAt || decompressed.updatedAt,
            isActive: theater.isActive !== false,
            displayOrder: theater.displayOrder ?? decompressed.displayOrder ?? 9999,
            decorationCompulsory: theater.decorationCompulsory ?? decompressed.decorationCompulsory ?? false,
            youtubeLink: theater.youtubeLink ?? decompressed.youtubeLink
          };
          decompressedTheaters.push(mergedTheater);
        } catch (error) {
          console.error('❌ Error decompressing theater:', theater.theaterId, error);
          decompressedTheaters.push(theater);
        }
      } else {
        decompressedTheaters.push({
          ...theater,
          displayOrder: theater.displayOrder ?? 9999
        });
      }
    }
    // Sort by displayOrder ascending
    decompressedTheaters.sort((a: any, b: any) => (a.displayOrder ?? 9999) - (b.displayOrder ?? 9999));
    return {
      success: true,
      theaters: decompressedTheaters,
      total: decompressedTheaters.length
    };
  } catch (error) {
    console.error('❌ Error fetching theaters from MongoDB:', error);
    return { success: false, error: 'Failed to fetch theaters' };
  }
};

const updateTheater = async (theaterId: string, theaterData: any) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(THEATER_COLLECTION_NAME);

    // First, get the existing theater data to preserve existing images
    const existingTheater = await collection.findOne({ theaterId: theaterId });

    if (!existingTheater) {
      return { success: false, error: 'Theater not found' };
    }

    // Decompress existing data to get current images
    let existingData: any = {};
    if (existingTheater.compressedData) {
      try {
        const decompressed = await decompressData(existingTheater.compressedData);
        existingData = decompressed || {};
      } catch (error) {
        console.log('⚠️ Could not decompress existing data, using empty object');
        existingData = {};
      }
    }

    // Merge images: keep existing images and add new ones (avoid duplicates)
    const existingImages = existingData?.images || [];
    const newImages = theaterData.images || [];

    // Create a Set to avoid duplicate images
    const allImagesSet = new Set([...existingImages, ...newImages]);
    const mergedImages = Array.from(allImagesSet);

    console.log(`🖼️ Image merge for theater ${theaterId} (Max: 6):`);
    console.log(`   Existing images: ${existingImages.length}`, existingImages);
    console.log(`   New images: ${newImages.length}`, newImages);
    console.log(`   Merged images: ${mergedImages.length}`, mergedImages);

    // Merge existing data with new data to preserve all fields
    const updatedTheaterData = {
      ...existingData,  // Start with existing data
      ...theaterData,   // Override with new data
      images: mergedImages  // Use merged images
    };

    const compressedData = await compressData(updatedTheaterData);

    const updateData: any = {
      compressedData: compressedData,
      updatedAt: new Date()
    };

    // Only update fields that are provided
    if (theaterData.name !== undefined) updateData.name = theaterData.name;
    if (theaterData.price !== undefined) updateData.price = theaterData.price;
    if (theaterData.capacity !== undefined) updateData.capacity = theaterData.capacity;
    if (theaterData.isActive !== undefined) updateData.isActive = theaterData.isActive;
    if (typeof theaterData.displayOrder === 'number') {
      updateData.displayOrder = theaterData.displayOrder;
    }
    if (theaterData.decorationCompulsory !== undefined) {
      updateData.decorationCompulsory = theaterData.decorationCompulsory;
    }
    if (theaterData.youtubeLink !== undefined) {
      updateData.youtubeLink = theaterData.youtubeLink;
    }

    const result = await collection.updateOne(
      { theaterId: theaterId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return { success: false, error: 'Theater not found' };
    }

    console.log(`✅ Theater updated in MongoDB with merged images:`, theaterId);
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating theater in MongoDB:', error);
    return { success: false, error: 'Failed to update theater' };
  }
};

// Reorder theaters by updating displayOrder in bulk
const reorderTheaters = async (orderUpdates: Array<{ theaterId: string; displayOrder: number }>) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }
    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(THEATER_COLLECTION_NAME);

    const ops = orderUpdates.map(u => ({
      updateOne: {
        filter: { theaterId: u.theaterId },
        update: { $set: { displayOrder: u.displayOrder, updatedAt: new Date() } }
      }
    }));

    const result = await collection.bulkWrite(ops, { ordered: false });
    return { success: true, updatedCount: result.modifiedCount };
  } catch (error) {
    console.error('❌ Error reordering theaters:', error);
    return { success: false, error: 'Failed to reorder theaters' };
  }
};

const deleteTheater = async (theaterId: string) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(THEATER_COLLECTION_NAME);

    // First get the theater to extract all image URLs for Cloudinary deletion
    const theater = await collection.findOne({ theaterId: theaterId });
    if (!theater) {
      return { success: false, error: 'Theater not found' };
    }

    // Collect all image URLs for deletion
    let imageUrls: string[] = [];

    if (theater.compressedData) {
      try {
        const decompressed: any = await decompressData(theater.compressedData);

        // Check single image field
        if (decompressed.image && decompressed.image.includes('cloudinary.com')) {
          imageUrls.push(decompressed.image);
        }

        // Check images array field
        if (decompressed.images) {
          let imagesArray = [];

          if (Array.isArray(decompressed.images)) {
            imagesArray = decompressed.images;
          } else if (typeof decompressed.images === 'string') {
            try {
              const parsed = JSON.parse(decompressed.images);
              imagesArray = Array.isArray(parsed) ? parsed : [decompressed.images];
            } catch {
              imagesArray = [decompressed.images];
            }
          }

          // Add all Cloudinary images to deletion list
          imagesArray.forEach((img: string) => {
            if (img && typeof img === 'string' && img.includes('cloudinary.com')) {
              if (!imageUrls.includes(img)) { // Avoid duplicates
                imageUrls.push(img);
              }
            }
          });
        }

        console.log(`🗑️ Found ${imageUrls.length} Cloudinary images to delete for theater ${theaterId}:`, imageUrls);

      } catch (decompressError) {
        console.warn('⚠️ Could not decompress theater data for images:', decompressError);
      }
    } else {
      // Handle non-compressed data
      if (theater.image && theater.image.includes('cloudinary.com')) {
        imageUrls.push(theater.image);
      }

      if (theater.images) {
        let imagesArray = [];

        if (Array.isArray(theater.images)) {
          imagesArray = theater.images;
        } else if (typeof theater.images === 'string') {
          try {
            const parsed = JSON.parse(theater.images);
            imagesArray = Array.isArray(parsed) ? parsed : [theater.images];
          } catch {
            imagesArray = [theater.images];
          }
        }

        imagesArray.forEach((img: string) => {
          if (img && typeof img === 'string' && img.includes('cloudinary.com')) {
            if (!imageUrls.includes(img)) {
              imageUrls.push(img);
            }
          }
        });
      }
    }

    // Hard delete - completely remove from database
    const result = await collection.deleteOne({ theaterId: theaterId });

    if (result.deletedCount === 0) {
      return { success: false, error: 'Theater not found' };
    }

    console.log(`✅ Theater completely deleted from MongoDB:`, theaterId);
    return { success: true, imageUrls };
  } catch (error) {
    console.error('❌ Error deleting theater from MongoDB:', error);
    return { success: false, error: 'Failed to delete theater' };
  }
};

// Gallery Management Functions
const getNextGalleryImageId = async () => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(GALLERY_COLLECTION_NAME);

    // Find the latest image ID
    const latestImage = await collection
      .find({ imageId: { $regex: /^IMG\d{4}$/ } })
      .sort({ imageId: -1 })
      .limit(1)
      .toArray();

    if (latestImage.length === 0) {
      return 'IMG0001';
    }

    // Extract number and increment
    const lastId = latestImage[0].imageId;
    const lastNumber = parseInt(lastId.replace('IMG', ''));
    const nextNumber = lastNumber + 1;

    // Format as IMG0001, IMG0002, etc.
    return `IMG${nextNumber.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error('❌ Error getting next gallery image ID:', error);
    return `IMG${Date.now().toString().slice(-4)}`;
  }
};

const saveGalleryImage = async (imageData: any) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(GALLERY_COLLECTION_NAME);

    // Get next sequential ID
    const imageId = await getNextGalleryImageId();

    const galleryImage = {
      imageId: imageId,
      imageUrl: imageData.imageUrl,
      createdAt: new Date()
    };

    const result = await collection.insertOne(galleryImage);
    console.log(`✅ Gallery image saved to MongoDB:`, galleryImage.imageId);

    return {
      success: true,
      imageId: galleryImage.imageId,
      insertedId: result.insertedId
    };
  } catch (error) {
    console.error('❌ Error saving gallery image to MongoDB:', error);
    return { success: false, error: 'Failed to save gallery image' };
  }
};

const getAllGalleryImages = async () => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(GALLERY_COLLECTION_NAME);
    const images = await collection.find({}).sort({ createdAt: -1 }).toArray();

    return {
      success: true,
      images: images,
      total: images.length
    };
  } catch (error) {
    console.error('❌ Error fetching gallery images from MongoDB:', error);
    return { success: false, error: 'Failed to fetch gallery images' };
  }
};

const deleteGalleryImage = async (imageId: string) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(GALLERY_COLLECTION_NAME);

    // Hard delete - completely remove from database
    const result = await collection.deleteOne({ imageId: imageId });

    if (result.deletedCount === 0) {
      return { success: false, error: 'Gallery image not found' };
    }

    console.log(`✅ Gallery image permanently deleted from MongoDB:`, imageId);
    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting gallery image in MongoDB:', error);
    return { success: false, error: 'Failed to delete gallery image' };
  }
};

// Coupon Management Functions
const saveCoupon = async (couponData: any) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(COUPON_COLLECTION_NAME);

    const coupon = {
      couponCode: couponData.couponCode.toUpperCase(),
      discountType: couponData.discountType, // 'percentage' or 'fixed'
      discountValue: couponData.discountValue,
      usageLimit: couponData.usageLimit || null,
      validDate: couponData.validDate ? new Date(couponData.validDate) : new Date(),
      expireDate: couponData.expireDate ? new Date(couponData.expireDate) : null,
      isActive: couponData.isActive !== false,
      createdAt: new Date()
    };

    const result = await collection.insertOne(coupon);
    console.log(`✅ Coupon saved to MongoDB:`, coupon.couponCode);

    return {
      success: true,
      couponCode: coupon.couponCode,
      insertedId: result.insertedId
    };
  } catch (error) {
    console.error('❌ Error saving coupon to MongoDB:', error);
    return { success: false, error: 'Failed to save coupon' };
  }
};

const getAllCoupons = async () => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(COUPON_COLLECTION_NAME);
    const coupons = await collection.find({}).sort({ createdAt: -1 }).toArray();

    return {
      success: true,
      coupons: coupons,
      total: coupons.length
    };
  } catch (error) {
    console.error('❌ Error fetching coupons from MongoDB:', error);
    return { success: false, error: 'Failed to fetch coupons' };
  }
};

const updateCoupon = async (couponCode: string, couponData: any) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(COUPON_COLLECTION_NAME);

    const result = await collection.updateOne(
      { couponCode: couponCode },
      { $set: couponData }
    );

    if (result.matchedCount === 0) {
      return { success: false, error: 'Coupon not found' };
    }

    console.log(`✅ Coupon updated in MongoDB:`, couponCode);
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating coupon in MongoDB:', error);
    return { success: false, error: 'Failed to update coupon' };
  }
};

const deleteCoupon = async (couponCode: string) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(COUPON_COLLECTION_NAME);

    // Soft delete - mark as inactive (coupons are not deleted from database)
    const result = await collection.updateOne(
      { couponCode: couponCode },
      { $set: { isActive: false, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return { success: false, error: 'Coupon not found' };
    }

    console.log(`✅ Coupon deactivated in MongoDB:`, couponCode);
    return { success: true };
  } catch (error) {
    console.error('❌ Error deactivating coupon in MongoDB:', error);
    return { success: false, error: 'Failed to deactivate coupon' };
  }
};

// ============================================
// OCCASION MANAGEMENT FUNCTIONS
// ============================================

const getNextOccasionId = async (): Promise<string> => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(OCCASION_COLLECTION_NAME);
    const lastOccasion = await collection
      .find()
      .sort({ occasionId: -1 })
      .limit(1)
      .toArray();

    if (lastOccasion.length === 0) {
      return 'OCC0001';
    }

    const lastId = lastOccasion[0].occasionId;
    const numPart = parseInt(lastId.replace('OCC', ''));
    const nextNum = numPart + 1;
    return `OCC${nextNum.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error('❌ Error generating occasion ID:', error);
    return 'OCC0001';
  }
};

const saveOccasion = async (occasionData: Record<string, unknown>) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(OCCASION_COLLECTION_NAME);

    const occasionId = await getNextOccasionId();
    const compressedData = await compressData(occasionData);

    const occasion = {
      occasionId: occasionId,
      compressedData: compressedData,
      name: occasionData.name,
      imageUrl: occasionData.imageUrl,
      requiredFields: occasionData.requiredFields || [],
      isActive: occasionData.isActive !== undefined ? occasionData.isActive : true,
      includeInDecoration: occasionData.includeInDecoration === true,
      createdAt: new Date()
    };

    const result = await collection.insertOne(occasion);

    console.log(`✅ Occasion saved to MongoDB with ID:`, occasionId);
    return {
      success: true,
      occasion: {
        _id: result.insertedId,
        occasionId: occasionId,
        name: occasion.name,
        imageUrl: occasion.imageUrl,
        requiredFields: occasion.requiredFields,
        isActive: occasion.isActive,
        includeInDecoration: occasion.includeInDecoration === true,
        createdAt: occasion.createdAt
      }
    };
  } catch (error) {
    console.error('❌ Error saving occasion to MongoDB:', error);
    return { success: false, error: 'Failed to save occasion' };
  }
};

const getAllOccasions = async () => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(OCCASION_COLLECTION_NAME);
    const occasions = await collection.find({ isActive: true }).toArray();

    const decompressedOccasions = await Promise.all(
      occasions.map(async (occasion) => {
        let decompressedData: any = {};

        if (occasion.compressedData) {
          try {
            decompressedData = await decompressData(occasion.compressedData);
          } catch (error) {
            console.error('❌ Error decompressing occasion data:', error);
          }
        }

        return {
          _id: occasion._id,
          occasionId: occasion.occasionId,
          name: occasion.name,
          imageUrl: occasion.imageUrl,
          requiredFields: occasion.requiredFields || [],
          isActive: occasion.isActive,
          createdAt: occasion.createdAt,
          includeInDecoration: occasion.includeInDecoration === true || decompressedData.includeInDecoration === true,
          ...decompressedData
        };
      })
    );

    console.log(`✅ Fetched ${decompressedOccasions.length} occasions from MongoDB`);
    return decompressedOccasions;
  } catch (error) {
    console.error('❌ Error fetching occasions from MongoDB:', error);
    return [];
  }
};

const updateOccasion = async (id: string, occasionData: Record<string, unknown>) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(OCCASION_COLLECTION_NAME);
    const compressedData = await compressData(occasionData);

    const updateData = {
      compressedData: compressedData,
      name: occasionData.name,
      imageUrl: occasionData.imageUrl,
      requiredFields: occasionData.requiredFields || [],
      isActive: occasionData.isActive !== undefined ? occasionData.isActive : true,
      includeInDecoration: occasionData.includeInDecoration === true,
      updatedAt: new Date()
    };

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return { success: false, error: 'Occasion not found' };
    }

    const updatedOccasion = await collection.findOne({ _id: new ObjectId(id) });

    console.log(`✅ Occasion updated in MongoDB:`, id);
    return {
      success: true,
      occasion: {
        _id: updatedOccasion?._id,
        occasionId: updatedOccasion?.occasionId,
        name: updatedOccasion?.name,
        imageUrl: updatedOccasion?.imageUrl,
        requiredFields: updatedOccasion?.requiredFields,
        isActive: updatedOccasion?.isActive,
        includeInDecoration: updatedOccasion?.compressedData.includeInDecoration === true,
        updatedAt: updatedOccasion?.updatedAt
      }
    };
  } catch (error) {
    console.error('❌ Error updating occasion in MongoDB:', error);
    return { success: false, error: 'Failed to update occasion' };
  }
};

const deleteOccasion = async (id: string) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(OCCASION_COLLECTION_NAME);

    // Hard delete - completely remove from database
    const result = await collection.deleteOne(
      { _id: new ObjectId(id) }
    );

    if (result.deletedCount === 0) {
      return { success: false, error: 'Occasion not found' };
    }

    console.log(`✅ Occasion deleted from MongoDB:`, id);
    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting occasion from MongoDB:', error);
    return { success: false, error: 'Failed to delete occasion' };
  }
};

// ============================================
// SERVICE MANAGEMENT FUNCTIONS
// ============================================

const getNextServiceId = async (): Promise<string> => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(SERVICE_COLLECTION_NAME);
    const lastService = await collection
      .find()
      .sort({ serviceId: -1 })
      .limit(1)
      .toArray();

    if (lastService.length === 0) {
      return 'SRV0001';
    }

    const lastId = lastService[0].serviceId;
    const numPart = parseInt(lastId.replace('SRV', ''));
    const nextNum = numPart + 1;
    return `SRV${nextNum.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error('❌ Error generating service ID:', error);
    return 'SRV0001';
  }
};

const saveService = async (serviceData: Record<string, unknown>) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(SERVICE_COLLECTION_NAME);

    const serviceId = await getNextServiceId();
    const compressedData = await compressData(serviceData);

    const service = {
      serviceId: serviceId,
      compressedData: compressedData,
      name: serviceData.name,
      items: serviceData.items || [],
      isActive: serviceData.isActive !== undefined ? serviceData.isActive : true,
      showInBookingPopup: serviceData.showInBookingPopup !== undefined ? serviceData.showInBookingPopup : true,
      createdAt: new Date()
    };

    const result = await collection.insertOne(service);

    console.log(`✅ Service saved to MongoDB with ID:`, serviceId);
    return {
      success: true,
      service: {
        _id: result.insertedId,
        serviceId: serviceId,
        name: service.name,
        items: service.items,
        isActive: service.isActive,
        createdAt: service.createdAt
      }
    };
  } catch (error) {
    console.error('❌ Error saving service to MongoDB:', error);
    return { success: false, error: 'Failed to save service' };
  }
};

const getAllServices = async () => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(SERVICE_COLLECTION_NAME);
    const services = await collection.find({ isActive: true }).toArray();

    const decompressedServices = await Promise.all(
      services.map(async (service) => {
        let decompressedData: any = {};

        if (service.compressedData) {
          try {
            decompressedData = await decompressData(service.compressedData);
          } catch (error) {
            console.error('❌ Error decompressing service data:', error);
          }
        }

        // Prefer items from main document (they contain latest showTag etc.),
        // but fall back to decompressed items if needed.
        const rawItems = (service.items || decompressedData.items || []) as any[];
        const normalizedItems = rawItems.map((item) => ({
          ...item,
          showTag: item.showTag ?? false,
        }));

        return {
          // Start from decompressed data so it provides defaults,
          // then override with authoritative DB fields.
          ...decompressedData,
          _id: service._id,
          serviceId: service.serviceId,
          name: service.name,
          items: normalizedItems,
          isActive: service.isActive,
          includeInDecoration: service.includeInDecoration,
          compulsory: service.compulsory,
          itemTagEnabled: service.itemTagEnabled,
          itemTagName: service.itemTagName,
          showInBookingPopup: service.showInBookingPopup,
          createdAt: service.createdAt,
        };
      })
    );

    console.log(`✅ Fetched ${decompressedServices.length} services from MongoDB`);
    return decompressedServices;
  } catch (error) {
    console.error('❌ Error fetching services from MongoDB:', error);
    return [];
  }
};

const getAllServicesIncludingInactive = async () => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(SERVICE_COLLECTION_NAME);
    // Fetch ALL services (including inactive) for admin panel
    const services = await collection.find({}).toArray();

    const decompressedServices = await Promise.all(
      services.map(async (service) => {
        let decompressedData: any = {};

        if (service.compressedData) {
          try {
            decompressedData = await decompressData(service.compressedData);
            console.log(`📦 Decompressed service "${service.name}":`, decompressedData);
          } catch (error) {
            console.error('❌ Error decompressing service data:', error);
          }
        }

        // Prefer items from main document (with showTag) and fall back to decompressed items.
        const rawItems = (service.items || decompressedData.items || []) as any[];
        const normalizedItems = rawItems.map((item) => ({
          ...item,
          showTag: item.showTag ?? false,
        }));

        // Merge database fields with decompressed data
        // Direct fields take priority over decompressed data
        const mergedService = {
          ...decompressedData,
          _id: service._id,
          serviceId: service.serviceId,
          name: service.name,
          items: normalizedItems,
          isActive: service.isActive,
          includeInDecoration: service.includeInDecoration, // Direct field from database
          compulsory: service.compulsory, // Direct field from database
          itemTagEnabled: service.itemTagEnabled, // Direct field from database
          itemTagName: service.itemTagName, // Direct field from database
          showInBookingPopup: service.showInBookingPopup,
          createdAt: service.createdAt,
          updatedAt: service.updatedAt,
        };

        console.log(`🔍 Service "${service.name}":`, {
          includeInDecoration: mergedService.includeInDecoration,
          compulsory: mergedService.compulsory,
          itemTagEnabled: mergedService.itemTagEnabled,
          itemTagName: mergedService.itemTagName,
          isActive: mergedService.isActive
        });

        return mergedService;
      })
    );

    console.log(`✅ Fetched ${decompressedServices.length} services (including inactive) from MongoDB`);
    return decompressedServices;
  } catch (error) {
    console.error('❌ Error fetching all services from MongoDB:', error);
    return [];
  }
};

const updateService = async (id: string, serviceData: Record<string, unknown>) => {
  try {
    console.log('🔄 updateService called with:', { id, serviceData });

    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(SERVICE_COLLECTION_NAME);
    const compressedData = await compressData(serviceData);

    const updateData: Record<string, unknown> = {
      compressedData: compressedData,
      updatedAt: new Date()
    };

    if (serviceData.name !== undefined) updateData.name = serviceData.name;
    if (serviceData.items !== undefined) updateData.items = serviceData.items;
    if (serviceData.isActive !== undefined) updateData.isActive = serviceData.isActive;
    if (serviceData.includeInDecoration !== undefined) {
      updateData.includeInDecoration = serviceData.includeInDecoration;
      console.log('✅ Setting includeInDecoration to:', serviceData.includeInDecoration);
    }
    if (serviceData.compulsory !== undefined) {
      updateData.compulsory = serviceData.compulsory;
      console.log('✅ Setting compulsory to:', serviceData.compulsory);
    }
    if (serviceData.itemTagEnabled !== undefined) {
      updateData.itemTagEnabled = serviceData.itemTagEnabled;
      console.log('✅ Setting itemTagEnabled to:', serviceData.itemTagEnabled);
    }
    if (serviceData.itemTagName !== undefined) {
      updateData.itemTagName = serviceData.itemTagName;
      console.log('✅ Setting itemTagName to:', serviceData.itemTagName);
    }
    if (serviceData.showInBookingPopup !== undefined) {
      updateData.showInBookingPopup = serviceData.showInBookingPopup;
      console.log('✅ Setting showInBookingPopup to:', serviceData.showInBookingPopup);
    }

    console.log('📦 Final updateData:', updateData);

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return { success: false, error: 'Service not found' };
    }

    const updatedService = await collection.findOne({ _id: new ObjectId(id) });

    console.log(`✅ Service updated in MongoDB:`, id);
    return {
      success: true,
      service: {
        _id: updatedService?._id,
        serviceId: updatedService?.serviceId,
        name: updatedService?.name,
        items: updatedService?.items,
        isActive: updatedService?.isActive,
        createdAt: updatedService?.createdAt
      }
    };
  } catch (error) {
    console.error('❌ Error updating service in MongoDB:', error);
    return { success: false, error: 'Failed to update service' };
  }
};

const deleteService = async (id: string) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(SERVICE_COLLECTION_NAME);

    // Hard delete - completely remove from database
    const result = await collection.deleteOne(
      { _id: new ObjectId(id) }
    );

    if (result.deletedCount === 0) {
      return { success: false, error: 'Service not found' };
    }

    console.log(`✅ Service deleted from MongoDB:`, id);
    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting service from MongoDB:', error);
    return { success: false, error: 'Failed to delete service' };
  }
};

// ============================================
// USER MANAGEMENT FUNCTIONS
// ============================================

const getNextStaffId = async (): Promise<string> => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(USER_COLLECTION_NAME);
    const lastUser = await collection
      .find()
      .sort({ userId: -1 })
      .limit(1)
      .toArray();

    if (lastUser.length === 0) {
      return 'FMT0001';
    }

    const lastId = lastUser[0].userId;
    // Handle both USR and FMT prefixes for backward compatibility
    const numPart = parseInt(lastId.replace(/^(USR|FMT)/, ''));
    const nextNum = numPart + 1;
    return `FMT${nextNum.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error('❌ Error generating staff ID:', error);
    return 'FMT0001';
  }
};

const saveStaff = async (staffData: Record<string, unknown>) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(USER_COLLECTION_NAME);

    const staffId = await getNextStaffId();
    const normalizedAccess = staffData.bookingAccess === 'edit' ? 'edit' : 'view';
    const compressedData = await compressData({ ...staffData, bookingAccess: normalizedAccess });

    const staff = {
      userId: staffId,
      compressedData: compressedData,
      name: staffData.name,
      email: staffData.email,
      phone: staffData.phone,
      gender: staffData.gender,
      profilePhoto: staffData.profilePhoto,
      photoType: staffData.photoType || 'upload',
      role: staffData.role || 'staff',
      password: staffData.password, // Store password for staff login
      isActive: staffData.isActive !== undefined ? staffData.isActive : true,
      bookingAccess: normalizedAccess,
      createdAt: new Date()
    };

    const result = await collection.insertOne(staff);

    console.log(`✅ Staff saved to MongoDB with ID:`, staffId);
    return {
      success: true,
      user: {
        _id: result.insertedId,
        userId: staffId,
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        gender: staff.gender,
        profilePhoto: staff.profilePhoto,
        photoType: staff.photoType,
        role: staff.role,
        isActive: staff.isActive,
        bookingAccess: staff.bookingAccess,
        createdAt: staff.createdAt
      }
    };
  } catch (error) {
    console.error('❌ Error saving staff to MongoDB:', error);
    return { success: false, error: 'Failed to save staff' };
  }
};

const getAllUsers = async () => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(USER_COLLECTION_NAME);
    const users = await collection.find({}).toArray();

    const decompressedUsers = await Promise.all(
      users.map(async (user) => {
        let decompressedData: any = {};

        if (user.compressedData) {
          try {
            decompressedData = await decompressData(user.compressedData);
          } catch (error) {
            console.error('❌ Error decompressing user data:', error);
          }
        }

        const { bookingAccess: decompressedAccess, ...restDecompressed } = decompressedData || {};
        const normalizedAccess = decompressedAccess === 'edit' || user.bookingAccess === 'edit' ? 'edit' : 'view';

        return {
          _id: user._id,
          userId: user.userId,
          name: user.name,
          email: user.email,
          phone: user.phone,
          gender: user.gender,
          profilePhoto: user.profilePhoto,
          photoType: user.photoType,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          password: user.password, // Include password for staff login authentication
          ...restDecompressed,
          bookingAccess: normalizedAccess
        };
      })
    );

    console.log(`✅ Fetched ${decompressedUsers.length} users from MongoDB`);
    return decompressedUsers;
  } catch (error) {
    console.error('❌ Error fetching users from MongoDB:', error);
    return [];
  }
};

const updateUser = async (id: string, userData: Record<string, unknown>) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(USER_COLLECTION_NAME);
    const normalizedUserData = {
      ...userData,
      ...(userData.bookingAccess !== undefined ? { bookingAccess: userData.bookingAccess === 'edit' ? 'edit' : 'view' } : {})
    };
    const compressedData = await compressData(normalizedUserData);

    const updateData: Record<string, unknown> = {
      compressedData: compressedData,
      updatedAt: new Date()
    };

    if (userData.name !== undefined) updateData.name = userData.name;
    if (userData.email !== undefined) updateData.email = userData.email;
    if (userData.phone !== undefined) updateData.phone = userData.phone;
    if (userData.gender !== undefined) updateData.gender = userData.gender;
    if (userData.profilePhoto !== undefined) updateData.profilePhoto = userData.profilePhoto;
    if (userData.photoType !== undefined) updateData.photoType = userData.photoType;
    if (userData.role !== undefined) updateData.role = userData.role;
    if (userData.isActive !== undefined) updateData.isActive = userData.isActive;
    if (userData.password !== undefined) updateData.password = userData.password;
    if (userData.bookingAccess !== undefined) updateData.bookingAccess = userData.bookingAccess === 'edit' ? 'edit' : 'view';

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return { success: false, error: 'User not found' };
    }

    const updatedUser = await collection.findOne({ _id: new ObjectId(id) });

    console.log(`✅ User updated in MongoDB:`, id);
    return {
      success: true,
      user: {
        _id: updatedUser?._id,
        userId: updatedUser?.userId,
        name: updatedUser?.name,
        email: updatedUser?.email,
        phone: updatedUser?.phone,
        gender: updatedUser?.gender,
        profilePhoto: updatedUser?.profilePhoto,
        photoType: updatedUser?.photoType,
        role: updatedUser?.role,
        isActive: updatedUser?.isActive,
        createdAt: updatedUser?.createdAt,
        bookingAccess: updatedUser?.bookingAccess
      }
    };
  } catch (error) {
    console.error('❌ Error updating user in MongoDB:', error);
    return { success: false, error: 'Failed to update user' };
  }
};

const deleteUser = async (id: string) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(USER_COLLECTION_NAME);

    // Hard delete - completely remove from database
    const result = await collection.deleteOne(
      { _id: new ObjectId(id) }
    );

    if (result.deletedCount === 0) {
      return { success: false, error: 'User not found' };
    }

    console.log(`✅ User deleted from MongoDB:`, id);
    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting user from MongoDB:', error);
    return { success: false, error: 'Failed to delete user' };
  }
};

// ============================================
// SETTINGS MANAGEMENT FUNCTIONS
// ============================================

const getSettings = async () => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(SETTINGS_COLLECTION_NAME);
    const settings = await collection.findOne({ type: 'system' });

    if (!settings) {
      return null;
    }

    let decompressedData: any = {};
    if (settings.compressedData) {
      try {
        decompressedData = await decompressData(settings.compressedData);
      } catch (error) {
        console.error('❌ Error decompressing settings data:', error);
      }
    }

    return { ...settings, ...decompressedData };
  } catch (error) {
    console.error('❌ Error fetching settings from MongoDB:', error);
    return null;
  }
};

const getSystemSettings = async () => {
  try {
    const settings = await getSettings();

    if (!settings) {
      return {
        success: false,
        error: 'No system settings found in database',
        settings: null
      };
    }

    return {
      success: true,
      settings: settings
    };
  } catch (error) {
    console.error('❌ Error fetching system settings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      settings: null
    };
  }
};

const saveSettings = async (settingsData: Record<string, unknown>) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(SETTINGS_COLLECTION_NAME);
    const compressedData = await compressData(settingsData);

    const settings = {
      type: 'system',
      compressedData: compressedData,
      ...settingsData,
      updatedAt: new Date()
    };

    await collection.updateOne(
      { type: 'system' },
      { $set: settings },
      { upsert: true }
    );

    console.log(`✅ Settings saved to MongoDB`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error saving settings to MongoDB:', error);
    return { success: false, error: 'Failed to save settings' };
  }
};

// Get admin by password from admin collection
const getAdminByPassword = async (password: string) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(ADMIN_COLLECTION_NAME);

    // Find admin by password
    const admin = await collection.findOne({
      password: password,
      isActive: true
    });

    if (admin) {
      console.log('✅ Admin found in database');
      return admin;
    } else {
      console.log('❌ No admin found with that password');
      return null;
    }

  } catch (error) {
    console.error('❌ Error getting admin by password:', error);
    return null;
  }
};

// Update admin profile in admin collection
const updateAdminProfile = async (adminId: string, updateData: any) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(ADMIN_COLLECTION_NAME);

    // Update admin profile
    const result = await collection.updateOne(
      { adminId: adminId },
      {
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Admin profile updated successfully');
      return { success: true };
    } else {
      console.log('❌ No admin found or no changes made');
      return { success: false, error: 'No changes made' };
    }

  } catch (error) {
    console.error('❌ Error updating admin profile:', error);
    return { success: false, error: 'Failed to update admin profile' };
  }
};

// Update admin password in admin collection
const updateAdminPassword = async (adminId: string, currentPassword: string, newPassword: string) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(ADMIN_COLLECTION_NAME);

    // First verify current password
    const admin = await collection.findOne({
      adminId: adminId,
      password: currentPassword
    });

    if (!admin) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Update password
    const result = await collection.updateOne(
      { adminId: adminId },
      {
        $set: {
          password: newPassword,
          updatedAt: new Date()
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Admin password updated successfully');
      return { success: true };
    } else {
      return { success: false, error: 'Failed to update password' };
    }

  } catch (error) {
    console.error('❌ Error updating admin password:', error);
    return { success: false, error: 'Failed to update password' };
  }
};

// Get admin profile by ID
const getAdminById = async (adminId: string) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(ADMIN_COLLECTION_NAME);

    const admin = await collection.findOne({ adminId: adminId });

    if (admin) {
      console.log('✅ Admin profile found');
      return admin;
    } else {
      console.log('❌ Admin not found');
      return null;
    }

  } catch (error) {
    console.error('❌ Error getting admin profile:', error);
    return null;
  }
};

// Get staff by ID (ObjectId or userId)
const getStaffById = async (staffId: string) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(USER_COLLECTION_NAME);

    // Try to find by userId first (FMT0001, etc.)
    let staff = await collection.findOne({ userId: staffId });

    // If not found by userId, try by ObjectId
    if (!staff && ObjectId.isValid(staffId)) {
      staff = await collection.findOne({ _id: new ObjectId(staffId) });
    }

    if (!staff) {
      return {
        success: false,
        error: 'Staff member not found'
      };
    }

    // Decompress data if needed
    let decompressedData: any = {};
    if (staff.compressedData) {
      try {
        decompressedData = await decompressData(staff.compressedData);
      } catch (error) {
        console.error('❌ Error decompressing staff data:', error);
      }
    }

    const staffData = {
      _id: staff._id,
      userId: staff.userId,
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      gender: staff.gender,
      profilePhoto: staff.profilePhoto,
      photoType: staff.photoType,
      password: staff.password,
      role: staff.role,
      isActive: staff.isActive,
      createdAt: staff.createdAt,
      ...decompressedData
    };

    return {
      success: true,
      staff: staffData
    };
  } catch (error) {
    console.error('❌ Error fetching staff by ID:', error);
    return {
      success: false,
      error: 'Failed to fetch staff'
    };
  }
};

// Save password change request
const savePasswordChangeRequest = async (requestData: any) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(REQUESTS_COLLECTION_NAME);
    const result = await collection.insertOne(requestData);

    console.log('✅ Password change request saved:', result.insertedId);
    return result.insertedId;
  } catch (error) {
    console.error('❌ Error saving password change request:', error);
    throw error;
  }
};

// Get all password change requests
const getAllPasswordChangeRequests = async () => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(REQUESTS_COLLECTION_NAME);
    const requests = await collection.find({}).sort({ requestedAt: -1 }).toArray();

    console.log(`✅ Fetched ${requests.length} password change requests`);
    return requests;
  } catch (error) {
    console.error('❌ Error fetching password change requests:', error);
    return [];
  }
};

// Get password change requests by staff ID
const getPasswordChangeRequestsByStaffId = async (staffId: string) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(REQUESTS_COLLECTION_NAME);
    const requests = await collection.find({ staffId: staffId }).sort({ requestedAt: -1 }).toArray();

    console.log(`✅ Fetched ${requests.length} password change requests for staff ${staffId}`);
    return requests;
  } catch (error) {
    console.error('❌ Error fetching password change requests by staff ID:', error);
    return [];
  }
};

// Update password change request status
const updatePasswordChangeRequest = async (requestId: string, updateData: any) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(REQUESTS_COLLECTION_NAME);
    const result = await collection.updateOne(
      { _id: new ObjectId(requestId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      console.error('❌ No password change request found with ID:', requestId);
      return false;
    }

    console.log('✅ Password change request updated:', requestId);
    return true;
  } catch (error) {
    console.error('❌ Error updating password change request:', error);
    return false;
  }
};

// Update user by userId (FMT0001, etc.)
const updateUserByUserId = async (userId: string, userData: Record<string, unknown>) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(USER_COLLECTION_NAME);

    // Update by userId field
    const result = await collection.updateOne(
      { userId: userId },
      { $set: userData }
    );

    if (result.matchedCount === 0) {
      console.error('❌ No user found with userId:', userId);
      return { success: false, error: 'User not found' };
    }

    console.log('✅ User updated by userId:', userId);
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating user by userId:', error);
    return { success: false, error: 'Failed to update user' };
  }
};

// Time Slots Management
const saveTimeSlot = async (timeSlotData: any) => {
  try {
    if (!isConnected || !db) {
      await connectToDatabase();
    }

    const collection = db!.collection(TIME_SLOTS_COLLECTION_NAME);

    // Generate unique slot ID
    const slotId = `SLOT-${Date.now()}`;

    const timeSlot = {
      slotId,
      ...timeSlotData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await collection.insertOne(timeSlot);

    return {
      success: true,
      timeSlot,
      slotId
    };
  } catch (error) {
    console.error('❌ Error saving time slot:', error);
    return { success: false, error: 'Failed to save time slot' };
  }
};

const getAllTimeSlots = async () => {
  try {
    if (!isConnected || !db) {
      await connectToDatabase();
    }

    const collection = db!.collection(TIME_SLOTS_COLLECTION_NAME);
    const timeSlots = await collection.find({}).sort({ startTime: 1 }).toArray();

    console.log('🎰 Fetched time slots from database:', timeSlots.length);

    return {
      success: true,
      timeSlots,
      total: timeSlots.length
    };
  } catch (error) {
    console.error('❌ Error fetching time slots:', error);
    return { success: false, error: 'Failed to fetch time slots' };
  }
};

const updateTimeSlot = async (slotId: string, updateData: any) => {
  try {
    if (!isConnected || !db) {
      await connectToDatabase();
    }

    const collection = db!.collection(TIME_SLOTS_COLLECTION_NAME);

    const result = await collection.updateOne(
      { slotId },
      {
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return { success: false, error: 'Time slot not found' };
    }

    const updatedSlot = await collection.findOne({ slotId });

    return {
      success: true,
      timeSlot: updatedSlot
    };
  } catch (error) {
    console.error('❌ Error updating time slot:', error);
    return { success: false, error: 'Failed to update time slot' };
  }
};

const deleteTimeSlot = async (slotId: string) => {
  try {
    if (!isConnected || !db) {
      await connectToDatabase();
    }

    const collection = db!.collection(TIME_SLOTS_COLLECTION_NAME);

    const result = await collection.deleteOne({ slotId });

    if (result.deletedCount === 0) {
      return { success: false, error: 'Time slot not found' };
    }

    return {
      success: true,
      message: 'Time slot deleted successfully'
    };
  } catch (error) {
    console.error('❌ Error deleting time slot:', error);
    return { success: false, error: 'Failed to delete time slot' };
  }
};

// Counter Management Functions
const initializeCounters = async () => {
  try {
    if (!isConnected || !db) {
      await connectToDatabase();
    }

    const collection = db!.collection<any>(COUNTERS_COLLECTION_NAME);

    // Check if counters already exist
    const existingCounters = await collection.find({}).toArray();

    if (existingCounters.length === 0) {
      // Initialize all booking counters with daily, weekly, monthly, total structure
      const currentDate = new Date();
      const currentDay = currentDate.getDate();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      // Calculate week start for initial counters
      const currentWeekStart = new Date(currentDate);
      currentWeekStart.setDate(currentDate.getDate() - currentDate.getDay());
      const currentWeekStartDay = currentWeekStart.getDate();
      const currentWeekStartMonth = currentWeekStart.getMonth();
      const currentWeekStartYear = currentWeekStart.getFullYear();

      const initialCounters = [
        {
          _id: 'confirmedCounter' as any,
          dailyCount: 0,
          weeklyCount: 0,
          monthlyCount: 0,
          yearlyCount: 0,
          totalCount: 0,
          count: 0, // Legacy support
          lastResetDay: currentDay,
          lastResetWeekDay: currentWeekStartDay,
          lastResetWeekMonth: currentWeekStartMonth,
          lastResetWeekYear: currentWeekStartYear,
          lastResetMonth: currentMonth,
          lastResetYear: currentYear
        },
        {
          _id: 'manualCounter' as any,
          dailyCount: 0,
          weeklyCount: 0,
          monthlyCount: 0,
          yearlyCount: 0,
          totalCount: 0,
          count: 0, // Legacy support
          lastResetDay: currentDay,
          lastResetWeekDay: currentWeekStartDay,
          lastResetWeekMonth: currentWeekStartMonth,
          lastResetWeekYear: currentWeekStartYear,
          lastResetMonth: currentMonth,
          lastResetYear: currentYear
        },
        {
          _id: 'completedCounter' as any,
          dailyCount: 0,
          weeklyCount: 0,
          monthlyCount: 0,
          yearlyCount: 0,
          totalCount: 0,
          count: 0, // Legacy support
          lastResetDay: currentDay,
          lastResetWeekDay: currentWeekStartDay,
          lastResetWeekMonth: currentWeekStartMonth,
          lastResetWeekYear: currentWeekStartYear,
          lastResetMonth: currentMonth,
          lastResetYear: currentYear
        },
        {
          _id: 'cancelledCounter' as any,
          dailyCount: 0,
          weeklyCount: 0,
          monthlyCount: 0,
          yearlyCount: 0,
          totalCount: 0,
          count: 0, // Legacy support
          lastResetDay: currentDay,
          lastResetWeekDay: currentWeekStartDay,
          lastResetWeekMonth: currentWeekStartMonth,
          lastResetWeekYear: currentWeekStartYear,
          lastResetMonth: currentMonth,
          lastResetYear: currentYear
        },
        {
          _id: 'incompleteCounter' as any,
          dailyCount: 0,
          weeklyCount: 0,
          monthlyCount: 0,
          yearlyCount: 0,
          totalCount: 0,
          count: 0, // Legacy support
          lastResetDay: currentDay,
          lastResetWeekDay: currentWeekStartDay,
          lastResetWeekMonth: currentWeekStartMonth,
          lastResetWeekYear: currentWeekStartYear,
          lastResetMonth: currentMonth,
          lastResetYear: currentYear
        }
      ];

      await collection.insertMany(initialCounters);
      console.log('✅ Initialized booking counters with daily/weekly/monthly/total structure in database');
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Error initializing counters:', error);
    return { success: false, error: 'Failed to initialize counters' };
  }
};

// Check and reset counters based on time
const checkAndResetCounters = async () => {
  try {
    if (!isConnected || !db) {
      await connectToDatabase();
    }

    const collection = db!.collection(COUNTERS_COLLECTION_NAME);

    // Get current IST time
    const now = new Date();
    const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

    console.log('🔄 [AUTO-RESET] Checking counters for reset...');

    const counters = await collection.findOne({ _id: 'confirmedCounter' as any });

    if (!counters) {
      console.log('🔄 [AUTO-RESET] No counters found, initializing...');
      await initializeCounters();
      return { success: true, message: 'Counters initialized' };
    }

    // Reset logic is handled in incrementCounter function
    return { success: true, message: 'Counters checked' };

  } catch (error) {
    console.error('❌ Error checking counters:', error);
    return { success: false, error: 'Failed to check counters' };
  }
};


const incrementCounter = async (counterType: string) => {
  try {
    if (!isConnected || !db) {
      await connectToDatabase();
    }

    // First check and reset counters if needed
    await checkAndResetCounters();

    const collection = db!.collection(COUNTERS_COLLECTION_NAME);
    const counterId = `${counterType}Counter`;

    // Increment all counter types (daily, weekly, monthly, yearly, total)
    const result = await collection.findOneAndUpdate(
      { _id: counterId as any },
      {
        $inc: {
          dailyCount: 1,
          weeklyCount: 1,
          monthlyCount: 1,
          yearlyCount: 1,
          totalCount: 1,
          count: 1 // Keep legacy count for backward compatibility
        }
      },
      { returnDocument: 'after', upsert: true }
    );

    if (result) {
      console.log(`📊 Incremented ${counterType} counter - Daily: ${result.value?.dailyCount || 0}, Weekly: ${result.value?.weeklyCount || 0}, Monthly: ${result.value?.monthlyCount || 0}, Yearly: ${result.value?.yearlyCount || 0}, Total: ${result.value?.totalCount || 0}`);
      return {
        success: true,
        dailyCount: result.value?.dailyCount || 0,
        weeklyCount: result.value?.weeklyCount || 0,
        monthlyCount: result.value?.monthlyCount || 0,
        yearlyCount: result.value?.yearlyCount || 0,
        totalCount: result.value?.totalCount || 0
      };
    }

    return { success: false, error: 'Failed to increment counter' };
  } catch (error) {
    console.error(`❌ Error incrementing ${counterType} counter:`, error);
    return { success: false, error: 'Failed to increment counter' };
  }
};

// Decrement counter function - used to decrease counters when needed
const decrementCounter = async (counterType: string) => {
  try {
    if (!isConnected || !db) {
      await connectToDatabase();
    }

    const collection = db!.collection(COUNTERS_COLLECTION_NAME);
    const counterId = `${counterType}Counter`;

    // Get current counter values
    const currentCounter = await collection.findOne({ _id: counterId as any });

    if (!currentCounter) {
      console.log(`⚠️ No ${counterType} counter found to decrement`);
      return { success: false, error: `${counterType} counter not found` };
    }

    // Ensure we don't go below zero for any counter
    const dailyCount = Math.max(0, (currentCounter.dailyCount || 0) - 1);
    const weeklyCount = Math.max(0, (currentCounter.weeklyCount || 0) - 1);
    const monthlyCount = Math.max(0, (currentCounter.monthlyCount || 0) - 1);
    const yearlyCount = Math.max(0, (currentCounter.yearlyCount || 0) - 1);
    const totalCount = Math.max(0, (currentCounter.totalCount || currentCounter.count || 0) - 1);

    // Update counter with decremented values
    const result = await collection.findOneAndUpdate(
      { _id: counterId as any },
      {
        $set: {
          dailyCount: dailyCount,
          weeklyCount: weeklyCount,
          monthlyCount: monthlyCount,
          yearlyCount: yearlyCount,
          totalCount: totalCount,
          count: totalCount // Keep legacy count for backward compatibility
        }
      },
      { returnDocument: 'after' }
    );

    if (result) {
      console.log(`📊 Decremented ${counterType} counter - Daily: ${result.value?.dailyCount || 0}, Weekly: ${result.value?.weeklyCount || 0}, Monthly: ${result.value?.monthlyCount || 0}, Yearly: ${result.value?.yearlyCount || 0}, Total: ${result.value?.totalCount || 0}`);
      return {
        success: true,
        dailyCount: result.value?.dailyCount || 0,
        weeklyCount: result.value?.weeklyCount || 0,
        monthlyCount: result.value?.monthlyCount || 0,
        yearlyCount: result.value?.yearlyCount || 0,
        totalCount: result.value?.totalCount || 0
      };
    }

    return { success: false, error: 'Failed to decrement counter' };
  } catch (error) {
    console.error(`❌ Error decrementing ${counterType} counter:`, error);
    return { success: false, error: 'Failed to decrement counter' };
  }
};

const getCounterValue = async (counterType: string) => {
  try {
    if (!isConnected || !db) {
      await connectToDatabase();
    }

    // First check and reset if needed
    await checkAndResetCounters();

    const collection = db!.collection(COUNTERS_COLLECTION_NAME);
    const counterId = `${counterType}Counter`;

    const counter = await collection.findOne({ _id: counterId as any });

    if (counter) {
      return { success: true, count: counter.count };
    }

    return { success: true, count: 0 };
  } catch (error) {
    console.error(`❌ Error getting ${counterType} counter:`, error);
    return { success: false, error: 'Failed to get counter value' };
  }
};

// ============================================
// TRUSTED CUSTOMERS MANAGEMENT FUNCTIONS
// ============================================

const getNextTrustedCustomerId = async (): Promise<string> => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(TRUSTED_CUSTOMERS_COLLECTION_NAME);
    const lastCustomer = await collection
      .find()
      .sort({ customerId: -1 })
      .limit(1)
      .toArray();

    if (lastCustomer.length === 0 || !lastCustomer[0].customerId) {
      return 'TC0001';
    }

    const lastId = String(lastCustomer[0].customerId);
    const numericPart = parseInt(lastId.replace(/\D/g, ''), 10);
    const nextNumber = Number.isNaN(numericPart) ? 1 : numericPart + 1;

    return `TC${nextNumber.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error('❌ Error generating trusted customer ID:', error);
    return 'TC0001';
  }
};

const saveTrustedCustomer = async (customerData: Record<string, unknown>) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(TRUSTED_CUSTOMERS_COLLECTION_NAME);
    const customerId = await getNextTrustedCustomerId();
    const now = new Date();

    const { _id: _ignored, tags, ...rest } = customerData as Record<string, unknown>;
    const restData = rest as Record<string, any>;
    const rawBillingPreference = restData.billingPreference;
    delete restData.billingPreference;
    const tagsArray = Array.isArray(tags)
      ? tags
      : typeof tags === 'string'
        ? (tags as string)
          .split(',')
          .map(tag => tag.trim())
          .filter(Boolean)
        : [];
    const billingPreference = rawBillingPreference === 'free' ? 'free' : 'paid';

    const customer: Record<string, any> = {
      _id: new ObjectId(),
      customerId,
      createdAt: now,
      updatedAt: now,
      ...restData,
      tags: tagsArray,
      isActive: restData.isActive !== undefined ? Boolean(restData.isActive) : true,
      billingPreference
    };

    if (typeof customer.name === 'string') {
      customer.name = customer.name.trim();
    }
    if (typeof customer.company === 'string') {
      customer.company = customer.company.trim();
    }
    if (typeof customer.email === 'string') {
      customer.email = customer.email.trim();
    }
    if (typeof customer.phone === 'string') {
      customer.phone = customer.phone.trim();
    }

    await collection.insertOne(customer);

    console.log('🤝 Trusted customer saved to MongoDB:', customerId, customer.name || 'Unnamed customer');

    return {
      success: true,
      customer
    };
  } catch (error) {
    console.error('❌ Error saving trusted customer to MongoDB:', error);
    return { success: false, error: 'Failed to save trusted customer' };
  }
};

const getAllTrustedCustomers = async () => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(TRUSTED_CUSTOMERS_COLLECTION_NAME);
    const customers = await collection.find({}).sort({ createdAt: -1 }).toArray();

    console.log(`🤝 Retrieved ${customers.length} trusted customers from MongoDB`);

    return customers;
  } catch (error) {
    console.error('❌ Error fetching trusted customers from MongoDB:', error);
    return [];
  }
};

const updateTrustedCustomer = async (id: string, customerData: Record<string, unknown>) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(TRUSTED_CUSTOMERS_COLLECTION_NAME);

    const filter = ObjectId.isValid(id) && id.length === 24
      ? { _id: new ObjectId(id) }
      : { customerId: id };

    const { _id: _ignored, customerId: _ignoredCustomerId, tags, ...rest } = customerData as Record<string, unknown>;
    const restData = rest as Record<string, any>;
    const rawBillingPreference = restData.billingPreference;
    delete restData.billingPreference;
    const updatePayload: Record<string, unknown> = {
      ...restData,
      updatedAt: new Date()
    };

    if (tags !== undefined) {
      const tagsArray = Array.isArray(tags)
        ? tags
        : typeof tags === 'string'
          ? (tags as string)
            .split(',')
            .map(tag => tag.trim())
            .filter(Boolean)
          : [];
      updatePayload.tags = tagsArray;
    }

    if (restData.name !== undefined && typeof restData.name === 'string') {
      updatePayload.name = (restData.name as string).trim();
    }
    if (restData.company !== undefined && typeof restData.company === 'string') {
      updatePayload.company = (restData.company as string).trim();
    }
    if (restData.email !== undefined && typeof restData.email === 'string') {
      updatePayload.email = (restData.email as string).trim();
    }
    if (restData.phone !== undefined && typeof restData.phone === 'string') {
      updatePayload.phone = (restData.phone as string).trim();
    }
    if (rawBillingPreference !== undefined) {
      updatePayload.billingPreference = rawBillingPreference === 'free' ? 'free' : 'paid';
    }

    const result = await collection.updateOne(filter, { $set: updatePayload });

    if (result.matchedCount === 0) {
      return { success: false, error: 'Trusted customer not found' };
    }

    const updatedCustomer = await collection.findOne(filter);

    console.log('✅ Trusted customer updated in MongoDB:', id);

    return {
      success: true,
      customer: updatedCustomer
    };
  } catch (error) {
    console.error('❌ Error updating trusted customer in MongoDB:', error);
    return { success: false, error: 'Failed to update trusted customer' };
  }
};

const deleteTrustedCustomer = async (id: string) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(TRUSTED_CUSTOMERS_COLLECTION_NAME);

    const filter = ObjectId.isValid(id) && id.length === 24
      ? { _id: new ObjectId(id) }
      : { customerId: id };

    const result = await collection.deleteOne(filter);

    if (result.deletedCount === 0) {
      return { success: false, error: 'Trusted customer not found' };
    }

    console.log('🗑️ Trusted customer deleted from MongoDB:', id);

    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting trusted customer from MongoDB:', error);
    return { success: false, error: 'Failed to delete trusted customer' };
  }
};

const database = {
  connect: connectToDatabase,
  connectToDatabase: connectToDatabase,
  checkConnection: checkConnection,
  db: () => db,
  // Expose compression helpers for API routes that need them
  decompressData: decompressData,
  compressData: compressData,
  saveBooking: saveBooking,
  saveManualBooking: saveManualBooking,
  getAllManualBookings: getAllManualBookings,
  saveIncompleteBooking: saveIncompleteBooking,
  getAllBookings: getAllBookings,
  getLatestBookings: async (limit: number = 5) => {
    try {
      if (!isConnected || !db) {
        await connectToDatabase();
      }

      if (!db) {
        throw new Error('Database not connected');
      }

      const collection = db.collection(COLLECTION_NAME);
      const bookings = await collection
        .find({})
        .sort({ _id: -1 })
        .limit(limit)
        .toArray();

      return bookings;
    } catch (error) {
      console.error('❌ Error getting latest bookings:', error);
      return [];
    }
  },
  getAllIncompleteBookings: getAllIncompleteBookings,
  deleteIncompleteBooking: deleteIncompleteBooking,
  deleteExpiredIncompleteBookings: deleteExpiredIncompleteBookings,
  getBookingById: getBookingById,
  getBookingByTicketNumber: getBookingByTicketNumber,
  updateBooking: updateBooking,
  updateManualBooking: updateManualBooking,
  updateIncompleteBooking: updateIncompleteBooking,
  updateBookingStatus: updateBookingStatus,
  deleteBooking: deleteBooking,
  deleteManualBooking: deleteManualBooking,
  moveBookingToCancelled: moveBookingToCancelled,
  moveBookingToCompleted: moveBookingToCompleted,
  getAllCompletedBookings: getAllCompletedBookings,
  getAllCancelledBookings: getAllCancelledBookings,
  deleteOldCancelledBookings: deleteOldCancelledBookings,
  deleteExpiredBookings: deleteExpiredBookings,
  getExpiredBookings: getExpiredBookings,
  saveTheater: saveTheater,
  getAllTheaters: getAllTheaters,
  updateTheater: updateTheater,
  reorderTheaters: reorderTheaters,
  deleteTheater: deleteTheater,
  updateOrderStatusByTicket: updateOrderStatusByTicket,
  saveGalleryImage: saveGalleryImage,
  getAllGalleryImages: getAllGalleryImages,
  deleteGalleryImage: deleteGalleryImage,
  saveCoupon: saveCoupon,
  getAllCoupons: getAllCoupons,
  updateCoupon: updateCoupon,
  deleteCoupon: deleteCoupon,
  saveOccasion: saveOccasion,
  getAllOccasions: getAllOccasions,
  updateOccasion: updateOccasion,
  deleteOccasion: deleteOccasion,
  saveService: saveService,
  getAllServices: getAllServices,
  getAllServicesIncludingInactive: getAllServicesIncludingInactive,
  updateService: updateService,
  deleteService: deleteService,
  saveStaff: saveStaff,
  getAllStaff: getAllUsers, // getAllUsers returns staff data
  updateStaff: updateUser, // updateUser updates staff data
  deleteStaff: deleteUser, // deleteUser deletes staff data
  getAllUsers: getAllUsers, // Keep for backward compatibility
  updateUser: updateUser, // Keep for backward compatibility
  saveOrderRecord: saveOrderRecord,
  getOrders: getOrders,
  getOrderCounts: getOrderCounts,
  markOrderReadyForAutoDeletion: markOrderReadyForAutoDeletion,
  cleanupReadyOrdersPastAutoDelete: cleanupReadyOrdersPastAutoDelete,
  deleteOrdersByBookingReference: deleteOrdersByBookingReference,
  deleteOrdersByBookingAndService: deleteOrdersByBookingAndService,
  updateOrdersRemoveItems: updateOrdersRemoveItems,
  getSettings: getSettings,
  getSystemSettings: getSystemSettings,
  saveSettings: saveSettings,
  getAdminByPassword: getAdminByPassword,
  updateAdminProfile: updateAdminProfile,
  updateAdminPassword: updateAdminPassword,
  getAdminById: getAdminById,
  savePasswordChangeRequest: savePasswordChangeRequest,
  getAllPasswordChangeRequests: getAllPasswordChangeRequests,
  getPasswordChangeRequestsByStaffId: getPasswordChangeRequestsByStaffId,
  updatePasswordChangeRequest: updatePasswordChangeRequest,
  updateUserByUserId: updateUserByUserId,
  getStaffById: getStaffById,
  isConnected: () => isConnected,
  saveTimeSlot: saveTimeSlot,
  getAllTimeSlots: getAllTimeSlots,
  updateTimeSlot: updateTimeSlot,
  deleteTimeSlot: deleteTimeSlot,
  initializeCounters: initializeCounters,
  checkAndResetCounters: checkAndResetCounters,
  getAllCounters: async () => {
    try {
      if (!isConnected || !db) {
        await connectToDatabase();
      }

      const collection = db!.collection(COUNTERS_COLLECTION_NAME);
      const counters = await collection.find({}).toArray();

      const result: any = {};
      counters.forEach(counter => {
        const counterType = counter._id.toString().replace('Counter', '');
        result[counterType] = {
          daily: counter.dailyCount || 0,
          weekly: counter.weeklyCount || 0,
          monthly: counter.monthlyCount || 0,
          yearly: counter.yearlyCount || 0,
          total: counter.totalCount || counter.count || 0
        };
      });

      return { success: true, counters: result };
    } catch (error) {
      console.error('❌ Error getting all counters:', error);
      return { success: false, error: 'Failed to get counters' };
    }
  },
  getCounterValue: getCounterValue,
  incrementStaffCounter: incrementStaffCounter,
  incrementCounter: incrementCounter,
  autoResetCounters: async () => {
    try {
      if (!isConnected) {
        await connectToDatabase();
      }
      if (!db) {
        throw new Error('Database not connected');
      }

      // Get current IST time (same method used throughout the app)
      const now = new Date();
      const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

      const currentDate = istNow.toISOString().split('T')[0]; // YYYY-MM-DD
      const currentDay = istNow.getDay(); // 0 = Sunday
      const currentDayOfMonth = istNow.getDate();
      const currentMonth = istNow.getMonth() + 1; // 1-12
      const currentYear = istNow.getFullYear();

      console.log(`🔄 [AUTO-RESET] Checking counters - IST: ${istNow.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);

      const countersCollection = db.collection<any>('counters');

      // Get all individual counters
      const confirmedCounter = await countersCollection.findOne({ _id: 'confirmedCounter' as any });
      const manualCounter = await countersCollection.findOne({ _id: 'manualCounter' as any });
      const cancelledCounter = await countersCollection.findOne({ _id: 'cancelledCounter' as any });
      const completedCounter = await countersCollection.findOne({ _id: 'completedCounter' as any });

      if (!confirmedCounter || !manualCounter || !cancelledCounter || !completedCounter) {
        console.log('🔄 [AUTO-RESET] Some counters missing, initializing...');
        await initializeCounters();
        return { success: true, message: 'Counters initialized' };
      }

      const counters = {
        confirmed: confirmedCounter,
        manual: manualCounter,
        cancelled: cancelledCounter,
        completed: completedCounter
      };

      const resetActions: string[] = [];
      let needsUpdate = false;

      // Check daily reset (every day at midnight IST)
      if (counters.confirmed.lastResetDay !== currentDayOfMonth) {
        console.log(`🔄 [AUTO-RESET] Daily reset needed - Last: ${counters.confirmed.lastResetDay}, Current: ${currentDayOfMonth}`);

        // Reset daily counters for all types
        await countersCollection.updateOne(
          { _id: 'confirmedCounter' as any },
          { $set: { dailyCount: 0, lastResetDay: currentDayOfMonth } }
        );
        await countersCollection.updateOne(
          { _id: 'manualCounter' as any },
          { $set: { dailyCount: 0, lastResetDay: currentDayOfMonth } }
        );
        await countersCollection.updateOne(
          { _id: 'cancelledCounter' as any },
          { $set: { dailyCount: 0, lastResetDay: currentDayOfMonth } }
        );
        await countersCollection.updateOne(
          { _id: 'completedCounter' as any },
          { $set: { dailyCount: 0, lastResetDay: currentDayOfMonth } }
        );

        resetActions.push('Daily counters reset');
        needsUpdate = true;
      }

      // Check weekly reset (every Sunday at midnight IST)
      if (currentDay === 0 && counters.confirmed.lastResetWeekDay !== currentDayOfMonth) {
        console.log(`🔄 [AUTO-RESET] Weekly reset needed - Last: ${counters.confirmed.lastResetWeekDay}, Current: ${currentDayOfMonth}`);

        // Reset weekly counters for all types
        await countersCollection.updateOne(
          { _id: 'confirmedCounter' as any },
          { $set: { weeklyCount: 0, lastResetWeekDay: currentDayOfMonth, lastResetWeekMonth: currentMonth, lastResetWeekYear: currentYear } }
        );
        await countersCollection.updateOne(
          { _id: 'manualCounter' as any },
          { $set: { weeklyCount: 0, lastResetWeekDay: currentDayOfMonth, lastResetWeekMonth: currentMonth, lastResetWeekYear: currentYear } }
        );
        await countersCollection.updateOne(
          { _id: 'cancelledCounter' as any },
          { $set: { weeklyCount: 0, lastResetWeekDay: currentDayOfMonth, lastResetWeekMonth: currentMonth, lastResetWeekYear: currentYear } }
        );
        await countersCollection.updateOne(
          { _id: 'completedCounter' as any },
          { $set: { weeklyCount: 0, lastResetWeekDay: currentDayOfMonth, lastResetWeekMonth: currentMonth, lastResetWeekYear: currentYear } }
        );

        resetActions.push('Weekly counters reset');
        needsUpdate = true;
      }

      // Check monthly reset (1st day of month at midnight IST)
      if (currentDayOfMonth === 1 && counters.confirmed.lastResetMonth !== (currentMonth - 1)) {
        console.log(`🔄 [AUTO-RESET] Monthly reset needed - Last: ${counters.confirmed.lastResetMonth}, Current: ${currentMonth - 1}`);

        // Reset monthly counters for all types
        await countersCollection.updateOne(
          { _id: 'confirmedCounter' as any },
          { $set: { monthlyCount: 0, lastResetMonth: currentMonth - 1 } }
        );
        await countersCollection.updateOne(
          { _id: 'manualCounter' as any },
          { $set: { monthlyCount: 0, lastResetMonth: currentMonth - 1 } }
        );
        await countersCollection.updateOne(
          { _id: 'cancelledCounter' as any },
          { $set: { monthlyCount: 0, lastResetMonth: currentMonth - 1 } }
        );
        await countersCollection.updateOne(
          { _id: 'completedCounter' as any },
          { $set: { monthlyCount: 0, lastResetMonth: currentMonth - 1 } }
        );

        resetActions.push('Monthly counters reset');
        needsUpdate = true;
      }

      // Check yearly reset (January 1st at midnight IST)
      if (currentMonth === 1 && currentDayOfMonth === 1 && counters.confirmed.lastResetYear !== currentYear) {
        console.log(`🔄 [AUTO-RESET] Yearly reset needed - Last: ${counters.confirmed.lastResetYear}, Current: ${currentYear}`);

        // Reset yearly counters for all types
        await countersCollection.updateOne(
          { _id: 'confirmedCounter' as any },
          { $set: { yearlyCount: 0, lastResetYear: currentYear } }
        );
        await countersCollection.updateOne(
          { _id: 'manualCounter' as any },
          { $set: { yearlyCount: 0, lastResetYear: currentYear } }
        );
        await countersCollection.updateOne(
          { _id: 'cancelledCounter' as any },
          { $set: { yearlyCount: 0, lastResetYear: currentYear } }
        );
        await countersCollection.updateOne(
          { _id: 'completedCounter' as any },
          { $set: { yearlyCount: 0, lastResetYear: currentYear } }
        );

        resetActions.push('Yearly counters reset');
        needsUpdate = true;
      }

      // Update counters if any reset was needed
      if (needsUpdate) {
        console.log(`✅ [AUTO-RESET] Counters updated: ${resetActions.join(', ')}`);

        return {
          success: true,
          message: 'Counters automatically reset',
          resetActions: resetActions,
          timestamp: istNow.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
        };
      } else {
        console.log(`✅ [AUTO-RESET] No reset needed - all counters current`);

        return {
          success: true,
          message: 'No reset needed',
          resetActions: [],
          timestamp: istNow.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
        };
      }

    } catch (error) {
      console.error('❌ [AUTO-RESET] Error in automatic counter reset:', error);
      return {
        success: false,
        error: 'Failed to auto-reset counters',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
  saveFeedbackWithLimit: async (feedbackData: any) => {
    return await saveFeedbackWithLimit(feedbackData);
  },
  getFeedbackList: async () => {
    return await getFeedbackList();
  },
  deleteFeedbackById: async (feedbackId: string) => {
    return await deleteFeedbackById(feedbackId);
  },
  updateFeedbackById: async (feedbackId: string, updates: Record<string, any>) => {
    return await updateFeedbackById(feedbackId, updates);
  },
  addTestimonial: async (testimonialData: any) => {
    return await addTestimonial(testimonialData);
  },
  addFAQ: async (faqData: any) => {
    return await addFAQ(faqData);
  },
  getAllFAQs: async () => {
    return await getAllFAQs();
  },
  updateFAQ: async (faqId: string, faqData: any) => {
    return await updateFAQ(faqId, faqData);
  },
  deleteFAQ: async (faqId: string) => {
    return await deleteFAQ(faqId);
  },
  saveTrustedCustomer: saveTrustedCustomer,
  getAllTrustedCustomers: getAllTrustedCustomers,
  updateTrustedCustomer: updateTrustedCustomer,
  deleteTrustedCustomer: deleteTrustedCustomer
};

// Get bookings by occasion from MongoDB database
const getBookingsByOccasion = async (occasion: string) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    // Get collection
    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(COLLECTION_NAME);

    // Find bookings by occasion (limit to recent 50 for performance)
    const bookings = await collection.find({
      occasion: occasion
    }).sort({ createdAt: -1 }).limit(50).toArray();

    return {
      success: true,
      bookings: bookings,
      total: bookings.length,
      occasion: occasion,
      database: DB_NAME,
      collection: COLLECTION_NAME
    };

  } catch (error) {
    console.error('❌ Error getting bookings by occasion from MongoDB:', error);
    return {
      success: false,
      error: 'Failed to get bookings by occasion from MongoDB'
    };
  }
};



// Save Feedback with Maximum 20 Limit (FIFO - First In, First Out)
const saveFeedbackWithLimit = async (feedbackData: any) => {
  try {
    if (!isConnected) {
      const connectionResult = await connectToDatabase();
      if (!connectionResult.success) {
        throw new Error('Failed to connect to database');
      }
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection('feedback');

    // Check current count
    const currentCount = await collection.countDocuments();
    console.log(`📊 Current feedback count: ${currentCount}`);

    // If we have 20 or more, delete the oldest one(s)
    if (currentCount >= 20) {
      const oldestFeedback = await collection.find({}).sort({ submittedAt: 1 }).limit(currentCount - 19).toArray();

      if (oldestFeedback.length > 0) {
        const idsToDelete = oldestFeedback.map(f => f._id);
        await collection.deleteMany({ _id: { $in: idsToDelete } });
        console.log(`🗑️ Deleted ${oldestFeedback.length} oldest feedback entries`);
      }
    }

    // Add new feedback
    const result = await collection.insertOne({
      ...feedbackData,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Get updated count
    const newCount = await collection.countDocuments();
    console.log(`✅ Feedback saved. New count: ${newCount}`);

    return {
      success: true,
      feedbackId: result.insertedId.toString(),
      message: 'Feedback saved successfully',
      totalCount: newCount
    };
  } catch (error) {
    console.error('❌ Error saving feedback to MongoDB:', error);
    return {
      success: false,
      error: 'Failed to save feedback to MongoDB'
    };
  }
};

// Get Feedback List (Latest 20)
const getFeedbackList = async () => {
  try {
    // Ensure database connection
    if (!isConnected) {
      const connectionResult = await connectToDatabase();
      if (!connectionResult.success) {
        throw new Error('Failed to connect to database');
      }
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection('feedback');
    const feedback = await collection.find({}).sort({ submittedAt: -1 }).limit(20).toArray();

    console.log(`📋 Retrieved ${feedback.length} feedback entries`);

    return {
      success: true,
      feedback: feedback,
      total: feedback.length
    };
  } catch (error) {
    console.error('❌ Error getting feedback from MongoDB:', error);
    return {
      success: false,
      error: 'Failed to get feedback from MongoDB'
    };
  }
};

const deleteFeedbackById = async (feedbackId: string) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection('feedback');

    const filters: any[] = [];
    const trimmedId = typeof feedbackId === 'string' ? feedbackId.trim() : feedbackId;

    const extractObjectId = (value?: string) => {
      if (!value) return null;
      if (ObjectId.isValid(value)) return value;
      const match = value.match(/[a-f0-9]{24}/i);
      if (match && ObjectId.isValid(match[0])) {
        return match[0];
      }
      return null;
    };

    const objectIdCandidate = extractObjectId(typeof trimmedId === 'string' ? trimmedId : '');
    if (objectIdCandidate) {
      filters.push({ _id: new ObjectId(objectIdCandidate) });
    }

    const numericId = Number(trimmedId);
    if (!Number.isNaN(numericId)) {
      filters.push({ feedbackId: numericId });
    }

    if (trimmedId) {
      filters.push({ feedbackId: trimmedId });
    }

    if (!filters.length) {
      return { success: false, error: 'Invalid feedback identifier provided' };
    }

    const query = filters.length > 1 ? { $or: filters } : filters[0];

    const result = await collection.findOneAndDelete(query);

    if (!result || !result.value) {
      return { success: false, error: 'Feedback not found' };
    }

    return { success: true, deleted: result.value };
  } catch (error) {
    console.error('❌ Error deleting feedback from MongoDB:', error);
    return {
      success: false,
      error: 'Failed to delete feedback'
    };
  }
};

const updateFeedbackById = async (feedbackId: string, updates: Record<string, any>) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection('feedback');

    const filters: any[] = [];
    if (ObjectId.isValid(feedbackId)) {
      filters.push({ _id: new ObjectId(feedbackId) });
    }

    const numericId = Number(feedbackId);
    if (!Number.isNaN(numericId)) {
      filters.push({ feedbackId: numericId });
    }

    filters.push({ feedbackId });

    const query = filters.length > 1 ? { $or: filters } : filters[0];

    const updatePayload = {
      ...updates,
      updatedAt: new Date()
    };

    const result = await collection.findOneAndUpdate(
      query,
      { $set: updatePayload },
      { returnDocument: 'after' }
    );

    if (!result || !result.value) {
      return { success: false, error: 'Feedback not found' };
    }

    return { success: true, testimonial: result.value };
  } catch (error) {
    console.error('❌ Error updating feedback in MongoDB:', error);
    return {
      success: false,
      error: 'Failed to update feedback'
    };
  }
};

// Add Testimonial to Database
const addTestimonial = async (testimonialData: any) => {
  try {
    // Ensure database connection
    if (!isConnected) {
      const connectionResult = await connectToDatabase();
      if (!connectionResult.success) {
        throw new Error('Failed to connect to database');
      }
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection('testimonials');
    const result = await collection.insertOne({
      ...testimonialData,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return {
      success: true,
      testimonialId: result.insertedId.toString(),
      message: 'Testimonial added successfully'
    };
  } catch (error) {
    console.error('❌ Error adding testimonial to MongoDB:', error);
    return {
      success: false,
      error: 'Failed to add testimonial to MongoDB'
    };
  }
};

// FAQ Management Functions
const addFAQ = async (faqData: any) => {
  try {
    // Ensure database connection
    if (!isConnected) {
      const connectionResult = await connectToDatabase();
      if (!connectionResult.success) {
        throw new Error('Failed to connect to database');
      }
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(FAQ_COLLECTION_NAME);

    // Prepare FAQ data for compression
    const faqToStore = {
      ...faqData,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      order: await collection.countDocuments() + 1
    };

    // Compress the FAQ data before storing
    const compressedData = await compressData(faqToStore);

    const result = await collection.insertOne({
      compressedData: compressedData,
      _compressed: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      order: await collection.countDocuments() + 1
    });

    return {
      success: true,
      faqId: result.insertedId.toString(),
      message: 'FAQ added successfully'
    };
  } catch (error) {
    console.error('❌ Error adding FAQ to MongoDB:', error);
    return {
      success: false,
      error: 'Failed to add FAQ to MongoDB'
    };
  }
};

const getAllFAQs = async () => {
  try {
    // Ensure database connection
    if (!isConnected) {
      const connectionResult = await connectToDatabase();
      if (!connectionResult.success) {
        throw new Error('Failed to connect to database');
      }
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(FAQ_COLLECTION_NAME);

    // First, let's check all documents without filtering
    const allRawFaqs = await collection.find({}).sort({ order: 1 }).toArray();
    console.log('📊 getAllFAQs: Found', allRawFaqs.length, 'total documents in FAQ collection');
    console.log('📋 All FAQ documents:', allRawFaqs);

    // Now filter for active ones
    const rawFaqs = allRawFaqs.filter(faq => faq.isActive !== false); // Include docs where isActive is true or undefined
    console.log('📊 getAllFAQs: Found', rawFaqs.length, 'active FAQs in database');

    // Decompress FAQ data
    const faqs = await Promise.all(rawFaqs.map(async (faq, index) => {
      console.log(`🔍 Processing FAQ ${index + 1}:`, {
        _id: faq._id,
        hasCompressedData: !!faq._compressed,
        hasCompressedField: !!faq.compressedData
      });

      if (faq._compressed && faq.compressedData) {
        try {
          // Decompress the data
          console.log(`🔄 Decompressing FAQ ${index + 1}...`);
          const decompressedData = await decompressData(faq.compressedData) as any;
          console.log(`✅ FAQ ${index + 1} decompressed successfully:`, decompressedData);

          // Ensure we have the required fields
          const finalFAQ = {
            _id: faq._id,
            ...(typeof decompressedData === 'object' && decompressedData !== null ? decompressedData : {}),
            createdAt: faq.createdAt,
            updatedAt: faq.updatedAt,
            isActive: faq.isActive !== false, // Default to true if not set
            order: faq.order || 1 // Default order if not set
          };

          console.log(`📋 Final FAQ ${index + 1}:`, finalFAQ);
          return finalFAQ;
        } catch (decompressError) {
          console.error(`❌ FAQ ${index + 1} decompression failed:`, decompressError);
          console.error('Compressed data type:', typeof faq.compressedData);
          console.error('Compressed data:', faq.compressedData);

          // Try to return a fallback FAQ with basic info
          return {
            _id: faq._id,
            question: 'FAQ data could not be loaded',
            answer: 'There was an issue loading this FAQ. Please try again later.',
            category: 'General',
            createdAt: faq.createdAt,
            updatedAt: faq.updatedAt,
            isActive: faq.isActive !== false,
            order: faq.order || 1
          };
        }
      } else {
        // Legacy FAQ without compression
        console.log(`📄 FAQ ${index + 1} is legacy (no compression):`, faq);
        return {
          ...faq,
          isActive: faq.isActive !== false,
          order: faq.order || 1
        };
      }
    }));

    return {
      success: true,
      faqs: faqs,
      total: faqs.length
    };
  } catch (error) {
    console.error('❌ Error getting FAQs from MongoDB:', error);
    return {
      success: false,
      error: 'Failed to get FAQs from MongoDB'
    };
  }
};

const updateFAQ = async (faqId: string, faqData: any) => {
  try {
    // Ensure database connection
    if (!isConnected) {
      const connectionResult = await connectToDatabase();
      if (!connectionResult.success) {
        throw new Error('Failed to connect to database');
      }
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(FAQ_COLLECTION_NAME);

    // Prepare FAQ data for compression
    const faqToStore = {
      ...faqData,
      updatedAt: new Date()
    };

    // Compress the FAQ data before storing
    const compressedData = await compressData(faqToStore);

    const result = await collection.updateOne(
      { _id: new ObjectId(faqId) },
      {
        $set: {
          compressedData: compressedData,
          _compressed: true,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return {
        success: false,
        error: 'FAQ not found'
      };
    }

    return {
      success: true,
      message: 'FAQ updated successfully'
    };
  } catch (error) {
    console.error('❌ Error updating FAQ in MongoDB:', error);
    return {
      success: false,
      error: 'Failed to update FAQ in MongoDB'
    };
  }
};

const deleteFAQ = async (faqId: string) => {
  try {
    // Ensure database connection
    if (!isConnected) {
      const connectionResult = await connectToDatabase();
      if (!connectionResult.success) {
        throw new Error('Failed to connect to database');
      }
    }

    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection(FAQ_COLLECTION_NAME);
    const result = await collection.deleteOne({ _id: new ObjectId(faqId) });

    if (result.deletedCount === 0) {
      return {
        success: false,
        error: 'FAQ not found'
      };
    }

    return {
      success: true,
      message: 'FAQ deleted successfully'
    };
  } catch (error) {
    console.error('❌ Error deleting FAQ from MongoDB:', error);
    return {
      success: false,
      error: 'Failed to delete FAQ from MongoDB'
    };
  }
};

// Excel Records Management Functions
const getAllExcelRecords = async function () {
  try {
    if (!client) {
      await connectToDatabase();
    }
    const db = client?.db(DB_NAME);
    if (!db) {
      return { success: false, error: 'Database connection not established' };
    }

    const excelRecordsCollection = db.collection('excelRecords');
    const records = await excelRecordsCollection.find({}).sort({ updatedAt: -1 }).toArray();

    return {
      success: true,
      records: records || []
    };
  } catch (error) {
    console.error('❌ Error fetching Excel records from MongoDB:', error);
    return {
      success: false,
      error: 'Failed to fetch Excel records from MongoDB'
    };
  }
};

const saveExcelRecord = async function (recordData: any) {
  try {
    if (!client) {
      await connectToDatabase();
    }
    const db = client?.db(DB_NAME);
    if (!db) {
      return { success: false, error: 'Database connection not established' };
    }

    const excelRecordsCollection = db.collection('excelRecords');

    // Check if record exists for this type
    const existingRecord = await excelRecordsCollection.findOne({ type: recordData.type });

    if (existingRecord) {
      // Update existing record
      await excelRecordsCollection.updateOne(
        { type: recordData.type },
        {
          $set: {
            filename: recordData.filename,
            totalRecords: recordData.totalRecords,
            updatedAt: new Date()
          }
        }
      );

      return {
        success: true,
        recordId: existingRecord._id,
        message: 'Excel record updated successfully'
      };
    } else {
      // Create new record
      const result = await excelRecordsCollection.insertOne({
        type: recordData.type,
        filename: recordData.filename,
        totalRecords: recordData.totalRecords,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return {
        success: true,
        recordId: result.insertedId,
        message: 'Excel record created successfully'
      };
    }
  } catch (error) {
    console.error('❌ Error saving Excel record to MongoDB:', error);
    return {
      success: false,
      error: 'Failed to save Excel record to MongoDB'
    };
  }
};

const deleteExcelRecord = async function (recordId: string) {
  try {
    if (!client) {
      await connectToDatabase();
    }
    const db = client?.db(DB_NAME);
    if (!db) {
      return { success: false, error: 'Database connection not established' };
    }

    const excelRecordsCollection = db.collection('excelRecords');
    const result = await excelRecordsCollection.deleteOne({ _id: new ObjectId(recordId) });

    if (result.deletedCount === 0) {
      return {
        success: false,
        error: 'Excel record not found'
      };
    }

    return {
      success: true,
      message: 'Excel record deleted successfully'
    };
  } catch (error) {
    console.error('❌ Error deleting Excel record from MongoDB:', error);
    return {
      success: false,
      error: 'Failed to delete Excel record from MongoDB'
    };
  }
};

// Add Excel Records functions to database object
(database as any).getAllExcelRecords = getAllExcelRecords;
(database as any).saveExcelRecord = saveExcelRecord;
(database as any).deleteExcelRecord = deleteExcelRecord;

// ===== PRICING COLLECTION FUNCTIONS =====

// Get all pricing data from MongoDB database
const getAllPricing = async () => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(PRICING_COLLECTION_NAME);

    // Find all pricing data
    const pricingData = await collection.find({}).toArray();

    console.log(`📊 Retrieved ${pricingData.length} pricing records from database`);

    return {
      success: true,
      pricing: pricingData,
      total: pricingData.length,
      database: DB_NAME,
      collection: PRICING_COLLECTION_NAME
    };

  } catch (error) {
    console.error('❌ Error getting pricing data from MongoDB:', error);
    return {
      success: false,
      error: 'Failed to get pricing data from MongoDB'
    };
  }
};

// Save pricing data to MongoDB database
const savePricing = async (pricingData: any) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(PRICING_COLLECTION_NAME);

    // Add timestamp and ID
    const pricing = {
      ...pricingData,
      _id: new ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: pricingData.isActive !== undefined ? pricingData.isActive : true
    };

    // Insert pricing data into MongoDB
    const result = await collection.insertOne(pricing);

    console.log('💰 New pricing data saved to MongoDB:', {
      database: DB_NAME,
      collection: PRICING_COLLECTION_NAME,
      mongoId: result.insertedId,
      pricingName: pricing.name || 'Unnamed Pricing',
      isActive: pricing.isActive
    });

    return {
      success: true,
      message: 'Pricing data saved to MongoDB database',
      pricing: {
        id: result.insertedId,
        ...pricing
      }
    };

  } catch (error) {
    console.error('❌ Error saving pricing data to MongoDB:', error);
    return {
      success: false,
      error: 'Failed to save pricing data to MongoDB database'
    };
  }
};

// Update pricing data in MongoDB database
const updatePricing = async (pricingId: string, pricingData: any) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(PRICING_COLLECTION_NAME);

    // Update pricing data
    const updateData = {
      ...pricingData,
      updatedAt: new Date()
    };

    let result;
    if (ObjectId.isValid(pricingId) && pricingId.length === 24) {
      result = await collection.updateOne(
        { _id: new ObjectId(pricingId) },
        { $set: updateData }
      );
    } else {
      result = await collection.updateOne(
        { pricingId: pricingId },
        { $set: updateData }
      );
    }

    if (result.matchedCount === 0) {
      return {
        success: false,
        error: 'Pricing data not found'
      };
    }

    console.log('✅ Pricing data updated in MongoDB:', pricingId);

    return {
      success: true,
      message: 'Pricing data updated successfully'
    };

  } catch (error) {
    console.error('❌ Error updating pricing data in MongoDB:', error);
    return {
      success: false,
      error: 'Failed to update pricing data in MongoDB'
    };
  }
};

// Delete pricing data from MongoDB database
const deletePricing = async (pricingId: string) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(PRICING_COLLECTION_NAME);

    let result;
    if (ObjectId.isValid(pricingId) && pricingId.length === 24) {
      result = await collection.deleteOne({ _id: new ObjectId(pricingId) });
    } else {
      result = await collection.deleteOne({ pricingId: pricingId });
    }

    if (result.deletedCount === 0) {
      return {
        success: false,
        error: 'Pricing data not found'
      };
    }

    console.log('🗑️ Pricing data deleted from MongoDB:', pricingId);

    return {
      success: true,
      message: 'Pricing data deleted successfully'
    };

  } catch (error) {
    console.error('❌ Error deleting pricing data from MongoDB:', error);
    return {
      success: false,
      error: 'Failed to delete pricing data from MongoDB'
    };
  }
};

// ===== CANCEL REASONS COLLECTION FUNCTIONS =====

// Get all cancel reasons from MongoDB database
const getAllCancelReasons = async () => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(CANCEL_REASONS_COLLECTION_NAME);

    // Find all cancel reasons
    const cancelReasons = await collection.find({}).toArray();

    console.log(`📝 Retrieved ${cancelReasons.length} cancel reasons from database`);

    return {
      success: true,
      cancelReasons: cancelReasons,
      total: cancelReasons.length,
      database: DB_NAME,
      collection: CANCEL_REASONS_COLLECTION_NAME
    };

  } catch (error) {
    console.error('❌ Error getting cancel reasons from MongoDB:', error);
    return {
      success: false,
      error: 'Failed to get cancel reasons from MongoDB'
    };
  }
};

// Save cancel reason to MongoDB database
const saveCancelReason = async (cancelReasonData: any) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(CANCEL_REASONS_COLLECTION_NAME);

    // Add timestamp and ID
    const cancelReason = {
      ...cancelReasonData,
      _id: new ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: cancelReasonData.isActive !== undefined ? cancelReasonData.isActive : true
    };

    // Insert cancel reason into MongoDB
    const result = await collection.insertOne(cancelReason);

    console.log('📝 New cancel reason saved to MongoDB:', {
      database: DB_NAME,
      collection: CANCEL_REASONS_COLLECTION_NAME,
      mongoId: result.insertedId,
      reason: cancelReason.reason || 'Unnamed Reason',
      isActive: cancelReason.isActive
    });

    return {
      success: true,
      message: 'Cancel reason saved to MongoDB database',
      cancelReason: {
        id: result.insertedId,
        ...cancelReason
      }
    };

  } catch (error) {
    console.error('❌ Error saving cancel reason to MongoDB:', error);
    return {
      success: false,
      error: 'Failed to save cancel reason to MongoDB database'
    };
  }
};

// Update cancel reason in MongoDB database
const updateCancelReason = async (reasonId: string, cancelReasonData: any) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(CANCEL_REASONS_COLLECTION_NAME);

    // Update cancel reason data
    const updateData = {
      ...cancelReasonData,
      updatedAt: new Date()
    };

    let result;
    if (ObjectId.isValid(reasonId) && reasonId.length === 24) {
      result = await collection.updateOne(
        { _id: new ObjectId(reasonId) },
        { $set: updateData }
      );
    } else {
      result = await collection.updateOne(
        { reasonId: reasonId },
        { $set: updateData }
      );
    }

    if (result.matchedCount === 0) {
      return {
        success: false,
        error: 'Cancel reason not found'
      };
    }

    console.log('✅ Cancel reason updated in MongoDB:', reasonId);

    return {
      success: true,
      message: 'Cancel reason updated successfully'
    };

  } catch (error) {
    console.error('❌ Error updating cancel reason in MongoDB:', error);
    return {
      success: false,
      error: 'Failed to update cancel reason in MongoDB'
    };
  }
};

// Delete cancel reason from MongoDB database
const deleteCancelReason = async (reasonId: string) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(CANCEL_REASONS_COLLECTION_NAME);

    let result;
    if (ObjectId.isValid(reasonId) && reasonId.length === 24) {
      result = await collection.deleteOne({ _id: new ObjectId(reasonId) });
    } else {
      result = await collection.deleteOne({ reasonId: reasonId });
    }

    if (result.deletedCount === 0) {
      return {
        success: false,
        error: 'Cancel reason not found'
      };
    }

    console.log('🗑️ Cancel reason deleted from MongoDB:', reasonId);

    return {
      success: true,
      message: 'Cancel reason deleted successfully'
    };

  } catch (error) {
    console.error('❌ Error deleting cancel reason from MongoDB:', error);
    return {
      success: false,
      error: 'Failed to delete cancel reason from MongoDB'
    };
  }
};

// Get bookings by date and theater (optimized for booked-slots API)
const getBookingsByDateAndTheater = async (date: string, theaterName?: string) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(COLLECTION_NAME);

    // Build query filter
    const query: any = { date };
    if (theaterName) {
      query.theaterName = theaterName;
    }

    // Only fetch bookings for the specific date (and theater if provided)
    const bookings = await collection.find(query).toArray();

    // Decompress booking data
    const decompressedBookings = [];
    for (const booking of bookings) {
      if (booking.compressedData) {
        try {
          const decompressed: any = await decompressData(booking.compressedData);
          const mergedBooking = {
            ...decompressed,
            _id: booking._id,
            bookingId: booking.bookingId || decompressed.bookingId,
            status: booking.status || decompressed.status,
            date: booking.date || decompressed.date,
            time: booking.time || decompressed.time,
            theaterName: booking.theaterName || decompressed.theaterName || decompressed.theater
          };
          decompressedBookings.push(mergedBooking);
        } catch (error) {
          console.error('❌ Error decompressing booking:', booking.bookingId, error);
          decompressedBookings.push(booking);
        }
      } else {
        decompressedBookings.push(booking);
      }
    }

    return {
      success: true,
      bookings: decompressedBookings,
      total: decompressedBookings.length
    };

  } catch (error) {
    console.error('❌ Error getting bookings by date and theater:', error);
    return {
      success: false,
      error: 'Failed to get bookings',
      bookings: []
    };
  }
};

// Add Pricing and Cancel Reasons functions to database object
(database as any).getAllPricing = getAllPricing;
(database as any).savePricing = savePricing;
(database as any).updatePricing = updatePricing;
(database as any).deletePricing = deletePricing;

(database as any).getAllCancelReasons = getAllCancelReasons;
(database as any).saveCancelReason = saveCancelReason;
(database as any).updateCancelReason = updateCancelReason;
(database as any).deleteCancelReason = deleteCancelReason;

// Get incomplete bookings by date and theater (optimized)
const getIncompleteBookingsByDateAndTheater = async (date: string, theaterName?: string) => {
  try {
    if (!isConnected) {
      await connectToDatabase();
    }

    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(INCOMPLETE_COLLECTION_NAME);

    // Build query filter
    const query: any = { date };
    if (theaterName) {
      query.theaterName = theaterName;
    }

    // Only fetch incomplete bookings for the specific date (and theater if provided)
    const incompleteBookings = await collection.find(query).toArray();

    return {
      success: true,
      incompleteBookings,
      total: incompleteBookings.length
    };

  } catch (error) {
    console.error('❌ Error getting incomplete bookings by date and theater:', error);
    return {
      success: false,
      error: 'Failed to get incomplete bookings',
      incompleteBookings: []
    };
  }
};

(database as any).getBookingsByDateAndTheater = getBookingsByDateAndTheater;
(database as any).getIncompleteBookingsByDateAndTheater = getIncompleteBookingsByDateAndTheater;

// Functions are now part of database object definition above

// Auto-connect when module loads
connectToDatabase();

export { connectToDatabase, getBookingsByOccasion };
export default database;
