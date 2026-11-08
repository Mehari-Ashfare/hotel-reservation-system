/**
 * Reservation.js - Reservation model
 * * Handles booking operations including creation, modification,
 * cancellation, and availability checking.
 * * Dependencies:
 * - database pool from config/database.js
 */

import pool from '../config/database.js';

class Reservation {
  /**
   * Create new reservation
   * @param {Object} reservationData - Reservation information
   * @returns {Promise<Object>} Created reservation
   */
  static async create(reservationData) {
    try {
      const {
        guest_id,
        room_id,
        created_by,
        check_in_date,
        check_out_date,
        number_of_guests,
        total_amount,
        special_requests = null
      } = reservationData;

      const query = `
        INSERT INTO reservations (
          guest_id, room_id, created_by, check_in_date,
          check_out_date, number_of_guests, total_amount,
          special_requests, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'confirmed')
        RETURNING *
      `;

      const values = [
        guest_id,
        room_id,
        created_by,
        check_in_date,
        check_out_date,
        number_of_guests,
        total_amount,
        special_requests
      ];

      const result = await pool.query(query, values);
      
      // Automatically set room to 'occupied' when reservation is created/confirmed
      await pool.query("UPDATE rooms SET status = 'occupied' WHERE room_id = $1", [room_id]);

      return result.rows[0];
    } catch (error) {
      if (error.code === '23514') { // Check constraint violation
        throw new Error('Invalid date range or guest count');
      }
      throw new Error(`Database error creating reservation: ${error.message}`);
    }
  }

  /**
   * Find reservation by ID
   * FIX: Added JOIN to users table (alias 'gu') to get guest email
   */
  static async findById(reservationId) {
    try {
      const query = `
        SELECT 
          res.*,
          g.first_name || ' ' || g.last_name as guest_name,
          gu.email as guest_email,  -- FIX: Get email from guest_user (gu)
          g.phone as guest_phone,
          r.room_number,
          rt.type_name as room_type,
          u.email as created_by_email,
          
          -- Calculate Net Paid
          (SELECT COALESCE(SUM(amount), 0) - COALESCE(SUM(refund_amount), 0) 
           FROM payments p 
           WHERE p.reservation_id = res.reservation_id 
           AND p.payment_status IN ('completed', 'partially_refunded', 'refunded')) as paid_amount,

          -- Calculate Refunded Amount
          (SELECT COALESCE(SUM(refund_amount), 0) 
           FROM payments p 
           WHERE p.reservation_id = res.reservation_id) as refunded_amount

        FROM reservations res
        JOIN guests g ON res.guest_id = g.guest_id
        LEFT JOIN users gu ON g.user_id = gu.user_id -- FIX: Link guest to their user account
        JOIN rooms r ON res.room_id = r.room_id
        JOIN room_types rt ON r.room_type_id = rt.room_type_id
        JOIN users u ON res.created_by = u.user_id
        WHERE res.reservation_id = $1
      `;
      const result = await pool.query(query, [reservationId]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Database error finding reservation: ${error.message}`);
    }
  }

  /**
   * Get all reservations with filters
   * FIX: Updated Search and Selection to use 'gu.email'
   */
  static async getAll(filters = {}, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      const whereConditions = [];
      const values = [];
      let paramCount = 1;

      // Build filter conditions
      if (filters.guest_id) {
        whereConditions.push(`res.guest_id = $${paramCount}`);
        values.push(filters.guest_id);
        paramCount++;
      }

      if (filters.status) {
        whereConditions.push(`res.status = $${paramCount}`);
        values.push(filters.status);
        paramCount++;
      }

      if (filters.start_date) {
        whereConditions.push(`res.check_in_date >= $${paramCount}`);
        values.push(filters.start_date);
        paramCount++;
      }

      if (filters.end_date) {
        whereConditions.push(`res.check_out_date <= $${paramCount}`);
        values.push(filters.end_date);
        paramCount++;
      }

      if (filters.search) {
        // FIX: Search gu.email instead of g.email
        whereConditions.push(`
          (g.first_name ILIKE $${paramCount} OR 
           g.last_name ILIKE $${paramCount} OR
           gu.email ILIKE $${paramCount} OR 
           r.room_number ILIKE $${paramCount})
        `);
        values.push(`%${filters.search}%`);
        paramCount++;
      }

      // Build WHERE clause
      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';

      // Count query
      const countQuery = `
        SELECT COUNT(*) 
        FROM reservations res
        JOIN guests g ON res.guest_id = g.guest_id
        LEFT JOIN users gu ON g.user_id = gu.user_id -- FIX: Added Join
        JOIN rooms r ON res.room_id = r.room_id
        ${whereClause}
      `;

      // Data query
      const dataQuery = `
        SELECT 
          res.*,
          g.first_name || ' ' || g.last_name as guest_name,
          gu.email as guest_email, -- FIX: Get email from guest_user
          g.phone as guest_phone,
          r.room_number,
          rt.type_name as room_type,
          u.email as created_by_email,
          
          (SELECT COALESCE(SUM(amount), 0) - COALESCE(SUM(refund_amount), 0) 
           FROM payments p 
           WHERE p.reservation_id = res.reservation_id 
           AND p.payment_status IN ('completed', 'partially_refunded', 'refunded')) as paid_amount,

          (SELECT COALESCE(SUM(refund_amount), 0) 
           FROM payments p 
           WHERE p.reservation_id = res.reservation_id) as refunded_amount

        FROM reservations res
        JOIN guests g ON res.guest_id = g.guest_id
        LEFT JOIN users gu ON g.user_id = gu.user_id -- FIX: Link guest to user account
        JOIN rooms r ON res.room_id = r.room_id
        JOIN room_types rt ON r.room_type_id = rt.room_type_id
        JOIN users u ON res.created_by = u.user_id
        ${whereClause}
        ORDER BY res.reservation_id DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;

      // Add pagination parameters
      values.push(limit, offset);

      const [countResult, dataResult] = await Promise.all([
        pool.query(countQuery, values.slice(0, whereConditions.length)),
        pool.query(dataQuery, values)
      ]);

      const total = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / limit);

      return {
        reservations: dataResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Database error getting reservations: ${error.message}`);
    }
  }

  /**
   * Update reservation
   */
  static async update(reservationId, updateData) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          fields.push(`${key} = $${paramCount}`);
          values.push(updateData[key]);
          paramCount++;
        }
      });

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(reservationId);

      const query = `
        UPDATE reservations 
        SET ${fields.join(', ')}
        WHERE reservation_id = $${paramCount}
        RETURNING *
      `;

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Database error updating reservation: ${error.message}`);
    }
  }

  /**
   * Cancel reservation
   */
  static async cancel(reservationId, reason) {
    try {
      // 1. Get room ID first
      const resQuery = await pool.query("SELECT room_id FROM reservations WHERE reservation_id = $1", [reservationId]);
      const roomId = resQuery.rows[0]?.room_id;

      // 2. Update status
      const query = `
        UPDATE reservations 
        SET status = 'cancelled', 
            cancellation_reason = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE reservation_id = $2
        RETURNING *
      `;
      const result = await pool.query(query, [reason, reservationId]);

      // 3. Automatically release room to 'available'
      if (roomId) {
        await pool.query("UPDATE rooms SET status = 'available' WHERE room_id = $1", [roomId]);
      }

      return result.rows[0];
    } catch (error) {
      throw new Error(`Database error cancelling reservation: ${error.message}`);
    }
  }

  /**
   * Check in guest
   */
  static async checkIn(reservationId) {
    try {
      const query = `
        UPDATE reservations 
        SET status = 'checked-in', 
            actual_check_in = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE reservation_id = $1
        RETURNING *
      `;
      const result = await pool.query(query, [reservationId]);
      
      if (result.rows[0]) {
         await pool.query("UPDATE rooms SET status = 'occupied' WHERE room_id = $1", [result.rows[0].room_id]);
      }

      return result.rows[0];
    } catch (error) {
      throw new Error(`Database error checking in: ${error.message}`);
    }
  }

  /**
   * Check out guest
   */
  static async checkOut(reservationId) {
    try {
      const query = `
        UPDATE reservations 
        SET status = 'checked-out', 
            actual_check_out = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE reservation_id = $1
        RETURNING *
      `;
      const result = await pool.query(query, [reservationId]);

      if (result.rows[0]) {
        await pool.query("UPDATE rooms SET status = 'available' WHERE room_id = $1", [result.rows[0].room_id]);
      }

      return result.rows[0];
    } catch (error) {
      throw new Error(`Database error checking out: ${error.message}`);
    }
  }

  /**
   * Get guest's reservations
   */
  static async getGuestReservations(guestId) {
    try {
      const query = `
        SELECT 
          res.*,
          r.room_number,
          rt.type_name as room_type,
          (SELECT COALESCE(SUM(amount), 0) - COALESCE(SUM(refund_amount), 0)
           FROM payments p 
           WHERE p.reservation_id = res.reservation_id 
           AND p.payment_status IN ('completed', 'partially_refunded', 'refunded')) as paid_amount
        FROM reservations res
        JOIN rooms r ON res.room_id = r.room_id
        JOIN room_types rt ON r.room_type_id = rt.room_type_id
        WHERE res.guest_id = $1
        ORDER BY res.check_in_date DESC
      `;
      const result = await pool.query(query, [guestId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error getting guest reservations: ${error.message}`);
    }
  }

  /**
   * Calculate reservation price
   */
  static async calculatePrice(roomId, checkInDate, checkOutDate) {
    try {
      // Get room price
      const roomQuery = `
        SELECT rt.base_price, r.price_adjustment
        FROM rooms r
        JOIN room_types rt ON r.room_type_id = rt.room_type_id
        WHERE r.room_id = $1
      `;
      const roomResult = await pool.query(roomQuery, [roomId]);
      
      if (!roomResult.rows[0]) {
        throw new Error('Room not found');
      }

      const { base_price, price_adjustment } = roomResult.rows[0];
      const dailyRate = parseFloat(base_price) + parseFloat(price_adjustment || 0);

      // Calculate number of nights
      const checkIn = new Date(checkInDate);
      const checkOut = new Date(checkOutDate);
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

      return dailyRate * nights;
    } catch (error) {
      throw new Error(`Error calculating price: ${error.message}`);
    }
  }
}

export default Reservation;


// /**
//  * Reservation.js - Reservation model
//  * * Handles booking operations including creation, modification,
//  * cancellation, and availability checking.
//  * * Dependencies:
//  * - database pool from config/database.js
//  */

// import pool from '../config/database.js';

// class Reservation {
//   /**
//    * Create new reservation
//    * @param {Object} reservationData - Reservation information
//    * @returns {Promise<Object>} Created reservation
//    */
//   static async create(reservationData) {
//     try {
//       const {
//         guest_id,
//         room_id,
//         created_by,
//         check_in_date,
//         check_out_date,
//         number_of_guests,
//         total_amount,
//         special_requests = null
//       } = reservationData;

//       const query = `
//         INSERT INTO reservations (
//           guest_id, room_id, created_by, check_in_date,
//           check_out_date, number_of_guests, total_amount,
//           special_requests, status
//         )
//         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'confirmed')
//         RETURNING *
//       `;

//       const values = [
//         guest_id,
//         room_id,
//         created_by,
//         check_in_date,
//         check_out_date,
//         number_of_guests,
//         total_amount,
//         special_requests
//       ];

//       const result = await pool.query(query, values);
      
//       // Automatically set room to 'occupied' when reservation is created/confirmed
//       await pool.query("UPDATE rooms SET status = 'occupied' WHERE room_id = $1", [room_id]);

//       return result.rows[0];
//     } catch (error) {
//       if (error.code === '23514') { // Check constraint violation
//         throw new Error('Invalid date range or guest count');
//       }
//       throw new Error(`Database error creating reservation: ${error.message}`);
//     }
//   }

//   /**
//    * Find reservation by ID
//    * @param {number} reservationId - Reservation ID
//    * @returns {Promise<Object|null>} Reservation object or null
//    */
//   static async findById(reservationId) {
//     try {
//       const query = `
//         SELECT 
//           res.*,
//           g.first_name || ' ' || g.last_name as guest_name,
//           g.email as guest_email,
//           g.phone as guest_phone,
//           r.room_number,
//           rt.type_name as room_type,
//           u.email as created_by_email,
          
//           -- Calculate Net Paid (Total Paid - Refunds)
//           (SELECT COALESCE(SUM(amount), 0) - COALESCE(SUM(refund_amount), 0) 
//            FROM payments p 
//            WHERE p.reservation_id = res.reservation_id 
//            AND p.payment_status IN ('completed', 'partially_refunded', 'refunded')) as paid_amount,

//           -- Calculate Total Refunded Amount
//           (SELECT COALESCE(SUM(refund_amount), 0) 
//            FROM payments p 
//            WHERE p.reservation_id = res.reservation_id) as refunded_amount

//         FROM reservations res
//         JOIN guests g ON res.guest_id = g.guest_id
//         JOIN rooms r ON res.room_id = r.room_id
//         JOIN room_types rt ON r.room_type_id = rt.room_type_id
//         JOIN users u ON res.created_by = u.user_id
//         WHERE res.reservation_id = $1
//       `;
//       const result = await pool.query(query, [reservationId]);
//       return result.rows[0] || null;
//     } catch (error) {
//       throw new Error(`Database error finding reservation: ${error.message}`);
//     }
//   }

//   /**
//    * Get all reservations with filters
//    */
//   static async getAll(filters = {}, page = 1, limit = 20) {
//     try {
//       const offset = (page - 1) * limit;
//       const whereConditions = [];
//       const values = [];
//       let paramCount = 1;

//       // Build filter conditions
//       if (filters.guest_id) {
//         whereConditions.push(`res.guest_id = $${paramCount}`);
//         values.push(filters.guest_id);
//         paramCount++;
//       }

//       if (filters.status) {
//         whereConditions.push(`res.status = $${paramCount}`);
//         values.push(filters.status);
//         paramCount++;
//       }

//       if (filters.start_date) {
//         whereConditions.push(`res.check_in_date >= $${paramCount}`);
//         values.push(filters.start_date);
//         paramCount++;
//       }

//       if (filters.end_date) {
//         whereConditions.push(`res.check_out_date <= $${paramCount}`);
//         values.push(filters.end_date);
//         paramCount++;
//       }

//       if (filters.search) {
//         whereConditions.push(`
//           (g.first_name ILIKE $${paramCount} OR 
//            g.last_name ILIKE $${paramCount} OR
//            g.email ILIKE $${paramCount} OR
//            r.room_number ILIKE $${paramCount})
//         `);
//         values.push(`%${filters.search}%`);
//         paramCount++;
//       }

//       // Build WHERE clause
//       const whereClause = whereConditions.length > 0 
//         ? `WHERE ${whereConditions.join(' AND ')}` 
//         : '';

//       // Count query
//       const countQuery = `
//         SELECT COUNT(*) 
//         FROM reservations res
//         JOIN guests g ON res.guest_id = g.guest_id
//         JOIN rooms r ON res.room_id = r.room_id
//         ${whereClause}
//       `;

//       // Data query
//       // UPDATE: Added paid_amount and refunded_amount subqueries
//       const dataQuery = `
//         SELECT 
//           res.*,
//           g.first_name || ' ' || g.last_name as guest_name,
//           g.email as guest_email,
//           g.phone as guest_phone,
//           r.room_number,
//           rt.type_name as room_type,
//           u.email as created_by_email,
          
//           -- Calculate Net Paid (Total Paid - Refunds)
//           (SELECT COALESCE(SUM(amount), 0) - COALESCE(SUM(refund_amount), 0) 
//            FROM payments p 
//            WHERE p.reservation_id = res.reservation_id 
//            AND p.payment_status IN ('completed', 'partially_refunded', 'refunded')) as paid_amount,

//           -- Calculate Total Refunded Amount for UI
//           (SELECT COALESCE(SUM(refund_amount), 0) 
//            FROM payments p 
//            WHERE p.reservation_id = res.reservation_id) as refunded_amount

//         FROM reservations res
//         JOIN guests g ON res.guest_id = g.guest_id
//         JOIN rooms r ON res.room_id = r.room_id
//         JOIN room_types rt ON r.room_type_id = rt.room_type_id
//         JOIN users u ON res.created_by = u.user_id
//         ${whereClause}
//         ORDER BY res.reservation_id DESC
//         LIMIT $${paramCount} OFFSET $${paramCount + 1}
//       `;

//       // Add pagination parameters
//       values.push(limit, offset);

//       const [countResult, dataResult] = await Promise.all([
//         pool.query(countQuery, values.slice(0, whereConditions.length)),
//         pool.query(dataQuery, values)
//       ]);

//       const total = parseInt(countResult.rows[0].count);
//       const totalPages = Math.ceil(total / limit);

//       return {
//         reservations: dataResult.rows,
//         pagination: {
//           page,
//           limit,
//           total,
//           totalPages,
//           hasNext: page < totalPages,
//           hasPrev: page > 1
//         }
//       };
//     } catch (error) {
//       throw new Error(`Database error getting reservations: ${error.message}`);
//     }
//   }

//   /**
//    * Update reservation
//    */
//   static async update(reservationId, updateData) {
//     try {
//       const fields = [];
//       const values = [];
//       let paramCount = 1;

//       Object.keys(updateData).forEach(key => {
//         if (updateData[key] !== undefined) {
//           fields.push(`${key} = $${paramCount}`);
//           values.push(updateData[key]);
//           paramCount++;
//         }
//       });

//       if (fields.length === 0) {
//         throw new Error('No fields to update');
//       }

//       values.push(reservationId);

//       const query = `
//         UPDATE reservations 
//         SET ${fields.join(', ')}
//         WHERE reservation_id = $${paramCount}
//         RETURNING *
//       `;

//       const result = await pool.query(query, values);
//       return result.rows[0];
//     } catch (error) {
//       throw new Error(`Database error updating reservation: ${error.message}`);
//     }
//   }

//   /**
//    * Cancel reservation
//    */
//   static async cancel(reservationId, reason) {
//     try {
//       // 1. Get room ID first
//       const resQuery = await pool.query("SELECT room_id FROM reservations WHERE reservation_id = $1", [reservationId]);
//       const roomId = resQuery.rows[0]?.room_id;

//       // 2. Update status
//       const query = `
//         UPDATE reservations 
//         SET status = 'cancelled', 
//             cancellation_reason = $1,
//             updated_at = CURRENT_TIMESTAMP
//         WHERE reservation_id = $2
//         RETURNING *
//       `;
//       const result = await pool.query(query, [reason, reservationId]);

//       // 3. Automatically release room to 'available'
//       if (roomId) {
//         await pool.query("UPDATE rooms SET status = 'available' WHERE room_id = $1", [roomId]);
//       }

//       return result.rows[0];
//     } catch (error) {
//       throw new Error(`Database error cancelling reservation: ${error.message}`);
//     }
//   }

//   /**
//    * Check in guest
//    */
//   static async checkIn(reservationId) {
//     try {
//       const query = `
//         UPDATE reservations 
//         SET status = 'checked-in', 
//             actual_check_in = CURRENT_TIMESTAMP,
//             updated_at = CURRENT_TIMESTAMP
//         WHERE reservation_id = $1
//         RETURNING *
//       `;
//       const result = await pool.query(query, [reservationId]);
      
//       // Note: Room is already 'occupied' from creation, but ensuring it here is safe
//       if (result.rows[0]) {
//          await pool.query("UPDATE rooms SET status = 'occupied' WHERE room_id = $1", [result.rows[0].room_id]);
//       }

//       return result.rows[0];
//     } catch (error) {
//       throw new Error(`Database error checking in: ${error.message}`);
//     }
//   }

//   /**
//    * Check out guest
//    */
//   static async checkOut(reservationId) {
//     try {
//       const query = `
//         UPDATE reservations 
//         SET status = 'checked-out', 
//             actual_check_out = CURRENT_TIMESTAMP,
//             updated_at = CURRENT_TIMESTAMP
//         WHERE reservation_id = $1
//         RETURNING *
//       `;
//       const result = await pool.query(query, [reservationId]);

//       // Automatically release room to 'available'
//       if (result.rows[0]) {
//         await pool.query("UPDATE rooms SET status = 'available' WHERE room_id = $1", [result.rows[0].room_id]);
//       }

//       return result.rows[0];
//     } catch (error) {
//       throw new Error(`Database error checking out: ${error.message}`);
//     }
//   }

//   /**
//    * Get guest's reservations
//    */
//   static async getGuestReservations(guestId) {
//     try {
//       const query = `
//         SELECT 
//           res.*,
//           r.room_number,
//           rt.type_name as room_type,
//           (SELECT COALESCE(SUM(amount), 0) - COALESCE(SUM(refund_amount), 0)
//            FROM payments p 
//            WHERE p.reservation_id = res.reservation_id 
//            AND p.payment_status IN ('completed', 'partially_refunded', 'refunded')) as paid_amount
//         FROM reservations res
//         JOIN rooms r ON res.room_id = r.room_id
//         JOIN room_types rt ON r.room_type_id = rt.room_type_id
//         WHERE res.guest_id = $1
//         ORDER BY res.check_in_date DESC
//       `;
//       const result = await pool.query(query, [guestId]);
//       return result.rows;
//     } catch (error) {
//       throw new Error(`Database error getting guest reservations: ${error.message}`);
//     }
//   }

//   /**
//    * Calculate reservation price
//    */
//   static async calculatePrice(roomId, checkInDate, checkOutDate) {
//     try {
//       // Get room price
//       const roomQuery = `
//         SELECT rt.base_price, r.price_adjustment
//         FROM rooms r
//         JOIN room_types rt ON r.room_type_id = rt.room_type_id
//         WHERE r.room_id = $1
//       `;
//       const roomResult = await pool.query(roomQuery, [roomId]);
      
//       if (!roomResult.rows[0]) {
//         throw new Error('Room not found');
//       }

//       const { base_price, price_adjustment } = roomResult.rows[0];
//       const dailyRate = parseFloat(base_price) + parseFloat(price_adjustment || 0);

//       // Calculate number of nights
//       const checkIn = new Date(checkInDate);
//       const checkOut = new Date(checkOutDate);
//       const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

//       return dailyRate * nights;
//     } catch (error) {
//       throw new Error(`Error calculating price: ${error.message}`);
//     }
//   }
// }

// export default Reservation;







// // /**
// //  * Reservation.js - Reservation model
// //  * * Handles booking operations including creation, modification,
// //  * cancellation, and availability checking.
// //  * * Dependencies:
// //  * - database pool from config/database.js
// //  */

// // import pool from '../config/database.js';

// // class Reservation {
// //   /**
// //    * Create new reservation
// //    * @param {Object} reservationData - Reservation information
// //    * @returns {Promise<Object>} Created reservation
// //    */
// //   static async create(reservationData) {
// //     try {
// //       const {
// //         guest_id,
// //         room_id,
// //         created_by,
// //         check_in_date,
// //         check_out_date,
// //         number_of_guests,
// //         total_amount,
// //         special_requests = null
// //       } = reservationData;

// //       const query = `
// //         INSERT INTO reservations (
// //           guest_id, room_id, created_by, check_in_date,
// //           check_out_date, number_of_guests, total_amount,
// //           special_requests, status
// //         )
// //         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'confirmed')
// //         RETURNING *
// //       `;

// //       const values = [
// //         guest_id,
// //         room_id,
// //         created_by,
// //         check_in_date,
// //         check_out_date,
// //         number_of_guests,
// //         total_amount,
// //         special_requests
// //       ];

// //       const result = await pool.query(query, values);
      
// //       // UPDATE: Automatically set room to 'occupied' when reservation is created/confirmed
// //       await pool.query("UPDATE rooms SET status = 'occupied' WHERE room_id = $1", [room_id]);

// //       return result.rows[0];
// //     } catch (error) {
// //       if (error.code === '23514') { // Check constraint violation
// //         throw new Error('Invalid date range or guest count');
// //       }
// //       throw new Error(`Database error creating reservation: ${error.message}`);
// //     }
// //   }

// //   /**
// //    * Find reservation by ID
// //    * @param {number} reservationId - Reservation ID
// //    * @returns {Promise<Object|null>} Reservation object or null
// //    */
// //   static async findById(reservationId) {
// //     try {
// //       const query = `
// //         SELECT 
// //           res.*,
// //           g.first_name || ' ' || g.last_name as guest_name,
// //           g.email as guest_email,
// //           g.phone as guest_phone,
// //           r.room_number,
// //           rt.type_name as room_type,
// //           u.email as created_by_email,
// //           (SELECT COALESCE(SUM(amount), 0) FROM payments p 
// //            WHERE p.reservation_id = res.reservation_id 
// //            AND p.payment_status = 'completed') as paid_amount
// //         FROM reservations res
// //         JOIN guests g ON res.guest_id = g.guest_id
// //         JOIN rooms r ON res.room_id = r.room_id
// //         JOIN room_types rt ON r.room_type_id = rt.room_type_id
// //         JOIN users u ON res.created_by = u.user_id
// //         WHERE res.reservation_id = $1
// //       `;
// //       const result = await pool.query(query, [reservationId]);
// //       return result.rows[0] || null;
// //     } catch (error) {
// //       throw new Error(`Database error finding reservation: ${error.message}`);
// //     }
// //   }

// //   /**
// //    * Get all reservations with filters
// //    */
// //   static async getAll(filters = {}, page = 1, limit = 20) {
// //     try {
// //       const offset = (page - 1) * limit;
// //       const whereConditions = [];
// //       const values = [];
// //       let paramCount = 1;

// //       // Build filter conditions
// //       if (filters.guest_id) {
// //         whereConditions.push(`res.guest_id = $${paramCount}`);
// //         values.push(filters.guest_id);
// //         paramCount++;
// //       }

// //       if (filters.status) {
// //         whereConditions.push(`res.status = $${paramCount}`);
// //         values.push(filters.status);
// //         paramCount++;
// //       }

// //       if (filters.start_date) {
// //         whereConditions.push(`res.check_in_date >= $${paramCount}`);
// //         values.push(filters.start_date);
// //         paramCount++;
// //       }

// //       if (filters.end_date) {
// //         whereConditions.push(`res.check_out_date <= $${paramCount}`);
// //         values.push(filters.end_date);
// //         paramCount++;
// //       }

// //       if (filters.search) {
// //         whereConditions.push(`
// //           (g.first_name ILIKE $${paramCount} OR 
// //            g.last_name ILIKE $${paramCount} OR
// //            g.email ILIKE $${paramCount} OR
// //            r.room_number ILIKE $${paramCount})
// //         `);
// //         values.push(`%${filters.search}%`);
// //         paramCount++;
// //       }

// //       // Build WHERE clause
// //       const whereClause = whereConditions.length > 0 
// //         ? `WHERE ${whereConditions.join(' AND ')}` 
// //         : '';

// //       // Count query
// //       const countQuery = `
// //         SELECT COUNT(*) 
// //         FROM reservations res
// //         JOIN guests g ON res.guest_id = g.guest_id
// //         JOIN rooms r ON res.room_id = r.room_id
// //         ${whereClause}
// //       `;

// //       // Data query
// //       // UPDATE: Added paid_amount subquery so Admin UI sees payment status
// //       const dataQuery = `
// //         SELECT 
// //           res.*,
// //           g.first_name || ' ' || g.last_name as guest_name,
// //           g.email as guest_email,
// //           g.phone as guest_phone,
// //           r.room_number,
// //           rt.type_name as room_type,
// //           u.email as created_by_email,
// //           (SELECT COALESCE(SUM(amount), 0) FROM payments p 
// //            WHERE p.reservation_id = res.reservation_id 
// //            AND p.payment_status = 'completed') as paid_amount
// //         FROM reservations res
// //         JOIN guests g ON res.guest_id = g.guest_id
// //         JOIN rooms r ON res.room_id = r.room_id
// //         JOIN room_types rt ON r.room_type_id = rt.room_type_id
// //         JOIN users u ON res.created_by = u.user_id
// //         ${whereClause}
// //         ORDER BY res.reservation_id DESC
// //         LIMIT $${paramCount} OFFSET $${paramCount + 1}
// //       `;

// //       // Add pagination parameters
// //       values.push(limit, offset);

// //       const [countResult, dataResult] = await Promise.all([
// //         pool.query(countQuery, values.slice(0, whereConditions.length)),
// //         pool.query(dataQuery, values)
// //       ]);

// //       const total = parseInt(countResult.rows[0].count);
// //       const totalPages = Math.ceil(total / limit);

// //       return {
// //         reservations: dataResult.rows,
// //         pagination: {
// //           page,
// //           limit,
// //           total,
// //           totalPages,
// //           hasNext: page < totalPages,
// //           hasPrev: page > 1
// //         }
// //       };
// //     } catch (error) {
// //       throw new Error(`Database error getting reservations: ${error.message}`);
// //     }
// //   }

// //   /**
// //    * Update reservation
// //    */
// //   static async update(reservationId, updateData) {
// //     try {
// //       const fields = [];
// //       const values = [];
// //       let paramCount = 1;

// //       Object.keys(updateData).forEach(key => {
// //         if (updateData[key] !== undefined) {
// //           fields.push(`${key} = $${paramCount}`);
// //           values.push(updateData[key]);
// //           paramCount++;
// //         }
// //       });

// //       if (fields.length === 0) {
// //         throw new Error('No fields to update');
// //       }

// //       values.push(reservationId);

// //       const query = `
// //         UPDATE reservations 
// //         SET ${fields.join(', ')}
// //         WHERE reservation_id = $${paramCount}
// //         RETURNING *
// //       `;

// //       const result = await pool.query(query, values);
// //       return result.rows[0];
// //     } catch (error) {
// //       throw new Error(`Database error updating reservation: ${error.message}`);
// //     }
// //   }

// //   /**
// //    * Cancel reservation
// //    */
// //   static async cancel(reservationId, reason) {
// //     try {
// //       // 1. Get room ID first
// //       const resQuery = await pool.query("SELECT room_id FROM reservations WHERE reservation_id = $1", [reservationId]);
// //       const roomId = resQuery.rows[0]?.room_id;

// //       // 2. Update status
// //       const query = `
// //         UPDATE reservations 
// //         SET status = 'cancelled', 
// //             cancellation_reason = $1,
// //             updated_at = CURRENT_TIMESTAMP
// //         WHERE reservation_id = $2
// //         RETURNING *
// //       `;
// //       const result = await pool.query(query, [reason, reservationId]);

// //       // 3. UPDATE: Automatically release room to 'available'
// //       if (roomId) {
// //         await pool.query("UPDATE rooms SET status = 'available' WHERE room_id = $1", [roomId]);
// //       }

// //       return result.rows[0];
// //     } catch (error) {
// //       throw new Error(`Database error cancelling reservation: ${error.message}`);
// //     }
// //   }

// //   /**
// //    * Check in guest
// //    */
// //   static async checkIn(reservationId) {
// //     try {
// //       const query = `
// //         UPDATE reservations 
// //         SET status = 'checked-in', 
// //             actual_check_in = CURRENT_TIMESTAMP,
// //             updated_at = CURRENT_TIMESTAMP
// //         WHERE reservation_id = $1
// //         RETURNING *
// //       `;
// //       const result = await pool.query(query, [reservationId]);
      
// //       // Note: Room is already 'occupied' from creation, but ensuring it here is safe
// //       if (result.rows[0]) {
// //          await pool.query("UPDATE rooms SET status = 'occupied' WHERE room_id = $1", [result.rows[0].room_id]);
// //       }

// //       return result.rows[0];
// //     } catch (error) {
// //       throw new Error(`Database error checking in: ${error.message}`);
// //     }
// //   }

// //   /**
// //    * Check out guest
// //    */
// //   static async checkOut(reservationId) {
// //     try {
// //       const query = `
// //         UPDATE reservations 
// //         SET status = 'checked-out', 
// //             actual_check_out = CURRENT_TIMESTAMP,
// //             updated_at = CURRENT_TIMESTAMP
// //         WHERE reservation_id = $1
// //         RETURNING *
// //       `;
// //       const result = await pool.query(query, [reservationId]);

// //       // UPDATE: Automatically release room to 'available'
// //       if (result.rows[0]) {
// //         await pool.query("UPDATE rooms SET status = 'available' WHERE room_id = $1", [result.rows[0].room_id]);
// //       }

// //       return result.rows[0];
// //     } catch (error) {
// //       throw new Error(`Database error checking out: ${error.message}`);
// //     }
// //   }

// //   /**
// //    * Get guest's reservations
// //    */
// //   static async getGuestReservations(guestId) {
// //     try {
// //       const query = `
// //         SELECT 
// //           res.*,
// //           r.room_number,
// //           rt.type_name as room_type,
// //           (SELECT COALESCE(SUM(amount), 0) FROM payments p 
// //            WHERE p.reservation_id = res.reservation_id 
// //            AND p.payment_status = 'completed') as paid_amount
// //         FROM reservations res
// //         JOIN rooms r ON res.room_id = r.room_id
// //         JOIN room_types rt ON r.room_type_id = rt.room_type_id
// //         WHERE res.guest_id = $1
// //         ORDER BY res.check_in_date DESC
// //       `;
// //       const result = await pool.query(query, [guestId]);
// //       return result.rows;
// //     } catch (error) {
// //       throw new Error(`Database error getting guest reservations: ${error.message}`);
// //     }
// //   }

// //   /**
// //    * Calculate reservation price
// //    */
// //   static async calculatePrice(roomId, checkInDate, checkOutDate) {
// //     try {
// //       // Get room price
// //       const roomQuery = `
// //         SELECT rt.base_price, r.price_adjustment
// //         FROM rooms r
// //         JOIN room_types rt ON r.room_type_id = rt.room_type_id
// //         WHERE r.room_id = $1
// //       `;
// //       const roomResult = await pool.query(roomQuery, [roomId]);
      
// //       if (!roomResult.rows[0]) {
// //         throw new Error('Room not found');
// //       }

// //       const { base_price, price_adjustment } = roomResult.rows[0];
// //       const dailyRate = parseFloat(base_price) + parseFloat(price_adjustment || 0);

// //       // Calculate number of nights
// //       const checkIn = new Date(checkInDate);
// //       const checkOut = new Date(checkOutDate);
// //       const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

// //       return dailyRate * nights;
// //     } catch (error) {
// //       throw new Error(`Error calculating price: ${error.message}`);
// //     }
// //   }
// // }

// // export default Reservation;








// // /**
// //  * Reservation.js - Reservation model
// //  * * Handles booking operations including creation, modification,
// //  * cancellation, and availability checking.
// //  * * Dependencies:
// //  * - database pool from config/database.js
// //  */

// // import pool from '../config/database.js';

// // class Reservation {
// //   /**
// //    * Create new reservation
// //    * @param {Object} reservationData - Reservation information
// //    * @returns {Promise<Object>} Created reservation
// //    */
// //   static async create(reservationData) {
// //     try {
// //       const {
// //         guest_id,
// //         room_id,
// //         created_by,
// //         check_in_date,
// //         check_out_date,
// //         number_of_guests,
// //         total_amount,
// //         special_requests = null
// //       } = reservationData;

// //       const query = `
// //         INSERT INTO reservations (
// //           guest_id, room_id, created_by, check_in_date,
// //           check_out_date, number_of_guests, total_amount,
// //           special_requests, status
// //         )
// //         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'confirmed')
// //         RETURNING *
// //       `;

// //       const values = [
// //         guest_id,
// //         room_id,
// //         created_by,
// //         check_in_date,
// //         check_out_date,
// //         number_of_guests,
// //         total_amount,
// //         special_requests
// //       ];

// //       const result = await pool.query(query, values);
// //       return result.rows[0];
// //     } catch (error) {
// //       if (error.code === '23514') { // Check constraint violation
// //         throw new Error('Invalid date range or guest count');
// //       }
// //       throw new Error(`Database error creating reservation: ${error.message}`);
// //     }
// //   }

// //   /**
// //    * Find reservation by ID
// //    * @param {number} reservationId - Reservation ID
// //    * @returns {Promise<Object|null>} Reservation object or null
// //    */
// //   static async findById(reservationId) {
// //     try {
// //       const query = `
// //         SELECT 
// //           res.*,
// //           g.first_name || ' ' || g.last_name as guest_name,
// //           g.email as guest_email,
// //           g.phone as guest_phone,
// //           r.room_number,
// //           rt.type_name as room_type,
// //           u.email as created_by_email
// //         FROM reservations res
// //         JOIN guests g ON res.guest_id = g.guest_id
// //         JOIN rooms r ON res.room_id = r.room_id
// //         JOIN room_types rt ON r.room_type_id = rt.room_type_id
// //         JOIN users u ON res.created_by = u.user_id
// //         WHERE res.reservation_id = $1
// //       `;
// //       const result = await pool.query(query, [reservationId]);
// //       return result.rows[0] || null;
// //     } catch (error) {
// //       throw new Error(`Database error finding reservation: ${error.message}`);
// //     }
// //   }

// //   /**
// //    * Get all reservations with filters
// //    */
// //   static async getAll(filters = {}, page = 1, limit = 20) {
// //     try {
// //       const offset = (page - 1) * limit;
// //       const whereConditions = [];
// //       const values = [];
// //       let paramCount = 1;

// //       // Build filter conditions
// //       if (filters.guest_id) {
// //         whereConditions.push(`res.guest_id = $${paramCount}`);
// //         values.push(filters.guest_id);
// //         paramCount++;
// //       }

// //       if (filters.status) {
// //         whereConditions.push(`res.status = $${paramCount}`);
// //         values.push(filters.status);
// //         paramCount++;
// //       }

// //       if (filters.start_date) {
// //         whereConditions.push(`res.check_in_date >= $${paramCount}`);
// //         values.push(filters.start_date);
// //         paramCount++;
// //       }

// //       if (filters.end_date) {
// //         whereConditions.push(`res.check_out_date <= $${paramCount}`);
// //         values.push(filters.end_date);
// //         paramCount++;
// //       }

// //       if (filters.search) {
// //         whereConditions.push(`
// //           (g.first_name ILIKE $${paramCount} OR 
// //            g.last_name ILIKE $${paramCount} OR
// //            g.email ILIKE $${paramCount} OR
// //            r.room_number ILIKE $${paramCount})
// //         `);
// //         values.push(`%${filters.search}%`);
// //         paramCount++;
// //       }

// //       // Build WHERE clause
// //       const whereClause = whereConditions.length > 0 
// //         ? `WHERE ${whereConditions.join(' AND ')}` 
// //         : '';

// //       // Count query
// //       const countQuery = `
// //         SELECT COUNT(*) 
// //         FROM reservations res
// //         JOIN guests g ON res.guest_id = g.guest_id
// //         JOIN rooms r ON res.room_id = r.room_id
// //         ${whereClause}
// //       `;

// //       // Data query
// //       const dataQuery = `
// //         SELECT 
// //           res.*,
// //           g.first_name || ' ' || g.last_name as guest_name,
// //           g.email as guest_email,
// //           g.phone as guest_phone,
// //           r.room_number,
// //           rt.type_name as room_type,
// //           u.email as created_by_email
// //         FROM reservations res
// //         JOIN guests g ON res.guest_id = g.guest_id
// //         JOIN rooms r ON res.room_id = r.room_id
// //         JOIN room_types rt ON r.room_type_id = rt.room_type_id
// //         JOIN users u ON res.created_by = u.user_id
// //         ${whereClause}
// //         ORDER BY res.reservation_id DESC
// //         LIMIT $${paramCount} OFFSET $${paramCount + 1}
// //       `;

// //       // Add pagination parameters
// //       values.push(limit, offset);

// //       const [countResult, dataResult] = await Promise.all([
// //         pool.query(countQuery, values.slice(0, whereConditions.length)),
// //         pool.query(dataQuery, values)
// //       ]);

// //       const total = parseInt(countResult.rows[0].count);
// //       const totalPages = Math.ceil(total / limit);

// //       return {
// //         reservations: dataResult.rows,
// //         pagination: {
// //           page,
// //           limit,
// //           total,
// //           totalPages,
// //           hasNext: page < totalPages,
// //           hasPrev: page > 1
// //         }
// //       };
// //     } catch (error) {
// //       throw new Error(`Database error getting reservations: ${error.message}`);
// //     }
// //   }

// //   /**
// //    * Update reservation
// //    */
// //   static async update(reservationId, updateData) {
// //     try {
// //       const fields = [];
// //       const values = [];
// //       let paramCount = 1;

// //       Object.keys(updateData).forEach(key => {
// //         if (updateData[key] !== undefined) {
// //           fields.push(`${key} = $${paramCount}`);
// //           values.push(updateData[key]);
// //           paramCount++;
// //         }
// //       });

// //       if (fields.length === 0) {
// //         throw new Error('No fields to update');
// //       }

// //       values.push(reservationId);

// //       const query = `
// //         UPDATE reservations 
// //         SET ${fields.join(', ')}
// //         WHERE reservation_id = $${paramCount}
// //         RETURNING *
// //       `;

// //       const result = await pool.query(query, values);
// //       return result.rows[0];
// //     } catch (error) {
// //       throw new Error(`Database error updating reservation: ${error.message}`);
// //     }
// //   }

// //   /**
// //    * Cancel reservation
// //    */
// //   static async cancel(reservationId, reason) {
// //     try {
// //       const query = `
// //         UPDATE reservations 
// //         SET status = 'cancelled', 
// //             cancellation_reason = $1,
// //             updated_at = CURRENT_TIMESTAMP
// //         WHERE reservation_id = $2
// //         RETURNING *
// //       `;
// //       const result = await pool.query(query, [reason, reservationId]);
// //       return result.rows[0];
// //     } catch (error) {
// //       throw new Error(`Database error cancelling reservation: ${error.message}`);
// //     }
// //   }

// //   /**
// //    * Check in guest
// //    */
// //   static async checkIn(reservationId) {
// //     try {
// //       const query = `
// //         UPDATE reservations 
// //         SET status = 'checked-in', 
// //             actual_check_in = CURRENT_TIMESTAMP,
// //             updated_at = CURRENT_TIMESTAMP
// //         WHERE reservation_id = $1
// //         RETURNING *
// //       `;
// //       const result = await pool.query(query, [reservationId]);
// //       return result.rows[0];
// //     } catch (error) {
// //       throw new Error(`Database error checking in: ${error.message}`);
// //     }
// //   }

// //   /**
// //    * Check out guest
// //    */
// //   static async checkOut(reservationId) {
// //     try {
// //       const query = `
// //         UPDATE reservations 
// //         SET status = 'checked-out', 
// //             actual_check_out = CURRENT_TIMESTAMP,
// //             updated_at = CURRENT_TIMESTAMP
// //         WHERE reservation_id = $1
// //         RETURNING *
// //       `;
// //       const result = await pool.query(query, [reservationId]);
// //       return result.rows[0];
// //     } catch (error) {
// //       throw new Error(`Database error checking out: ${error.message}`);
// //     }
// //   }

// //   /**
// //    * Get guest's reservations
// //    */
// //   static async getGuestReservations(guestId) {
// //     try {
// //       const query = `
// //         SELECT 
// //           res.*,
// //           r.room_number,
// //           rt.type_name as room_type,
// //           (SELECT SUM(amount) FROM payments p 
// //            WHERE p.reservation_id = res.reservation_id 
// //            AND p.payment_status = 'completed') as paid_amount
// //         FROM reservations res
// //         JOIN rooms r ON res.room_id = r.room_id
// //         JOIN room_types rt ON r.room_type_id = rt.room_type_id
// //         WHERE res.guest_id = $1
// //         ORDER BY res.check_in_date DESC
// //       `;
// //       const result = await pool.query(query, [guestId]);
// //       return result.rows;
// //     } catch (error) {
// //       throw new Error(`Database error getting guest reservations: ${error.message}`);
// //     }
// //   }

// //   /**
// //    * Calculate reservation price
// //    */
// //   static async calculatePrice(roomId, checkInDate, checkOutDate) {
// //     try {
// //       // Get room price
// //       const roomQuery = `
// //         SELECT rt.base_price, r.price_adjustment
// //         FROM rooms r
// //         JOIN room_types rt ON r.room_type_id = rt.room_type_id
// //         WHERE r.room_id = $1
// //       `;
// //       const roomResult = await pool.query(roomQuery, [roomId]);
      
// //       if (!roomResult.rows[0]) {
// //         throw new Error('Room not found');
// //       }

// //       const { base_price, price_adjustment } = roomResult.rows[0];
// //       const dailyRate = parseFloat(base_price) + parseFloat(price_adjustment || 0);

// //       // Calculate number of nights
// //       const checkIn = new Date(checkInDate);
// //       const checkOut = new Date(checkOutDate);
// //       const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

// //       return dailyRate * nights;
// //     } catch (error) {
// //       throw new Error(`Error calculating price: ${error.message}`);
// //     }
// //   }
// // }

// // export default Reservation;
