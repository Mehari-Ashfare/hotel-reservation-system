/**
 * auditMiddleware.js - Automatic audit logging middleware
 * Automatically logs all CRUD operations to audit_logs table
 */

import AuditLog from '../models/AuditLog.js';
import { getClientIp } from '../utils/ipUtils.js';

class AuditMiddleware {
  /**
   * Log CRUD operations automatically
   */
  static async logOperation(req, res, next) {
    const originalSend = res.send;
    const originalJson = res.json;
    
    // Capture response data
    res.json = function(data) {
      res.locals.responseData = data;
      return originalJson.call(this, data);
    };
    
    res.send = function(data) {
      res.locals.responseData = data;
      return originalSend.call(this, data);
    };
    
    // After response is sent, log the operation
    res.on('finish', async () => {
      try {
        const { method, originalUrl, user, body, params, query } = req;
        const { statusCode } = res;
        
        // Only log successful operations (2xx, 3xx status codes)
        if (statusCode >= 200 && statusCode < 400) {
          let action = '';
          let tableName = '';
          let recordId = null;
          
          // Determine action and table based on route
          if (originalUrl.includes('/api/guests')) {
            tableName = 'guests';
            if (method === 'POST') action = 'CREATE';
            else if (method === 'PUT' || method === 'PATCH') action = 'UPDATE';
            else if (method === 'DELETE') action = 'DELETE';
            recordId = params.id || body.guest_id || res.locals.responseData?.data?.guest_id;
          }
          else if (originalUrl.includes('/api/rooms')) {
            tableName = 'rooms';
            if (method === 'POST') action = 'CREATE';
            else if (method === 'PUT' || method === 'PATCH') action = 'UPDATE';
            else if (method === 'DELETE') action = 'DELETE';
            recordId = params.id || body.room_id || res.locals.responseData?.data?.room_id;
          }
          else if (originalUrl.includes('/api/reservations')) {
            tableName = 'reservations';
            if (method === 'POST') action = 'CREATE';
            else if (method === 'PUT' || method === 'PATCH') action = 'UPDATE';
            else if (method === 'DELETE') action = 'DELETE';
            else if (originalUrl.includes('/check-in')) action = 'CHECK_IN';
            else if (originalUrl.includes('/check-out')) action = 'CHECK_OUT';
            else if (originalUrl.includes('/cancel')) action = 'CANCEL';
            recordId = params.id || body.reservation_id || res.locals.responseData?.data?.reservation_id;
          }
          else if (originalUrl.includes('/api/payments')) {
            tableName = 'payments';
            if (method === 'POST') action = 'CREATE';
            else if (method === 'PUT' || method === 'PATCH') action = 'UPDATE';
            else if (method === 'DELETE') action = 'DELETE';
            else if (originalUrl.includes('/process')) action = 'PROCESS';
            else if (originalUrl.includes('/refund')) action = 'REFUND';
            recordId = params.id || body.payment_id || res.locals.responseData?.data?.payment_id;
          }
          
          if (action && tableName) {
            await AuditLog.create({
              table_name: tableName,
              record_id: recordId,
              action: action,
              old_values: method === 'PUT' || method === 'PATCH' ? JSON.stringify(req.body) : null,
              new_values: JSON.stringify(res.locals.responseData?.data || {}),
              user_id: user?.user_id || null,
              ip_address: getClientIp(req),
              user_agent: req.get('user-agent')
            });
          }
        }
      } catch (error) {
        console.error('Audit logging failed (non-critical):', error.message);
      }
    });
    
    next();
  }
  
  /**
   * Manual audit logging for specific operations
   */
  static async manualLog(logData) {
    try {
      return await AuditLog.create(logData);
    } catch (error) {
      console.error('Manual audit log failed:', error.message);
      return null;
    }
  }
}

export default AuditMiddleware;