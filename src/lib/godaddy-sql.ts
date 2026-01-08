import mysql from 'mysql2/promise';

// GoDaddy SQL Database Configuration
const GODADDY_DB_CONFIG = {
  host: process.env.GODADDY_DB_HOST || 'localhost',
  user: process.env.GODADDY_DB_USER || 'root',
  password: process.env.GODADDY_DB_PASSWORD || '',
  database: process.env.GODADDY_DB_NAME || 'feelme_town',
  port: parseInt(process.env.GODADDY_DB_PORT || '3306'),
  // Remove SSL for GoDaddy shared hosting - it doesn't support secure connections
  // ssl: false
};

let feedbackSchemaEnsured = false;

// Create connection pool for better performance
let connectionPool: mysql.Pool | null = null;

let completedBookingsSchemaEnsured = false;

let cancelledBookingsSchemaEnsured = false;

const getConnectionPool = () => {
  if (!connectionPool) {
    connectionPool = mysql.createPool({
      ...GODADDY_DB_CONFIG,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });
  }
  return connectionPool;
};

// Export for use in API routes
export { getConnectionPool };

const normalizeMongoId = (value: any): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'object') {
    if (typeof value.$oid === 'string') return value.$oid;
    if (typeof value.toHexString === 'function') return value.toHexString();
    if (typeof value.toString === 'function') {
      const asString = value.toString();
      const match = asString.match(/[a-f0-9]{24}/i);
      if (match) return match[0];
      return asString;
    }
  }
  return null;
};

const ensureFeedbackSchema = async (connection: mysql.PoolConnection) => {
  if (feedbackSchemaEnsured) return;

  await connection.execute(`
        CREATE TABLE IF NOT EXISTS feedback (
          id INT AUTO_INCREMENT PRIMARY KEY,
          mongo_id VARCHAR(50) UNIQUE,
          feedback_id BIGINT,
          name VARCHAR(255),
          email VARCHAR(255),
          phone VARCHAR(30),
          avatar TEXT,
          avatar_type VARCHAR(50),
          social_handle VARCHAR(255),
          social_platform VARCHAR(255),
          message TEXT,
          rating INT,
          submitted_at DATETIME,
          status VARCHAR(50),
          is_testimonial TINYINT(1),
          created_at_source DATETIME,
          updated_at_source DATETIME,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_feedback_id (feedback_id),
          INDEX idx_email (email),
          INDEX idx_submitted_at (submitted_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

  const addColumn = async (sql: string) => {
    try {
      await connection.execute(sql);
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {
        console.warn('⚠️ Failed to ensure feedback column exists:', e?.message || e);
      }
    }
  };

  await addColumn('ALTER TABLE feedback ADD COLUMN mongo_id VARCHAR(50) UNIQUE');
  await addColumn('ALTER TABLE feedback ADD COLUMN feedback_id BIGINT NULL');
  await addColumn('ALTER TABLE feedback ADD COLUMN name VARCHAR(255) NULL');
  await addColumn('ALTER TABLE feedback ADD COLUMN email VARCHAR(255) NULL');
  await addColumn('ALTER TABLE feedback ADD COLUMN phone VARCHAR(30) NULL');
  await addColumn('ALTER TABLE feedback ADD COLUMN avatar TEXT NULL');
  await addColumn('ALTER TABLE feedback ADD COLUMN avatar_type VARCHAR(50) NULL');
  await addColumn('ALTER TABLE feedback ADD COLUMN social_handle VARCHAR(255) NULL');
  await addColumn('ALTER TABLE feedback ADD COLUMN social_platform VARCHAR(255) NULL');
  await addColumn('ALTER TABLE feedback ADD COLUMN message TEXT NULL');
  await addColumn('ALTER TABLE feedback ADD COLUMN rating INT NULL');
  await addColumn('ALTER TABLE feedback ADD COLUMN submitted_at DATETIME NULL');
  await addColumn('ALTER TABLE feedback ADD COLUMN status VARCHAR(50) NULL');
  await addColumn('ALTER TABLE feedback ADD COLUMN is_testimonial TINYINT(1) NULL');
  await addColumn('ALTER TABLE feedback ADD COLUMN created_at_source DATETIME NULL');
  await addColumn('ALTER TABLE feedback ADD COLUMN updated_at_source DATETIME NULL');

  feedbackSchemaEnsured = true;
};

const ensureCancelledBookingsSchema = async (connection: mysql.PoolConnection) => {
  if (cancelledBookingsSchemaEnsured) return;

  const addColumn = async (sql: string) => {
    try {
      await connection.execute(sql);
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {
        console.warn('⚠️ Failed to ensure cancelled_bookings column exists:', e?.message || e);
      }
    }
  };

  await addColumn(`ALTER TABLE cancelled_bookings ADD COLUMN occasion_person_name VARCHAR(255) NULL`);
  await addColumn(`ALTER TABLE cancelled_bookings ADD COLUMN booking_type VARCHAR(50) NULL`);
  await addColumn(`ALTER TABLE cancelled_bookings ADD COLUMN pricing_data LONGTEXT NULL`);
  await addColumn(`ALTER TABLE cancelled_bookings ADD COLUMN occasion_data LONGTEXT NULL`);
  await addColumn(`ALTER TABLE cancelled_bookings ADD COLUMN selected_movies LONGTEXT NULL`);
  await addColumn(`ALTER TABLE cancelled_bookings ADD COLUMN selected_cakes LONGTEXT NULL`);
  await addColumn(`ALTER TABLE cancelled_bookings ADD COLUMN selected_decor_items LONGTEXT NULL`);
  await addColumn(`ALTER TABLE cancelled_bookings ADD COLUMN selected_gifts LONGTEXT NULL`);
  await addColumn(`ALTER TABLE cancelled_bookings ADD COLUMN selected_extra_add_ons LONGTEXT NULL`);
  await addColumn(`ALTER TABLE cancelled_bookings ADD COLUMN selected_food LONGTEXT NULL`);
  await addColumn(`ALTER TABLE cancelled_bookings ADD COLUMN selected_other_items LONGTEXT NULL`);
  await addColumn(`ALTER TABLE cancelled_bookings ADD COLUMN notes TEXT NULL`);
  await addColumn(`ALTER TABLE cancelled_bookings ADD COLUMN created_by_type VARCHAR(50) NULL`);
  await addColumn(`ALTER TABLE cancelled_bookings ADD COLUMN created_by_name VARCHAR(255) NULL`);
  await addColumn(`ALTER TABLE cancelled_bookings ADD COLUMN staff_id VARCHAR(255) NULL`);
  await addColumn(`ALTER TABLE cancelled_bookings ADD COLUMN staff_name VARCHAR(255) NULL`);
  await addColumn(`ALTER TABLE cancelled_bookings ADD COLUMN created_at_source DATETIME NULL`);
  await addColumn(`ALTER TABLE cancelled_bookings ADD COLUMN total_before_discount DECIMAL(10,2) NULL`);
  await addColumn(`ALTER TABLE cancelled_bookings ADD COLUMN total_after_discount DECIMAL(10,2) NULL`);
  await addColumn(`ALTER TABLE cancelled_bookings ADD COLUMN admin_discount DECIMAL(10,2) NULL`);
  await addColumn(`ALTER TABLE cancelled_bookings ADD COLUMN special_discount DECIMAL(10,2) NULL`);
  await addColumn(`ALTER TABLE cancelled_bookings ADD COLUMN generic_discount DECIMAL(10,2) NULL`);
  await addColumn(`ALTER TABLE cancelled_bookings ADD COLUMN coupon_discount DECIMAL(10,2) NULL`);
  await addColumn(`ALTER TABLE cancelled_bookings ADD COLUMN coupon_code VARCHAR(100) NULL`);
  await addColumn(`ALTER TABLE cancelled_bookings ADD COLUMN discount_by_coupon DECIMAL(10,2) NULL`);
  await addColumn(`ALTER TABLE cancelled_bookings ADD COLUMN applied_decoration_fee DECIMAL(10,2) NULL`);
  await addColumn(`ALTER TABLE cancelled_bookings ADD COLUMN decoration_fee DECIMAL(10,2) NULL`);

  cancelledBookingsSchemaEnsured = true;
};

export const getFeedbackListFromSQL = async (options?: { limit?: number; testimonialsOnly?: boolean }) => {
  try {
    const pool = getConnectionPool();
    const connection = await pool.getConnection();

    await ensureFeedbackSchema(connection);

    const limit = typeof options?.limit === 'number' && options.limit > 0 ? options.limit : 20;
    const testimonialsOnly = options?.testimonialsOnly === true;

    const where = testimonialsOnly ? 'WHERE is_testimonial = 1' : '';
    const [rows] = await connection.execute(
      `
        SELECT
          mongo_id,
          feedback_id,
          name,
          email,
          phone,
          avatar,
          avatar_type,
          social_handle,
          social_platform,
          message,
          rating,
          submitted_at,
          status,
          is_testimonial,
          created_at_source,
          updated_at_source
        FROM feedback
        ${where}
        ORDER BY submitted_at DESC, id DESC
        LIMIT ?
      `,
      [limit]
    );

    connection.release();

    return {
      success: true,
      feedback: (Array.isArray(rows) ? rows : []).map((row: any) => ({
        _id: row.mongo_id ?? null,
        mongoId: row.mongo_id ?? null,
        feedbackId: row.feedback_id ?? null,
        name: row.name ?? null,
        email: row.email ?? null,
        phone: row.phone ?? null,
        avatar: row.avatar ?? null,
        avatarType: row.avatar_type ?? null,
        socialHandle: row.social_handle ?? null,
        socialPlatform: row.social_platform ?? null,
        message: row.message ?? null,
        rating: typeof row.rating === 'number' ? row.rating : (row.rating ? Number(row.rating) : null),
        submittedAt: row.submitted_at ?? null,
        status: row.status ?? null,
        isTestimonial: row.is_testimonial === 1 || row.is_testimonial === true,
        createdAt: row.created_at_source ?? null,
        updatedAt: row.updated_at_source ?? null
      })),
      total: Array.isArray(rows) ? rows.length : 0
    };
  } catch (error) {
    console.error('❌ Failed to fetch feedback list from GoDaddy SQL:', error);
    return {
      success: false,
      feedback: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const getCompletedBookingHistoryFromSQL = async (params: {
  start: string;
  end: string;
}) => {
  try {
    const pool = getConnectionPool();
    const connection = await pool.getConnection();
    try {
      const startDt = `${params.start} 00:00:00`;
      const endDt = `${params.end} 23:59:59`;

      const [rows] = await connection.execute(
        `
        SELECT
          booking_id AS bookingId,
          name,
          email,
          phone,
          theater_name AS theaterName,
          booking_date AS date,
          booking_time AS time,
          'completed' AS status,
          total_amount AS totalAmount,
          completed_at AS createdAt
        FROM completed_bookings
        WHERE completed_at BETWEEN ? AND ?
        ORDER BY completed_at DESC
        `,
        [startDt, endDt]
      );

      return { success: true, bookings: rows as any[] };
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Failed to fetch completed booking history from GoDaddy SQL:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const getCancelledBookingHistoryFromSQL = async (params: {
  start: string;
  end: string;
}) => {
  try {
    const pool = getConnectionPool();
    const connection = await pool.getConnection();
    try {
      const startDt = `${params.start} 00:00:00`;
      const endDt = `${params.end} 23:59:59`;

      const decodeOriginalBookingData = (raw: unknown) => {
        try {
          if (!raw) return null;
          if (typeof raw !== 'string') return raw;
          let trimmed = raw.trim();
          if (!trimmed) return null;

          if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
            try {
              const unwrapped = JSON.parse(trimmed);
              if (typeof unwrapped === 'string') trimmed = unwrapped.trim();
            } catch {}
          }
          try {
            const jsonString = Buffer.from(trimmed, 'base64').toString('utf-8');
            return JSON.parse(jsonString);
          } catch {
            return JSON.parse(trimmed);
          }
        } catch {
          return null;
        }
      };

      const [rows] = await connection.execute(
        `
        SELECT
          booking_id AS bookingId,
          name,
          email,
          phone,
          theater_name AS theaterName,
          booking_date AS date,
          booking_time AS time,
          'cancelled' AS status,
          total_amount AS totalAmount,
          cancelled_at AS createdAt,
          original_booking_data AS originalBookingData,
          cancellation_reason AS cancellationReason,
          refund_amount AS refundAmount,
          refund_status AS refundStatus
        FROM cancelled_bookings
        WHERE cancelled_at BETWEEN ? AND ?
        ORDER BY cancelled_at DESC
        `,
        [startDt, endDt]
      );

      const bookings = (rows as any[]).map((row) => {
        const decoded = decodeOriginalBookingData(row?.originalBookingData);
        const source = decoded && typeof decoded === 'object' ? decoded : {};

        const nestedOriginal =
          source &&
          typeof source === 'object' &&
          (source as any)._originalBooking &&
          typeof (source as any)._originalBooking === 'object'
            ? (source as any)._originalBooking
            : null;

        const flattenedSource = nestedOriginal
          ? { ...(nestedOriginal as any), ...(source as any), _originalBooking: undefined }
          : source;

        const bookingId =
          (flattenedSource as any)?.bookingId ||
          (flattenedSource as any)?.id ||
          row?.bookingId;

        return {
          ...flattenedSource,
          bookingId,
          id: (flattenedSource as any)?.id || bookingId,
          name: (flattenedSource as any)?.name || row?.name,
          email: (flattenedSource as any)?.email || row?.email,
          phone: (flattenedSource as any)?.phone || row?.phone,
          theaterName: (flattenedSource as any)?.theaterName || row?.theaterName,
          date: (flattenedSource as any)?.date || row?.date,
          time: (flattenedSource as any)?.time || row?.time,
          status: 'cancelled',
          totalAmount: (flattenedSource as any)?.totalAmount ?? row?.totalAmount,
          createdAt: (flattenedSource as any)?.cancelledAt || row?.createdAt,
          cancelledAt: (flattenedSource as any)?.cancelledAt || row?.createdAt,
          cancellationReason:
            (flattenedSource as any)?.cancellationReason ||
            (flattenedSource as any)?.cancelReason ||
            row?.cancellationReason,
          refundAmount: (flattenedSource as any)?.refundAmount ?? row?.refundAmount,
          refundStatus: (flattenedSource as any)?.refundStatus ?? row?.refundStatus,
        };
      });

      return { success: true, bookings };
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Failed to fetch cancelled booking history from GoDaddy SQL:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const deleteFeedbackFromSQL = async (identifier: { mongoId?: any; feedbackId?: any }) => {
  try {
    const pool = getConnectionPool();
    const connection = await pool.getConnection();

    await ensureFeedbackSchema(connection);

    const mongoId = normalizeMongoId(identifier?.mongoId);
    const feedbackIdRaw = identifier?.feedbackId;
    const feedbackId = typeof feedbackIdRaw === 'number'
      ? feedbackIdRaw
      : (typeof feedbackIdRaw === 'string' && feedbackIdRaw.trim().length ? Number(feedbackIdRaw) : null);

    if (!mongoId && (feedbackId === null || Number.isNaN(feedbackId))) {
      connection.release();
      return { success: false, error: 'Missing identifier for SQL delete' };
    }

    if (mongoId) {
      await connection.execute('DELETE FROM feedback WHERE mongo_id = ?', [mongoId]);
    }

    if (feedbackId !== null && !Number.isNaN(feedbackId)) {
      await connection.execute('DELETE FROM feedback WHERE feedback_id = ?', [feedbackId]);
    }

    connection.release();
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to delete feedback from GoDaddy SQL:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const updateFeedbackInSQL = async (params: {
  mongoId?: any;
  feedbackId?: any;
  updates: {
    name?: string;
    email?: string | null;
    phone?: string | null;
    avatar?: string | null;
    avatarType?: string | null;
    socialHandle?: string | null;
    socialPlatform?: string | null;
    message?: string;
    rating?: number;
    status?: string | null;
    isTestimonial?: boolean;
    submittedAt?: any;
    createdAt?: any;
    updatedAt?: any;
  };
}) => {
  try {
    const pool = getConnectionPool();
    const connection = await pool.getConnection();

    await ensureFeedbackSchema(connection);

    const mongoId = normalizeMongoId(params?.mongoId);
    const feedbackIdRaw = params?.feedbackId;
    const feedbackId = typeof feedbackIdRaw === 'number'
      ? feedbackIdRaw
      : (typeof feedbackIdRaw === 'string' && feedbackIdRaw.trim().length ? Number(feedbackIdRaw) : null);

    if (!mongoId && (feedbackId === null || Number.isNaN(feedbackId))) {
      connection.release();
      return { success: false, error: 'Missing identifier for SQL update' };
    }

    const updates = params?.updates || {};
    const setClauses: string[] = [];
    const values: any[] = [];

    const setIfDefined = (column: string, value: any) => {
      if (typeof value === 'undefined') return;
      setClauses.push(`${column} = ?`);
      values.push(value);
    };

    setIfDefined('name', typeof updates.name === 'string' ? updates.name : updates.name);
    setIfDefined('email', updates.email);
    setIfDefined('phone', updates.phone);
    setIfDefined('avatar', updates.avatar);
    setIfDefined('avatar_type', updates.avatarType);
    setIfDefined('social_handle', updates.socialHandle);
    setIfDefined('social_platform', updates.socialPlatform);
    setIfDefined('message', typeof updates.message === 'string' ? updates.message : updates.message);
    setIfDefined('rating', typeof updates.rating === 'number' ? updates.rating : updates.rating);
    setIfDefined('status', updates.status);
    if (typeof updates.isTestimonial !== 'undefined') {
      setIfDefined('is_testimonial', updates.isTestimonial === true ? 1 : 0);
    }

    if (typeof updates.submittedAt !== 'undefined') {
      setIfDefined('submitted_at', updates.submittedAt ? new Date(updates.submittedAt) : null);
    }
    if (typeof updates.createdAt !== 'undefined') {
      setIfDefined('created_at_source', updates.createdAt ? new Date(updates.createdAt) : null);
    }

    setIfDefined('updated_at_source', updates.updatedAt ? new Date(updates.updatedAt) : new Date());
    setClauses.push('updated_at = CURRENT_TIMESTAMP');

    if (!setClauses.length) {
      connection.release();
      return { success: true, affectedRows: 0 };
    }

    const whereClauses: string[] = [];
    const whereValues: any[] = [];
    if (mongoId) {
      whereClauses.push('mongo_id = ?');
      whereValues.push(mongoId);
    }
    if (feedbackId !== null && !Number.isNaN(feedbackId)) {
      whereClauses.push('feedback_id = ?');
      whereValues.push(feedbackId);
    }

    const sql = `UPDATE feedback SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' OR ')}`;
    const [result]: any = await connection.execute(sql, [...values, ...whereValues]);
    connection.release();
    return { success: true, result };
  } catch (error) {
    console.error('❌ Failed to update feedback in GoDaddy SQL:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const upsertFeedbackToSQL = async (feedbackData: any) => {
  try {
    const pool = getConnectionPool();
    const connection = await pool.getConnection();

    await ensureFeedbackSchema(connection);

    const mongoId = normalizeMongoId(
      feedbackData?.mongoId ?? feedbackData?.mongo_id ?? feedbackData?._id,
    );
    const feedbackId = feedbackData?.feedbackId ?? feedbackData?.feedback_id ?? null;

    const submittedAtRaw = feedbackData?.submittedAt ?? feedbackData?.submitted_at ?? null;
    const createdAtRaw = feedbackData?.createdAt ?? feedbackData?.created_at ?? null;
    const updatedAtRaw = feedbackData?.updatedAt ?? feedbackData?.updated_at ?? null;
    const submittedAt = submittedAtRaw ? new Date(submittedAtRaw) : null;
    const createdAtSource = createdAtRaw ? new Date(createdAtRaw) : (submittedAt ? new Date(submittedAt) : new Date());
    const updatedAtSource = updatedAtRaw ? new Date(updatedAtRaw) : new Date();

    const insertQuery = `
      INSERT INTO feedback (
        mongo_id, feedback_id, name, email, phone,
        avatar, avatar_type, social_handle, social_platform,
        message, rating, submitted_at, status, is_testimonial,
        created_at_source, updated_at_source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        feedback_id = VALUES(feedback_id),
        name = VALUES(name),
        email = VALUES(email),
        phone = VALUES(phone),
        avatar = VALUES(avatar),
        avatar_type = VALUES(avatar_type),
        social_handle = VALUES(social_handle),
        social_platform = VALUES(social_platform),
        message = VALUES(message),
        rating = VALUES(rating),
        submitted_at = VALUES(submitted_at),
        status = VALUES(status),
        is_testimonial = VALUES(is_testimonial),
        created_at_source = VALUES(created_at_source),
        updated_at_source = VALUES(updated_at_source),
        updated_at = CURRENT_TIMESTAMP
    `;

    const values = [
      mongoId,
      feedbackId,
      feedbackData?.name ?? null,
      feedbackData?.email ?? null,
      feedbackData?.phone ?? null,
      feedbackData?.avatar ?? null,
      feedbackData?.avatarType ?? feedbackData?.avatar_type ?? null,
      feedbackData?.socialHandle ?? feedbackData?.social_handle ?? null,
      feedbackData?.socialPlatform ?? feedbackData?.social_platform ?? null,
      feedbackData?.message ?? null,
      typeof feedbackData?.rating === 'number' ? feedbackData.rating : (feedbackData?.rating ? Number(feedbackData.rating) : null),
      submittedAt,
      feedbackData?.status ?? null,
      feedbackData?.isTestimonial === true ? 1 : 0,
      createdAtSource,
      updatedAtSource,
    ];

    const [result] = await connection.execute(insertQuery, values);
    connection.release();
    return { success: true, result };
  } catch (error) {
    console.error('❌ Failed to upsert feedback to GoDaddy SQL:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const syncFeedbackToSQL = async (feedbackData: any) => {
  try {
    return await upsertFeedbackToSQL(feedbackData);
  } catch (error) {
    console.error('❌ Failed to sync feedback to GoDaddy SQL:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Test database connection
export const testGoDaddyConnection = async () => {
  let connection: mysql.PoolConnection | null = null;
  try {
    const pool = getConnectionPool();
    connection = await pool.getConnection();
    
    // Test query
    await connection.execute('SELECT 1 as test');
    
    console.log('✅ GoDaddy SQL Database connected successfully');
    return { success: true, message: 'Database connection successful' };
  } catch (error) {
    console.error('❌ GoDaddy SQL Database connection failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  } finally {
    try {
      connection?.release();
    } catch {}
  }
};

// Create tables if they don't exist
export const createGoDaddyTables = async () => {
  try {
    const pool = getConnectionPool();
    const connection = await pool.getConnection();
    
    // Create cancelled_bookings table
    const cancelledBookingsTable = `
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
    `;

    const feedbackTable = `
      CREATE TABLE IF NOT EXISTS feedback (
        id INT AUTO_INCREMENT PRIMARY KEY,
        mongo_id VARCHAR(50) UNIQUE,
        feedback_id BIGINT,
        name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(30),
        avatar TEXT,
        avatar_type VARCHAR(50),
        social_handle VARCHAR(255),
        social_platform VARCHAR(255),
        message TEXT,
        rating INT,
        submitted_at DATETIME,
        status VARCHAR(50),
        is_testimonial TINYINT(1),
        created_at_source DATETIME,
        updated_at_source DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_feedback_id (feedback_id),
        INDEX idx_email (email),
        INDEX idx_submitted_at (submitted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    // Create completed_bookings table
    const completedBookingsTable = `
      CREATE TABLE IF NOT EXISTS completed_bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_id VARCHAR(255) UNIQUE NOT NULL,
        mongo_id VARCHAR(50),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        theater_name VARCHAR(255),
        booking_date DATE,
        booking_time VARCHAR(50),
        occasion VARCHAR(255),
        occasion_person_name VARCHAR(255),
        number_of_people INT,
        ticket_number VARCHAR(50),
        booking_type VARCHAR(50),
        payment_mode VARCHAR(50),
        payment_method VARCHAR(50),
        user_id VARCHAR(255),
        admin_name VARCHAR(255),
        is_manual_booking TINYINT(1),
        base_capacity INT,
        theater_capacity_min INT,
        theater_capacity_max INT,
        advance_payment DECIMAL(10,2),
        venue_payment DECIMAL(10,2),
        total_amount DECIMAL(10,2),
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        booking_status VARCHAR(50) DEFAULT 'completed',
        payment_status VARCHAR(50),
        venue_payment_method VARCHAR(50),
        paid_by VARCHAR(50),
        paid_at DATETIME,
        payment_received VARCHAR(255),
        advance_payment_method VARCHAR(50),
        theater_base_price DECIMAL(10,2),
        extra_guest_fee DECIMAL(10,2),
        extra_guests_count INT,
        extra_guest_charges DECIMAL(10,2),
        decoration_fee DECIMAL(10,2),
        slot_booking_fee DECIMAL(10,2),
        payable_amount DECIMAL(10,2),
        admin_discount DECIMAL(10,2),
        special_discount DECIMAL(10,2),
        generic_discount DECIMAL(10,2),
        penalty_charges DECIMAL(10,2),
        penalty_reason TEXT,
        penalty_charge DECIMAL(10,2),
        coupon_discount DECIMAL(10,2),
        coupon_code VARCHAR(100),
        coupon_type VARCHAR(50),
        coupon_value DECIMAL(10,2),
        discount_by_coupon DECIMAL(10,2),
        applied_decoration_fee DECIMAL(10,2),
        total_before_discount DECIMAL(10,2),
        total_after_discount DECIMAL(10,2),
        occasion_field1_label VARCHAR(255),
        occasion_field1_value VARCHAR(255),
        occasion_field2_label VARCHAR(255),
        occasion_field2_value VARCHAR(255),
        pricing_data LONGTEXT,
        occasion_data LONGTEXT,
        selected_movies LONGTEXT,
        selected_cakes LONGTEXT,
        selected_decor_items LONGTEXT,
        selected_gifts LONGTEXT,
        selected_extra_add_ons LONGTEXT,
        selected_food LONGTEXT,
        selected_other_items LONGTEXT,
        notes TEXT,
        created_by_type VARCHAR(50),
        created_by_name VARCHAR(255),
        staff_id VARCHAR(255),
        staff_name VARCHAR(255),
        created_at_source DATETIME,
        original_booking_data JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_booking_id (booking_id),
        INDEX idx_email (email),
        INDEX idx_booking_date (booking_date),
        INDEX idx_completed_at (completed_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    await connection.execute(cancelledBookingsTable);
    await connection.execute(completedBookingsTable);
    await connection.execute(feedbackTable);

    cancelledBookingsSchemaEnsured = false;
    completedBookingsSchemaEnsured = false;
    feedbackSchemaEnsured = false;
    
    connection.release();
    
    console.log('✅ GoDaddy SQL tables created successfully');
    return { success: true, message: 'Tables created successfully' };
  } catch (error) {
    console.error('❌ Failed to create GoDaddy SQL tables:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// Helper function to compress JSON data
const compressJSON = (data: any): string => {
  try {
    // Remove unnecessary whitespace and compress JSON
    const jsonString = JSON.stringify(data);
    // Convert to base64 to reduce size further
    const compressed = Buffer.from(jsonString).toString('base64');
    return compressed;
  } catch (error) {
    console.error('Failed to compress JSON:', error);
    return JSON.stringify(data);
  }
};

// Helper function to decompress JSON data
const decompressJSON = (compressedData: string): any => {
  try {
    // Decode from base64
    const jsonString = Buffer.from(compressedData, 'base64').toString('utf-8');
    // Parse JSON
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Failed to decompress JSON:', error);
    // Try to parse as regular JSON (fallback for non-compressed data)
    try {
      return JSON.parse(compressedData);
    } catch {
      return null;
    }
  }
};

// Insert cancelled booking into GoDaddy SQL
export const insertCancelledBooking = async (bookingData: any) => {
  let connection: mysql.PoolConnection | null = null;
  try {
    console.log(`🔄 [SQL INSERT] Getting connection pool...`);
    const pool = getConnectionPool();
    connection = await pool.getConnection();
    console.log(`✅ [SQL INSERT] Connection acquired`);

    await ensureCancelledBookingsSchema(connection);
    
    const toJsonStringOrNull = (value: any): string | null => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? trimmed : null;
      }
      try {
        return JSON.stringify(value);
      } catch {
        return null;
      }
    };

    const sourceBooking =
      bookingData &&
      typeof bookingData === 'object' &&
      (bookingData as any)._originalBooking &&
      typeof (bookingData as any)._originalBooking === 'object'
        ? (bookingData as any)._originalBooking
        : bookingData;

    const snapshotForStorage = (() => {
      if (!bookingData || typeof bookingData !== 'object') return bookingData;
      const cleaned = { ...(bookingData as any) };
      if (cleaned && typeof cleaned === 'object') {
        delete (cleaned as any)._originalBooking;
      }
      if (sourceBooking && typeof sourceBooking === 'object') {
        return { ...(sourceBooking as any), ...cleaned };
      }
      return cleaned;
    })();

    const resolveCreatedBy = () => {
      const raw = (sourceBooking as any)?.createdBy;
      if (!raw || typeof raw !== 'object') return { createdByType: null as string | null, createdByName: null as string | null };
      const type = typeof raw.type === 'string' ? raw.type : null;
      const name =
        (typeof raw.staffName === 'string' && raw.staffName) ||
        (typeof raw.adminName === 'string' && raw.adminName) ||
        (typeof raw.name === 'string' && raw.name) ||
        null;
      return { createdByType: type, createdByName: name };
    };

    const { createdByType, createdByName } = resolveCreatedBy();

    const resolvedBookingId =
      bookingData?.bookingId ||
      bookingData?.id ||
      bookingData?._id ||
      (sourceBooking as any)?.bookingId ||
      (sourceBooking as any)?.id ||
      (sourceBooking as any)?._id;
    const resolvedDate =
      bookingData?.date ||
      bookingData?.bookingDate ||
      bookingData?.booking_date ||
      (sourceBooking as any)?.date ||
      (sourceBooking as any)?.bookingDate ||
      (sourceBooking as any)?.booking_date;
    const resolvedTime =
      bookingData?.time ||
      bookingData?.bookingTime ||
      bookingData?.booking_time ||
      (sourceBooking as any)?.time ||
      (sourceBooking as any)?.bookingTime ||
      (sourceBooking as any)?.booking_time;

    const insertQueryWithDetails = `
      INSERT INTO cancelled_bookings (
        booking_id, name, email, phone, theater_name, booking_date, booking_time,
        occasion, occasion_person_name, number_of_people, booking_type, total_amount,
        cancelled_at, cancellation_reason, refund_amount, refund_status,
        total_before_discount, total_after_discount, admin_discount, special_discount, generic_discount,
        coupon_discount, coupon_code, discount_by_coupon, applied_decoration_fee, decoration_fee,
        pricing_data, occasion_data,
        selected_movies, selected_cakes, selected_decor_items, selected_gifts,
        selected_extra_add_ons, selected_food, selected_other_items,
        notes, created_by_type, created_by_name, staff_id, staff_name, created_at_source,
        original_booking_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        email = VALUES(email),
        phone = VALUES(phone),
        theater_name = VALUES(theater_name),
        booking_date = VALUES(booking_date),
        booking_time = VALUES(booking_time),
        occasion = VALUES(occasion),
        occasion_person_name = VALUES(occasion_person_name),
        number_of_people = VALUES(number_of_people),
        booking_type = VALUES(booking_type),
        total_amount = VALUES(total_amount),
        cancelled_at = VALUES(cancelled_at),
        cancellation_reason = VALUES(cancellation_reason),
        refund_amount = VALUES(refund_amount),
        refund_status = VALUES(refund_status),
        total_before_discount = VALUES(total_before_discount),
        total_after_discount = VALUES(total_after_discount),
        admin_discount = VALUES(admin_discount),
        special_discount = VALUES(special_discount),
        generic_discount = VALUES(generic_discount),
        coupon_discount = VALUES(coupon_discount),
        coupon_code = VALUES(coupon_code),
        discount_by_coupon = VALUES(discount_by_coupon),
        applied_decoration_fee = VALUES(applied_decoration_fee),
        decoration_fee = VALUES(decoration_fee),
        pricing_data = VALUES(pricing_data),
        occasion_data = VALUES(occasion_data),
        selected_movies = VALUES(selected_movies),
        selected_cakes = VALUES(selected_cakes),
        selected_decor_items = VALUES(selected_decor_items),
        selected_gifts = VALUES(selected_gifts),
        selected_extra_add_ons = VALUES(selected_extra_add_ons),
        selected_food = VALUES(selected_food),
        selected_other_items = VALUES(selected_other_items),
        notes = VALUES(notes),
        created_by_type = VALUES(created_by_type),
        created_by_name = VALUES(created_by_name),
        staff_id = VALUES(staff_id),
        staff_name = VALUES(staff_name),
        created_at_source = VALUES(created_at_source),
        original_booking_data = VALUES(original_booking_data),
        updated_at = CURRENT_TIMESTAMP
    `;

    const insertQueryLegacy = `
      INSERT INTO cancelled_bookings (
        booking_id, name, email, phone, theater_name, booking_date, booking_time,
        occasion, number_of_people, total_amount, cancelled_at, cancellation_reason,
        refund_amount, refund_status, original_booking_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        email = VALUES(email),
        phone = VALUES(phone),
        theater_name = VALUES(theater_name),
        booking_date = VALUES(booking_date),
        booking_time = VALUES(booking_time),
        occasion = VALUES(occasion),
        number_of_people = VALUES(number_of_people),
        total_amount = VALUES(total_amount),
        cancelled_at = VALUES(cancelled_at),
        cancellation_reason = VALUES(cancellation_reason),
        refund_amount = VALUES(refund_amount),
        refund_status = VALUES(refund_status),
        original_booking_data = VALUES(original_booking_data),
        updated_at = CURRENT_TIMESTAMP
    `;
    
    // Compress the original booking data to save storage
    console.log(`🔄 [SQL INSERT] Compressing booking data...`);
    const compressedData = compressJSON(snapshotForStorage);
    
    const valuesWithDetails = [
      resolvedBookingId,
      (sourceBooking as any)?.name ?? bookingData.name,
      (sourceBooking as any)?.email ?? bookingData.email,
      (sourceBooking as any)?.phone ?? bookingData.phone,
      (sourceBooking as any)?.theaterName ?? bookingData.theaterName,
      resolvedDate ? new Date(resolvedDate) : null,
      resolvedTime,
      (sourceBooking as any)?.occasion ?? bookingData.occasion,
      (sourceBooking as any)?.occasionPersonName || bookingData.occasionPersonName || null,
      (sourceBooking as any)?.numberOfPeople ?? bookingData.numberOfPeople,
      (sourceBooking as any)?.bookingType || bookingData.bookingType || null,
      (sourceBooking as any)?.totalAmount ?? bookingData.totalAmount,
      bookingData.cancelledAt ? new Date(bookingData.cancelledAt) : new Date(),
      bookingData.cancellationReason || bookingData.cancelReason,
      bookingData.refundAmount,
      bookingData.refundStatus,
      bookingData.totalBeforeDiscount ?? bookingData.total_before_discount ?? null,
      bookingData.totalAfterDiscount ?? bookingData.total_after_discount ?? null,
      bookingData.adminDiscount ?? null,
      bookingData.specialDiscount ?? null,
      bookingData.genericDiscount ?? null,
      bookingData.couponDiscount ?? null,
      bookingData.couponCode ?? null,
      bookingData.discountByCoupon ?? bookingData.DiscountByCoupon ?? null,
      bookingData.appliedDecorationFee ?? null,
      bookingData.decorationFee ?? null,
      toJsonStringOrNull((sourceBooking as any)?.pricingData || (sourceBooking as any)?.pricing_data || bookingData.pricingData || bookingData.pricing_data),
      toJsonStringOrNull((sourceBooking as any)?.occasionData || (sourceBooking as any)?.occasion_data || bookingData.occasionData || bookingData.occasion_data),
      toJsonStringOrNull((sourceBooking as any)?.selectedMovies || bookingData.selectedMovies || []),
      toJsonStringOrNull((sourceBooking as any)?.selectedCakes || bookingData.selectedCakes || []),
      toJsonStringOrNull((sourceBooking as any)?.selectedDecorItems || bookingData.selectedDecorItems || []),
      toJsonStringOrNull((sourceBooking as any)?.selectedGifts || bookingData.selectedGifts || []),
      toJsonStringOrNull((sourceBooking as any)?.selectedExtraAddOns || (sourceBooking as any)?.selectedExtraAddOnsItems || bookingData.selectedExtraAddOns || bookingData.selectedExtraAddOnsItems || []),
      toJsonStringOrNull((sourceBooking as any)?.selectedFood || bookingData.selectedFood || []),
      toJsonStringOrNull((sourceBooking as any)?.selectedOtherItems || bookingData.selectedOtherItems || null),
      (sourceBooking as any)?.notes || bookingData.notes || null,
      createdByType,
      createdByName,
      (sourceBooking as any)?.staffId || bookingData.staffId || null,
      (sourceBooking as any)?.staffName || bookingData.staffName || null,
      (sourceBooking as any)?.createdAt || bookingData.createdAt
        ? new Date((sourceBooking as any)?.createdAt || bookingData.createdAt)
        : null,
      compressedData
    ];

    const valuesLegacy = [
      resolvedBookingId,
      bookingData.name,
      bookingData.email,
      bookingData.phone,
      bookingData.theaterName,
      resolvedDate ? new Date(resolvedDate) : null,
      resolvedTime,
      bookingData.occasion,
      bookingData.numberOfPeople,
      bookingData.totalAmount,
      bookingData.cancelledAt ? new Date(bookingData.cancelledAt) : new Date(),
      bookingData.cancellationReason || bookingData.cancelReason,
      bookingData.refundAmount,
      bookingData.refundStatus,
      compressedData
    ];
    
    console.log(`🔄 [SQL INSERT] Executing INSERT query...`);
    console.log(`🔄 [SQL INSERT] Booking ID: ${valuesWithDetails[0]}`);
    console.log(`🔄 [SQL INSERT] Name: ${valuesWithDetails[1]}`);
    console.log(`🔄 [SQL INSERT] Email: ${valuesWithDetails[2]}`);
    
    let result: any;
    try {
      const [res] = await connection.execute(insertQueryWithDetails, valuesWithDetails);
      result = res;
    } catch (e: any) {
      if (e?.code === 'ER_BAD_FIELD_ERROR') {
        const [res] = await connection.execute(insertQueryLegacy, valuesLegacy);
        result = res;
      } else {
        throw e;
      }
    }
    connection.release();
    console.log(`✅ [SQL INSERT] Query executed successfully`);
    
    const originalSize = JSON.stringify(bookingData).length;
    const compressedSize = compressedData.length;
    const savedPercent = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
    
    console.log(`✅ Cancelled booking inserted into GoDaddy SQL: ${bookingData.bookingId}`);
    console.log(`💾 Storage saved: ${savedPercent}% (${originalSize} → ${compressedSize} bytes)`);
    console.log(`📊 Insert ID: ${(result as any).insertId}, Affected Rows: ${(result as any).affectedRows}`);
    
    return { success: true, result };
  } catch (error) {
    console.error('❌ [SQL INSERT] Failed to insert cancelled booking into GoDaddy SQL:', error);
    console.error('❌ [SQL INSERT] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any).code,
      errno: (error as any).errno,
      sqlState: (error as any).sqlState
    });
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// Insert completed booking into GoDaddy SQL
export const insertCompletedBooking = async (bookingData: any) => {
  let connection: mysql.PoolConnection | null = null;
  try {
    const pool = getConnectionPool();
    const getConn = async () => pool.getConnection();
    try {
      connection = await getConn();
    } catch (e: any) {
      if (e?.code === 'ETIMEDOUT' || e?.code === 'ECONNRESET') {
        connection = await getConn();
      } else {
        throw e;
      }
    }

    if (!connection) {
      throw new Error('Failed to acquire GoDaddy SQL connection');
    }

    const conn = connection;

    const ensureCompletedBookingsSchema = async () => {
      if (completedBookingsSchemaEnsured) return;
      const addColumn = async (sql: string) => {
        try {
          await conn.execute(sql);
        } catch (e: any) {
          if (e?.code !== 'ER_DUP_FIELDNAME') {
            console.warn('⚠️ Failed to ensure completed_bookings column exists:', e?.message || e);
          }
        }
      };

      // Best-effort schema upgrade for existing tables
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN occasion_person_name VARCHAR(255) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN booking_type VARCHAR(50) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN mongo_id VARCHAR(50) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN ticket_number VARCHAR(50) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN payment_mode VARCHAR(50) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN payment_method VARCHAR(50) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN user_id VARCHAR(255) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN admin_name VARCHAR(255) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN is_manual_booking TINYINT(1) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN base_capacity INT NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN theater_capacity_min INT NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN theater_capacity_max INT NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN advance_payment DECIMAL(10,2) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN venue_payment DECIMAL(10,2) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN venue_payment_method VARCHAR(50) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN paid_by VARCHAR(50) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN paid_at DATETIME NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN payment_received VARCHAR(255) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN advance_payment_method VARCHAR(50) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN theater_base_price DECIMAL(10,2) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN extra_guest_fee DECIMAL(10,2) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN extra_guests_count INT NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN extra_guest_charges DECIMAL(10,2) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN decoration_fee DECIMAL(10,2) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN slot_booking_fee DECIMAL(10,2) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN payable_amount DECIMAL(10,2) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN admin_discount DECIMAL(10,2) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN special_discount DECIMAL(10,2) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN generic_discount DECIMAL(10,2) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN penalty_charges DECIMAL(10,2) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN penalty_reason TEXT NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN penalty_charge DECIMAL(10,2) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN coupon_discount DECIMAL(10,2) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN coupon_code VARCHAR(100) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN coupon_type VARCHAR(50) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN coupon_value DECIMAL(10,2) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN discount_by_coupon DECIMAL(10,2) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN applied_decoration_fee DECIMAL(10,2) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN total_before_discount DECIMAL(10,2) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN total_after_discount DECIMAL(10,2) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN occasion_field1_label VARCHAR(255) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN occasion_field1_value VARCHAR(255) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN occasion_field2_label VARCHAR(255) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN occasion_field2_value VARCHAR(255) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN pricing_data LONGTEXT NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN occasion_data LONGTEXT NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN selected_movies LONGTEXT NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN selected_cakes LONGTEXT NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN selected_decor_items LONGTEXT NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN selected_gifts LONGTEXT NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN selected_extra_add_ons LONGTEXT NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN selected_food LONGTEXT NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN selected_other_items LONGTEXT NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN notes TEXT NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN created_by_type VARCHAR(50) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN created_by_name VARCHAR(255) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN staff_id VARCHAR(255) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN staff_name VARCHAR(255) NULL`);
      await addColumn(`ALTER TABLE completed_bookings ADD COLUMN created_at_source DATETIME NULL`);

      completedBookingsSchemaEnsured = true;
    };

    await ensureCompletedBookingsSchema();

    // Use original booking snapshot for completeness, but let the latest record win (status/completedAt/etc.)
    const originalSnapshot = (bookingData?._originalBooking && typeof bookingData._originalBooking === 'object')
      ? bookingData._originalBooking
      : null;

    const mergeDefined = (base: any, next: any) => {
      const out: any = { ...(base || {}) };
      if (!next || typeof next !== 'object') return out;
      for (const [k, v] of Object.entries(next)) {
        if (v !== undefined) {
          out[k] = v;
        }
      }
      return out;
    };

    const sourceBooking = mergeDefined(originalSnapshot, bookingData);

    const resolvedBookingId = String(sourceBooking?.bookingId || sourceBooking?.id || '').trim();
    const resolvedName = String(sourceBooking?.name || '').trim() || 'Unknown';
    const resolvedEmail = String(sourceBooking?.email || '').trim() || `noemail+${resolvedBookingId || 'unknown'}@feelmetown.local`;
    const resolvedPhone = sourceBooking?.phone ?? '';

    const normalizeMethod = (raw: unknown): string => {
      const v = String(raw || '').toLowerCase().trim();
      if (v === 'cash' || v === 'cash_payment') return 'Cash';
      if (v === 'upi') return 'UPI';
      if (v === 'online') return 'Online';
      return v ? v.toUpperCase() : '';
    };

    const resolveReceiverName = (data: any): string => {
      const candidates = [
        data?.staffName,
        data?.adminName,
        data?.paidByName,
        data?.paidBy,
      ];
      for (const c of candidates) {
        if (typeof c === 'string' && c.trim()) {
          const trimmed = c.trim();
          const normalized = trimmed.toLowerCase();
          if (normalized === 'admin' || normalized === 'administrator') return 'Admin';
          if (trimmed.toLowerCase() === 'staff') return 'Staff';
          return trimmed;
        }
      }
      const paidBy = String(data?.paidBy || '').toLowerCase().trim();
      if (paidBy === 'admin' || paidBy === 'administrator') return 'Admin';
      if (paidBy === 'staff') return 'Staff';
      return '';
    };

    const paymentMethodLabel = normalizeMethod(
      sourceBooking?.venuePaymentMethod ?? sourceBooking?.paymentMethod ?? sourceBooking?.paymentMode,
    );
    const receiverName = resolveReceiverName(sourceBooking);
    const paymentReceived = paymentMethodLabel && receiverName
      ? `${paymentMethodLabel} - ${receiverName}`
      : paymentMethodLabel
        ? paymentMethodLabel
        : receiverName
          ? receiverName
          : null;

    const toJsonStringOrNull = (value: unknown) => {
      if (value === undefined || value === null) return null;
      try {
        return JSON.stringify(value);
      } catch {
        return null;
      }
    };

    const knownSelectedKeys = new Set([
      'selectedMovies',
      'selectedCakes',
      'selectedDecorItems',
      'selectedGifts',
      'selectedExtraAddOns',
      'selectedExtraAddOnsItems',
      'selectedFood',
    ]);

    const selectedOtherItems: Record<string, any> = {};
    Object.keys(sourceBooking || {}).forEach((key) => {
      if (!key.startsWith('selected')) return;
      if (knownSelectedKeys.has(key)) return;
      const v = sourceBooking[key];
      if (Array.isArray(v) && v.length > 0) {
        selectedOtherItems[key] = v;
      }
    });

    const createdByType = sourceBooking?.createdBy?.type || null;
    const createdByName = sourceBooking?.createdBy?.type === 'admin'
      ? (sourceBooking?.createdBy?.adminName || 'Administrator')
      : sourceBooking?.createdBy?.type === 'staff'
        ? (sourceBooking?.createdBy?.staffName || 'Staff')
        : null;

    const paidAtValue = sourceBooking?.paidAt ? new Date(sourceBooking.paidAt) : null;
    const createdAtSourceValue = sourceBooking?.createdAt ? new Date(sourceBooking.createdAt) : null;

    const numberOrNull = (value: unknown) => {
      if (value === undefined || value === null || value === '') return null;
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    };

    const pricingData = sourceBooking?.pricingData || {};
    // You asked to treat Admin Discount as Special Discount (no separate admin_discount)
    const specialDiscountAmount = numberOrNull(
      sourceBooking?.specialDiscount ??
        sourceBooking?.adminDiscount ??
        pricingData?.specialDiscount ??
        pricingData?.adminDiscount,
    );
    const genericDiscountAmount = numberOrNull(sourceBooking?.Discount ?? pricingData?.discount);
    const penaltyChargesAmount = numberOrNull(
      sourceBooking?.penaltyCharges ??
        sourceBooking?.penaltyCharge ??
        pricingData?.penaltyCharges ??
        pricingData?.penaltyCharge,
    );

    const couponDiscountAmount = numberOrNull(sourceBooking?.discountAmount ?? sourceBooking?.couponDiscount);
    const couponCode = sourceBooking?.appliedCouponCode ?? sourceBooking?.discountSummary?.code ?? null;

    const theaterBasePrice = numberOrNull(pricingData?.theaterBasePrice);
    const extraGuestFee = numberOrNull(sourceBooking?.extraGuestFee ?? pricingData?.extraGuestFee);
    const extraGuestsCount = numberOrNull(sourceBooking?.extraGuestsCount);
    const extraGuestCharges = numberOrNull(sourceBooking?.extraGuestCharges);
    const decorationFee = numberOrNull(
      sourceBooking?.decorationFee ??
        sourceBooking?.appliedDecorationFee ??
        sourceBooking?.decorationAppliedFee ??
        pricingData?.decorationAppliedFee ??
        pricingData?.decorationFees,
    );
    const slotBookingFee = numberOrNull(sourceBooking?.slotBookingFee ?? pricingData?.slotBookingFee);

    const discountByCoupon = numberOrNull(
      sourceBooking?.DiscountByCoupon ??
        sourceBooking?.DiscountByCouponAmount ??
        sourceBooking?.DiscountByCouponValue,
    );
    const appliedDecorationFee = numberOrNull(
      sourceBooking?.appliedDecorationFee ??
        sourceBooking?.decorationAppliedFee ??
        pricingData?.decorationAppliedFee,
    );
    const penaltyReason = sourceBooking?.penaltyReason || null;
    const penaltyCharge = numberOrNull(sourceBooking?.penaltyCharge);

    const baseCapacity = numberOrNull(sourceBooking?.baseCapacity ?? sourceBooking?.theaterCapacity?.baseCapacity);
    const theaterCapacityMin = numberOrNull(sourceBooking?.theaterCapacity?.min);
    const theaterCapacityMax = numberOrNull(sourceBooking?.theaterCapacity?.max);

    const mongoId = sourceBooking?._id ? String(sourceBooking._id) : null;
    const ticketNumber = sourceBooking?.ticketNumber || null;
    const paymentMode = sourceBooking?.paymentMode || null;
    const paymentMethod = sourceBooking?.paymentMethod || null;
    const userId = sourceBooking?.userId || null;
    const adminName = sourceBooking?.adminName || null;
    const isManualBooking = sourceBooking?.isManualBooking === true
      ? 1
      : (sourceBooking?.isManualBooking === false ? 0 : null);

    const createdByTypeResolved = (() => {
      const v = sourceBooking?.createdBy;
      if (!v) return createdByType;
      if (typeof v === 'string') return v.toLowerCase();
      return createdByType;
    })();

    const createdByNameResolved = (() => {
      const v = sourceBooking?.createdBy;
      if (!v) return createdByName;
      if (typeof v === 'string') return null;
      return createdByName;
    })();

    const totalAmountValue = numberOrNull(sourceBooking?.totalAmount ?? sourceBooking?.amount);
    const advancePaymentValue = numberOrNull(sourceBooking?.advancePayment ?? pricingData?.slotBookingFee);
    const payableAmount = numberOrNull(
      sourceBooking?.venuePayment ??
        (totalAmountValue !== null && advancePaymentValue !== null
          ? totalAmountValue - advancePaymentValue
          : null),
    );

    const totalAfterDiscount = numberOrNull(
      sourceBooking?.totalAmountAfterDiscount ?? sourceBooking?.totalAmount ?? sourceBooking?.amount,
    );
    const totalBeforeDiscount = numberOrNull(sourceBooking?.totalAmountBeforeDiscount);

    const buildOccasionFields = () => {
      // Prefer structured occasionData; fallback to legacy *_label keys
      const labelValuePairs: Array<{ label: string; value: string }> = [];

      const occasionData = sourceBooking?.occasionData;
      if (occasionData && typeof occasionData === 'object') {
        for (const [k, v] of Object.entries(occasionData)) {
          const valueStr = v === null || v === undefined ? '' : String(v).trim();
          if (!valueStr) continue;
          labelValuePairs.push({ label: k, value: valueStr });
        }
      }

      if (!labelValuePairs.length) {
        Object.keys(sourceBooking || {}).forEach((key) => {
          if (!key.endsWith('_label')) return;
          const label = String((sourceBooking as any)[key] || '').trim();
          if (!label) return;
          const fieldKey = key.replace('_label', '');
          const rawValue = (sourceBooking as any)[fieldKey];
          if (rawValue === null || rawValue === undefined) return;
          if (typeof rawValue === 'object') return;
          const valueStr = String(rawValue).trim();
          if (!valueStr) return;
          labelValuePairs.push({ label, value: valueStr });
        });
      }

      const first = labelValuePairs[0] || null;
      const second = labelValuePairs[1] || null;
      return {
        occasionField1Label: first?.label || null,
        occasionField1Value: first?.value || null,
        occasionField2Label: second?.label || null,
        occasionField2Value: second?.value || null,
      };
    };

    const { occasionField1Label, occasionField1Value, occasionField2Label, occasionField2Value } = buildOccasionFields();
    
    const insertQueryWithPaymentReceived = `
      INSERT INTO completed_bookings (
        booking_id, name, email, phone, theater_name, booking_date, booking_time,
        occasion, occasion_person_name, number_of_people, booking_type,
        advance_payment, venue_payment, total_amount,
        completed_at, booking_status,
        payment_status, venue_payment_method, paid_by, paid_at, payment_received,
        pricing_data, occasion_data,
        selected_movies, selected_cakes, selected_decor_items, selected_gifts,
        selected_extra_add_ons, selected_other_items,
        notes, created_by_type, created_by_name, staff_id, staff_name, created_at_source,
        original_booking_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        email = VALUES(email),
        phone = VALUES(phone),
        theater_name = VALUES(theater_name),
        booking_date = VALUES(booking_date),
        booking_time = VALUES(booking_time),
        occasion = VALUES(occasion),
        occasion_person_name = VALUES(occasion_person_name),
        number_of_people = VALUES(number_of_people),
        booking_type = VALUES(booking_type),
        advance_payment = VALUES(advance_payment),
        venue_payment = VALUES(venue_payment),
        total_amount = VALUES(total_amount),
        completed_at = VALUES(completed_at),
        booking_status = VALUES(booking_status),
        payment_status = VALUES(payment_status),
        venue_payment_method = VALUES(venue_payment_method),
        paid_by = VALUES(paid_by),
        paid_at = VALUES(paid_at),
        payment_received = VALUES(payment_received),
        pricing_data = VALUES(pricing_data),
        occasion_data = VALUES(occasion_data),
        selected_movies = VALUES(selected_movies),
        selected_cakes = VALUES(selected_cakes),
        selected_decor_items = VALUES(selected_decor_items),
        selected_gifts = VALUES(selected_gifts),
        selected_extra_add_ons = VALUES(selected_extra_add_ons),
        selected_other_items = VALUES(selected_other_items),
        notes = VALUES(notes),
        created_by_type = VALUES(created_by_type),
        created_by_name = VALUES(created_by_name),
        staff_id = VALUES(staff_id),
        staff_name = VALUES(staff_name),
        created_at_source = VALUES(created_at_source),
        original_booking_data = VALUES(original_booking_data),
        updated_at = CURRENT_TIMESTAMP
    `;

    const insertQueryLegacy = `
      INSERT INTO completed_bookings (
        booking_id, name, email, phone, theater_name, booking_date, booking_time,
        occasion, number_of_people, total_amount, completed_at, booking_status,
        payment_status, original_booking_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        email = VALUES(email),
        phone = VALUES(phone),
        theater_name = VALUES(theater_name),
        booking_date = VALUES(booking_date),
        booking_time = VALUES(booking_time),
        occasion = VALUES(occasion),
        number_of_people = VALUES(number_of_people),
        total_amount = VALUES(total_amount),
        completed_at = VALUES(completed_at),
        booking_status = VALUES(booking_status),
        payment_status = VALUES(payment_status),
        original_booking_data = VALUES(original_booking_data),
        updated_at = CURRENT_TIMESTAMP
    `;
    
    // Compress the original booking data to save storage
    const compressedData = compressJSON(bookingData);
    
    const values = [
      resolvedBookingId,
      resolvedName,
      resolvedEmail,
      resolvedPhone,
      sourceBooking.theaterName,
      sourceBooking.date ? new Date(sourceBooking.date) : null,
      sourceBooking.time,
      sourceBooking.occasion,
      sourceBooking.occasionPersonName || null,
      sourceBooking.numberOfPeople,
      sourceBooking.bookingType || null,
      sourceBooking.advancePayment ?? null,
      sourceBooking.venuePayment ?? null,
      sourceBooking.totalAmount,
      sourceBooking.completedAt ? new Date(sourceBooking.completedAt) : new Date(),
      sourceBooking.status || 'completed',
      sourceBooking.paymentStatus || 'paid',
      sourceBooking.venuePaymentMethod || null,
      sourceBooking.paidBy || null,
      paidAtValue,
      paymentReceived,
      null,
      null,
      toJsonStringOrNull(sourceBooking.selectedMovies || []),
      toJsonStringOrNull(sourceBooking.selectedCakes || []),
      toJsonStringOrNull(sourceBooking.selectedDecorItems || []),
      toJsonStringOrNull(sourceBooking.selectedGifts || []),
      toJsonStringOrNull(
        sourceBooking.selectedExtraAddOns || sourceBooking.selectedExtraAddOnsItems || [],
      ),
      Object.keys(selectedOtherItems).length ? toJsonStringOrNull(selectedOtherItems) : null,
      sourceBooking.notes || null,
      createdByType,
      createdByName,
      sourceBooking.staffId || null,
      sourceBooking.staffName || null,
      createdAtSourceValue,
      null
    ];

    let result: any;
    try {
      const [res] = await connection.execute(insertQueryWithPaymentReceived, values);
      result = res;
    } catch (e: any) {
      // Fallback for older schema
      if (e?.code === 'ER_BAD_FIELD_ERROR') {
        const legacyValues = [
          resolvedBookingId,
          resolvedName,
          resolvedEmail,
          resolvedPhone,
          bookingData.theaterName,
          bookingData.date ? new Date(bookingData.date) : null,
          bookingData.time,
          bookingData.occasion,
          bookingData.numberOfPeople,
          bookingData.totalAmount,
          bookingData.completedAt ? new Date(bookingData.completedAt) : new Date(),
          bookingData.status || 'completed',
          bookingData.paymentStatus || 'paid',
          null
        ];
        const [res] = await connection.execute(insertQueryLegacy, legacyValues);
        result = res;
      } else {
        throw e;
      }
    }

    // Best-effort populate the additional payment summary columns
    try {
      await connection.execute(
        `UPDATE completed_bookings
          SET
            advance_payment_method = ?,
            theater_base_price = ?,
            extra_guest_fee = ?,
            extra_guests_count = ?,
            extra_guest_charges = ?,
            decoration_fee = ?,
            slot_booking_fee = ?,
            payable_amount = ?,
            special_discount = ?,
            generic_discount = ?,
            penalty_charges = ?,
            penalty_reason = ?,
            penalty_charge = ?,
            coupon_discount = ?,
            coupon_code = ?,
            discount_by_coupon = ?,
            applied_decoration_fee = ?,
            total_before_discount = ?,
            total_after_discount = ?,
            occasion_field1_label = ?,
            occasion_field1_value = ?,
            occasion_field2_label = ?,
            occasion_field2_value = ?,
            mongo_id = ?,
            ticket_number = ?,
            payment_mode = ?,
            payment_method = ?,
            user_id = ?,
            admin_name = ?,
            is_manual_booking = ?,
            base_capacity = ?,
            theater_capacity_min = ?,
            theater_capacity_max = ?,
            created_by_type = ?,
            created_by_name = ?,
            selected_food = ?
          WHERE booking_id = ?`,
        [
          sourceBooking?.advancePaymentMethod || null,
          theaterBasePrice,
          extraGuestFee,
          extraGuestsCount,
          extraGuestCharges,
          decorationFee,
          slotBookingFee,
          payableAmount,
          specialDiscountAmount,
          genericDiscountAmount,
          penaltyChargesAmount,
          penaltyReason,
          penaltyCharge,
          couponDiscountAmount,
          couponCode,
          discountByCoupon,
          appliedDecorationFee,
          totalBeforeDiscount,
          totalAfterDiscount,
          occasionField1Label,
          occasionField1Value,
          occasionField2Label,
          occasionField2Value,
          mongoId,
          ticketNumber,
          paymentMode,
          paymentMethod,
          userId,
          adminName,
          isManualBooking,
          baseCapacity,
          theaterCapacityMin,
          theaterCapacityMax,
          createdByTypeResolved,
          createdByNameResolved,
          toJsonStringOrNull(sourceBooking.selectedFood || []),
          sourceBooking.bookingId || sourceBooking.id,
        ],
      );
    } catch (e: any) {
      if (e?.code !== 'ER_BAD_FIELD_ERROR') {
        console.warn('⚠️ Failed to update payment summary columns:', e?.message || e);
      }
    }
    const originalSize = JSON.stringify(bookingData).length;
    const compressedSize = compressedData.length;
    const savedPercent = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
    
    console.log(`✅ Completed booking inserted into GoDaddy SQL: ${bookingData.bookingId}`);
    console.log(`💾 Storage saved: ${savedPercent}% (${originalSize} → ${compressedSize} bytes)`);
    return { success: true, result };
  } catch (error) {
    console.error('❌ Failed to insert completed booking into GoDaddy SQL:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  } finally {
    try {
      connection?.release();
    } catch {}
  }
};

// Sync JSON data to GoDaddy SQL
// DISABLED: No longer needed - data syncs directly from MongoDB to SQL
export const syncJSONToGoDaddySQL = async () => {
  console.log('⚠️ syncJSONToGoDaddySQL called but JSON sync is disabled - data syncs directly from MongoDB to SQL');
  
  return {
    success: true,
    message: 'JSON sync disabled - data syncs directly from MongoDB to SQL',
    results: {
      cancelledBookings: { synced: 0, errors: 0 },
      completedBookings: { synced: 0, errors: 0 }
    }
  };
  
  /* DISABLED CODE - keeping for reference
  try {
    const { ExportsStorage } = await import('./exports-storage');
    
    const results = {
      cancelledBookings: { synced: 0, errors: 0 },
      completedBookings: { synced: 0, errors: 0 }
    };
    
    // Sync cancelled bookings
    try {
      const cancelledBookingsData = await ExportsStorage.readArray('cancelled-bookings.json');
      console.log(`📄 Found ${cancelledBookingsData.length} cancelled bookings in JSON`);
      
      for (const booking of cancelledBookingsData) {
        const result = await insertCancelledBooking(booking);
        if (result.success) {
          results.cancelledBookings.synced++;
        } else {
          results.cancelledBookings.errors++;
          console.error(`❌ Failed to sync cancelled booking ${booking.bookingId}:`, result.error);
        }
      }
    } catch (error) {
      console.error('❌ Error reading cancelled-bookings.json:', error);
    }
    
    // Sync completed bookings
    try {
      const completedBookingsData = await ExportsStorage.readArray('completed-bookings.json');
      console.log(`📄 Found ${completedBookingsData.length} completed bookings in JSON`);
      
      for (const booking of completedBookingsData) {
        const result = await insertCompletedBooking(booking);
        if (result.success) {
          results.completedBookings.synced++;
        } else {
          results.completedBookings.errors++;
          console.error(`❌ Failed to sync completed booking ${booking.bookingId}:`, result.error);
        }
      }
    } catch (error) {
      console.error('❌ Error reading completed-bookings.json:', error);
    }
    
    console.log('✅ JSON to GoDaddy SQL sync completed:', results);
    return { success: true, results };
  } catch (error) {
    console.error('❌ JSON to GoDaddy SQL sync failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
  */
};

// Get booking statistics from GoDaddy SQL
export const getGoDaddyBookingStats = async () => {
  try {
    const pool = getConnectionPool();
    const connection = await pool.getConnection();
    
    // Get cancelled bookings stats
    const [cancelledStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN DATE(cancelled_at) = CURDATE() THEN 1 END) as today,
        COUNT(CASE WHEN YEARWEEK(cancelled_at, 1) = YEARWEEK(CURDATE(), 1) THEN 1 END) as this_week,
        COUNT(CASE WHEN YEAR(cancelled_at) = YEAR(CURDATE()) AND MONTH(cancelled_at) = MONTH(CURDATE()) THEN 1 END) as this_month,
        COUNT(CASE WHEN YEAR(cancelled_at) = YEAR(CURDATE()) THEN 1 END) as this_year
      FROM cancelled_bookings
    `);
    
    // Get completed bookings stats
    const [completedStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN DATE(completed_at) = CURDATE() THEN 1 END) as today,
        COUNT(CASE WHEN YEARWEEK(completed_at, 1) = YEARWEEK(CURDATE(), 1) THEN 1 END) as this_week,
        COUNT(CASE WHEN YEAR(completed_at) = YEAR(CURDATE()) AND MONTH(completed_at) = MONTH(CURDATE()) THEN 1 END) as this_month,
        COUNT(CASE WHEN YEAR(completed_at) = YEAR(CURDATE()) THEN 1 END) as this_year
      FROM completed_bookings
    `);
    
    connection.release();
    
    return {
      success: true,
      stats: {
        cancelled: (cancelledStats as any)[0],
        completed: (completedStats as any)[0]
      }
    };
  } catch (error) {
    console.error('❌ Failed to get GoDaddy booking stats:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// Sync MongoDB booking to GoDaddy SQL when completed
export const syncCompletedBookingToSQL = async (bookingData: any) => {
  try {
    console.log(`🔄 Syncing completed booking to GoDaddy SQL: ${bookingData.bookingId}`);
    
    // Insert into GoDaddy SQL
    const result = await insertCompletedBooking(bookingData);
    
    if (result.success) {
      console.log(`✅ Completed booking synced to GoDaddy SQL: ${bookingData.bookingId}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Failed to sync completed booking to GoDaddy SQL:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// Sync manual booking (status: manual) into completed_bookings table for parity
export const syncManualBookingToSQL = async (bookingData: any) => {
  try {
    const normalizedRecord = {
      ...bookingData,
      status: bookingData.status || 'manual',
      completedAt: bookingData.completedAt || bookingData.createdAt || new Date().toISOString(),
      paymentStatus: bookingData.paymentStatus || 'unpaid'
    };

    console.log(`🔄 Syncing manual booking to GoDaddy SQL (completed table): ${normalizedRecord.bookingId}`);
    return await insertCompletedBooking(normalizedRecord);
  } catch (error) {
    console.error('❌ Failed to sync manual booking to GoDaddy SQL:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Sync MongoDB cancelled booking to GoDaddy SQL
export const syncCancelledBookingToSQL = async (bookingData: any) => {
  try {
    console.log(`🔄 Syncing cancelled booking to GoDaddy SQL: ${bookingData.bookingId}`);
    
    // Insert into GoDaddy SQL
    const result = await insertCancelledBooking(bookingData);
    
    if (result.success) {
      console.log(`✅ Cancelled booking synced to GoDaddy SQL: ${bookingData.bookingId}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Failed to sync cancelled booking to GoDaddy SQL:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

export default {
  testConnection: testGoDaddyConnection,
  createTables: createGoDaddyTables,
  insertCancelledBooking,
  insertCompletedBooking,
  upsertFeedbackToSQL,
  syncJSONToSQL: syncJSONToGoDaddySQL,
  getBookingStats: getGoDaddyBookingStats,
  syncCompletedBookingToSQL,
  syncCancelledBookingToSQL,
  syncFeedbackToSQL,
  getCompletedBookingHistoryFromSQL,
  getCancelledBookingHistoryFromSQL
};
