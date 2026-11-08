/**
 * StaffController.js - Staff management controller
 */
import Staff from '../models/Staff.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import { validationResult } from 'express-validator';
import AuditLogger from '../utils/auditLogger.js';

class StaffController {
  
  static async createStaff(req, res) {
    const client = await pool.connect(); 
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

      // FIX: Added 'sex' to extraction
      const { username, password, email, first_name, last_name, phone, address, position, department, role = 'receptionist', hire_date, is_active, sex } = req.body;

      await client.query('BEGIN');
      const checkUser = await client.query('SELECT * FROM users WHERE email = $1', [email]);
      if (checkUser.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Email already exists' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      let role_id = 2; 
      if (role === 'admin') role_id = 1;
      
      const userResult = await client.query(
        'INSERT INTO users (email, password_hash, role_id, is_active) VALUES ($1, $2, $3, true) RETURNING user_id, email',
        [email, hashedPassword, role_id]
      );
      const newUser = userResult.rows[0];

      // FIX: Insert into staff (NO EMAIL, ADD SEX)
      const staffResult = await client.query(
        'INSERT INTO staff (user_id, first_name, last_name, phone, address, position, department, hire_date, is_active, sex) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
        [newUser.user_id, first_name, last_name, phone, address, position, department, hire_date || new Date().toISOString().split('T')[0], true, sex]
      );
      const newStaff = staffResult.rows[0];

      await client.query('COMMIT');
      res.status(201).json({ success: true, message: 'Staff member created successfully', data: newStaff });
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(500).json({ success: false, message: `Error creating staff: ${error.message}` });
    } finally { client.release(); }
  }

  // === UPDATED GET ALL METHOD WITH SEARCH LOGIC ===
  static async getAllStaff(req, res) {
    try {
      const { page = 1, limit = 20, department, position, is_active, search = '' } = req.query;
      const offset = (page - 1) * limit;
      
      // We build the query manually here to handle the JOINs needed for search
      let query = `
        SELECT s.staff_id, s.user_id, s.first_name, s.last_name, s.phone, s.position, s.department, s.sex, s.hire_date, s.address,
               u.email, u.is_active, r.role_name
        FROM staff s
        JOIN users u ON s.user_id = u.user_id
        JOIN roles r ON u.role_id = r.role_id
      `;

      let countQuery = `
        SELECT COUNT(*) 
        FROM staff s
        JOIN users u ON s.user_id = u.user_id
      `;

      // Build Filters
      const params = [];
      const conditions = [];
      let paramIndex = 1;

      // 1. Search Filter (Name, Email, Phone)
      if (search) {
        conditions.push(`(
          s.first_name ILIKE $${paramIndex} OR 
          s.last_name ILIKE $${paramIndex} OR 
          u.email ILIKE $${paramIndex} OR 
          s.phone ILIKE $${paramIndex}
        )`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      // 2. Specific Filters
      if (department) {
        conditions.push(`s.department = $${paramIndex}`);
        params.push(department);
        paramIndex++;
      }
      if (position) {
        conditions.push(`s.position = $${paramIndex}`);
        params.push(position);
        paramIndex++;
      }
      if (is_active !== undefined) {
        conditions.push(`u.is_active = $${paramIndex}`);
        params.push(is_active === 'true');
        paramIndex++;
      }

      // Combine conditions
      if (conditions.length > 0) {
        const whereClause = ' WHERE ' + conditions.join(' AND ');
        query += whereClause;
        countQuery += whereClause;
      }

      // Add Sorting and Pagination
      query += ` ORDER BY s.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      
      // Execute Queries
      // Note: for the main query, we need to add limit and offset to params
      const queryParams = [...params, limit, offset];
      
      const result = await pool.query(query, queryParams);
      const countResult = await pool.query(countQuery, params); // Count query only uses filter params

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].count),
          page: parseInt(page),
          pages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
        }
      });

    } catch (error) { 
      console.error('Get all staff error:', error);
      res.status(500).json({ success: false, message: error.message }); 
    }
  }

  static async getStaffById(req, res) {
     try {
       const { id } = req.params;
       if (req.user.role === 'receptionist') {
         if (!req.staff || req.staff.staff_id !== parseInt(id)) return res.status(403).json({ success: false, message: 'Access denied.' });
       } 
       const staff = await Staff.findById(parseInt(id));
       if (!staff) return res.status(404).json({ success: false, message: 'Not found' });
       res.json({ success: true, data: staff });
     } catch (error) { res.status(500).json({ success: false, message: error.message }); }
  }

  // === UPDATED UPDATE METHOD WITH STATUS SYNC ===
  static async updateStaff(req, res) {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const updateData = req.body;
      const staffId = parseInt(id);
      
      const newRole = updateData.role; 
      const newStatus = updateData.is_active; // Get status update

      // Clean payload
      delete updateData.role; delete updateData.role_name; delete updateData.username; delete updateData.password; delete updateData.email; // Email is not in staff table

      if (req.user.role !== 'admin') {
         if (!req.staff || req.staff.staff_id !== staffId) { client.release(); return res.status(403).json({ success: false, message: 'Access denied' }); }
         const allowed = ['phone', 'address']; // Restricted fields for non-admin
         Object.keys(updateData).forEach(k => { if(!allowed.includes(k)) delete updateData[k] });
      }

      await client.query('BEGIN');

      // 1. Update Staff Table (Info + Status)
      if (Object.keys(updateData).length > 0) {
         // Filter to valid columns only
         const validColumns = ['first_name', 'last_name', 'phone', 'address', 'position', 'department', 'hire_date', 'is_active', 'sex'];
         const fields = [];
         const values = [staffId];
         let idx = 2;

         Object.keys(updateData).forEach(key => {
             if (validColumns.includes(key) && updateData[key] !== undefined) {
                 fields.push(`${key} = $${idx}`);
                 values.push(updateData[key]);
                 idx++;
             }
         });

         if (fields.length > 0) {
             await client.query(`UPDATE staff SET ${fields.join(', ')} WHERE staff_id = $1`, values);
         }
      }

      // 2. Sync with Users Table (Role OR Status)
      if (req.user.role === 'admin') {
         const staffRes = await client.query('SELECT user_id FROM staff WHERE staff_id = $1', [staffId]);
         if (staffRes.rows.length > 0) {
             const userId = staffRes.rows[0].user_id;
             
             // Handle Role Change
             if (newRole) {
                 let roleId = 2; 
                 if (newRole === 'admin') roleId = 1;
                 await client.query('UPDATE users SET role_id = $1 WHERE user_id = $2', [roleId, userId]);
             }

             // Handle Status Change (Block Login)
             if (newStatus !== undefined) {
                 await client.query('UPDATE users SET is_active = $1 WHERE user_id = $2', [newStatus, userId]);
             }
         }
      }

      await client.query('COMMIT');
      const updatedStaff = await Staff.findById(staffId);
      res.json({ success: true, data: updatedStaff, message: "Staff updated successfully" });
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(500).json({ success: false, message: error.message });
    } finally { client.release(); }
  }

  static async getDepartmentStats(req, res) {
    try {
      const stats = await Staff.getDepartmentStats();
      res.json({ success: true, data: stats });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
  }

  // Re-add changePassword
  static async changePassword(req, res) {
    const client = await pool.connect();
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Passwords required' });

        const userId = req.user.id || req.user.user_id;
        const userRes = await client.query('SELECT password_hash FROM users WHERE user_id = $1', [userId]);
        const user = userRes.rows[0];

        if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
            return res.status(400).json({ success: false, message: 'Incorrect current password' });
        }

        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(newPassword, salt);
        await client.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [newHash, userId]);

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    } finally { client.release(); }
  }
}

export default StaffController;






// /**
//  * StaffController.js - Staff management controller
//  */
// import Staff from '../models/Staff.js';
// import User from '../models/User.js';
// import bcrypt from 'bcryptjs';
// import pool from '../config/database.js';
// import { validationResult } from 'express-validator';
// import AuditLogger from '../utils/auditLogger.js';

// class StaffController {
  
//   static async createStaff(req, res) {
//     const client = await pool.connect(); 
//     try {
//       const errors = validationResult(req);
//       if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

//       // FIX: Added 'sex' to extraction
//       const { username, password, email, first_name, last_name, phone, address, position, department, role = 'receptionist', hire_date, is_active, sex } = req.body;

//       await client.query('BEGIN');
//       const checkUser = await client.query('SELECT * FROM users WHERE email = $1', [email]);
//       if (checkUser.rows.length > 0) {
//         await client.query('ROLLBACK');
//         return res.status(400).json({ success: false, message: 'Email already exists' });
//       }

//       const salt = await bcrypt.genSalt(10);
//       const hashedPassword = await bcrypt.hash(password, salt);
//       let role_id = 2; 
//       if (role === 'admin') role_id = 1;
      
//       const userResult = await client.query(
//         'INSERT INTO users (email, password_hash, role_id, is_active) VALUES ($1, $2, $3, true) RETURNING user_id, email',
//         [email, hashedPassword, role_id]
//       );
//       const newUser = userResult.rows[0];

//       // FIX: Insert into staff (NO EMAIL, ADD SEX)
//       const staffResult = await client.query(
//         'INSERT INTO staff (user_id, first_name, last_name, phone, address, position, department, hire_date, is_active, sex) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
//         [newUser.user_id, first_name, last_name, phone, address, position, department, hire_date || new Date().toISOString().split('T')[0], true, sex]
//       );
//       const newStaff = staffResult.rows[0];

//       await client.query('COMMIT');
//       res.status(201).json({ success: true, message: 'Staff member created successfully', data: newStaff });
//     } catch (error) {
//       await client.query('ROLLBACK');
//       res.status(500).json({ success: false, message: `Error creating staff: ${error.message}` });
//     } finally { client.release(); }
//   }

//   static async getAllStaff(req, res) {
//     try {
//       const { page = 1, limit = 20, department, position, is_active } = req.query;
//       const filters = {};
//       if (department) filters.department = department;
//       if (position) filters.position = position;
//       if (is_active !== undefined) filters.is_active = is_active === 'true';
//       const result = await Staff.getAll(filters, parseInt(page), parseInt(limit));
//       res.json({ success: true, data: result });
//     } catch (error) { res.status(500).json({ success: false, message: error.message }); }
//   }

//   static async getStaffById(req, res) {
//      try {
//        const { id } = req.params;
//        if (req.user.role === 'receptionist') {
//          if (!req.staff || req.staff.staff_id !== parseInt(id)) return res.status(403).json({ success: false, message: 'Access denied.' });
//        } 
//        const staff = await Staff.findById(parseInt(id));
//        if (!staff) return res.status(404).json({ success: false, message: 'Not found' });
//        res.json({ success: true, data: staff });
//      } catch (error) { res.status(500).json({ success: false, message: error.message }); }
//   }

//   // === UPDATED UPDATE METHOD WITH STATUS SYNC ===
//   static async updateStaff(req, res) {
//     const client = await pool.connect();
//     try {
//       const { id } = req.params;
//       const updateData = req.body;
//       const staffId = parseInt(id);
      
//       const newRole = updateData.role; 
//       const newStatus = updateData.is_active; // Get status update

//       // Clean payload
//       delete updateData.role; delete updateData.role_name; delete updateData.username; delete updateData.password; delete updateData.email; // Email is not in staff table

//       if (req.user.role !== 'admin') {
//          if (!req.staff || req.staff.staff_id !== staffId) { client.release(); return res.status(403).json({ success: false, message: 'Access denied' }); }
//          const allowed = ['phone', 'address']; // Restricted fields for non-admin
//          Object.keys(updateData).forEach(k => { if(!allowed.includes(k)) delete updateData[k] });
//       }

//       await client.query('BEGIN');

//       // 1. Update Staff Table (Info + Status)
//       // Note: We use Staff.update model logic inside controller here for transactional safety if needed, 
//       // but simpler to call SQL directly to ensure transaction consistency with Users table update.
//       if (Object.keys(updateData).length > 0) {
//          // Filter to valid columns only (prevent error on 'email' if passed)
//          const validColumns = ['first_name', 'last_name', 'phone', 'address', 'position', 'department', 'hire_date', 'is_active', 'sex'];
//          const fields = [];
//          const values = [staffId];
//          let idx = 2;

//          Object.keys(updateData).forEach(key => {
//              if (validColumns.includes(key) && updateData[key] !== undefined) {
//                  fields.push(`${key} = $${idx}`);
//                  values.push(updateData[key]);
//                  idx++;
//              }
//          });

//          if (fields.length > 0) {
//              await client.query(`UPDATE staff SET ${fields.join(', ')} WHERE staff_id = $1`, values);
//          }
//       }

//       // 2. Sync with Users Table (Role OR Status)
//       if (req.user.role === 'admin') {
//          const staffRes = await client.query('SELECT user_id FROM staff WHERE staff_id = $1', [staffId]);
//          if (staffRes.rows.length > 0) {
//              const userId = staffRes.rows[0].user_id;
             
//              // Handle Role Change
//              if (newRole) {
//                  let roleId = 2; 
//                  if (newRole === 'admin') roleId = 1;
//                  await client.query('UPDATE users SET role_id = $1 WHERE user_id = $2', [roleId, userId]);
//              }

//              // Handle Status Change (Block Login)
//              if (newStatus !== undefined) {
//                  await client.query('UPDATE users SET is_active = $1 WHERE user_id = $2', [newStatus, userId]);
//              }
//          }
//       }

//       await client.query('COMMIT');
//       const updatedStaff = await Staff.findById(staffId);
//       res.json({ success: true, data: updatedStaff, message: "Staff updated successfully" });
//     } catch (error) {
//       await client.query('ROLLBACK');
//       res.status(500).json({ success: false, message: error.message });
//     } finally { client.release(); }
//   }

//   static async getDepartmentStats(req, res) {
//     try {
//       const stats = await Staff.getDepartmentStats();
//       res.json({ success: true, data: stats });
//     } catch (error) { res.status(500).json({ success: false, message: error.message }); }
//   }

//   // Re-add changePassword correctly attached to class
//   static async changePassword(req, res) {
//     const client = await pool.connect();
//     try {
//         const { currentPassword, newPassword } = req.body;
//         if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Passwords required' });

//         const userId = req.user.id || req.user.user_id;
//         const userRes = await client.query('SELECT password_hash FROM users WHERE user_id = $1', [userId]);
//         const user = userRes.rows[0];

//         if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
//             return res.status(400).json({ success: false, message: 'Incorrect current password' });
//         }

//         const salt = await bcrypt.genSalt(10);
//         const newHash = await bcrypt.hash(newPassword, salt);
//         await client.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [newHash, userId]);

//         res.json({ success: true, message: 'Password changed successfully' });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     } finally { client.release(); }
//   }
// }

// export default StaffController;