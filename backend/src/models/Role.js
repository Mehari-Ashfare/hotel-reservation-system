/**
 * Role.js - Role model for authorization
 * * Handles role-based access control (RBAC) operations.
 * Manages permissions and role assignments.
 * * Dependencies:
 * - database pool from config/database.js
 */

import pool from '../config/database.js';

class Role {
  /**
   * Find role by ID
   * @param {number} roleId - Role ID
   * @returns {Promise<Object|null>} Role object or null
   */
  static async findById(roleId) {
    try {
      const result = await pool.query(
        'SELECT * FROM roles WHERE role_id = $1',
        [roleId]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new Error('Database error finding role: ' + error.message);
    }
  }

  /**
   * Find role by name
   * @param {string} roleName - Role name (admin, receptionist, guest)
   * @returns {Promise<Object|null>} Role object or null
   */
  static async findByName(roleName) {
    try {
      const result = await pool.query(
        'SELECT * FROM roles WHERE role_name = $1',
        [roleName]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new Error('Database error finding role: ' + error.message);
    }
  }

  /**
   * Get all roles
   * @returns {Promise<Array>} List of all roles
   */
  static async getAll() {
    try {
      const result = await pool.query('SELECT * FROM roles ORDER BY role_id');
      return result.rows;
    } catch (error) {
      throw new Error('Database error getting roles: ' + error.message);
    }
  }

  /**
   * Check if user has permission
   * @param {Array} userPermissions - User's permissions array
   * @param {string} requiredPermission - Required permission
   * @returns {boolean} True if user has permission
   */
  static hasPermission(userPermissions, requiredPermission) {
    // '*' means all permissions
    if (userPermissions && userPermissions.includes('*')) return true;
    return userPermissions && userPermissions.includes(requiredPermission);
  }

  /**
   * Get role permissions
   * @param {number} roleId - Role ID
   * @returns {Promise<Array>} Array of permissions
   */
  static async getPermissions(roleId) {
    try {
      const result = await pool.query(
        'SELECT permissions FROM roles WHERE role_id = $1',
        [roleId]
      );
      return result.rows[0]?.permissions || [];
    } catch (error) {
      throw new Error('Database error getting permissions: ' + error.message);
    }
  }
}

export default Role;