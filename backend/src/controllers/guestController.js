/**
 * guestController.js - Guest controller
 * * Handles all guest-related operations including CRUD operations,
 * search, and guest management.
 * * Dependencies:
 * - Guest model for database operations
 */

import Guest from '../models/Guest.js';
import AuditLogger from '../utils/auditLogger.js'; 

class GuestController {
  /**
   * Create new guest
   */
  static async createGuest(req, res) {
    try {
      // UPDATE: Added 'sex', Removed 'email' form extraction
      const { 
        first_name, last_name, phone, address, sex,
        id_type, id_number, date_of_birth, nationality, guest_type 
      } = req.body;

      const guestData = {
        first_name,
        last_name,
        // email, // REMOVED: Email is no longer in guests table
        phone,
        sex, // ADDED
        address,
        id_type,
        id_number,
        date_of_birth,
        nationality,
        guest_type,
        created_by: req.user?.id // Set created_by from authenticated user
      };

      const guest = await Guest.create(guestData);

      // AUDIT LOG: Guest created
      await AuditLogger.log({
        table_name: 'guests',
        record_id: guest.guest_id,
        action: 'INSERT',
        new_values: guest,
        user_id: req.user?.id || null,
        ip_address: AuditLogger.getClientIp(req),
        user_agent: req.get('user-agent')
      });

      res.status(201).json({
        success: true,
        message: 'Guest created successfully',
        data: guest
      });
    } catch (error) {
      console.error('Create guest error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create guest'
      });
    }
  }

  /**
   * Get all guests with pagination
   */
  static async getAllGuests(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      
      const result = await Guest.getAll(parseInt(page), parseInt(limit));

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Get guests error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get guests'
      });
    }
  }

  /**
   * Get guest by ID
   */
  static async getGuestById(req, res) {
    try {
      const { id } = req.params;
      const guest = await Guest.findById(id);

      if (!guest) {
        return res.status(404).json({
          success: false,
          message: 'Guest not found'
        });
      }

      res.json({
        success: true,
        data: guest
      });
    } catch (error) {
      console.error('Get guest error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get guest'
      });
    }
  }

  /**
   * Update guest information
   */
  static async updateGuest(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Remove fields that shouldn't be updated directly
      delete updateData.guest_id;
      delete updateData.created_at;
      delete updateData.user_id;
      delete updateData.email; // FIX: Ensure email is not passed to update query

      // FIX 1: Get the OLD data before updating (for Audit Log)
      const oldGuest = await Guest.findById(id);

      if (!oldGuest) {
        return res.status(404).json({ success: false, message: 'Guest not found' });
      }

      // FIX 2: Perform the update
      const updatedGuest = await Guest.update(id, updateData);

      // AUDIT LOG: Guest updated
      await AuditLogger.log({
        table_name: 'guests',
        record_id: parseInt(id),
        action: 'UPDATE',
        old_values: oldGuest,     // ✅ Now this exists
        new_values: updatedGuest, // ✅ Now this exists
        user_id: req.user?.id || null,
        ip_address: AuditLogger.getClientIp(req),
        user_agent: req.get('user-agent')
      });

      res.json({
        success: true,
        message: 'Guest updated successfully',
        data: updatedGuest
      });
    } catch (error) {
      console.error('Update guest error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update guest'
      });
    }
  }

  /**
   * Delete guest
   */
  static async deleteGuest(req, res) {
    try {
      const { id } = req.params;
      // FIX 1: Capture the deleted guest object into a variable
      const guest = await Guest.delete(id);

      if (!guest) {
        return res.status(404).json({ success: false, message: 'Guest not found' });
      }
      
      // For hard delete (if implemented):
      await AuditLogger.log({
        table_name: 'guests',
        record_id: parseInt(id),
        action: 'DELETE',
        old_values: guest,
        new_values: null,
        user_id: req.user?.id || null,
        ip_address: AuditLogger.getClientIp(req),
        user_agent: req.get('user-agent')
      });
      
      res.json({
        success: true,
        message: 'Guest deleted successfully'
      });
    } catch (error) {
      console.error('Delete guest error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete guest'
      });
    }
  }

  /**
   * Search guests
   */
  static async searchGuests(req, res) {
    try {
      const { query } = req.query;
      
      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search query must be at least 2 characters'
        });
      }

      const guests = await Guest.search(query.trim());

      res.json({
        success: true,
        data: guests
      });
    } catch (error) {
      console.error('Search guests error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to search guests'
      });
    }
  }
}

export default GuestController;




// /**
//  * guestController.js - Guest controller
//  * * Handles all guest-related operations including CRUD operations,
//  * search, and guest management.
//  * * Dependencies:
//  * - Guest model for database operations
//  */

// import Guest from '../models/Guest.js';
// import AuditLogger from '../utils/auditLogger.js'; // ADD THIS

// class GuestController {
//   /**
//    * Create new guest
//    */
//   static async createGuest(req, res) {
//     try {
//       const { 
//         first_name, last_name, email, phone, address,
//         id_type, id_number, date_of_birth, nationality, guest_type 
//       } = req.body;

//       const guestData = {
//         first_name,
//         last_name,
//         email,
//         phone,
//         address,
//         id_type,
//         id_number,
//         date_of_birth,
//         nationality,
//         guest_type,
//         created_by: req.user?.id // Set created_by from authenticated user
//       };

//       const guest = await Guest.create(guestData);

//       // AUDIT LOG: Guest created
//       await AuditLogger.log({
//         table_name: 'guests',
//         record_id: guest.guest_id,
//         action: 'INSERT',
//         new_values: guest,
//         user_id: req.user?.id || null,
//         ip_address: AuditLogger.getClientIp(req),
//         user_agent: req.get('user-agent')
//       });

//       res.status(201).json({
//         success: true,
//         message: 'Guest created successfully',
//         data: guest
//       });
//     } catch (error) {
//       console.error('Create guest error:', error);
//       res.status(500).json({
//         success: false,
//         message: error.message || 'Failed to create guest'
//       });
//     }
//   }

//   /**
//    * Get all guests with pagination
//    */
//   static async getAllGuests(req, res) {
//     try {
//       const { page = 1, limit = 20 } = req.query;
      
//       const result = await Guest.getAll(parseInt(page), parseInt(limit));

//       res.json({
//         success: true,
//         data: result
//       });
//     } catch (error) {
//       console.error('Get guests error:', error);
//       res.status(500).json({
//         success: false,
//         message: error.message || 'Failed to get guests'
//       });
//     }
//   }

//   /**
//    * Get guest by ID
//    */
//   static async getGuestById(req, res) {
//     try {
//       const { id } = req.params;
//       const guest = await Guest.findById(id);

//       if (!guest) {
//         return res.status(404).json({
//           success: false,
//           message: 'Guest not found'
//         });
//       }

//       res.json({
//         success: true,
//         data: guest
//       });
//     } catch (error) {
//       console.error('Get guest error:', error);
//       res.status(500).json({
//         success: false,
//         message: error.message || 'Failed to get guest'
//       });
//     }
//   }

//   /**
//    * Update guest information
//    */
//   static async updateGuest(req, res) {
//     try {
//       const { id } = req.params;
//       const updateData = req.body;

//       // Remove fields that shouldn't be updated directly
//       delete updateData.guest_id;
//       delete updateData.created_at;
//       delete updateData.user_id;

//       // FIX 1: Get the OLD data before updating (for Audit Log)
//       const oldGuest = await Guest.findById(id);

//       if (!oldGuest) {
//         return res.status(404).json({ success: false, message: 'Guest not found' });
//       }

//       // FIX 2: Perform the update
//       const updatedGuest = await Guest.update(id, updateData);

//       // AUDIT LOG: Guest updated
//       await AuditLogger.log({
//         table_name: 'guests',
//         record_id: parseInt(id),
//         action: 'UPDATE',
//         old_values: oldGuest,     // ✅ Now this exists
//         new_values: updatedGuest, // ✅ Now this exists
//         user_id: req.user?.id || null,
//         ip_address: AuditLogger.getClientIp(req),
//         user_agent: req.get('user-agent')
//       });

//       res.json({
//         success: true,
//         message: 'Guest updated successfully',
//         data: updatedGuest
//       });
//     } catch (error) {
//       console.error('Update guest error:', error);
//       res.status(500).json({
//         success: false,
//         message: error.message || 'Failed to update guest'
//       });
//     }
//   }

//   /**
//    * Delete guest
//    */
//   static async deleteGuest(req, res) {
//     try {
//       const { id } = req.params;
//       // FIX 1: Capture the deleted guest object into a variable
//       const guest = await Guest.delete(id);

//       if (!guest) {
//         return res.status(404).json({ success: false, message: 'Guest not found' });
//       }
      
//       // Note: In production, consider soft delete
//       // For now, we'll just return success
//       // Actual deletion would be: await Guest.delete(id);

//       // // AUDIT LOG: Guest deletion (soft delete logged as UPDATE)
//       // await AuditLogger.log({
//       //   table_name: 'guests',
//       //   record_id: parseInt(id),
//       //   action: 'UPDATE', // Use UPDATE for soft delete
//       //   old_values: guest,
//       //   new_values: { ...guest, is_active: false, deleted_at: new Date() },
//       //   user_id: req.user?.id || null,
//       //   ip_address: AuditLogger.getClientIp(req),
//       //   user_agent: req.get('user-agent')
//       // });

//       // For hard delete (if implemented):
//       await AuditLogger.log({
//         table_name: 'guests',
//         record_id: parseInt(id),
//         action: 'DELETE',
//         old_values: guest,
//         new_values: null,
//         user_id: req.user?.id || null,
//         ip_address: AuditLogger.getClientIp(req),
//         user_agent: req.get('user-agent')
//       });
      
//       res.json({
//         success: true,
//         message: 'Guest deleted successfully'
//       });
//     } catch (error) {
//       console.error('Delete guest error:', error);
//       res.status(500).json({
//         success: false,
//         message: error.message || 'Failed to delete guest'
//       });
//     }
//   }

//   /**
//    * Search guests
//    */
//   static async searchGuests(req, res) {
//     try {
//       const { query } = req.query;
      
//       if (!query || query.trim().length < 2) {
//         return res.status(400).json({
//           success: false,
//           message: 'Search query must be at least 2 characters'
//         });
//       }

//       const guests = await Guest.search(query.trim());

//       res.json({
//         success: true,
//         data: guests
//       });
//     } catch (error) {
//       console.error('Search guests error:', error);
//       res.status(500).json({
//         success: false,
//         message: error.message || 'Failed to search guests'
//       });
//     }
//   }
// }

// export default GuestController;
