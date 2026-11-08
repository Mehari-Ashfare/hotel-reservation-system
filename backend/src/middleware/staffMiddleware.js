/**
 * staffMiddleware.js - Staff management and validation middleware
 */
import Staff from '../models/Staff.js';

class StaffMiddleware {
  static async validateStaff(req, res, next) {
    try {
      if (!req.user) return next();
      
      // Use req.user.id (standard) or req.user.user_id depending on your AuthController
      // We check both to be safe
      const userId = req.user.id || req.user.user_id;

      if (req.user.role === 'receptionist' || req.user.role === 'admin') {
        const staff = await Staff.findByUserId(userId);
        if (staff) {
          req.staff = staff;
        }
      }
      next();
    } catch (error) {
      console.error('Staff validation error:', error.message);
      next();
    }
  }
  
  static requireStaff(req, res, next) {
    if (!req.staff) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Staff profile required.'
      });
    }
    next();
  }

  static async getStaffProfile(req, res) {
    if (!req.staff) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }
    res.json({ success: true, data: req.staff });
  }
}

export default StaffMiddleware;




// /**
//  * staffMiddleware.js - Staff management and validation middleware
//  */

// import Staff from '../models/Staff.js';

// class StaffMiddleware {
//   /**
//    * Validate staff exists for user
//    */
//   static async validateStaff(req, res, next) {
//     try {
//       if (!req.user) {
//         return next();
//       }
      
//       // For receptionist users, find their staff record
//       if (req.user.role === 'receptionist') {
//         const staff = await Staff.findByUserId(req.user.id);
//         if (staff) {
//           req.staff = staff;
//         } else {
//           console.warn(`User ${req.user.user_id} (${req.user.email}) has receptionist role but no staff record`);
//         }
//       }
//       // Note: Admin users don't need staff records
      
//       next();
//     } catch (error) {
//       console.error('Staff validation error:', error.message);
//       next();
//     }
//   }
  
//   /**
//    * Check if user is staff member (receptionist)
//    */
//   static requireStaff(req, res, next) {
//     if (!req.staff) {
//       return res.status(403).json({
//         success: false,
//         message: 'Access denied. Staff member (receptionist) required.'
//       });
//     }
//     next();
//   }
  
//   /**
//    * Check if user is active staff
//    */
//   static requireActiveStaff(req, res, next) {
//     if (!req.staff || !req.staff.is_active) {
//       return res.status(403).json({
//         success: false,
//         message: 'Access denied. Active staff member required.'
//       });
//     }
//     next();
//   }
  
//   /**
//    * Get staff profile
//    */
//   static async getStaffProfile(req, res) {
//     try {
//       if (!req.staff) {
//         return res.status(404).json({
//           success: false,
//           message: 'Staff profile not found. You need to be a receptionist to have a staff profile.'
//         });
//       }
      
//       res.json({
//         success: true,
//         data: req.staff
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: 'Error fetching staff profile'
//       });
//     }
//   }
// }

// export default StaffMiddleware;








// // /**
// //  * staffMiddleware.js - Staff management and validation middleware
// //  */

// // import Staff from '../models/Staff.js';

// // class StaffMiddleware {
// //   /**
// //    * Validate staff exists for user
// //    */
// //   static async validateStaff(req, res, next) {
// //     try {
// //       if (!req.user) {
// //         return next();
// //       }
      
// //       const staff = await Staff.findByUserId(req.user.user_id);
// //       if (staff) {
// //         req.staff = staff;
// //       }
      
// //       next();
// //     } catch (error) {
// //       console.error('Staff validation error:', error.message);
// //       next();
// //     }
// //   }
  
// //   /**
// //    * Check if user is staff member
// //    */
// //   static requireStaff(req, res, next) {
// //     if (!req.staff) {
// //       return res.status(403).json({
// //         success: false,
// //         message: 'Access denied. Staff member required.'
// //       });
// //     }
// //     next();
// //   }
  
// //   /**
// //    * Check if user is active staff
// //    */
// //   static requireActiveStaff(req, res, next) {
// //     if (!req.staff || !req.staff.is_active) {
// //       return res.status(403).json({
// //         success: false,
// //         message: 'Access denied. Active staff member required.'
// //       });
// //     }
// //     next();
// //   }
  
// //   /**
// //    * Get staff profile
// //    */
// //   static async getStaffProfile(req, res) {
// //     try {
// //       if (!req.staff) {
// //         return res.status(404).json({
// //           success: false,
// //           message: 'Staff profile not found'
// //         });
// //       }
      
// //       res.json({
// //         success: true,
// //         data: req.staff
// //       });
// //     } catch (error) {
// //       res.status(500).json({
// //         success: false,
// //         message: 'Error fetching staff profile'
// //       });
// //     }
// //   }
// // }

// // export default StaffMiddleware;