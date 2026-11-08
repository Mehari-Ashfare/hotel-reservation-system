/**
 * reportRoutes.js - Report management routes
 * * Defines all report-related API endpoints.
 * * Endpoints:
 * - GET /daily     - Get daily report
 * - GET /weekly    - Get weekly report
 * - GET /monthly   - Get monthly report
 * - GET /custom    - Get custom report
 * * Dependencies:
 * - ReportController for business logic
 * - AuthMiddleware for authentication
 */

import { Router } from 'express';
import ReportController from '../controllers/reportController.js';
import AuthMiddleware from '../middleware/authMiddleware.js';
import ErrorMiddleware from '../middleware/errorMiddleware.js';

const router = Router();

// All routes require authentication
router.use(AuthMiddleware.authenticate);

// REMOVED: router.use(AuthMiddleware.requirePermission('view_reports'));
// Why? This line was blocking receptionists globally. We will handle permissions per route below.

/**
 * @route   GET /api/reports/daily
 * @desc    Get daily report (Used for Dashboard)
 * @access  Private (admin, receptionist)
 */
router.get(
  '/daily',
  AuthMiddleware.authorizeRoles('admin', 'receptionist'), // Allowed for Dashboard visibility
  ErrorMiddleware.asyncHandler(ReportController.getDailyReport)
);

/**
 * @route   GET /api/reports/weekly
 * @desc    Get weekly report
 * @access  Private (admin only)
 */
router.get(
  '/weekly',
  AuthMiddleware.authorizeRoles('admin'), // Restricted to Admin
  ErrorMiddleware.asyncHandler(ReportController.getWeeklyReport)
);

/**
 * @route   GET /api/reports/monthly
 * @desc    Get monthly report
 * @access  Private (admin only)
 */
router.get(
  '/monthly',
  AuthMiddleware.authorizeRoles('admin'), // Restricted to Admin
  ErrorMiddleware.asyncHandler(ReportController.getMonthlyReport)
);

/**
 * @route   GET /api/reports/custom
 * @desc    Get custom report
 * @access  Private (admin only)
 */
router.get(
  '/custom',
  AuthMiddleware.authorizeRoles('admin'), // Restricted to Admin
  ErrorMiddleware.asyncHandler(ReportController.getCustomReport)
);

export default router;



// /**
//  * reportRoutes.js - Report management routes
//  * 
//  * Defines all report-related API endpoints.
//  * 
//  * Endpoints:
//  * - GET /daily     - Get daily report
//  * - GET /weekly    - Get weekly report
//  * - GET /monthly   - Get monthly report
//  * - GET /custom    - Get custom report
//  * 
//  * Dependencies:
//  * - ReportController for business logic
//  * - AuthMiddleware for authentication
//  */

// import { Router } from 'express';
// import ReportController from '../controllers/reportController.js';
// import AuthMiddleware from '../middleware/authMiddleware.js';
// import ErrorMiddleware from '../middleware/errorMiddleware.js';

// const router = Router();

// // All routes require authentication and report viewing permission
// router.use(AuthMiddleware.authenticate);
// router.use(AuthMiddleware.requirePermission('view_reports'));

// /**
//  * @route   GET /api/reports/daily
//  * @desc    Get daily report
//  * @access  Private (admin, receptionist)
//  */
// router.get(
//   '/daily',
//   AuthMiddleware.authorizeRoles('admin', 'receptionist'),
//   ErrorMiddleware.asyncHandler(ReportController.getDailyReport)
// );

// /**
//  * @route   GET /api/reports/weekly
//  * @desc    Get weekly report
//  * @access  Private (admin, receptionist)
//  */
// router.get(
//   '/weekly',
//   AuthMiddleware.authorizeRoles('admin', 'receptionist'),
//   ErrorMiddleware.asyncHandler(ReportController.getWeeklyReport)
// );

// /**
//  * @route   GET /api/reports/monthly
//  * @desc    Get monthly report
//  * @access  Private (admin, receptionist)
//  */
// router.get(
//   '/monthly',
//   AuthMiddleware.authorizeRoles('admin', 'receptionist'),
//   ErrorMiddleware.asyncHandler(ReportController.getMonthlyReport)
// );

// /**
//  * @route   GET /api/reports/custom
//  * @desc    Get custom report
//  * @access  Private (admin, receptionist)
//  */
// router.get(
//   '/custom',
//   AuthMiddleware.authorizeRoles('admin', 'receptionist'),
//   ErrorMiddleware.asyncHandler(ReportController.getCustomReport)
// );

// export default router;
