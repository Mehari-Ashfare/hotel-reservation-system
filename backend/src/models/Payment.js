/**
 * Payment.js - Payment model
 * * Handles payment processing including recording payments,
 * refunds, and payment status management.
 * * Dependencies:
 * - database pool from config/database.js
 */

import pool from '../config/database.js';

class Payment {
  /**
   * Create new payment
   * @param {Object} paymentData - Payment information
   * @returns {Promise<Object>} Created payment
   */
  static async create(paymentData) {
    try {
      const {
        reservation_id,
        amount,
        payment_method,
        payment_status = 'pending',
        transaction_id = null,
        processed_by = null,
        notes = null
      } = paymentData;

      const query = `
        INSERT INTO payments (
          reservation_id, amount, payment_method, payment_status,
          transaction_id, processed_by, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const values = [
        reservation_id,
        amount,
        payment_method,
        payment_status,
        transaction_id,
        processed_by,
        notes
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Database error creating payment: ${error.message}`);
    }
  }

  /**
   * Find payment by ID
   * @param {number} paymentId - Payment ID
   * @returns {Promise<Object|null>} Payment object or null
   */
  static async findById(paymentId) {
    try {
      const query = `
        SELECT 
          p.*,
          res.reservation_id,
          g.first_name || ' ' || g.last_name as guest_name,
          r.room_number,
          s.first_name || ' ' || s.last_name as processed_by_name
        FROM payments p
        JOIN reservations res ON p.reservation_id = res.reservation_id
        JOIN guests g ON res.guest_id = g.guest_id
        JOIN rooms r ON res.room_id = r.room_id
        LEFT JOIN staff s ON p.processed_by = s.staff_id
        WHERE p.payment_id = $1
      `;
      const result = await pool.query(query, [paymentId]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Database error finding payment: ${error.message}`);
    }
  }

  /**
   * Find payments by Reservation ID
   */
  static async findByReservationId(reservationId) {
    try {
      const query = `
        SELECT * FROM payments 
        WHERE reservation_id = $1 
        ORDER BY created_at DESC
      `;
      const result = await pool.query(query, [reservationId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error finding payments for reservation: ${error.message}`);
    }
  }

  /**
   * Get all payments with filters
   */
  static async getAll(filters = {}, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      const whereConditions = [];
      const values = [];
      let paramCount = 1;

      // Build filter conditions
      if (filters.reservation_id) {
        whereConditions.push(`p.reservation_id = $${paramCount}`);
        values.push(filters.reservation_id);
        paramCount++;
      }

      if (filters.payment_status) {
        whereConditions.push(`p.payment_status = $${paramCount}`);
        values.push(filters.payment_status);
        paramCount++;
      }

      if (filters.payment_method) {
        whereConditions.push(`p.payment_method = $${paramCount}`);
        values.push(filters.payment_method);
        paramCount++;
      }

      if (filters.start_date) {
        whereConditions.push(`p.payment_date >= $${paramCount}`);
        values.push(filters.start_date);
        paramCount++;
      }

      if (filters.end_date) {
        whereConditions.push(`p.payment_date <= $${paramCount}`);
        values.push(filters.end_date);
        paramCount++;
      }

      // Build WHERE clause
      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';

      // Count query
      const countQuery = `
        SELECT COUNT(*) 
        FROM payments p
        ${whereClause}
      `;

      // Data query
      const dataQuery = `
        SELECT 
          p.*,
          res.reservation_id,
          g.first_name || ' ' || g.last_name as guest_name,
          r.room_number
        FROM payments p
        JOIN reservations res ON p.reservation_id = res.reservation_id
        JOIN guests g ON res.guest_id = g.guest_id
        JOIN rooms r ON res.room_id = r.room_id
        ${whereClause}
        ORDER BY p.payment_date DESC
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
        payments: dataResult.rows,
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
      throw new Error(`Database error getting payments: ${error.message}`);
    }
  }

  /**
   * Update payment
   */
  static async update(paymentId, updateData) {
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

      values.push(paymentId);

      const query = `
        UPDATE payments 
        SET ${fields.join(', ')}
        WHERE payment_id = $${paramCount}
        RETURNING *
      `;

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Database error updating payment: ${error.message}`);
    }
  }

  /**
   * Process payment (mark as completed)
   */
  static async processPayment(paymentId, processedBy, transactionId = null) {
    try {
      const query = `
        UPDATE payments 
        SET payment_status = 'completed',
            payment_date = CURRENT_TIMESTAMP,
            processed_by = $1,
            transaction_id = $2
        WHERE payment_id = $3
        RETURNING *
      `;
      const result = await pool.query(query, [processedBy, transactionId, paymentId]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Database error processing payment: ${error.message}`);
    }
  }

  /**
   * Process refund
   */
  static async processRefund(paymentId, refundAmount, reason) {
    try {
      // Check if refund is valid
      const checkQuery = 'SELECT amount, refund_amount FROM payments WHERE payment_id = $1';
      const checkResult = await pool.query(checkQuery, [paymentId]);
      
      if (!checkResult.rows[0]) {
        throw new Error('Payment not found');
      }

      const { amount, refund_amount } = checkResult.rows[0];
      const totalRefunded = parseFloat(refund_amount || 0) + parseFloat(refundAmount);

      if (totalRefunded > amount) {
        throw new Error('Refund amount cannot exceed original payment');
      }

      // FIX: Explicitly cast strings to ENUM type using ::payment_status_enum
      const query = `
        UPDATE payments 
        SET refund_amount = $1,
            refund_reason = $2,
            payment_status = CASE 
              WHEN $1 = amount THEN 'refunded'::payment_status_enum
              ELSE 'partially_refunded'::payment_status_enum
            END
        WHERE payment_id = $3
        RETURNING *
      `;
      const result = await pool.query(query, [totalRefunded, reason, paymentId]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Database error processing refund: ${error.message}`);
    }
  }

  /**
   * Get payments summary for a reservation
   */
  static async getReservationSummary(reservationId) {
    try {
      const query = `
        SELECT 
          SUM(amount) as total_paid,
          SUM(refund_amount) as total_refunded,
          COUNT(*) as payment_count,
          ARRAY_AGG(payment_status) as statuses
        FROM payments 
        WHERE reservation_id = $1
      `;
      const result = await pool.query(query, [reservationId]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Database error getting payment summary: ${error.message}`);
    }
  }

  /**
   * Get financial report
   */
  static async getFinancialReport(startDate, endDate) {
    try {
      const query = `
        SELECT 
          DATE(payment_date) as payment_date,
          payment_method,
          payment_status,
          COUNT(*) as transaction_count,
          SUM(amount) as total_amount,
          SUM(refund_amount) as total_refunds
        FROM payments 
        WHERE payment_date BETWEEN $1 AND $2
        GROUP BY DATE(payment_date), payment_method, payment_status
        ORDER BY payment_date DESC, payment_method
      `;
      const result = await pool.query(query, [startDate, endDate]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error getting financial report: ${error.message}`);
    }
  }
}

export default Payment;






// /**
//  * Payment.js - Payment model
//  * * Handles payment processing including recording payments,
//  * refunds, and payment status management.
//  * * Dependencies:
//  * - database pool from config/database.js
//  */

// import pool from '../config/database.js';

// class Payment {
//   /**
//    * Create new payment
//    * @param {Object} paymentData - Payment information
//    * @returns {Promise<Object>} Created payment
//    */
//   static async create(paymentData) {
//     try {
//       const {
//         reservation_id,
//         amount,
//         payment_method,
//         payment_status = 'pending',
//         transaction_id = null,
//         processed_by = null,
//         notes = null
//       } = paymentData;

//       const query = `
//         INSERT INTO payments (
//           reservation_id, amount, payment_method, payment_status,
//           transaction_id, processed_by, notes
//         )
//         VALUES ($1, $2, $3, $4, $5, $6, $7)
//         RETURNING *
//       `;

//       const values = [
//         reservation_id,
//         amount,
//         payment_method,
//         payment_status,
//         transaction_id,
//         processed_by,
//         notes
//       ];

//       const result = await pool.query(query, values);
//       return result.rows[0];
//     } catch (error) {
//       throw new Error(`Database error creating payment: ${error.message}`);
//     }
//   }

//   /**
//    * Find payment by ID
//    * @param {number} paymentId - Payment ID
//    * @returns {Promise<Object|null>} Payment object or null
//    */
//   static async findById(paymentId) {
//     try {
//       const query = `
//         SELECT 
//           p.*,
//           res.reservation_id,
//           g.first_name || ' ' || g.last_name as guest_name,
//           r.room_number,
//           s.first_name || ' ' || s.last_name as processed_by_name
//         FROM payments p
//         JOIN reservations res ON p.reservation_id = res.reservation_id
//         JOIN guests g ON res.guest_id = g.guest_id
//         JOIN rooms r ON res.room_id = r.room_id
//         LEFT JOIN staff s ON p.processed_by = s.staff_id
//         WHERE p.payment_id = $1
//       `;
//       const result = await pool.query(query, [paymentId]);
//       return result.rows[0] || null;
//     } catch (error) {
//       throw new Error(`Database error finding payment: ${error.message}`);
//     }
//   }

//   /**
//    * Get all payments with filters
//    */
//   static async getAll(filters = {}, page = 1, limit = 20) {
//     try {
//       const offset = (page - 1) * limit;
//       const whereConditions = [];
//       const values = [];
//       let paramCount = 1;

//       // Build filter conditions
//       if (filters.reservation_id) {
//         whereConditions.push(`p.reservation_id = $${paramCount}`);
//         values.push(filters.reservation_id);
//         paramCount++;
//       }

//       if (filters.payment_status) {
//         whereConditions.push(`p.payment_status = $${paramCount}`);
//         values.push(filters.payment_status);
//         paramCount++;
//       }

//       if (filters.payment_method) {
//         whereConditions.push(`p.payment_method = $${paramCount}`);
//         values.push(filters.payment_method);
//         paramCount++;
//       }

//       if (filters.start_date) {
//         whereConditions.push(`p.payment_date >= $${paramCount}`);
//         values.push(filters.start_date);
//         paramCount++;
//       }

//       if (filters.end_date) {
//         whereConditions.push(`p.payment_date <= $${paramCount}`);
//         values.push(filters.end_date);
//         paramCount++;
//       }

//       // Build WHERE clause
//       const whereClause = whereConditions.length > 0 
//         ? `WHERE ${whereConditions.join(' AND ')}` 
//         : '';

//       // Count query
//       const countQuery = `
//         SELECT COUNT(*) 
//         FROM payments p
//         ${whereClause}
//       `;

//       // Data query
//       const dataQuery = `
//         SELECT 
//           p.*,
//           res.reservation_id,
//           g.first_name || ' ' || g.last_name as guest_name,
//           r.room_number
//         FROM payments p
//         JOIN reservations res ON p.reservation_id = res.reservation_id
//         JOIN guests g ON res.guest_id = g.guest_id
//         JOIN rooms r ON res.room_id = r.room_id
//         ${whereClause}
//         ORDER BY p.payment_date DESC
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
//         payments: dataResult.rows,
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
//       throw new Error(`Database error getting payments: ${error.message}`);
//     }
//   }

//   /**
//    * Update payment
//    */
//   static async update(paymentId, updateData) {
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

//       values.push(paymentId);

//       const query = `
//         UPDATE payments 
//         SET ${fields.join(', ')}
//         WHERE payment_id = $${paramCount}
//         RETURNING *
//       `;

//       const result = await pool.query(query, values);
//       return result.rows[0];
//     } catch (error) {
//       throw new Error(`Database error updating payment: ${error.message}`);
//     }
//   }

//   /**
//    * Process payment (mark as completed)
//    */
//   static async processPayment(paymentId, processedBy, transactionId = null) {
//     try {
//       const query = `
//         UPDATE payments 
//         SET payment_status = 'completed',
//             payment_date = CURRENT_TIMESTAMP,
//             processed_by = $1,
//             transaction_id = $2
//         WHERE payment_id = $3
//         RETURNING *
//       `;
//       const result = await pool.query(query, [processedBy, transactionId, paymentId]);
//       return result.rows[0];
//     } catch (error) {
//       throw new Error(`Database error processing payment: ${error.message}`);
//     }
//   }

//   /**
//    * Process refund
//    */
//   static async processRefund(paymentId, refundAmount, reason) {
//     try {
//       // Check if refund is valid
//       const checkQuery = 'SELECT amount, refund_amount FROM payments WHERE payment_id = $1';
//       const checkResult = await pool.query(checkQuery, [paymentId]);
      
//       if (!checkResult.rows[0]) {
//         throw new Error('Payment not found');
//       }

//       const { amount, refund_amount } = checkResult.rows[0];
//       const totalRefunded = parseFloat(refund_amount || 0) + parseFloat(refundAmount);

//       if (totalRefunded > amount) {
//         throw new Error('Refund amount cannot exceed original payment');
//       }

//       const query = `
//         UPDATE payments 
//         SET refund_amount = $1,
//             refund_reason = $2,
//             payment_status = CASE 
//               WHEN $1 = amount THEN 'refunded'
//               ELSE 'partially_refunded'
//             END
//         WHERE payment_id = $3
//         RETURNING *
//       `;
//       const result = await pool.query(query, [totalRefunded, reason, paymentId]);
//       return result.rows[0];
//     } catch (error) {
//       throw new Error(`Database error processing refund: ${error.message}`);
//     }
//   }

//   /**
//    * Get payments summary for a reservation
//    */
//   static async getReservationSummary(reservationId) {
//     try {
//       const query = `
//         SELECT 
//           SUM(amount) as total_paid,
//           SUM(refund_amount) as total_refunded,
//           COUNT(*) as payment_count,
//           ARRAY_AGG(payment_status) as statuses
//         FROM payments 
//         WHERE reservation_id = $1
//       `;
//       const result = await pool.query(query, [reservationId]);
//       return result.rows[0];
//     } catch (error) {
//       throw new Error(`Database error getting payment summary: ${error.message}`);
//     }
//   }

//   /**
//    * Get financial report
//    */
//   static async getFinancialReport(startDate, endDate) {
//     try {
//       const query = `
//         SELECT 
//           DATE(payment_date) as payment_date,
//           payment_method,
//           payment_status,
//           COUNT(*) as transaction_count,
//           SUM(amount) as total_amount,
//           SUM(refund_amount) as total_refunds
//         FROM payments 
//         WHERE payment_date BETWEEN $1 AND $2
//         GROUP BY DATE(payment_date), payment_method, payment_status
//         ORDER BY payment_date DESC, payment_method
//       `;
//       const result = await pool.query(query, [startDate, endDate]);
//       return result.rows;
//     } catch (error) {
//       throw new Error(`Database error getting financial report: ${error.message}`);
//     }
//   }
// }

// export default Payment;
