/**
 * Staff.js - Staff model
 * * Handles staff member operations including employee management
 * and user-staff relationship.
 * * Dependencies:
 * - database pool from config/database.js
 */

import pool from '../config/database.js';

class Staff {
  /**
   * Create new staff member
   * FIX: Removed 'email' from INSERT, Added 'sex'
   */
  static async create(staffData) {
    try {
      const {
        user_id,
        first_name,
        last_name,
        phone,
        // email, // REMOVED
        address = null,
        position,
        department = null,
        hire_date,
        is_active = true,
        sex // ADDED
      } = staffData;

      const query = `
        INSERT INTO staff (
          user_id, first_name, last_name, phone,
          address, position, department, hire_date, is_active, sex
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const values = [
        user_id,
        first_name,
        last_name,
        phone,
        address,
        position,
        department,
        hire_date,
        is_active,
        sex
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Database error creating staff: ${error.message}`);
    }
  }

  /**
   * Find staff by ID
   * FIX: Joins with users table to get email
   */
  static async findById(staffId) {
    try {
      const query = `
        SELECT 
          s.*,
          u.email as user_email,
          r.role_name
        FROM staff s
        JOIN users u ON s.user_id = u.user_id
        JOIN roles r ON u.role_id = r.role_id
        WHERE s.staff_id = $1
      `;
      const result = await pool.query(query, [staffId]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Database error finding staff: ${error.message}`);
    }
  }

  /**
   * Find staff by user ID
   * FIX: Joins with users table
   */
  static async findByUserId(userId) {
    try {
      const query = `
        SELECT 
          s.*,
          u.email as user_email,
          r.role_name
        FROM staff s
        JOIN users u ON s.user_id = u.user_id
        JOIN roles r ON u.role_id = r.role_id
        WHERE s.user_id = $1
      `;
      const result = await pool.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Database error finding staff: ${error.message}`);
    }
  }

  /**
   * Get all staff members
   * FIX: Joins with users table
   */
  static async getAll(filters = {}, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      const whereConditions = [];
      const values = [];
      let paramCount = 1;

      // Build filter conditions
      if (filters.department) {
        whereConditions.push(`s.department = $${paramCount}`);
        values.push(filters.department);
        paramCount++;
      }

      if (filters.position) {
        whereConditions.push(`s.position = $${paramCount}`);
        values.push(filters.position);
        paramCount++;
      }

      if (filters.is_active !== undefined) {
        whereConditions.push(`s.is_active = $${paramCount}`);
        values.push(filters.is_active);
        paramCount++;
      }

      // Build WHERE clause
      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';

      // Count query
      const countQuery = `
        SELECT COUNT(*) 
        FROM staff s
        ${whereClause}
      `;

      // Data query (FIX: SELECT u.email)
      const dataQuery = `
        SELECT 
          s.*,
          u.email as user_email,
          r.role_name
        FROM staff s
        JOIN users u ON s.user_id = u.user_id
        JOIN roles r ON u.role_id = r.role_id
        ${whereClause}
        ORDER BY s.staff_id DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;

      // Add pagination parameters
      values.push(limit, offset);

      const [countResult, dataResult] = await Promise.all([
        pool.query(countQuery, values.slice(0, whereConditions.length)),
        pool.query(dataQuery, values)
      ]);

      const total = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / limit);

      return {
        staff: dataResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Database error getting staff: ${error.message}`);
    }
  }

  /**
   * Update staff information
   * FIX: Added 'sex' to allowed updates, ignored 'email'
   */
  static async update(staffId, updateData) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      // Filter keys to ensure we only update columns that exist in 'staff'
      const allowedColumns = ['first_name', 'last_name', 'phone', 'address', 'position', 'department', 'hire_date', 'is_active', 'sex'];

      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined && allowedColumns.includes(key)) {
          fields.push(`${key} = $${paramCount}`);
          values.push(updateData[key]);
          paramCount++;
        }
      });

      if (fields.length === 0) {
        // If only updating user-related fields (like role), this is fine, return current staff
        return await this.findById(staffId);
      }

      values.push(staffId);

      const query = `
        UPDATE staff 
        SET ${fields.join(', ')}
        WHERE staff_id = $${paramCount}
        RETURNING *
      `;

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Database error updating staff: ${error.message}`);
    }
  }

  /**
   * Deactivate staff member
   */
  static async deactivate(staffId) {
    try {
      const query = `
        UPDATE staff 
        SET is_active = false
        WHERE staff_id = $1
        RETURNING *
      `;
      const result = await pool.query(query, [staffId]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Database error deactivating staff: ${error.message}`);
    }
  }

  /**
   * Get department statistics
   * FIXED: Returns structured JSON for positions instead of string
   */
  static async getDepartmentStats() {
    try {
      const query = `
        WITH DeptCounts AS (
          SELECT 
            department,
            position,
            COUNT(*) as pos_count
          FROM staff
          GROUP BY department, position
        )
        SELECT 
          s.department,
          COUNT(s.staff_id) as count,
          SUM(CASE WHEN s.is_active = true THEN 1 ELSE 0 END) as active_count,
          SUM(CASE WHEN s.is_active = false THEN 1 ELSE 0 END) as inactive_count,
          (
            SELECT json_object_agg(dc.position, dc.pos_count)
            FROM DeptCounts dc
            WHERE dc.department = s.department
          ) as positions
        FROM staff s
        GROUP BY s.department
        ORDER BY s.department
      `;
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error getting department stats: ${error.message}`);
    }
  }

  /**
   * Search staff by name or email
   * FIX: Search u.email via JOIN
   */
  static async search(searchTerm) {
    try {
      const query = `
        SELECT 
          s.*,
          u.email as user_email,
          r.role_name
        FROM staff s
        JOIN users u ON s.user_id = u.user_id
        JOIN roles r ON u.role_id = r.role_id
        WHERE s.first_name ILIKE $1 
          OR s.last_name ILIKE $1 
          OR u.email ILIKE $1 
        ORDER BY s.staff_id DESC
        LIMIT 50
      `;
      const result = await pool.query(query, [`%${searchTerm}%`]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error searching staff: ${error.message}`);
    }
  }
}

export default Staff;