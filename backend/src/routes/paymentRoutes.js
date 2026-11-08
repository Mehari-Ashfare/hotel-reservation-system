/**
 * paymentRoutes.js - Payment management routes
 * * Defines all payment-related API endpoints.
 * * Endpoints:
 * - GET    /                           - Get all payments
 * - GET    /reservation/:reservation_id - Get reservation payments
 * - GET    /financial-report           - Get financial report
 * - GET    /:id                        - Get payment by ID
 * - POST   /                           - Create new payment
 * - PUT    /:id/process                - Process payment
 * - PUT    /:id/refund                 - Process refund
 * * Dependencies:
 * - PaymentController for business logic
 * - AuthMiddleware for authentication
 */

import { Router } from 'express';
import PaymentController from '../controllers/paymentController.js';
import AuthMiddleware from '../middleware/authMiddleware.js';
import ErrorMiddleware from '../middleware/errorMiddleware.js';

const router = Router();

// All routes require authentication
router.use(AuthMiddleware.authenticate);

/**
 * @route   GET /api/payments
 * @desc    Get all payments with filters
 * @access  Private (admin, receptionist)
 */
router.get(
  '/',
  AuthMiddleware.authorizeRoles('admin', 'receptionist'),
  ErrorMiddleware.asyncHandler(PaymentController.getAllPayments)
);

/**
 * @route   GET /api/payments/reservation/:reservation_id
 * @desc    Get payment summary for reservation
 * @access  Private (admin, receptionist, guest)
 */
router.get(
  '/reservation/:reservation_id',
  // FIX: Added 'guest' so users can see their own booking's payment status
  AuthMiddleware.authorizeRoles('admin', 'receptionist', 'guest'),
  ErrorMiddleware.asyncHandler(PaymentController.getReservationPayments)
);

/**
 * @route   GET /api/payments/financial-report
 * @desc    Get financial report
 * @access  Private (admin)
 */
router.get(
  '/financial-report',
  AuthMiddleware.authorizeRoles('admin'),
  ErrorMiddleware.asyncHandler(PaymentController.getFinancialReport)
);

/**
 * @route   GET /api/payments/:id
 * @desc    Get payment by ID
 * @access  Private (admin, receptionist)
 */
router.get(
  '/:id',
  AuthMiddleware.authorizeRoles('admin', 'receptionist'),
  ErrorMiddleware.asyncHandler(PaymentController.getPaymentById)
);

/**
 * @route   POST /api/payments
 * @desc    Create new payment
 * @access  Private (admin, receptionist, guest)
 */
router.post(
  '/',
  // FIX: Added 'guest' so the "Pay" button on the booking page works
  AuthMiddleware.authorizeRoles('admin', 'receptionist', 'guest'),
  ErrorMiddleware.asyncHandler(PaymentController.createPayment)
);

/**
 * @route   PUT /api/payments/:id/process
 * @desc    Process payment (mark as completed)
 * @access  Private (admin, receptionist)
 */
router.put(
  '/:id/process',
  AuthMiddleware.authorizeRoles('admin', 'receptionist'),
  ErrorMiddleware.asyncHandler(PaymentController.processPayment)
);

/**
 * @route   PUT /api/payments/:id/refund
 * @desc    Process refund
 * @access  Private (admin only)
 */
router.put(
  '/:id/refund',
  AuthMiddleware.authorizeRoles('admin'),
  ErrorMiddleware.asyncHandler(PaymentController.processRefund)
);

export default router;