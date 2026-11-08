/**
 * reportController.js - Report controller
 * * Handles all reporting operations including daily, weekly,
 * monthly reports and business analytics.
 * * Dependencies:
 * - Various models for data aggregation
 */

import Reservation from '../models/Reservation.js';
import Payment from '../models/Payment.js';
import Room from '../models/Room.js';
import Guest from '../models/Guest.js';
import pool from '../config/database.js';
import AuditLogger from '../utils/auditLogger.js'; // ADD THIS

class ReportController {
  /**
   * Get daily report
   */
  static async getDailyReport(req, res) {
    try {
      const { date } = req.query;
      const reportDate = date ? new Date(date) : new Date();
      
      // Format date for database queries
      const formattedDate = reportDate.toISOString().split('T')[0];

      // Get daily occupancy
      const occupancyQuery = `
        SELECT 
          COUNT(DISTINCT r.room_id) as total_rooms,
          COUNT(DISTINCT res.room_id) as occupied_rooms,
          ROUND(
            COUNT(DISTINCT res.room_id) * 100.0 / NULLIF(COUNT(DISTINCT r.room_id), 0), 
          2) as occupancy_rate
        FROM rooms r
        LEFT JOIN reservations res ON r.room_id = res.room_id
          AND res.status IN ('confirmed', 'checked-in')
          AND $1::date BETWEEN res.check_in_date AND res.check_out_date - interval '1 day'
        WHERE r.is_active = true
      `;

      // Get daily check-ins
      const checkinsQuery = `
        SELECT COUNT(*) as check_ins
        FROM reservations
        WHERE DATE(actual_check_in) = $1::date
          AND status = 'checked-in'
      `;

      // Get daily check-outs
      const checkoutsQuery = `
        SELECT COUNT(*) as check_outs
        FROM reservations
        WHERE DATE(actual_check_out) = $1::date
          AND status = 'checked-out'
      `;

      // Get daily revenue
      const revenueQuery = `
        SELECT 
          COALESCE(SUM(amount), 0) as total_revenue,
          COALESCE(SUM(refund_amount), 0) as total_refunds,
          COUNT(*) as transaction_count
        FROM payments
        WHERE DATE(payment_date) = $1::date
          AND payment_status = 'completed'
      `;

      const [
        occupancyResult,
        checkinsResult,
        checkoutsResult,
        revenueResult,
        newGuestsResult
      ] = await Promise.all([
        pool.query(occupancyQuery, [formattedDate]),
        pool.query(checkinsQuery, [formattedDate]),
        pool.query(checkoutsQuery, [formattedDate]),
        pool.query(revenueQuery, [formattedDate]),
        pool.query('SELECT COUNT(*) as new_guests FROM guests WHERE DATE(created_at) = $1', [formattedDate])
      ]);

      // Calculate Available Rooms
      const totalRooms = parseInt(occupancyResult.rows[0].total_rooms || 0);
      const occupiedRooms = parseInt(occupancyResult.rows[0].occupied_rooms || 0);
      const availableRooms = totalRooms - occupiedRooms;

      const report = {
        date: formattedDate,
        occupancy: occupancyResult.rows[0],
        check_ins: checkinsResult.rows[0].check_ins,
        check_outs: checkoutsResult.rows[0].check_outs,
        revenue: revenueResult.rows[0]?.total_revenue || 0, // Ensure revenue is flat
        new_guests: newGuestsResult.rows[0].new_guests,
        availableRooms: availableRooms // <--- THIS FIXES THE DASHBOARD
      };

      // AUDIT LOG: Daily report accessed
      await AuditLogger.log({
        table_name: 'report_access',
        record_id: 0, // Using 0 as placeholder
        action: 'INSERT',
        new_values: {
          report_type: 'daily',
          report_date: formattedDate,
          accessed_by: req.user?.id,
          access_date: new Date(),
          ip_address: AuditLogger.getClientIp(req)
        },
        user_id: req.user?.id || null,
        ip_address: AuditLogger.getClientIp(req),
        user_agent: req.get('user-agent')
      });

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Get daily report error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get daily report'
      });
    }
  }

  /**
   * Get weekly report
   */
  static async getWeeklyReport(req, res) {
    try {
      const { start_date } = req.query;
      let startDate = start_date ? new Date(start_date) : new Date();
      
      // Adjust to start of week (Monday)
      const day = startDate.getDay();
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
      startDate = new Date(startDate.setDate(diff));
      
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);

      const formattedStart = startDate.toISOString().split('T')[0];
      const formattedEnd = endDate.toISOString().split('T')[0];

      // Get weekly occupancy
      const occupancyQuery = `
        SELECT 
          date::date,
          COUNT(DISTINCT r.room_id) as total_rooms,
          COUNT(DISTINCT CASE 
            WHEN res.status IN ('confirmed', 'checked-in') 
            AND date BETWEEN res.check_in_date AND res.check_out_date - interval '1 day'
            THEN res.room_id 
          END) as occupied_rooms,
          ROUND(
            COUNT(DISTINCT CASE 
              WHEN res.status IN ('confirmed', 'checked-in') 
              AND date BETWEEN res.check_in_date AND res.check_out_date - interval '1 day'
              THEN res.room_id 
            END) * 100.0 / NULLIF(COUNT(DISTINCT r.room_id), 0), 
          2) as occupancy_rate
        FROM generate_series($1::date, $2::date, interval '1 day') as date
        CROSS JOIN rooms r
        LEFT JOIN reservations res ON r.room_id = res.room_id
        WHERE r.is_active = true
        GROUP BY date::date
        ORDER BY date::date
      `;

      // Get weekly revenue
      const revenueQuery = `
        SELECT 
          DATE(payment_date) as payment_date,
          SUM(amount) as daily_revenue,
          SUM(refund_amount) as daily_refunds,
          COUNT(*) as transaction_count
        FROM payments
        WHERE payment_date BETWEEN $1::date AND $2::date
          AND payment_status = 'completed'
        GROUP BY DATE(payment_date)
        ORDER BY payment_date
      `;

      // Get weekly summary
      const summaryQuery = `
        SELECT 
          COUNT(DISTINCT res.reservation_id) as total_reservations,
          COUNT(DISTINCT CASE WHEN res.status = 'checked-in' THEN res.reservation_id END) as active_stays,
          COUNT(DISTINCT g.guest_id) as new_guests,
          COALESCE(SUM(p.amount), 0) as total_revenue,
          COALESCE(SUM(p.refund_amount), 0) as total_refunds
        FROM reservations res
        LEFT JOIN guests g ON DATE(g.created_at) BETWEEN $1::date AND $2::date
        LEFT JOIN payments p ON p.reservation_id = res.reservation_id
          AND DATE(p.payment_date) BETWEEN $1::date AND $2::date
          AND p.payment_status = 'completed'
        WHERE res.check_in_date BETWEEN $1::date AND $2::date
          OR res.check_out_date BETWEEN $1::date AND $2::date
          OR (res.check_in_date <= $1::date AND res.check_out_date >= $2::date)
      `;

      const [occupancyResult, revenueResult, summaryResult] = await Promise.all([
        pool.query(occupancyQuery, [formattedStart, formattedEnd]),
        pool.query(revenueQuery, [formattedStart, formattedEnd]),
        pool.query(summaryQuery, [formattedStart, formattedEnd])
      ]);

      const report = {
        period: {
          start_date: formattedStart,
          end_date: formattedEnd,
          week_number: Math.ceil((startDate.getDate() + new Date(startDate.getFullYear(), startDate.getMonth(), 1).getDay()) / 7)
        },
        daily_occupancy: occupancyResult.rows,
        daily_revenue: revenueResult.rows,
        summary: summaryResult.rows[0]
      };

      // AUDIT LOG: Weekly report accessed
      await AuditLogger.log({
        table_name: 'report_access',
        record_id: 0,
        action: 'INSERT',
        new_values: {
          report_type: 'weekly',
          start_date: formattedStart,
          end_date: formattedEnd,
          accessed_by: req.user?.id,
          access_date: new Date(),
          ip_address: AuditLogger.getClientIp(req)
        },
        user_id: req.user?.id || null,
        ip_address: AuditLogger.getClientIp(req),
        user_agent: req.get('user-agent')
      });

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Get weekly report error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get weekly report'
      });
    }
  }

  /**
   * Get monthly report
   */
  static async getMonthlyReport(req, res) {
    try {
      const { year, month } = req.query;
      const reportYear = year ? parseInt(year) : new Date().getFullYear();
      const reportMonth = month ? parseInt(month) - 1 : new Date().getMonth();

      const startDate = new Date(reportYear, reportMonth, 1);
      const endDate = new Date(reportYear, reportMonth + 1, 0);

      const formattedStart = startDate.toISOString().split('T')[0];
      const formattedEnd = endDate.toISOString().split('T')[0];

      // Get monthly statistics
      const statsQuery = `
        SELECT 
          -- Occupancy
          ROUND(AVG(
            (SELECT COUNT(DISTINCT res.room_id)
             FROM reservations res
             WHERE res.status IN ('confirmed', 'checked-in')
               AND date BETWEEN res.check_in_date AND res.check_out_date - interval '1 day')
            * 100.0 / NULLIF((SELECT COUNT(*) FROM rooms WHERE is_active = true), 0)
          ), 2) as avg_occupancy_rate,
          
          -- Reservations
          COUNT(DISTINCT res.reservation_id) as total_reservations,
          COUNT(DISTINCT CASE WHEN res.status = 'confirmed' THEN res.reservation_id END) as confirmed_reservations,
          COUNT(DISTINCT CASE WHEN res.status = 'checked-in' THEN res.reservation_id END) as active_reservations,
          COUNT(DISTINCT CASE WHEN res.status = 'cancelled' THEN res.reservation_id END) as cancelled_reservations,
          
          -- Guests
          COUNT(DISTINCT g.guest_id) as new_guests,
          COUNT(DISTINCT res.guest_id) as unique_guests,
          
          -- Revenue
          COALESCE(SUM(p.amount), 0) as total_revenue,
          COALESCE(SUM(p.refund_amount), 0) as total_refunds,
          COALESCE(SUM(p.amount) - COALESCE(SUM(p.refund_amount), 0), 0) as net_revenue,
          
          -- Room type breakdown
          (SELECT json_agg(row_to_json(room_types))
           FROM (
             SELECT rt.type_name, COUNT(DISTINCT res.room_id) as room_count,
                    COALESCE(SUM(res.total_amount), 0) as revenue
             FROM room_types rt
             LEFT JOIN rooms r ON rt.room_type_id = r.room_type_id
             LEFT JOIN reservations res ON r.room_id = res.room_id
               AND (res.check_in_date BETWEEN $1::date AND $2::date
                 OR res.check_out_date BETWEEN $1::date AND $2::date
                 OR (res.check_in_date <= $1::date AND res.check_out_date >= $2::date))
             GROUP BY rt.type_name
           ) room_types) as room_type_breakdown
        FROM generate_series($1::date, $2::date, interval '1 day') as date
        LEFT JOIN reservations res ON date BETWEEN res.check_in_date AND res.check_out_date - interval '1 day'
        LEFT JOIN guests g ON DATE(g.created_at) = date::date
        LEFT JOIN payments p ON DATE(p.payment_date) = date::date
          AND p.payment_status = 'completed'
      `;

      // Get payment method breakdown
      const paymentMethodQuery = `
        SELECT 
          payment_method,
          COUNT(*) as transaction_count,
          SUM(amount) as total_amount,
          SUM(refund_amount) as total_refunds
        FROM payments
        WHERE payment_date BETWEEN $1::date AND $2::date
          AND payment_status = 'completed'
        GROUP BY payment_method
        ORDER BY total_amount DESC
      `;

      const [statsResult, paymentMethodResult] = await Promise.all([
        pool.query(statsQuery, [formattedStart, formattedEnd]),
        pool.query(paymentMethodQuery, [formattedStart, formattedEnd])
      ]);

      const report = {
        period: {
          year: reportYear,
          month: reportMonth + 1,
          month_name: startDate.toLocaleString('default', { month: 'long' }),
          start_date: formattedStart,
          end_date: formattedEnd,
          days_in_month: endDate.getDate()
        },
        statistics: statsResult.rows[0],
        payment_methods: paymentMethodResult.rows
      };

      // AUDIT LOG: Monthly report accessed
      await AuditLogger.log({
        table_name: 'report_access',
        record_id: 0,
        action: 'INSERT',
        new_values: {
          report_type: 'monthly',
          year: reportYear,
          month: reportMonth + 1,
          accessed_by: req.user?.id,
          access_date: new Date(),
          ip_address: AuditLogger.getClientIp(req)
        },
        user_id: req.user?.id || null,
        ip_address: AuditLogger.getClientIp(req),
        user_agent: req.get('user-agent')
      });

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Get monthly report error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get monthly report'
      });
    }
  }

  /**
   * Get custom report
   */
  static async getCustomReport(req, res) {
    try {
      const { start_date, end_date, report_type } = req.query;

      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        });
      }

      let report;
      
      switch (report_type) {
        case 'occupancy':
          report = await Room.getOccupancyRate(start_date, end_date);
          break;
        
        case 'financial':
          report = await Payment.getFinancialReport(start_date, end_date);
          break;
        
        case 'guest':
          // Get guest statistics
          const guestQuery = `
            SELECT 
              guest_type,
              COUNT(*) as count,
              COUNT(DISTINCT CASE WHEN DATE(created_at) BETWEEN $1::date AND $2::date THEN guest_id END) as new_guests
            FROM guests
            WHERE created_at <= $2::date
            GROUP BY guest_type
          `;
          const result = await pool.query(guestQuery, [start_date, end_date]);
          report = result.rows;
          break;
        
        default:
          // Comprehensive report
          const [occupancy, financial, reservations] = await Promise.all([
            Room.getOccupancyRate(start_date, end_date),
            Payment.getFinancialReport(start_date, end_date),
            Reservation.getAll({ start_date, end_date }, 1, 1000)
          ]);
          
          report = {
            occupancy,
            financial,
            reservations: reservations.reservations
          };
      }

      // AUDIT LOG: Custom report accessed
      await AuditLogger.log({
        table_name: 'report_access',
        record_id: 0,
        action: 'INSERT',
        new_values: {
          report_type: report_type || 'comprehensive',
          start_date: start_date,
          end_date: end_date,
          accessed_by: req.user?.id,
          access_date: new Date(),
          ip_address: AuditLogger.getClientIp(req)
        },
        user_id: req.user?.id || null,
        ip_address: AuditLogger.getClientIp(req),
        user_agent: req.get('user-agent')
      });

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Get custom report error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get custom report'
      });
    }
  }
}

export default ReportController;
