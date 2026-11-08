/**
 * auditLogger.js - Utility for consistent audit logging
 * Handles the audit_logs table constraints properly
 */

import pool from '../config/database.js';

class AuditLogger {
  /**
   * Log an operation to audit_logs table
   * @param {Object} options - Audit log options
   * @returns {Promise<Object|null>} Created audit log or null
   */
  static async log(options) {
    try {
      const {
        table_name,
        record_id,
        action, // Must be 'INSERT', 'UPDATE', or 'DELETE'
        old_values = null,
        new_values = null,
        user_id = null,
        ip_address = null,
        user_agent = null
      } = options;

      // Validate based on audit table constraints
      if (action === 'INSERT' && (!new_values || old_values)) {
        console.warn('Audit warning: INSERT requires new_values and NULL old_values');
      }
      if (action === 'UPDATE' && (!old_values || !new_values)) {
        console.warn('Audit warning: UPDATE requires both old_values and new_values');
      }
      if (action === 'DELETE' && (!old_values || new_values)) {
        console.warn('Audit warning: DELETE requires old_values and NULL new_values');
      }

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
        old_values ? JSON.stringify(old_values) : null,
        new_values ? JSON.stringify(new_values) : null,
        user_id,
        ip_address,
        user_agent
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      // Don't throw - audit failures shouldn't break main operations
      console.error('Audit logging failed:', error.message);
      return null;
    }
  }

  /**
   * Get client IP from request
   */
  static getClientIp(req) {
    return req.ip || 
           req.headers['x-forwarded-for'] || 
           req.connection.remoteAddress || 
           'unknown';
  }
}

export default AuditLogger;