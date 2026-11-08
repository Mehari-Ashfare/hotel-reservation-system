/**
 * AuditLog.js - Audit Log model
 * * Handles audit trail operations for tracking all changes
 * in the system for security and compliance.
 * * Dependencies:
 * - database pool from config/database.js
 */

import pool from '../config/database.js';

class AuditLog {
  /**
   * Create audit log entry
   * @param {Object} logData - Audit log data
   * @returns {Promise<Object>} Created audit log
   */
  static async create(logData) {
    try {
      const {
        table_name,
        record_id,
        action,
        old_values = null,
        new_values = null,
        user_id = null,
        ip_address = null,
        user_agent = null
      } = logData;

      const query = `
        INSERT INTO audit_logs (
          table_name, record_id, action, old_values, 
          new_values, user_id, ip_address, user_agent
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        user_id,
        ip_address,
        user_agent
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating audit log:', error.message);
      // Don't throw error for audit failures to avoid breaking main operations
      return null;
    }
  }

  /**
   * Get audit logs with filters
   * @param {Object} filters - Filter options
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Paginated audit logs
   */
  static async getAll(filters = {}, page = 1, limit = 50) {
    try {
      const offset = (page - 1) * limit;
      const whereConditions = [];
      const values = [];
      let paramCount = 1;

      // Build filter conditions
      if (filters.table_name) {
        whereConditions.push(`table_name = $${paramCount}`);
        values.push(filters.table_name);
        paramCount++;
      }

      if (filters.action) {
        whereConditions.push(`action = $${paramCount}`);
        values.push(filters.action);
        paramCount++;
      }

      if (filters.user_id) {
        whereConditions.push(`user_id = $${paramCount}`);
        values.push(filters.user_id);
        paramCount++;
      }

      if (filters.start_date) {
        whereConditions.push(`timestamp >= $${paramCount}`);
        values.push(filters.start_date);
        paramCount++;
      }

      if (filters.end_date) {
        whereConditions.push(`timestamp <= $${paramCount}`);
        values.push(filters.end_date);
        paramCount++;
      }

      // Build WHERE clause
      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';

      // Count query
      const countQuery = `
        SELECT COUNT(*) 
        FROM audit_logs
        ${whereClause}
      `;

      // Data query
      const dataQuery = `
        SELECT 
          al.*,
          u.email as user_email,
          COALESCE(s.first_name || ' ' || s.last_name, 'System') as user_name
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.user_id
        LEFT JOIN staff s ON u.user_id = s.user_id
        ${whereClause}
        ORDER BY al.timestamp DESC
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
        auditLogs: dataResult.rows,
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
      throw new Error(`Database error getting audit logs: ${error.message}`);
    }
  }

  /**
   * Get audit log by ID
   * @param {number} auditId - Audit Log ID
   * @returns {Promise<Object|null>} Audit log object or null
   */
  static async findById(auditId) {
    try {
      const query = `
        SELECT 
          al.*,
          u.email as user_email,
          COALESCE(s.first_name || ' ' || s.last_name, 'System') as user_name
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.user_id
        LEFT JOIN staff s ON u.user_id = s.user_id
        WHERE al.audit_id = $1
      `;
      const result = await pool.query(query, [auditId]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Database error finding audit log: ${error.message}`);
    }
  }

  /**
   * Get audit trail for specific record
   * @param {string} tableName - Table name
   * @param {number} recordId - Record ID
   * @returns {Promise<Array>} Audit trail for record
   */
  static async getRecordAuditTrail(tableName, recordId) {
    try {
      const query = `
        SELECT 
          al.*,
          u.email as user_email,
          COALESCE(s.first_name || ' ' || s.last_name, 'System') as user_name
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.user_id
        LEFT JOIN staff s ON u.user_id = s.user_id
        WHERE al.table_name = $1 AND al.record_id = $2
        ORDER BY al.timestamp DESC
      `;
      const result = await pool.query(query, [tableName, recordId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error getting record audit trail: ${error.message}`);
    }
  }

  /**
   * Get recent activity
   * @param {number} limit - Number of recent activities
   * @returns {Promise<Array>} Recent audit logs
   */
  static async getRecentActivity(limit = 100) {
    try {
      const query = `
        SELECT 
          al.*,
          u.email as user_email,
          COALESCE(s.first_name || ' ' || s.last_name, 'System') as user_name
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.user_id
        LEFT JOIN staff s ON u.user_id = s.user_id
        ORDER BY al.timestamp DESC
        LIMIT $1
      `;
      const result = await pool.query(query, [limit]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error getting recent activity: ${error.message}`);
    }
  }
}

export default AuditLog;
