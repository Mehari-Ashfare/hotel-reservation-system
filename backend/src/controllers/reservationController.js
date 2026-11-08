/**
 * reservationController.js - Reservation controller
 * * Handles all reservation-related operations including booking,
 * modification, cancellation, and check-in/out.
 * * Dependencies:
 * - Reservation model for database operations
 * - Guest model for guest validation
 * - Room model for room validation
 */

import pool from '../config/database.js';
import Reservation from '../models/Reservation.js';
import Guest from '../models/Guest.js';
import Room from '../models/Room.js';
import AuditLogger from '../utils/auditLogger.js';

class ReservationController {
  /**
   * Create new reservation
   */
  static async createReservation(req, res) {
    try {
      const {
        guest_id,
        room_id,
        check_in_date,
        check_out_date,
        number_of_guests,
        special_requests
      } = req.body;

      // 1. Validate Guest
      const guest = await Guest.findById(guest_id);
      if (!guest) {
        return res.status(404).json({
          success: false,
          message: 'Guest not found'
        });
      }

      // 2. Validate Room & Get Details (Price/Capacity) via SQL JOIN
      const roomQuery = `
        SELECT r.*, rt.max_occupancy, rt.base_price 
        FROM rooms r 
        JOIN room_types rt ON r.room_type_id = rt.room_type_id 
        WHERE r.room_id = $1
      `;
      const roomResult = await pool.query(roomQuery, [room_id]);
      const room = roomResult.rows[0];

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      // 3. Check Capacity
      if (number_of_guests > room.max_occupancy) {
        return res.status(400).json({
          success: false,
          message: `Room capacity is ${room.max_occupancy} guests`
        });
      }

      // 4. Calculate Price Manually
      const start = new Date(check_in_date);
      const end = new Date(check_out_date);
      const diffTime = Math.abs(end - start);
      const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (nights <= 0) {
        return res.status(400).json({
             success: false, 
             message: 'Invalid date range' 
        });
      }

      const total_amount = nights * Number(room.base_price);

      const reservationData = {
        guest_id,
        room_id,
        created_by: req.user.id,
        check_in_date,
        check_out_date,
        number_of_guests,
        total_amount,
        special_requests
      };

      // Create Reservation (Confirmed by default for online bookings)
      const query = `
        INSERT INTO reservations (
          guest_id, room_id, check_in_date, check_out_date, 
          number_of_guests, total_amount, special_requests, 
          status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed', $8)
        RETURNING *
      `;

      const result = await pool.query(query, [
        guest_id, room_id, check_in_date, check_out_date, 
        number_of_guests, total_amount, special_requests, 
        req.user.id
      ]);

      const reservation = result.rows[0];

      // Immediately mark Room as 'occupied'
      await pool.query(
        "UPDATE rooms SET status = 'occupied' WHERE room_id = $1",
        [room_id]
      );

      // AUDIT LOG
      await AuditLogger.log({
        table_name: 'reservations',
        record_id: reservation.reservation_id,
        action: 'INSERT',
        new_values: reservation,
        user_id: req.user?.id || null,
        ip_address: AuditLogger.getClientIp(req),
        user_agent: req.get('user-agent')
      });

      res.status(201).json({
        success: true,
        message: 'Reservation created successfully',
        data: reservation
      });
    } catch (error) {
      console.error('Create reservation error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create reservation'
      });
    }
  }

  /**
   * Get all reservations with filters
   */
  static async getAllReservations(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20,
        guest_id,
        status,
        start_date,
        end_date,
        search
      } = req.query;

      const filters = {};
      if (guest_id) filters.guest_id = guest_id;
      if (status) filters.status = status;
      if (start_date) filters.start_date = start_date;
      if (end_date) filters.end_date = end_date;
      if (search) filters.search = search;

      const result = await Reservation.getAll(filters, parseInt(page), parseInt(limit));

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Get reservations error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get reservations'
      });
    }
  }

  /**
   * Get reservation by ID (FIXED: Calculates Total Paid for Admin UI)
   */
  static async getReservationById(req, res) {
    try {
      const { id } = req.params;
      
      // FIX: Use JOIN to calculate 'paid_amount' dynamically
      // We return 'total_paid' so the frontend UI can display it in the green box.
      const query = `
        SELECT 
            r.*, 
            COALESCE(SUM(p.amount), 0) as paid_amount,
            COALESCE(SUM(p.amount), 0) as total_paid,
            (r.total_amount - COALESCE(SUM(p.amount), 0)) as balance_due
        FROM reservations r
        LEFT JOIN payments p ON r.reservation_id = p.reservation_id AND p.payment_status = 'completed'
        WHERE r.reservation_id = $1
        GROUP BY r.reservation_id
      `;
      
      const result = await pool.query(query, [id]);
      const reservation = result.rows[0];

      if (!reservation) {
        return res.status(404).json({
          success: false,
          message: 'Reservation not found'
        });
      }

      res.json({
        success: true,
        data: reservation
      });
    } catch (error) {
      console.error('Get reservation error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get reservation'
      });
    }
  }

  /**
   * Update reservation
   */
  static async updateReservation(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      delete updateData.reservation_id;
      delete updateData.created_at;
      delete updateData.total_amount; 

      const oldReservation = await Reservation.findById(id);
      if (!oldReservation) {
        return res.status(404).json({
          success: false,
          message: 'Reservation not found'
        });
      }

      // Recalculate price if dates/room change
      if (updateData.check_in_date || updateData.check_out_date || updateData.room_id) {
        const roomId = updateData.room_id || oldReservation.room_id;
        const checkIn = new Date(updateData.check_in_date || oldReservation.check_in_date);
        const checkOut = new Date(updateData.check_out_date || oldReservation.check_out_date);

        const roomRes = await pool.query(
            `SELECT rt.base_price FROM rooms r 
             JOIN room_types rt ON r.room_type_id = rt.room_type_id 
             WHERE r.room_id = $1`, 
            [roomId]
        );
        
        if (roomRes.rows.length > 0) {
            const price = Number(roomRes.rows[0].base_price);
            const nights = Math.ceil(Math.abs(checkOut - checkIn) / (1000 * 60 * 60 * 24));
            updateData.total_amount = nights * price;
        }
      }

      const reservation = await Reservation.update(id, updateData);

      if (!reservation) {
        return res.status(404).json({
          success: false,
          message: 'Reservation not found'
        });
      }

      await AuditLogger.log({
        table_name: 'reservations',
        record_id: parseInt(id),
        action: 'UPDATE',
        old_values: oldReservation,
        new_values: reservation || { ...oldReservation, ...updateData },
        user_id: req.user?.id || null,
        ip_address: AuditLogger.getClientIp(req),
        user_agent: req.get('user-agent')
      });

      res.json({
        success: true,
        message: 'Reservation updated successfully',
        data: reservation
      });
    } catch (error) {
      console.error('Update reservation error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update reservation'
      });
    }
  }

  /**
   * Cancel reservation
   */
  static async cancelReservation(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cancellation reason is required'
        });
      }

      const oldReservation = await Reservation.findById(id);
      if (!oldReservation) {
        return res.status(404).json({
          success: false,
          message: 'Reservation not found'
        });
      }

      const reservation = await Reservation.cancel(id, reason.trim());

      if (!reservation) {
        return res.status(404).json({
          success: false,
          message: 'Reservation not found'
        });
      }

      // Cancellation makes room 'available'
      await pool.query(
        "UPDATE rooms SET status = 'available' WHERE room_id = $1",
        [oldReservation.room_id]
      );

      await AuditLogger.log({
        table_name: 'reservations',
        record_id: parseInt(id),
        action: 'UPDATE',
        old_values: oldReservation,
        new_values: { 
            status: (reservation && reservation.status) || 'cancelled',
            cancellation_reason: reason.trim()
        },
        user_id: req.user?.id || null,
        ip_address: AuditLogger.getClientIp(req),
        user_agent: req.get('user-agent')
      });

      res.json({
        success: true,
        message: 'Reservation cancelled successfully',
        data: reservation
      });
    } catch (error) {
      console.error('Cancel reservation error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to cancel reservation'
      });
    }
  }

  /**
   * Check in guest
   */
  static async checkIn(req, res) {
    try {
      const { id } = req.params;
      
      const oldReservation = await Reservation.findById(id);
      if (!oldReservation) {
        return res.status(404).json({
          success: false,
          message: 'Reservation not found'
        });
      }

      // Strict Payment Check BEFORE Check-In
      const payQuery = `
        SELECT COALESCE(SUM(amount), 0) as paid_amount 
        FROM payments 
        WHERE reservation_id = $1 AND payment_status = 'completed'
      `;
      const payResult = await pool.query(payQuery, [id]);
      const totalPaid = Number(payResult.rows[0].paid_amount);
      const totalCost = Number(oldReservation.total_amount);

      if (totalPaid < totalCost) {
        return res.status(400).json({
            success: false,
            message: `Check-in denied. Payment incomplete. Paid: $${totalPaid}, Due: $${totalCost}`
        });
      }

      const reservation = await Reservation.checkIn(id);

      if (!reservation) {
        return res.status(404).json({
          success: false,
          message: 'Reservation not found'
        });
      }

      // Confirm Room is 'occupied'
      await pool.query(
        "UPDATE rooms SET status = 'occupied' WHERE room_id = $1",
        [oldReservation.room_id]
      );

      await AuditLogger.log({
        table_name: 'reservations',
        record_id: parseInt(id),
        action: 'UPDATE',
        old_values: oldReservation,
        new_values: { 
            status: (reservation && reservation.status) || 'checked-in',
            actual_check_in: (reservation && reservation.actual_check_in) || new Date()
        },
        user_id: req.user?.id || null,
        ip_address: AuditLogger.getClientIp(req),
        user_agent: req.get('user-agent')
      });

      res.json({
        success: true,
        message: 'Guest checked in successfully',
        data: reservation
      });
    } catch (error) {
      console.error('Check in error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to check in guest'
      });
    }
  }

  /**
   * Check out guest
   */
  static async checkOut(req, res) {
    try {
      const { id } = req.params;
      
      const oldReservation = await Reservation.findById(id);
      if (!oldReservation) {
        return res.status(404).json({
          success: false,
          message: 'Reservation not found'
        });
      }

      const reservation = await Reservation.checkOut(id);

      if (!reservation) {
        return res.status(404).json({
          success: false,
          message: 'Reservation not found'
        });
      }

      // Check-out makes room 'available'
      await pool.query(
        "UPDATE rooms SET status = 'available' WHERE room_id = $1",
        [oldReservation.room_id]
      );

      await AuditLogger.log({
        table_name: 'reservations',
        record_id: parseInt(id),
        action: 'UPDATE',
        old_values: oldReservation,
        new_values: { 
            status: (reservation && reservation.status) || 'checked-out',
            actual_check_out: (reservation && reservation.actual_check_out) || new Date()
        },
        user_id: req.user?.id || null,
        ip_address: AuditLogger.getClientIp(req),
        user_agent: req.get('user-agent')
      });

      res.json({
        success: true,
        message: 'Guest checked out successfully',
        data: reservation
      });
    } catch (error) {
      console.error('Check out error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to check out guest'
      });
    }
  }

  /**
   * Get guest's reservations
   */
  static async getGuestReservations(req, res) {
    try {
      const { guest_id } = req.params;

      // Smart Query for Guest UI "Pay" button
      const query = `
        SELECT 
            r.*, 
            rooms.room_number,
            room_types.type_name,
            COALESCE(SUM(p.amount), 0) as paid_amount,
            CASE 
                WHEN COALESCE(SUM(p.amount), 0) >= r.total_amount THEN 'paid'
                ELSE 'unpaid'
            END as payment_status
        FROM reservations r
        LEFT JOIN rooms ON r.room_id = rooms.room_id
        LEFT JOIN room_types ON rooms.room_type_id = room_types.room_type_id
        LEFT JOIN payments p ON r.reservation_id = p.reservation_id AND p.payment_status = 'completed'
        WHERE r.guest_id = $1
        GROUP BY r.reservation_id, rooms.room_number, room_types.type_name, rooms.room_id, room_types.room_type_id
        ORDER BY r.created_at DESC
      `;

      const result = await pool.query(query, [guest_id]);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Get guest reservations error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get guest reservations'
      });
    }
  }

  /**
   * Calculate reservation price
   */
  static async calculatePrice(req, res) {
    try {
      const { room_id, check_in_date, check_out_date } = req.body;

      if (!room_id || !check_in_date || !check_out_date) {
        return res.status(400).json({
          success: false,
          message: 'Room ID, check-in date, and check-out date are required'
        });
      }

      const roomRes = await pool.query(
        `SELECT rt.base_price FROM rooms r 
         JOIN room_types rt ON r.room_type_id = rt.room_type_id 
         WHERE r.room_id = $1`, 
        [room_id]
      );

      let price = 0;
      if (roomRes.rows.length > 0) {
         const basePrice = Number(roomRes.rows[0].base_price);
         const start = new Date(check_in_date);
         const end = new Date(check_out_date);
         const nights = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));
         price = nights * basePrice;
      }

      res.json({
        success: true,
        data: { total_amount: price }
      });
    } catch (error) {
      console.error('Calculate price error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to calculate price'
      });
    }
  }
}

export default ReservationController;



// /**
//  * reservationController.js - Reservation controller
//  * * Handles all reservation-related operations including booking,
//  * modification, cancellation, and check-in/out.
//  * * Dependencies:
//  * - Reservation model for database operations
//  * - Guest model for guest validation
//  * - Room model for room validation
//  */

// import pool from '../config/database.js';
// import Reservation from '../models/Reservation.js';
// import Guest from '../models/Guest.js';
// import Room from '../models/Room.js';
// import AuditLogger from '../utils/auditLogger.js';

// class ReservationController {
//   /**
//    * Create new reservation
//    */
//   static async createReservation(req, res) {
//     try {
//       const {
//         guest_id,
//         room_id,
//         check_in_date,
//         check_out_date,
//         number_of_guests,
//         special_requests
//       } = req.body;

//       // 1. Validate Guest
//       const guest = await Guest.findById(guest_id);
//       if (!guest) {
//         return res.status(404).json({
//           success: false,
//           message: 'Guest not found'
//         });
//       }

//       // 2. Validate Room & Get Details (Price/Capacity) via SQL JOIN
//       const roomQuery = `
//         SELECT r.*, rt.max_occupancy, rt.base_price 
//         FROM rooms r 
//         JOIN room_types rt ON r.room_type_id = rt.room_type_id 
//         WHERE r.room_id = $1
//       `;
//       const roomResult = await pool.query(roomQuery, [room_id]);
//       const room = roomResult.rows[0];

//       if (!room) {
//         return res.status(404).json({
//           success: false,
//           message: 'Room not found'
//         });
//       }

//       // 3. Check Capacity
//       if (number_of_guests > room.max_occupancy) {
//         return res.status(400).json({
//           success: false,
//           message: `Room capacity is ${room.max_occupancy} guests`
//         });
//       }

//       // 4. Calculate Price Manually
//       const start = new Date(check_in_date);
//       const end = new Date(check_out_date);
//       const diffTime = Math.abs(end - start);
//       const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
//       if (nights <= 0) {
//         return res.status(400).json({
//              success: false, 
//              message: 'Invalid date range' 
//         });
//       }

//       const total_amount = nights * Number(room.base_price);

//       const reservationData = {
//         guest_id,
//         room_id,
//         created_by: req.user.id,
//         check_in_date,
//         check_out_date,
//         number_of_guests,
//         total_amount,
//         special_requests
//       };

//       // FIX: Changed 'status' from 'pending' to 'confirmed'
//       // Your DB enum strictly requires: 'confirmed', 'checked-in', 'checked-out', 'cancelled', 'no-show'
//       // Since payment is immediate in this flow, 'confirmed' is the correct status.
//       const query = `
//         INSERT INTO reservations (
//           guest_id, room_id, check_in_date, check_out_date, 
//           number_of_guests, total_amount, special_requests, 
//           status, created_by
//         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed', $8)
//         RETURNING *
//       `;

//       const result = await pool.query(query, [
//         guest_id, room_id, check_in_date, check_out_date, 
//         number_of_guests, total_amount, special_requests, 
//         req.user.id
//       ]);

//       const reservation = result.rows[0];

//       // AUDIT LOG
//       await AuditLogger.log({
//         table_name: 'reservations',
//         record_id: reservation.reservation_id,
//         action: 'INSERT',
//         new_values: reservation,
//         user_id: req.user?.id || null,
//         ip_address: AuditLogger.getClientIp(req),
//         user_agent: req.get('user-agent')
//       });

//       res.status(201).json({
//         success: true,
//         message: 'Reservation created successfully',
//         data: reservation
//       });
//     } catch (error) {
//       console.error('Create reservation error:', error);
//       res.status(500).json({
//         success: false,
//         message: error.message || 'Failed to create reservation'
//       });
//     }
//   }

//   /**
//    * Get all reservations with filters
//    */
//   static async getAllReservations(req, res) {
//     try {
//       const { 
//         page = 1, 
//         limit = 20,
//         guest_id,
//         status,
//         start_date,
//         end_date,
//         search
//       } = req.query;

//       const filters = {};
//       if (guest_id) filters.guest_id = guest_id;
//       if (status) filters.status = status;
//       if (start_date) filters.start_date = start_date;
//       if (end_date) filters.end_date = end_date;
//       if (search) filters.search = search;

//       const result = await Reservation.getAll(filters, parseInt(page), parseInt(limit));

//       res.json({
//         success: true,
//         data: result
//       });
//     } catch (error) {
//       console.error('Get reservations error:', error);
//       res.status(500).json({
//         success: false,
//         message: error.message || 'Failed to get reservations'
//       });
//     }
//   }

//   /**
//    * Get reservation by ID
//    */
//   static async getReservationById(req, res) {
//     try {
//       const { id } = req.params;
//       const reservation = await Reservation.findById(id);

//       if (!reservation) {
//         return res.status(404).json({
//           success: false,
//           message: 'Reservation not found'
//         });
//       }

//       res.json({
//         success: true,
//         data: reservation
//       });
//     } catch (error) {
//       console.error('Get reservation error:', error);
//       res.status(500).json({
//         success: false,
//         message: error.message || 'Failed to get reservation'
//       });
//     }
//   }

//   /**
//    * Update reservation
//    */
//   static async updateReservation(req, res) {
//     try {
//       const { id } = req.params;
//       const updateData = req.body;

//       delete updateData.reservation_id;
//       delete updateData.created_at;
//       delete updateData.total_amount; 

//       const oldReservation = await Reservation.findById(id);
//       if (!oldReservation) {
//         return res.status(404).json({
//           success: false,
//           message: 'Reservation not found'
//         });
//       }

//       // Recalculate price if dates/room change
//       if (updateData.check_in_date || updateData.check_out_date || updateData.room_id) {
//         const roomId = updateData.room_id || oldReservation.room_id;
//         const checkIn = new Date(updateData.check_in_date || oldReservation.check_in_date);
//         const checkOut = new Date(updateData.check_out_date || oldReservation.check_out_date);

//         const roomRes = await pool.query(
//             `SELECT rt.base_price FROM rooms r 
//              JOIN room_types rt ON r.room_type_id = rt.room_type_id 
//              WHERE r.room_id = $1`, 
//             [roomId]
//         );
        
//         if (roomRes.rows.length > 0) {
//             const price = Number(roomRes.rows[0].base_price);
//             const nights = Math.ceil(Math.abs(checkOut - checkIn) / (1000 * 60 * 60 * 24));
//             updateData.total_amount = nights * price;
//         }
//       }

//       const reservation = await Reservation.update(id, updateData);

//       if (!reservation) {
//         return res.status(404).json({
//           success: false,
//           message: 'Reservation not found'
//         });
//       }

//       await AuditLogger.log({
//         table_name: 'reservations',
//         record_id: parseInt(id),
//         action: 'UPDATE',
//         old_values: oldReservation,
//         new_values: reservation || { ...oldReservation, ...updateData },
//         user_id: req.user?.id || null,
//         ip_address: AuditLogger.getClientIp(req),
//         user_agent: req.get('user-agent')
//       });

//       res.json({
//         success: true,
//         message: 'Reservation updated successfully',
//         data: reservation
//       });
//     } catch (error) {
//       console.error('Update reservation error:', error);
//       res.status(500).json({
//         success: false,
//         message: error.message || 'Failed to update reservation'
//       });
//     }
//   }

//   /**
//    * Cancel reservation
//    */
//   static async cancelReservation(req, res) {
//     try {
//       const { id } = req.params;
//       const { reason } = req.body;

//       if (!reason || reason.trim().length === 0) {
//         return res.status(400).json({
//           success: false,
//           message: 'Cancellation reason is required'
//         });
//       }

//       const oldReservation = await Reservation.findById(id);
//       if (!oldReservation) {
//         return res.status(404).json({
//           success: false,
//           message: 'Reservation not found'
//         });
//       }

//       const reservation = await Reservation.cancel(id, reason.trim());

//       if (!reservation) {
//         return res.status(404).json({
//           success: false,
//           message: 'Reservation not found'
//         });
//       }

//       await AuditLogger.log({
//         table_name: 'reservations',
//         record_id: parseInt(id),
//         action: 'UPDATE',
//         old_values: oldReservation,
//         new_values: { 
//             status: (reservation && reservation.status) || 'cancelled',
//             cancellation_reason: reason.trim()
//         },
//         user_id: req.user?.id || null,
//         ip_address: AuditLogger.getClientIp(req),
//         user_agent: req.get('user-agent')
//       });

//       res.json({
//         success: true,
//         message: 'Reservation cancelled successfully',
//         data: reservation
//       });
//     } catch (error) {
//       console.error('Cancel reservation error:', error);
//       res.status(500).json({
//         success: false,
//         message: error.message || 'Failed to cancel reservation'
//       });
//     }
//   }

//   /**
//    * Check in guest
//    */
//   static async checkIn(req, res) {
//     try {
//       const { id } = req.params;
      
//       const oldReservation = await Reservation.findById(id);
//       if (!oldReservation) {
//         return res.status(404).json({
//           success: false,
//           message: 'Reservation not found'
//         });
//       }

//       const reservation = await Reservation.checkIn(id);

//       if (!reservation) {
//         return res.status(404).json({
//           success: false,
//           message: 'Reservation not found'
//         });
//       }

//       await pool.query(
//         "UPDATE rooms SET status = 'occupied' WHERE room_id = $1",
//         [oldReservation.room_id]
//       );

//       await AuditLogger.log({
//         table_name: 'reservations',
//         record_id: parseInt(id),
//         action: 'UPDATE',
//         old_values: oldReservation,
//         new_values: { 
//             status: (reservation && reservation.status) || 'checked-in',
//             actual_check_in: (reservation && reservation.actual_check_in) || new Date()
//         },
//         user_id: req.user?.id || null,
//         ip_address: AuditLogger.getClientIp(req),
//         user_agent: req.get('user-agent')
//       });

//       res.json({
//         success: true,
//         message: 'Guest checked in successfully',
//         data: reservation
//       });
//     } catch (error) {
//       console.error('Check in error:', error);
//       res.status(500).json({
//         success: false,
//         message: error.message || 'Failed to check in guest'
//       });
//     }
//   }

//   /**
//    * Check out guest
//    */
//   static async checkOut(req, res) {
//     try {
//       const { id } = req.params;
      
//       const oldReservation = await Reservation.findById(id);
//       if (!oldReservation) {
//         return res.status(404).json({
//           success: false,
//           message: 'Reservation not found'
//         });
//       }

//       const reservation = await Reservation.checkOut(id);

//       if (!reservation) {
//         return res.status(404).json({
//           success: false,
//           message: 'Reservation not found'
//         });
//       }

//       await pool.query(
//         "UPDATE rooms SET status = 'available' WHERE room_id = $1",
//         [oldReservation.room_id]
//       );

//       await AuditLogger.log({
//         table_name: 'reservations',
//         record_id: parseInt(id),
//         action: 'UPDATE',
//         old_values: oldReservation,
//         new_values: { 
//             status: (reservation && reservation.status) || 'checked-out',
//             actual_check_out: (reservation && reservation.actual_check_out) || new Date()
//         },
//         user_id: req.user?.id || null,
//         ip_address: AuditLogger.getClientIp(req),
//         user_agent: req.get('user-agent')
//       });

//       res.json({
//         success: true,
//         message: 'Guest checked out successfully',
//         data: reservation
//       });
//     } catch (error) {
//       console.error('Check out error:', error);
//       res.status(500).json({
//         success: false,
//         message: error.message || 'Failed to check out guest'
//       });
//     }
//   }

//   /**
//    * Get guest's reservations
//    */
//   static async getGuestReservations(req, res) {
//     try {
//       const { guest_id } = req.params;

//       const query = `
//         SELECT 
//             r.*, 
//             rooms.room_number,
//             room_types.type_name,
//             COALESCE(SUM(p.amount), 0) as paid_amount,
//             CASE 
//                 WHEN COALESCE(SUM(p.amount), 0) >= r.total_amount THEN 'paid'
//                 ELSE 'unpaid'
//             END as payment_status
//         FROM reservations r
//         LEFT JOIN rooms ON r.room_id = rooms.room_id
//         LEFT JOIN room_types ON rooms.room_type_id = room_types.room_type_id
//         LEFT JOIN payments p ON r.reservation_id = p.reservation_id AND p.payment_status = 'completed'
//         WHERE r.guest_id = $1
//         GROUP BY r.reservation_id, rooms.room_number, room_types.type_name, rooms.room_id, room_types.room_type_id
//         ORDER BY r.created_at DESC
//       `;

//       const result = await pool.query(query, [guest_id]);

//       res.json({
//         success: true,
//         data: result.rows
//       });
//     } catch (error) {
//       console.error('Get guest reservations error:', error);
//       res.status(500).json({
//         success: false,
//         message: error.message || 'Failed to get guest reservations'
//       });
//     }
//   }

//   /**
//    * Calculate reservation price
//    */
//   static async calculatePrice(req, res) {
//     try {
//       const { room_id, check_in_date, check_out_date } = req.body;

//       if (!room_id || !check_in_date || !check_out_date) {
//         return res.status(400).json({
//           success: false,
//           message: 'Room ID, check-in date, and check-out date are required'
//         });
//       }

//       const roomRes = await pool.query(
//         `SELECT rt.base_price FROM rooms r 
//          JOIN room_types rt ON r.room_type_id = rt.room_type_id 
//          WHERE r.room_id = $1`, 
//         [room_id]
//       );

//       let price = 0;
//       if (roomRes.rows.length > 0) {
//          const basePrice = Number(roomRes.rows[0].base_price);
//          const start = new Date(check_in_date);
//          const end = new Date(check_out_date);
//          const nights = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));
//          price = nights * basePrice;
//       }

//       res.json({
//         success: true,
//         data: { total_amount: price }
//       });
//     } catch (error) {
//       console.error('Calculate price error:', error);
//       res.status(500).json({
//         success: false,
//         message: error.message || 'Failed to calculate price'
//       });
//     }
//   }
// }

// export default ReservationController;


