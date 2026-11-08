/**
 * dashboardController.js - Analytics and Statistics
 */
import pool from '../config/database.js';

class DashboardController {
  /**
   * Get Summary Stats (Cards)
   */
  static async getSummary(req, res) {
    try {
      // Check if user is admin (req.user is set by AuthMiddleware)
      const isAdmin = req.user.role === 'admin';

      // 1. Total Active Guests (Checked In)
      const guestsQuery = await pool.query(
        "SELECT COUNT(*) FROM reservations WHERE status = 'checked-in'"
      );

      // 2. Room Status Counts
      const roomsQuery = await pool.query(
        "SELECT status, COUNT(*) FROM rooms GROUP BY status"
      );
      
      const roomStats = {
        available: 0,
        occupied: 0,
        maintenance: 0,
        total: 0
      };

      roomsQuery.rows.forEach(row => {
        const count = parseInt(row.count);
        roomStats[row.status] += count;
        roomStats.total += count;
      });

      // 3. Total Revenue (ONLY FOR ADMIN)
      let totalRevenue = 0;
      if (isAdmin) {
        const revenueQuery = await pool.query(
          "SELECT SUM(amount) FROM payments WHERE payment_status = 'completed'"
        );
        totalRevenue = parseInt(revenueQuery.rows[0].sum) || 0;
      }

      // 4. Reservations Today (Arrivals)
      const todayQuery = await pool.query(
        "SELECT COUNT(*) FROM reservations WHERE check_in_date = CURRENT_DATE"
      );

      res.json({
        success: true,
        data: {
          activeGuests: parseInt(guestsQuery.rows[0].count),
          rooms: roomStats,
          occupancyRate: roomStats.total ? Math.round((roomStats.occupied / roomStats.total) * 100) : 0,
          totalRevenue: totalRevenue, // Will be 0 for receptionist
          arrivalsToday: parseInt(todayQuery.rows[0].count),
          isAdmin: isAdmin // Send flag to frontend
        }
      });
    } catch (error) {
      console.error('Dashboard Summary Error:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  /**
   * Get Monthly Revenue (For Bar Chart)
   */
  static async getRevenueChart(req, res) {
    try {
      // SECURITY CHECK
      if (req.user.role !== 'admin') {
        return res.json({ success: true, data: [] }); // Return empty for non-admins
      }

      const query = `
        SELECT 
          TO_CHAR(payment_date, 'Mon') as month,
          EXTRACT(MONTH FROM payment_date) as month_num,
          SUM(amount) as revenue
        FROM payments 
        WHERE 
          payment_status = 'completed' AND
          payment_date >= DATE_TRUNC('year', CURRENT_DATE)
        GROUP BY 1, 2
        ORDER BY 2
      `;
      
      const result = await pool.query(query);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Revenue Chart Error:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export default DashboardController;



// /**
//  * dashboardController.js - Analytics and Statistics
//  */
// import pool from '../config/database.js';

// class DashboardController {
//   /**
//    * Get Summary Stats (Cards)
//    */
//   static async getSummary(req, res) {
//     try {
//       // 1. Total Active Guests (Checked In)
//       const guestsQuery = await pool.query(
//         "SELECT COUNT(*) FROM reservations WHERE status = 'checked-in'"
//       );

//       // 2. Room Status Counts
//       const roomsQuery = await pool.query(
//         "SELECT status, COUNT(*) FROM rooms GROUP BY status"
//       );
      
//       const roomStats = {
//         available: 0,
//         occupied: 0,
//         maintenance: 0,
//         total: 0
//       };

//       roomsQuery.rows.forEach(row => {
//         const count = parseInt(row.count);
//         roomStats[row.status] += count;
//         roomStats.total += count;
//       });

//       // 3. Total Revenue (All time)
//       const revenueQuery = await pool.query(
//         "SELECT SUM(amount) FROM payments WHERE payment_status = 'completed'"
//       );

//       // 4. Reservations Today (Arrivals)
//       const todayQuery = await pool.query(
//         "SELECT COUNT(*) FROM reservations WHERE check_in_date = CURRENT_DATE"
//       );

//       res.json({
//         success: true,
//         data: {
//           activeGuests: parseInt(guestsQuery.rows[0].count),
//           rooms: roomStats,
//           occupancyRate: roomStats.total ? Math.round((roomStats.occupied / roomStats.total) * 100) : 0,
//           totalRevenue: parseInt(revenueQuery.rows[0].sum) || 0,
//           arrivalsToday: parseInt(todayQuery.rows[0].count)
//         }
//       });
//     } catch (error) {
//       console.error('Dashboard Summary Error:', error);
//       res.status(500).json({ success: false, message: 'Server Error' });
//     }
//   }

//   /**
//    * Get Monthly Revenue (For Bar Chart)
//    * Aggregates payments by month for the current year
//    */
//   static async getRevenueChart(req, res) {
//     try {
//       const query = `
//         SELECT 
//           TO_CHAR(payment_date, 'Mon') as month,
//           EXTRACT(MONTH FROM payment_date) as month_num,
//           SUM(amount) as revenue
//         FROM payments 
//         WHERE 
//           payment_status = 'completed' AND
//           payment_date >= DATE_TRUNC('year', CURRENT_DATE)
//         GROUP BY 1, 2
//         ORDER BY 2
//       `;
      
//       const result = await pool.query(query);
//       res.json({ success: true, data: result.rows });
//     } catch (error) {
//       console.error('Revenue Chart Error:', error);
//       res.status(500).json({ success: false, message: 'Server Error' });
//     }
//   }
// }

// export default DashboardController;


// // /**
// //  * DashboardController.js - Aggregates key stats (Debug Mode)
// //  */
// // import pool from '../config/database.js';

// // class DashboardController {
  
// //   static async getSummary(req, res) {
// //     try {
// //       console.log("--- DASHBOARD API HIT ---");

// //       const [
// //         checkInRes, 
// //         checkOutRes, 
// //         roomRes, 
// //         guestRes,
// //         revenueRes
// //       ] = await Promise.all([
// //         // 1. Check-ins: Remove Date filter, just check 'confirmed'
// //         pool.query(`SELECT COUNT(*) FROM reservations WHERE status ILIKE 'confirmed'`),

// //         // 2. Check-outs: Remove Date filter, just check 'checked-in'
// //         pool.query(`SELECT COUNT(*) FROM reservations WHERE status ILIKE 'checked-in'`),

// //         // 3. Rooms: Remove 'available' filter. Count ALL rooms.
// //         pool.query(`SELECT COUNT(*) FROM rooms`),

// //         // 4. Guests: Count ALL reservations that are active
// //         pool.query(`SELECT COUNT(*) FROM reservations WHERE status ILIKE 'checked-in'`),

// //         // 5. Revenue: Remove Date filter. Sum ALL money.
// //         pool.query(`SELECT SUM(total_amount) FROM reservations WHERE status NOT ILIKE 'cancelled'`)
// //       ]);

// //       const data = {
// //         today_check_ins: parseInt(checkInRes.rows[0].count),
// //         today_check_outs: parseInt(checkOutRes.rows[0].count),
// //         available_rooms: parseInt(roomRes.rows[0].count),
// //         active_guests: parseInt(guestRes.rows[0].count),
// //         monthly_revenue: parseFloat(revenueRes.rows[0].sum || 0)
// //       };

// //       console.log("--- STATS FOUND ---", data);

// //       res.json({
// //         success: true,
// //         data: data
// //       });

// //     } catch (error) {
// //       console.error('Dashboard Stats Error:', error);
// //       res.status(500).json({ success: false, message: 'Failed to fetch stats' });
// //     }
// //   }
// // }

// // export default DashboardController;
