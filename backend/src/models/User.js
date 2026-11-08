/**
 * User.js - User model for authentication
 * * Handles user data operations including password hashing,
 * JWT token generation, and user validation.
 * * Dependencies:
 * - bcryptjs for password hashing
 * - jsonwebtoken for token generation
 * - database pool from config/database.js
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

class User {
  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User object or null
   */
  static async findByEmail(email) {
    try {
      const query = `
        SELECT u.*, r.role_name, r.permissions 
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        WHERE u.email = $1 AND u.is_active = true
      `;
      const result = await pool.query(query, [email]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error('Database error finding user: ' + error.message);
    }
  }

  /**
   * Find user by ID
   * @param {number} id - User ID
   * @returns {Promise<Object|null>} User object or null
   */
  static async findById(id) {
    try {
      const query = `
        SELECT u.*, r.role_name, r.permissions 
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        WHERE u.user_id = $1 AND u.is_active = true
      `;
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error('Database error finding user: ' + error.message);
    }
  }

  /**
   * Create new user
   * @param {Object} userData - User data including email, password, role_id
   * @returns {Promise<Object>} Created user
   */
  static async create(userData) {
    try {
      const { email, password, role_id } = userData;
      
      // Hash password
      const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12);
      const passwordHash = await bcrypt.hash(password, salt);

      const query = `
        INSERT INTO users (email, password_hash, role_id)
        VALUES ($1, $2, $3)
        RETURNING user_id, email, role_id, created_at
      `;
      
      const result = await pool.query(query, [email, passwordHash, role_id]);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Email already exists');
      }
      throw new Error('Database error creating user: ' + error.message);
    }
  }

  /**
   * Compare password with hashed password
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} True if password matches
   */
  static async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT token for user
   * @param {Object} user - User object
   * @returns {string} JWT token
   */
  static generateToken(user) {
    return jwt.sign(
      {
        id: user.user_id,
        email: user.email,
        role: user.role_name,
        permissions: user.permissions
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }

  /**
   * Update user last login timestamp
   * @param {number} userId - User ID
   * @returns {Promise<void>}
   */
  static async updateLastLogin(userId) {
    try {
      await pool.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1',
        [userId]
      );
    } catch (error) {
      console.error('Error updating last login:', error.message);
    }
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @returns {Promise<Object|null>} Decoded token payload or null
   */
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return null;
    }
  }
}

export default User;