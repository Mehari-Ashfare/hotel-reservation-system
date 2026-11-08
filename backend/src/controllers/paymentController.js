// // /**
// //  * paymentController.js - Payment controller
// //  * * Handles payment processing, refunds, and financial reporting.
// //  * * Dependencies:
// //  * - Payment model for database operations
// //  * - Reservation model to validate bookings
// //  */

// // import pool from '../config/database.js';
// // import Payment from '../models/Payment.js';
// // import Reservation from '../models/Reservation.js';
// // import AuditLogger from '../utils/auditLogger.js';

// // class PaymentController {
// //   /**
// //    * Create new payment
// //    */
// //   static async createPayment(req, res) {
// //     try {
// //       const { reservation_id, amount, payment_method, notes } = req.body;

// //       // 1. Validate Reservation exists
// //       const reservation = await Reservation.findById(reservation_id);
// //       if (!reservation) {
// //         return res.status(404).json({
// //           success: false,
// //           message: 'Reservation not found'
// //         });
// //       }

// //       // 2. SAFETY CHECK: Is it already paid?
// //       // We sum up all *completed* payments for this reservation
// //       const balanceQuery = `
// //         SELECT COALESCE(SUM(amount), 0) as total_paid 
// //         FROM payments 
// //         WHERE reservation_id = $1 AND payment_status = 'completed'
// //       `;
// //       const balanceResult = await pool.query(balanceQuery, [reservation_id]);
// //       const totalPaid = Number(balanceResult.rows[0].total_paid);
// //       const totalCost = Number(reservation.total_amount);

// //       // If they have already paid the full amount (or more), block new payments
// //       if (totalPaid >= totalCost) {
// //         return res.status(400).json({
// //             success: false,
// //             message: 'This reservation is already fully paid.'
// //         });
// //       }

// //       // Optional: Prevent overpayment (e.g., if owing $50 but trying to pay $100)
// //       const remainingBalance = totalCost - totalPaid;
// //       if (Number(amount) > remainingBalance) {
// //          // You can choose to block this or just warn. blocking is safer.
// //          return res.status(400).json({
// //              success: false,
// //              message: `Overpayment detected. Remaining balance is $${remainingBalance.toFixed(2)}`
// //          });
// //       }

// //       // 3. Determine who processed the payment
// //       const processedBy = req.user.id;

// //       const paymentData = {
// //         reservation_id,
// //         amount,
// //         payment_method,
// //         payment_status: 'completed', 
// //         processed_by: processedBy,
// //         notes: notes || 'Online Payment'
// //       };

// //       const payment = await Payment.create(paymentData);

// //       // 4. Update Reservation Status
// //       // If the NEW total paid equals the total cost, ensure it is confirmed.
// //       if (totalPaid + Number(amount) >= totalCost) {
// //           await pool.query(
// //             "UPDATE reservations SET status = 'confirmed' WHERE reservation_id = $1",
// //             [reservation_id]
// //           );
// //       }

// //       // AUDIT LOG
// //       await AuditLogger.log({
// //         table_name: 'payments',
// //         record_id: payment.payment_id,
// //         action: 'INSERT',
// //         new_values: {
// //           payment_id: payment.payment_id,
// //           reservation_id: payment.reservation_id,
// //           amount: payment.amount,
// //           status: payment.payment_status,
// //           method: payment.payment_method,
// //           processed_by: processedBy
// //         },
// //         user_id: req.user?.id || null,
// //         ip_address: AuditLogger.getClientIp(req),
// //         user_agent: req.get('user-agent')
// //       });

// //       res.status(201).json({
// //         success: true,
// //         message: 'Payment recorded successfully',
// //         data: payment
// //       });
// //     } catch (error) {
// //       console.error('Create payment error:', error);
// //       res.status(500).json({
// //         success: false,
// //         message: error.message || 'Failed to record payment'
// //       });
// //     }
// //   }

// //   // ... (Keep getAllPayments, getPaymentById, getReservationPayments, processPayment, processRefund, getFinancialReport EXACTLY as they were in the previous consolidated version) ...
  
// //   static async getAllPayments(req, res) {
// //     try {
// //       const { page = 1, limit = 20, start_date, end_date, method } = req.query;
// //       const filters = {};
// //       if (start_date) filters.start_date = start_date;
// //       if (end_date) filters.end_date = end_date;
// //       if (method) filters.payment_method = method;
// //       const result = await Payment.getAll(filters, parseInt(page), parseInt(limit));
// //       res.json({ success: true, data: result });
// //     } catch (error) {
// //       console.error('Get payments error:', error);
// //       res.status(500).json({ success: false, message: error.message || 'Failed to get payments' });
// //     }
// //   }

// //   static async getPaymentById(req, res) {
// //     try {
// //       const { id } = req.params;
// //       const payment = await Payment.findById(id);
// //       if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
// //       res.json({ success: true, data: payment });
// //     } catch (error) {
// //       console.error('Get payment error:', error);
// //       res.status(500).json({ success: false, message: error.message || 'Failed to get payment' });
// //     }
// //   }

// //   static async getReservationPayments(req, res) {
// //     try {
// //       const { reservation_id } = req.params;
// //       const payments = await Payment.findByReservationId(reservation_id);
// //       res.json({ success: true, data: payments });
// //     } catch (error) {
// //       console.error('Get reservation payments error:', error);
// //       res.status(500).json({ success: false, message: error.message || 'Failed to get reservation payments' });
// //     }
// //   }

// //   static async processPayment(req, res) {
// //     try {
// //       const { id } = req.params;
// //       const oldPayment = await Payment.findById(id);
// //       if (!oldPayment) return res.status(404).json({ success: false, message: 'Payment not found' });

// //       const result = await pool.query(
// //         `UPDATE payments SET payment_status = $1, processed_by = $2 WHERE payment_id = $3 RETURNING *`,
// //         ['completed', req.user.id, id]
// //       );
// //       const payment = result.rows[0];

// //       await AuditLogger.log({
// //         table_name: 'payments',
// //         record_id: parseInt(id),
// //         action: 'UPDATE',
// //         old_values: { status: oldPayment.payment_status },
// //         new_values: { status: 'completed', processed_by: req.user.id },
// //         user_id: req.user?.id || null,
// //         ip_address: AuditLogger.getClientIp(req),
// //         user_agent: req.get('user-agent')
// //       });

// //       res.json({ success: true, message: 'Payment processed successfully', data: payment });
// //     } catch (error) {
// //       console.error('Process payment error:', error);
// //       res.status(500).json({ success: false, message: error.message || 'Failed to process payment' });
// //     }
// //   }

// //   static async processRefund(req, res) {
// //     try {
// //       const { id } = req.params;
// //       const { reason } = req.body;
// //       const oldPayment = await Payment.findById(id);
// //       if (!oldPayment) return res.status(404).json({ success: false, message: 'Payment not found' });

// //       const result = await pool.query(
// //         `UPDATE payments SET payment_status = $1, processed_by = $2, notes = $3 WHERE payment_id = $4 RETURNING *`,
// //         ['refunded', req.user.id, reason, id]
// //       );
// //       const payment = result.rows[0];

// //       await AuditLogger.log({
// //         table_name: 'payments',
// //         record_id: parseInt(id),
// //         action: 'UPDATE',
// //         old_values: { status: oldPayment.payment_status },
// //         new_values: { status: 'refunded', notes: reason },
// //         user_id: req.user?.id || null,
// //         ip_address: AuditLogger.getClientIp(req),
// //         user_agent: req.get('user-agent')
// //       });

// //       res.json({ success: true, message: 'Refund processed successfully', data: payment });
// //     } catch (error) {
// //       console.error('Process refund error:', error);
// //       res.status(500).json({ success: false, message: error.message || 'Failed to process refund' });
// //     }
// //   }

// //   static async getFinancialReport(req, res) {
// //     try {
// //       const { start_date, end_date } = req.query;
// //       if (!start_date || !end_date) return res.status(400).json({ success: false, message: 'Dates required' });
// //       const report = await Payment.getFinancialReport(start_date, end_date);
// //       res.json({ success: true, data: report });
// //     } catch (error) {
// //       console.error('Get financial report error:', error);
// //       res.status(500).json({ success: false, message: error.message || 'Failed to get financial report' });
// //     }
// //   }
// // }

// // export default PaymentController;


// /**
//  * paymentController.js - Payment controller
//  * * Handles payment processing, refunds, and financial reporting.
//  * * Dependencies:
//  * - Payment model for database operations
//  * - Reservation model to validate bookings
//  */

// import pool from '../config/database.js';
// import Payment from '../models/Payment.js';
// import Reservation from '../models/Reservation.js';
// import AuditLogger from '../utils/auditLogger.js';

// class PaymentController {
//   /**
//    * Create new payment
//    */
//   static async createPayment(req, res) {
//     try {
//       const { reservation_id, amount, payment_method, notes } = req.body;

//       // 1. Validate Reservation exists
//       const reservation = await Reservation.findById(reservation_id);
//       if (!reservation) {
//         return res.status(404).json({
//           success: false,
//           message: 'Reservation not found'
//         });
//       }

//       // 2. SAFETY CHECK: Is it already paid?
//       // We sum up all *completed* payments for this reservation
//       const balanceQuery = `
//         SELECT COALESCE(SUM(amount), 0) as total_paid 
//         FROM payments 
//         WHERE reservation_id = $1 AND payment_status = 'completed'
//       `;
//       const balanceResult = await pool.query(balanceQuery, [reservation_id]);
//       const totalPaid = Number(balanceResult.rows[0].total_paid);
//       const totalCost = Number(reservation.total_amount);

//       // If they have already paid the full amount (or more), block new payments
//       if (totalPaid >= totalCost) {
//         return res.status(400).json({
//             success: false,
//             message: 'This reservation is already fully paid.'
//         });
//       }

//       // Optional: Prevent overpayment (e.g., if owing $50 but trying to pay $100)
//       const remainingBalance = totalCost - totalPaid;
//       if (Number(amount) > remainingBalance) {
//          // You can choose to block this or just warn. blocking is safer.
//          return res.status(400).json({
//              success: false,
//              message: `Overpayment detected. Remaining balance is $${remainingBalance.toFixed(2)}`
//          });
//       }

//       // 3. Determine who processed the payment
//       const processedBy = req.user.id;

//       const paymentData = {
//         reservation_id,
//         amount,
//         payment_method,
//         payment_status: 'completed', 
//         processed_by: processedBy,
//         notes: notes || 'Online Payment'
//       };

//       const payment = await Payment.create(paymentData);

//       // 4. Update Reservation Status
//       // If the NEW total paid equals the total cost, ensure it is confirmed.
//       if (totalPaid + Number(amount) >= totalCost) {
//           await pool.query(
//             "UPDATE reservations SET status = 'confirmed' WHERE reservation_id = $1",
//             [reservation_id]
//           );
//       }

//       // AUDIT LOG
//       await AuditLogger.log({
//         table_name: 'payments',
//         record_id: payment.payment_id,
//         action: 'INSERT',
//         new_values: {
//           payment_id: payment.payment_id,
//           reservation_id: payment.reservation_id,
//           amount: payment.amount,
//           status: payment.payment_status,
//           method: payment.payment_method,
//           processed_by: processedBy
//         },
//         user_id: req.user?.id || null,
//         ip_address: AuditLogger.getClientIp(req),
//         user_agent: req.get('user-agent')
//       });

//       res.status(201).json({
//         success: true,
//         message: 'Payment recorded successfully',
//         data: payment
//       });
//     } catch (error) {
//       console.error('Create payment error:', error);
//       res.status(500).json({
//         success: false,
//         message: error.message || 'Failed to record payment'
//       });
//     }
//   }

//   // ... (Standard Getters) ...
  
//   static async getAllPayments(req, res) {
//     try {
//       const { page = 1, limit = 20, start_date, end_date, method } = req.query;
//       const filters = {};
//       if (start_date) filters.start_date = start_date;
//       if (end_date) filters.end_date = end_date;
//       if (method) filters.payment_method = method;
//       const result = await Payment.getAll(filters, parseInt(page), parseInt(limit));
//       res.json({ success: true, data: result });
//     } catch (error) {
//       console.error('Get payments error:', error);
//       res.status(500).json({ success: false, message: error.message || 'Failed to get payments' });
//     }
//   }

//   static async getPaymentById(req, res) {
//     try {
//       const { id } = req.params;
//       const payment = await Payment.findById(id);
//       if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
//       res.json({ success: true, data: payment });
//     } catch (error) {
//       console.error('Get payment error:', error);
//       res.status(500).json({ success: false, message: error.message || 'Failed to get payment' });
//     }
//   }

//   static async getReservationPayments(req, res) {
//     try {
//       const { reservation_id } = req.params;
//       const payments = await Payment.findByReservationId(reservation_id);
//       res.json({ success: true, data: payments });
//     } catch (error) {
//       console.error('Get reservation payments error:', error);
//       res.status(500).json({ success: false, message: error.message || 'Failed to get reservation payments' });
//     }
//   }

//   static async processPayment(req, res) {
//     try {
//       const { id } = req.params;
//       const oldPayment = await Payment.findById(id);
//       if (!oldPayment) return res.status(404).json({ success: false, message: 'Payment not found' });

//       const result = await pool.query(
//         `UPDATE payments SET payment_status = $1, processed_by = $2 WHERE payment_id = $3 RETURNING *`,
//         ['completed', req.user.id, id]
//       );
//       const payment = result.rows[0];

//       await AuditLogger.log({
//         table_name: 'payments',
//         record_id: parseInt(id),
//         action: 'UPDATE',
//         old_values: { status: oldPayment.payment_status },
//         new_values: { status: 'completed', processed_by: req.user.id },
//         user_id: req.user?.id || null,
//         ip_address: AuditLogger.getClientIp(req),
//         user_agent: req.get('user-agent')
//       });

//       res.json({ success: true, message: 'Payment processed successfully', data: payment });
//     } catch (error) {
//       console.error('Process payment error:', error);
//       res.status(500).json({ success: false, message: error.message || 'Failed to process payment' });
//     }
//   }

//   /**
//    * Process refund - FIXED: Now extracts amount and uses Model logic
//    */
//   static async processRefund(req, res) {
//     try {
//       const { id } = req.params;
//       const { reason, refund_amount } = req.body; // Extract amount from request

//       // FIX: Use the Model's logic which updates 'refund_amount' and 'refund_reason' columns
//       // instead of just overwriting 'payment_status' via SQL.
//       // This ensures the amount shows up in your database.
//       const payment = await Payment.processRefund(id, refund_amount, reason);

//       await AuditLogger.log({
//         table_name: 'payments',
//         record_id: parseInt(id),
//         action: 'UPDATE',
//         new_values: { status: 'refunded', refund_amount, refund_reason: reason },
//         user_id: req.user?.id || null,
//         ip_address: AuditLogger.getClientIp(req),
//         user_agent: req.get('user-agent')
//       });

//       res.json({ success: true, message: 'Refund processed successfully', data: payment });
//     } catch (error) {
//       console.error('Process refund error:', error);
//       res.status(500).json({ success: false, message: error.message || 'Failed to process refund' });
//     }
//   }

//   static async getFinancialReport(req, res) {
//     try {
//       const { start_date, end_date } = req.query;
//       if (!start_date || !end_date) return res.status(400).json({ success: false, message: 'Dates required' });
//       const report = await Payment.getFinancialReport(start_date, end_date);
//       res.json({ success: true, data: report });
//     } catch (error) {
//       console.error('Get financial report error:', error);
//       res.status(500).json({ success: false, message: error.message || 'Failed to get financial report' });
//     }
//   }
// }

// export default PaymentController;


/**
 * paymentController.js - Payment controller
 * * Handles payment processing, refunds, and financial reporting.
 * * Dependencies:
 * - Payment model for database operations
 * - Reservation model to validate bookings
 */

import pool from '../config/database.js';
import Payment from '../models/Payment.js';
import Reservation from '../models/Reservation.js';
import AuditLogger from '../utils/auditLogger.js';

class PaymentController {
  /**
   * Create new payment
   */
  static async createPayment(req, res) {
    try {
      const { reservation_id, amount, payment_method, notes } = req.body;

      // 1. Validate Reservation exists
      const reservation = await Reservation.findById(reservation_id);
      if (!reservation) {
        return res.status(404).json({
          success: false,
          message: 'Reservation not found'
        });
      }

      // 2. SAFETY CHECK: Is it already paid?
      // We sum up all *completed* payments for this reservation
      const balanceQuery = `
        SELECT COALESCE(SUM(amount), 0) as total_paid 
        FROM payments 
        WHERE reservation_id = $1 AND payment_status = 'completed'
      `;
      const balanceResult = await pool.query(balanceQuery, [reservation_id]);
      const totalPaid = Number(balanceResult.rows[0].total_paid);
      const totalCost = Number(reservation.total_amount);

      // If they have already paid the full amount (or more), block new payments
      if (totalPaid >= totalCost) {
        return res.status(400).json({
            success: false,
            message: 'This reservation is already fully paid.'
        });
      }

      // Optional: Prevent overpayment (e.g., if owing $50 but trying to pay $100)
      const remainingBalance = totalCost - totalPaid;
      if (Number(amount) > remainingBalance) {
         // You can choose to block this or just warn. blocking is safer.
         return res.status(400).json({
             success: false,
             message: `Overpayment detected. Remaining balance is $${remainingBalance.toFixed(2)}`
         });
      }

      // 3. Determine who processed the payment
      const processedBy = req.user.id;

      const paymentData = {
        reservation_id,
        amount,
        payment_method,
        payment_status: 'completed', 
        processed_by: processedBy,
        notes: notes || 'Online Payment'
      };

      const payment = await Payment.create(paymentData);

      // 4. Update Reservation Status
      // If the NEW total paid equals the total cost, ensure it is confirmed.
      if (totalPaid + Number(amount) >= totalCost) {
          await pool.query(
            "UPDATE reservations SET status = 'confirmed' WHERE reservation_id = $1",
            [reservation_id]
          );
      }

      // AUDIT LOG
      await AuditLogger.log({
        table_name: 'payments',
        record_id: payment.payment_id,
        action: 'INSERT',
        new_values: {
          payment_id: payment.payment_id,
          reservation_id: payment.reservation_id,
          amount: payment.amount,
          status: payment.payment_status,
          method: payment.payment_method,
          processed_by: processedBy
        },
        user_id: req.user?.id || null,
        ip_address: AuditLogger.getClientIp(req),
        user_agent: req.get('user-agent')
      });

      res.status(201).json({
        success: true,
        message: 'Payment recorded successfully',
        data: payment
      });
    } catch (error) {
      console.error('Create payment error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to record payment'
      });
    }
  }

  // ... (Standard Getters) ...
  
  static async getAllPayments(req, res) {
    try {
      const { page = 1, limit = 20, start_date, end_date, method } = req.query;
      const filters = {};
      if (start_date) filters.start_date = start_date;
      if (end_date) filters.end_date = end_date;
      if (method) filters.payment_method = method;
      const result = await Payment.getAll(filters, parseInt(page), parseInt(limit));
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Get payments error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to get payments' });
    }
  }

  static async getPaymentById(req, res) {
    try {
      const { id } = req.params;
      const payment = await Payment.findById(id);
      if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
      res.json({ success: true, data: payment });
    } catch (error) {
      console.error('Get payment error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to get payment' });
    }
  }

  static async getReservationPayments(req, res) {
    try {
      const { reservation_id } = req.params;
      const payments = await Payment.findByReservationId(reservation_id);
      res.json({ success: true, data: payments });
    } catch (error) {
      console.error('Get reservation payments error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to get reservation payments' });
    }
  }

  static async processPayment(req, res) {
    try {
      const { id } = req.params;
      const oldPayment = await Payment.findById(id);
      if (!oldPayment) return res.status(404).json({ success: false, message: 'Payment not found' });

      const result = await pool.query(
        `UPDATE payments SET payment_status = $1, processed_by = $2 WHERE payment_id = $3 RETURNING *`,
        ['completed', req.user.id, id]
      );
      const payment = result.rows[0];

      await AuditLogger.log({
        table_name: 'payments',
        record_id: parseInt(id),
        action: 'UPDATE',
        old_values: { status: oldPayment.payment_status },
        new_values: { status: 'completed', processed_by: req.user.id },
        user_id: req.user?.id || null,
        ip_address: AuditLogger.getClientIp(req),
        user_agent: req.get('user-agent')
      });

      res.json({ success: true, message: 'Payment processed successfully', data: payment });
    } catch (error) {
      console.error('Process payment error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to process payment' });
    }
  }

  /**
   * Process refund - FIXED: Now extracts amount and uses Model logic
   */
  static async processRefund(req, res) {
    try {
      const { id } = req.params;
      const { reason, refund_amount } = req.body; // Extract amount from request

      // FIX: Use the Model's logic which updates 'refund_amount' and 'refund_reason' columns
      // instead of just overwriting 'payment_status' via SQL.
      // This ensures the amount shows up in your database.
      const payment = await Payment.processRefund(id, refund_amount, reason);

      await AuditLogger.log({
        table_name: 'payments',
        record_id: parseInt(id),
        action: 'UPDATE',
        new_values: { status: 'refunded', refund_amount, refund_reason: reason },
        user_id: req.user?.id || null,
        ip_address: AuditLogger.getClientIp(req),
        user_agent: req.get('user-agent')
      });

      res.json({ success: true, message: 'Refund processed successfully', data: payment });
    } catch (error) {
      console.error('Process refund error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to process refund' });
    }
  }

  static async getFinancialReport(req, res) {
    try {
      const { start_date, end_date } = req.query;
      if (!start_date || !end_date) return res.status(400).json({ success: false, message: 'Dates required' });
      const report = await Payment.getFinancialReport(start_date, end_date);
      res.json({ success: true, data: report });
    } catch (error) {
      console.error('Get financial report error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to get financial report' });
    }
  }
}

export default PaymentController;

