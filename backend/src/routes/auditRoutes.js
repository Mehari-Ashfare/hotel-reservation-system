/**
 * auditRoutes.js - Audit log viewing routes (admin only)
 * 1. GET    /api/audit                     - Get audit logs with filters
 * 2. GET    /api/audit/recent              - Get recent activity
 * 3. GET    /api/audit/record/:table/:id   - Get audit trail for specific record
 */

import { Router } from 'express';
import AuditLog from '../models/AuditLog.js';
import AuthMiddleware from '../middleware/authMiddleware.js';
import ErrorMiddleware from '../middleware/errorMiddleware.js';

const router = Router();

// All routes require admin access
router.use(AuthMiddleware.authenticate);
router.use(AuthMiddleware.authorizeRoles('admin'));

/**
 * @route   GET /api/audit
 * @desc    Get audit logs with filters
 * @access  Private (admin only)
 */
router.get(
  '/',
  ErrorMiddleware.asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 50,
      table_name,
      action,
      user_id,
      start_date,
      end_date
    } = req.query;

    const filters = {};
    if (table_name) filters.table_name = table_name;
    if (action) filters.action = action;
    if (user_id) filters.user_id = parseInt(user_id);
    if (start_date) filters.start_date = start_date;
    if (end_date) filters.end_date = end_date;

    const result = await AuditLog.getAll(filters, parseInt(page), parseInt(limit));

    res.json({
      success: true,
      data: result
    });
  })
);

/**
 * @route   GET /api/audit/recent
 * @desc    Get recent activity
 * @access  Private (admin only)
 */
router.get(
  '/recent',
  ErrorMiddleware.asyncHandler(async (req, res) => {
    const { limit = 100 } = req.query;
    const activity = await AuditLog.getRecentActivity(parseInt(limit));

    res.json({
      success: true,
      data: activity
    });
  })
);

/**
 * @route   GET /api/audit/record/:table/:id
 * @desc    Get audit trail for specific record
 * @access  Private (admin only)
 */
router.get(
  '/record/:table/:id',
  ErrorMiddleware.asyncHandler(async (req, res) => {
    const { table, id } = req.params;
    const trail = await AuditLog.getRecordAuditTrail(table, parseInt(id));

    res.json({
      success: true,
      data: trail
    });
  })
);

export default router;