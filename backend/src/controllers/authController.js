/**
 * authController.js - Authentication controller
 * * Handles user authentication operations: registration, login,
 * logout, token refresh, and current user info.
 * * Dependencies:
 * - User model for user operations
 * - Role model for role management
 * - express-validator for input validation
 */

import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import crypto from 'crypto'; 
import pool from '../config/database.js';
import User from '../models/User.js';
import Role from '../models/Role.js';
import Guest from '../models/Guest.js';
import AuditLogger from '../utils/auditLogger.js';
import { sendEmail } from '../utils/emailService.js'; // IMPORT EMAIL SERVICE

class AuthController {
  /**
   * User registration
   * Creates a new user account and AUTOMATICALLY creates guest profile
   */
  static async register(req, res) {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      // FIX: Ensure we accept 'name' (full name) or first/last
      const { email, password, role_name, name, first_name, last_name, phone } = req.body;

      // Determine default role (Guest) if not specified
      const targetRoleName = role_name || 'guest';

      // Get role ID by name
      const role = await Role.findByName(targetRoleName);
      if (!role) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role specified'
        });
      }

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email already registered'
        });
      }

      // 1. Create User
      // We create the user first. If the subsequent steps fail, we MUST delete this user.
      const userData = { email, password, role_id: role.role_id };
      const user = await User.create(userData);

      // --- TRANSACTION SAFEGUARD START ---
      let guest = null;

      try {
        // AUDIT LOG: User registration
        await AuditLogger.log({
          table_name: 'users',
          record_id: user.user_id,
          action: 'INSERT',
          new_values: {
            user_id: user.user_id,
            email: user.email,
            role_id: user.role_id,
            created_at: user.created_at
          },
          user_id: user.user_id, // Self-registration
          ip_address: AuditLogger.getClientIp(req),
          user_agent: req.get('user-agent')
        });

        // 2. Create Guest Profile (if role is guest)
        if (targetRoleName === 'guest') {
          // logic to split full name if provided
          let fName = first_name;
          let lName = last_name;

          if (!fName && name) {
              const nameParts = name.trim().split(' ');
              fName = nameParts[0];
              lName = nameParts.slice(1).join(' ') || 'Guest';
          }

          // Fallback if no name provided at all
          if (!fName) fName = 'Guest'; 
          if (!lName) lName = 'User';

          // FIX: Removed 'email' from creation
          guest = await Guest.create({
            user_id: user.user_id,
            created_by: user.user_id, // Guest creates themselves
            first_name: fName,
            last_name: lName,
            phone: phone || null,
            guest_type: 'online' // Correct Type
          });

          // AUDIT LOG: Guest creation
          await AuditLogger.log({
            table_name: 'guests',
            record_id: guest.guest_id,
            action: 'INSERT',
            new_values: {
              guest_id: guest.guest_id,
              user_id: guest.user_id,
              first_name: guest.first_name,
              last_name: guest.last_name,
              guest_type: guest.guest_type
            },
            user_id: user.user_id,
            ip_address: AuditLogger.getClientIp(req),
            user_agent: req.get('user-agent')
          });
        }
        
        // Note: For Staff (admin/receptionist), we rely on profile update to create the record later if needed.

        // Generate token
        const token = User.generateToken({
          ...user,
          role_name: role.role_name,
          permissions: role.permissions
        });

        res.status(201).json({
          success: true,
          message: 'Registration successful',
          data: {
            user: {
              id: user.user_id,
              email: user.email,
              role: role.role_name
            },
            guest: guest ? {
              id: guest.guest_id,
              name: `${guest.first_name} ${guest.last_name}`
            } : null,
            token
          }
        });

      } catch (innerError) {
        // !!! CRITICAL ROLLBACK !!!
        console.error("Partial Registration Failure - Rolling back User:", innerError);
        await pool.query('DELETE FROM users WHERE user_id = $1', [user.user_id]);
        throw innerError; 
      }
      // --- TRANSACTION SAFEGUARD END ---

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Registration failed'
      });
    }
  }

  /**
   * User login
   * Authenticates user and returns JWT token
   */
  static async login(req, res) {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const { email, password } = req.body;

      // Find user
      const user = await User.findByEmail(email);
      if (!user) {
        // AUDIT LOG: Failed login attempt (unknown user)
        await AuditLogger.log({
          table_name: 'auth_attempts',
          record_id: 0,
          action: 'INSERT',
          new_values: {
            email: email,
            success: false,
            reason: 'user_not_found',
            ip_address: AuditLogger.getClientIp(req),
            timestamp: new Date()
          },
          user_id: null,
          ip_address: AuditLogger.getClientIp(req),
          user_agent: req.get('user-agent')
        });

        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      /// Verify password
      const isValidPassword = await User.comparePassword(password, user.password_hash);
      
      // 1. Handle Invalid Password
      if (!isValidPassword) {
        
        // Calculate new values
        const newFailedAttempts = (user.failed_attempts || 0) + 1;
        const lastFailedAttempt = new Date();

        await pool.query(
          'UPDATE users SET failed_attempts = $1, last_failed_attempt = $2 WHERE user_id = $3',
          [newFailedAttempts, lastFailedAttempt, user.user_id]
        );

        await AuditLogger.log({
          table_name: 'users',
          record_id: user.user_id,
          action: 'UPDATE',
          old_values: { 
            last_failed_attempt: user.last_failed_attempt,
            failed_attempts: user.failed_attempts || 0
          },
          new_values: { 
            last_failed_attempt: lastFailedAttempt,
            failed_attempts: newFailedAttempts
          },
          user_id: user.user_id,
          ip_address: AuditLogger.getClientIp(req),
          user_agent: req.get('user-agent')
        });

        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Update last login
      await User.updateLastLogin(user.user_id);

      // AUDIT LOG: Successful login
      await AuditLogger.log({
        table_name: 'users',
        record_id: user.user_id,
        action: 'UPDATE',
        old_values: { last_login: user.last_login },
        new_values: { last_login: new Date() },
        user_id: user.user_id,
        ip_address: AuditLogger.getClientIp(req),
        user_agent: req.get('user-agent')
      });

      // Generate token
      const token = User.generateToken(user);

      // Get guest info if exists
      let guest = null;
      if (user.role_name === 'guest') {
        guest = await Guest.findByUserId(user.user_id);
      }

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.user_id,
            email: user.email,
            role: user.role_name,
            permissions: user.permissions
          },
          guest: guest ? {
            id: guest.guest_id,
            name: `${guest.first_name} ${guest.last_name}`,
            phone: guest.phone
          } : null,
          token
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed'
      });
    }
  }

  /**
   * Get current user info (Lightweight version for session check)
   */
  static async getCurrentUser(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Get guest info if exists
      let guest = null;
      if (user.role_name === 'guest') {
        guest = await Guest.findByUserId(user.user_id);
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.user_id,
            email: user.email,
            role: user.role_name,
            permissions: user.permissions,
            last_login: user.last_login,
            created_at: user.created_at
          },
          guest: guest ? {
            id: guest.guest_id,
            first_name: guest.first_name,
            last_name: guest.last_name,
            email: user.email, // Use email from User object
            phone: guest.phone,
            guest_type: guest.guest_type
          } : null
        }
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user information'
      });
    }
  }

  /**
   * Refresh token
   */
  static async refreshToken(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const token = User.generateToken(user);

      res.json({
        success: true,
        data: { token }
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to refresh token'
      });
    }
  }

  /**
   * Logout
   */
  static async logout(req, res) {
    try {
      await AuditLogger.log({
        table_name: 'auth_sessions',
        record_id: 0,
        action: 'INSERT',
        new_values: {
          user_id: req.user?.id,
          action: 'logout',
          ip_address: AuditLogger.getClientIp(req),
          timestamp: new Date()
        },
        user_id: req.user?.id || null,
        ip_address: AuditLogger.getClientIp(req),
        user_agent: req.get('user-agent')
      });

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  }

  /**
   * Change password
   */
  static async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'New password and confirm password do not match'
        });
      }

      const userId = req.user.id;

      const query = 'SELECT password_hash FROM users WHERE user_id = $1';
      const result = await pool.query(query, [userId]);
      
      if (!result.rows[0]) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const { password_hash } = result.rows[0];

      const isValid = await User.comparePassword(currentPassword, password_hash);
      if (!isValid) {
        await AuditLogger.log({
          table_name: 'auth_attempts',
          record_id: 0,
          action: 'INSERT',
          new_values: {
            user_id: userId,
            action: 'password_change',
            success: false,
            reason: 'invalid_current_password',
            ip_address: AuditLogger.getClientIp(req),
            timestamp: new Date()
          },
          user_id: userId,
          ip_address: AuditLogger.getClientIp(req),
          user_agent: req.get('user-agent')
        });

        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12);
      const newPasswordHash = await bcrypt.hash(newPassword, salt);

      await pool.query(
        'UPDATE users SET password_hash = $1 WHERE user_id = $2',
        [newPasswordHash, userId]
      );

      await AuditLogger.log({
        table_name: 'users',
        record_id: userId,
        action: 'UPDATE',
        old_values: { password_changed: false }, 
        new_values: { 
          password_changed: true,
          password_changed_at: new Date(),
          password_changed_by: userId
        },
        user_id: userId,
        ip_address: AuditLogger.getClientIp(req),
        user_agent: req.get('user-agent')
      });

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password'
      });
    }
  }

  // --- PASSWORD RESET METHODS (Updated with Real Email) ---

  /**
   * Forgot Password - Step 1
   * Generates token and sends REAL EMAIL via Nodemailer
   */
  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      const user = await User.findByEmail(email);

      if (!user) {
        return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
      }

      // 1. Generate Token
      const token = crypto.randomBytes(20).toString('hex');
      const expires = Date.now() + 3600000; // 1 hour

      // 2. Save Token to DB
      await pool.query(
        'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE user_id = $3',
        [token, expires, user.user_id]
      );

      // 3. Send Email
      const resetLink = `http://localhost:5173/reset-password/${token}`;
      
      const emailSent = await sendEmail(
        email, 
        'Password Reset Request', 
        `
        <div style="font-family: sans-serif; padding: 20px;">
          <h3>Password Reset Request</h3>
          <p>We received a request to reset your password. Click the link below to set a new password:</p>
          <a href="${resetLink}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
          <p>This link expires in 1 hour.</p>
          <p style="color: #666; font-size: 0.9em;">If you did not request this, please ignore this email.</p>
        </div>
        `
      );

      // Audit Log
      await AuditLogger.log({
        table_name: 'users',
        record_id: user.user_id,
        action: 'UPDATE',
        new_values: { 
          reset_token_generated: true, 
          email_sent: emailSent 
        },
        user_id: user.user_id,
        ip_address: AuditLogger.getClientIp(req),
        user_agent: req.get('user-agent')
      });

      if (emailSent) {
        res.json({ success: true, message: 'Reset link sent to your email.' });
      } else {
        res.status(500).json({ success: false, message: 'Failed to send email. Please try again later.' });
      }

    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ success: false, message: 'Error processing request' });
    }
  }

  /**
   * Reset Password - Step 2
   * Verifies token and updates password
   */
  static async resetPassword(req, res) {
    try {
      const { token, newPassword, confirmPassword } = req.body;

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ success: false, message: 'Passwords do not match' });
      }

      // 1. Find user with valid, non-expired token
      const query = `
        SELECT * FROM users 
        WHERE reset_password_token = $1 
        AND reset_password_expires > $2
      `;
      const result = await pool.query(query, [token, Date.now()]);
      const user = result.rows[0];

      if (!user) {
        // Log invalid attempt
        await AuditLogger.log({
          table_name: 'auth_attempts',
          record_id: 0,
          action: 'INSERT',
          new_values: {
            action: 'password_reset_fail',
            reason: 'invalid_token',
            timestamp: new Date()
          },
          user_id: null,
          ip_address: AuditLogger.getClientIp(req),
          user_agent: req.get('user-agent')
        });

        return res.status(400).json({ success: false, message: 'Password reset token is invalid or has expired.' });
      }

      // 2. Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // 3. Update User (Clear token fields)
      await pool.query(
        `UPDATE users 
         SET password_hash = $1, 
             reset_password_token = NULL, 
             reset_password_expires = NULL 
         WHERE user_id = $2`,
        [hashedPassword, user.user_id]
      );

      // Log successful reset
      await AuditLogger.log({
        table_name: 'users',
        record_id: user.user_id,
        action: 'UPDATE',
        new_values: { password_reset: true },
        user_id: user.user_id,
        ip_address: AuditLogger.getClientIp(req),
        user_agent: req.get('user-agent')
      });

      res.json({ success: true, message: 'Password has been reset successfully. You can now login.' });

    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ success: false, message: 'Failed to reset password' });
    }
  }

  // --- NEW METHODS FOR FULL PROFILE ---

  /**
   * Get Full Profile
   * Fetches specific data based on role (Guest vs Staff)
   * FIX: Queries 'staff' table for receptionist/admin
   */
  static async getProfile(req, res) {
    try {
      const { id, role } = req.user; 
      let query = '';
      
      // 1. Select appropriate table based on role
      if (role === 'guest') {
        query = `
          SELECT g.guest_id as id, g.first_name, g.last_name, u.email, g.phone, g.address, g.sex, 'guest' as role 
          FROM guests g
          JOIN users u ON g.user_id = u.user_id
          WHERE u.user_id = $1
        `;
      } else {
        // For Staff (Admin, Receptionist, etc.), fetch from 'staff' table joined with 'users'
        query = `
          SELECT s.staff_id as id, s.first_name, s.last_name, u.email, s.phone, s.position as role, s.sex 
          FROM staff s 
          JOIN users u ON s.user_id = u.user_id 
          WHERE u.user_id = $1
        `;
      }

      const result = await pool.query(query, [id]);
      
      // 2. Handle missing profile record (Fallback)
      if (result.rows.length === 0) {
        // If staff record is missing but user exists, return basic user info so page doesn't crash
        const userFallback = await pool.query('SELECT user_id as id, email, role_name as role FROM users WHERE user_id = $1', [id]);
        
        if (userFallback.rows.length > 0) {
            return res.json({ success: true, data: userFallback.rows[0] });
        }
        return res.status(404).json({ success: false, message: 'User profile not found' });
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ success: false, message: 'Server error fetching profile' });
    }
  }

  /**
   * Update Profile Details
   * FIX: Updates 'staff' table for receptionist/admin
   */
  static async updateProfile(req, res) {
    try {
      const { id, role } = req.user;
      const { first_name, last_name, phone, address } = req.body;

      let query = '';
      let values = [];

      if (role === 'guest') {
        // Update Guest
        query = `
          UPDATE guests 
          SET first_name = $1, last_name = $2, phone = $3, address = $4 
          WHERE user_id = $5 RETURNING *
        `;
        values = [first_name, last_name, phone, address, id];
      } else {
        // Update Staff - Check if record exists first
        const checkStaff = await pool.query('SELECT staff_id FROM staff WHERE user_id = $1', [id]);
        
        if (checkStaff.rows.length > 0) {
            // Update existing staff record
            query = `
              UPDATE staff 
              SET first_name = $1, last_name = $2, phone = $3 
              WHERE user_id = $4 RETURNING staff_id, first_name, last_name, phone, position
            `;
            values = [first_name, last_name, phone, id];
        } else {
            // Create new staff record if it doesn't exist (Self-repair)
            query = `
              INSERT INTO staff (user_id, first_name, last_name, phone, position)
              VALUES ($1, $2, $3, $4, $5)
              RETURNING staff_id, first_name, last_name, phone, position
            `;
            // Default position to role name
            values = [id, first_name, last_name, phone, role]; 
        }
      }

      const result = await pool.query(query, values);
      
      // Get updated full profile to return (re-fetch to get email from join)
      // Or just construct it manually to save a query. 
      // Let's just return what we updated combined with email from user.
      const userEmail = await pool.query('SELECT email FROM users WHERE user_id = $1', [id]);
      
      const responseData = {
          ...result.rows[0],
          email: userEmail.rows[0]?.email
      };

      // Log the update
      await AuditLogger.log({
        table_name: role === 'guest' ? 'guests' : 'staff',
        record_id: id,
        action: 'UPDATE',
        new_values: { first_name, last_name, phone },
        user_id: id,
        ip_address: AuditLogger.getClientIp(req),
        user_agent: req.get('user-agent')
      });

      res.json({ success: true, message: 'Profile updated successfully', data: responseData });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
  }
}

export default AuthController;



// /**
//  * authController.js - Authentication controller
//  * * Handles user authentication operations: registration, login,
//  * logout, token refresh, and current user info.
//  * * Dependencies:
//  * - User model for user operations
//  * - Role model for role management
//  * - express-validator for input validation
//  */

// import { validationResult } from 'express-validator';
// import bcrypt from 'bcryptjs';
// import crypto from 'crypto'; // ADDED: Required for generating reset tokens
// import pool from '../config/database.js';
// import User from '../models/User.js';
// import Role from '../models/Role.js';
// import Guest from '../models/Guest.js';
// import AuditLogger from '../utils/auditLogger.js';

// class AuthController {
//   /**
//    * User registration
//    * Creates a new user account and AUTOMATICALLY creates guest profile
//    */
//   static async register(req, res) {
//     try {
//       // Validate input
//       const errors = validationResult(req);
//       if (!errors.isEmpty()) {
//         return res.status(400).json({ 
//           success: false, 
//           errors: errors.array() 
//         });
//       }

//       // FIX: Ensure we accept 'name' (full name) or first/last
//       const { email, password, role_name, name, first_name, last_name, phone } = req.body;

//       // Determine default role (Guest) if not specified
//       const targetRoleName = role_name || 'guest';

//       // Get role ID by name
//       const role = await Role.findByName(targetRoleName);
//       if (!role) {
//         return res.status(400).json({
//           success: false,
//           message: 'Invalid role specified'
//         });
//       }

//       // Check if user already exists
//       const existingUser = await User.findByEmail(email);
//       if (existingUser) {
//         return res.status(409).json({
//           success: false,
//           message: 'Email already registered'
//         });
//       }

//       // 1. Create User
//       // We create the user first. If the subsequent steps fail, we MUST delete this user.
//       const userData = { email, password, role_id: role.role_id };
//       const user = await User.create(userData);

//       // --- TRANSACTION SAFEGUARD START ---
//       let guest = null;

//       try {
//         // AUDIT LOG: User registration
//         await AuditLogger.log({
//           table_name: 'users',
//           record_id: user.user_id,
//           action: 'INSERT',
//           new_values: {
//             user_id: user.user_id,
//             email: user.email,
//             role_id: user.role_id,
//             created_at: user.created_at
//           },
//           user_id: user.user_id, // Self-registration
//           ip_address: AuditLogger.getClientIp(req),
//           user_agent: req.get('user-agent')
//         });

//         // 2. Create Guest Profile (if role is guest)
//         if (targetRoleName === 'guest') {
//           // logic to split full name if provided
//           let fName = first_name;
//           let lName = last_name;

//           if (!fName && name) {
//               const nameParts = name.trim().split(' ');
//               fName = nameParts[0];
//               lName = nameParts.slice(1).join(' ') || 'Guest';
//           }

//           // Fallback if no name provided at all
//           if (!fName) fName = 'Guest'; 
//           if (!lName) lName = 'User';

//           // FIX: Removed 'email' from creation
//           guest = await Guest.create({
//             user_id: user.user_id,
//             created_by: user.user_id, // Guest creates themselves
//             first_name: fName,
//             last_name: lName,
//             phone: phone || null,
//             guest_type: 'online' // Correct Type
//           });

//           // AUDIT LOG: Guest creation
//           await AuditLogger.log({
//             table_name: 'guests',
//             record_id: guest.guest_id,
//             action: 'INSERT',
//             new_values: {
//               guest_id: guest.guest_id,
//               user_id: guest.user_id,
//               first_name: guest.first_name,
//               last_name: guest.last_name,
//               guest_type: guest.guest_type
//             },
//             user_id: user.user_id,
//             ip_address: AuditLogger.getClientIp(req),
//             user_agent: req.get('user-agent')
//           });
//         }
        
//         // Note: For Staff (admin/receptionist), we rely on profile update to create the record later if needed.

//         // Generate token
//         const token = User.generateToken({
//           ...user,
//           role_name: role.role_name,
//           permissions: role.permissions
//         });

//         res.status(201).json({
//           success: true,
//           message: 'Registration successful',
//           data: {
//             user: {
//               id: user.user_id,
//               email: user.email,
//               role: role.role_name
//             },
//             guest: guest ? {
//               id: guest.guest_id,
//               name: `${guest.first_name} ${guest.last_name}`
//             } : null,
//             token
//           }
//         });

//       } catch (innerError) {
//         // !!! CRITICAL ROLLBACK !!!
//         console.error("Partial Registration Failure - Rolling back User:", innerError);
//         await pool.query('DELETE FROM users WHERE user_id = $1', [user.user_id]);
//         throw innerError; 
//       }
//       // --- TRANSACTION SAFEGUARD END ---

//     } catch (error) {
//       console.error('Registration error:', error);
//       res.status(500).json({
//         success: false,
//         message: error.message || 'Registration failed'
//       });
//     }
//   }

//   /**
//    * User login
//    * Authenticates user and returns JWT token
//    */
//   static async login(req, res) {
//     try {
//       // Validate input
//       const errors = validationResult(req);
//       if (!errors.isEmpty()) {
//         return res.status(400).json({ 
//           success: false, 
//           errors: errors.array() 
//         });
//       }

//       const { email, password } = req.body;

//       // Find user
//       const user = await User.findByEmail(email);
//       if (!user) {
//         // AUDIT LOG: Failed login attempt (unknown user)
//         await AuditLogger.log({
//           table_name: 'auth_attempts',
//           record_id: 0,
//           action: 'INSERT',
//           new_values: {
//             email: email,
//             success: false,
//             reason: 'user_not_found',
//             ip_address: AuditLogger.getClientIp(req),
//             timestamp: new Date()
//           },
//           user_id: null,
//           ip_address: AuditLogger.getClientIp(req),
//           user_agent: req.get('user-agent')
//         });

//         return res.status(401).json({
//           success: false,
//           message: 'Invalid credentials'
//         });
//       }

//       /// Verify password
//       const isValidPassword = await User.comparePassword(password, user.password_hash);
      
//       // 1. Handle Invalid Password
//       if (!isValidPassword) {
        
//         // Calculate new values
//         const newFailedAttempts = (user.failed_attempts || 0) + 1;
//         const lastFailedAttempt = new Date();

//         await pool.query(
//           'UPDATE users SET failed_attempts = $1, last_failed_attempt = $2 WHERE user_id = $3',
//           [newFailedAttempts, lastFailedAttempt, user.user_id]
//         );

//         await AuditLogger.log({
//           table_name: 'users',
//           record_id: user.user_id,
//           action: 'UPDATE',
//           old_values: { 
//             last_failed_attempt: user.last_failed_attempt,
//             failed_attempts: user.failed_attempts || 0
//           },
//           new_values: { 
//             last_failed_attempt: lastFailedAttempt,
//             failed_attempts: newFailedAttempts
//           },
//           user_id: user.user_id,
//           ip_address: AuditLogger.getClientIp(req),
//           user_agent: req.get('user-agent')
//         });

//         return res.status(401).json({
//           success: false,
//           message: 'Invalid credentials'
//         });
//       }

//       // Update last login
//       await User.updateLastLogin(user.user_id);

//       // AUDIT LOG: Successful login
//       await AuditLogger.log({
//         table_name: 'users',
//         record_id: user.user_id,
//         action: 'UPDATE',
//         old_values: { last_login: user.last_login },
//         new_values: { last_login: new Date() },
//         user_id: user.user_id,
//         ip_address: AuditLogger.getClientIp(req),
//         user_agent: req.get('user-agent')
//       });

//       // Generate token
//       const token = User.generateToken(user);

//       // Get guest info if exists
//       let guest = null;
//       if (user.role_name === 'guest') {
//         guest = await Guest.findByUserId(user.user_id);
//       }

//       res.json({
//         success: true,
//         message: 'Login successful',
//         data: {
//           user: {
//             id: user.user_id,
//             email: user.email,
//             role: user.role_name,
//             permissions: user.permissions
//           },
//           guest: guest ? {
//             id: guest.guest_id,
//             name: `${guest.first_name} ${guest.last_name}`,
//             phone: guest.phone
//           } : null,
//           token
//         }
//       });
//     } catch (error) {
//       console.error('Login error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Login failed'
//       });
//     }
//   }

//   /**
//    * Get current user info (Lightweight version for session check)
//    */
//   static async getCurrentUser(req, res) {
//     try {
//       const user = await User.findById(req.user.id);
//       if (!user) {
//         return res.status(404).json({
//           success: false,
//           message: 'User not found'
//         });
//       }

//       // Get guest info if exists
//       let guest = null;
//       if (user.role_name === 'guest') {
//         guest = await Guest.findByUserId(user.user_id);
//       }

//       res.json({
//         success: true,
//         data: {
//           user: {
//             id: user.user_id,
//             email: user.email,
//             role: user.role_name,
//             permissions: user.permissions,
//             last_login: user.last_login,
//             created_at: user.created_at
//           },
//           guest: guest ? {
//             id: guest.guest_id,
//             first_name: guest.first_name,
//             last_name: guest.last_name,
//             email: user.email, // Use email from User object
//             phone: guest.phone,
//             guest_type: guest.guest_type
//           } : null
//         }
//       });
//     } catch (error) {
//       console.error('Get current user error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to get user information'
//       });
//     }
//   }

//   /**
//    * Refresh token
//    */
//   static async refreshToken(req, res) {
//     try {
//       const user = await User.findById(req.user.id);
//       if (!user) {
//         return res.status(404).json({
//           success: false,
//           message: 'User not found'
//         });
//       }

//       const token = User.generateToken(user);

//       res.json({
//         success: true,
//         data: { token }
//       });
//     } catch (error) {
//       console.error('Token refresh error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to refresh token'
//       });
//     }
//   }

//   /**
//    * Logout
//    */
//   static async logout(req, res) {
//     try {
//       await AuditLogger.log({
//         table_name: 'auth_sessions',
//         record_id: 0,
//         action: 'INSERT',
//         new_values: {
//           user_id: req.user?.id,
//           action: 'logout',
//           ip_address: AuditLogger.getClientIp(req),
//           timestamp: new Date()
//         },
//         user_id: req.user?.id || null,
//         ip_address: AuditLogger.getClientIp(req),
//         user_agent: req.get('user-agent')
//       });

//       res.json({
//         success: true,
//         message: 'Logout successful'
//       });
//     } catch (error) {
//       console.error('Logout error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Logout failed'
//       });
//     }
//   }

//   /**
//    * Change password
//    */
//   static async changePassword(req, res) {
//     try {
//       const errors = validationResult(req);
//       if (!errors.isEmpty()) {
//         return res.status(400).json({ 
//           success: false, 
//           errors: errors.array() 
//         });
//       }

//       const { currentPassword, newPassword, confirmPassword } = req.body;

//       if (newPassword !== confirmPassword) {
//         return res.status(400).json({
//           success: false,
//           message: 'New password and confirm password do not match'
//         });
//       }

//       const userId = req.user.id;

//       const query = 'SELECT password_hash FROM users WHERE user_id = $1';
//       const result = await pool.query(query, [userId]);
      
//       if (!result.rows[0]) {
//         return res.status(404).json({
//           success: false,
//           message: 'User not found'
//         });
//       }

//       const { password_hash } = result.rows[0];

//       const isValid = await User.comparePassword(currentPassword, password_hash);
//       if (!isValid) {
//         await AuditLogger.log({
//           table_name: 'auth_attempts',
//           record_id: 0,
//           action: 'INSERT',
//           new_values: {
//             user_id: userId,
//             action: 'password_change',
//             success: false,
//             reason: 'invalid_current_password',
//             ip_address: AuditLogger.getClientIp(req),
//             timestamp: new Date()
//           },
//           user_id: userId,
//           ip_address: AuditLogger.getClientIp(req),
//           user_agent: req.get('user-agent')
//         });

//         return res.status(401).json({
//           success: false,
//           message: 'Current password is incorrect'
//         });
//       }

//       const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12);
//       const newPasswordHash = await bcrypt.hash(newPassword, salt);

//       await pool.query(
//         'UPDATE users SET password_hash = $1 WHERE user_id = $2',
//         [newPasswordHash, userId]
//       );

//       await AuditLogger.log({
//         table_name: 'users',
//         record_id: userId,
//         action: 'UPDATE',
//         old_values: { password_changed: false }, 
//         new_values: { 
//           password_changed: true,
//           password_changed_at: new Date(),
//           password_changed_by: userId
//         },
//         user_id: userId,
//         ip_address: AuditLogger.getClientIp(req),
//         user_agent: req.get('user-agent')
//       });

//       res.json({
//         success: true,
//         message: 'Password changed successfully'
//       });
//     } catch (error) {
//       console.error('Change password error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to change password'
//       });
//     }
//   }

//   // --- ADDED: PASSWORD RESET METHODS ---

//   /**
//    * Forgot Password - Step 1
//    * Generates token and "sends" email
//    */
//   static async forgotPassword(req, res) {
//     try {
//       const { email } = req.body;
//       const user = await User.findByEmail(email);

//       if (!user) {
//         return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
//       }

//       // 1. Generate Token
//       const token = crypto.randomBytes(20).toString('hex');
//       const expires = Date.now() + 3600000; // 1 hour

//       // 2. Save Token to DB
//       await pool.query(
//         'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE user_id = $3',
//         [token, expires, user.user_id]
//       );

//       // 3. (SIMULATION) Send Email
//       const resetLink = `http://localhost:5173/reset-password/${token}`;
//       console.log(`\n=== PASSWORD RESET LINK ===\n${resetLink}\n===========================\n`);

//       // Audit Log
//       await AuditLogger.log({
//         table_name: 'users',
//         record_id: user.user_id,
//         action: 'UPDATE',
//         new_values: { reset_token_generated: true },
//         user_id: user.user_id,
//         ip_address: AuditLogger.getClientIp(req),
//         user_agent: req.get('user-agent')
//       });

//       res.json({ success: true, message: 'Reset link sent to email (Check server console)' });

//     } catch (error) {
//       console.error('Forgot password error:', error);
//       res.status(500).json({ success: false, message: 'Error processing request' });
//     }
//   }

//   /**
//    * Reset Password - Step 2
//    * Verifies token and updates password
//    */
//   static async resetPassword(req, res) {
//     try {
//       const { token, newPassword, confirmPassword } = req.body;

//       if (newPassword !== confirmPassword) {
//         return res.status(400).json({ success: false, message: 'Passwords do not match' });
//       }

//       // 1. Find user with valid, non-expired token
//       const query = `
//         SELECT * FROM users 
//         WHERE reset_password_token = $1 
//         AND reset_password_expires > $2
//       `;
//       const result = await pool.query(query, [token, Date.now()]);
//       const user = result.rows[0];

//       if (!user) {
//         return res.status(400).json({ success: false, message: 'Password reset token is invalid or has expired.' });
//       }

//       // 2. Hash new password
//       const salt = await bcrypt.genSalt(10);
//       const hashedPassword = await bcrypt.hash(newPassword, salt);

//       // 3. Update User (Clear token fields)
//       await pool.query(
//         `UPDATE users 
//          SET password_hash = $1, 
//              reset_password_token = NULL, 
//              reset_password_expires = NULL 
//          WHERE user_id = $2`,
//         [hashedPassword, user.user_id]
//       );

//       await AuditLogger.log({
//         table_name: 'users',
//         record_id: user.user_id,
//         action: 'UPDATE',
//         new_values: { password_reset: true },
//         user_id: user.user_id,
//         ip_address: AuditLogger.getClientIp(req),
//         user_agent: req.get('user-agent')
//       });

//       res.json({ success: true, message: 'Password has been reset successfully.' });

//     } catch (error) {
//       console.error('Reset password error:', error);
//       res.status(500).json({ success: false, message: 'Failed to reset password' });
//     }
//   }

//   // --- NEW METHODS FOR FULL PROFILE ---

//   /**
//    * Get Full Profile
//    * Fetches specific data based on role (Guest vs Staff)
//    * FIX: Queries 'staff' table for receptionist/admin
//    */
//   static async getProfile(req, res) {
//     try {
//       const { id, role } = req.user; 
//       let query = '';
      
//       // 1. Select appropriate table based on role
//       if (role === 'guest') {
//         query = `
//           SELECT g.guest_id as id, g.first_name, g.last_name, u.email, g.phone, g.address, g.sex, 'guest' as role 
//           FROM guests g
//           JOIN users u ON g.user_id = u.user_id
//           WHERE u.user_id = $1
//         `;
//       } else {
//         // For Staff (Admin, Receptionist, etc.), fetch from 'staff' table joined with 'users'
//         query = `
//           SELECT s.staff_id as id, s.first_name, s.last_name, u.email, s.phone, s.position as role, s.sex 
//           FROM staff s 
//           JOIN users u ON s.user_id = u.user_id 
//           WHERE u.user_id = $1
//         `;
//       }

//       const result = await pool.query(query, [id]);
      
//       // 2. Handle missing profile record (Fallback)
//       if (result.rows.length === 0) {
//         // If staff record is missing but user exists, return basic user info so page doesn't crash
//         const userFallback = await pool.query('SELECT user_id as id, email, role_name as role FROM users WHERE user_id = $1', [id]);
        
//         if (userFallback.rows.length > 0) {
//             return res.json({ success: true, data: userFallback.rows[0] });
//         }
//         return res.status(404).json({ success: false, message: 'User profile not found' });
//       }

//       res.json({ success: true, data: result.rows[0] });
//     } catch (error) {
//       console.error('Get profile error:', error);
//       res.status(500).json({ success: false, message: 'Server error fetching profile' });
//     }
//   }

//   /**
//    * Update Profile Details
//    * FIX: Updates 'staff' table for receptionist/admin
//    */
//   static async updateProfile(req, res) {
//     try {
//       const { id, role } = req.user;
//       const { first_name, last_name, phone, address } = req.body;

//       let query = '';
//       let values = [];

//       if (role === 'guest') {
//         // Update Guest
//         query = `
//           UPDATE guests 
//           SET first_name = $1, last_name = $2, phone = $3, address = $4 
//           WHERE user_id = $5 RETURNING *
//         `;
//         values = [first_name, last_name, phone, address, id];
//       } else {
//         // Update Staff - Check if record exists first
//         const checkStaff = await pool.query('SELECT staff_id FROM staff WHERE user_id = $1', [id]);
        
//         if (checkStaff.rows.length > 0) {
//             // Update existing staff record
//             query = `
//               UPDATE staff 
//               SET first_name = $1, last_name = $2, phone = $3 
//               WHERE user_id = $4 RETURNING staff_id, first_name, last_name, phone, position
//             `;
//             values = [first_name, last_name, phone, id];
//         } else {
//             // Create new staff record if it doesn't exist (Self-repair)
//             query = `
//               INSERT INTO staff (user_id, first_name, last_name, phone, position)
//               VALUES ($1, $2, $3, $4, $5)
//               RETURNING staff_id, first_name, last_name, phone, position
//             `;
//             // Default position to role name
//             values = [id, first_name, last_name, phone, role]; 
//         }
//       }

//       const result = await pool.query(query, values);
      
//       // Get updated full profile to return (re-fetch to get email from join)
//       // Or just construct it manually to save a query. 
//       // Let's just return what we updated combined with email from user.
//       const userEmail = await pool.query('SELECT email FROM users WHERE user_id = $1', [id]);
      
//       const responseData = {
//           ...result.rows[0],
//           email: userEmail.rows[0]?.email
//       };

//       // Log the update
//       await AuditLogger.log({
//         table_name: role === 'guest' ? 'guests' : 'staff',
//         record_id: id,
//         action: 'UPDATE',
//         new_values: { first_name, last_name, phone },
//         user_id: id,
//         ip_address: AuditLogger.getClientIp(req),
//         user_agent: req.get('user-agent')
//       });

//       res.json({ success: true, message: 'Profile updated successfully', data: responseData });

//     } catch (error) {
//       console.error('Update profile error:', error);
//       res.status(500).json({ success: false, message: 'Failed to update profile' });
//     }
//   }
// }

// export default AuthController;