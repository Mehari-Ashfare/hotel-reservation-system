/**
 * reservationRoutes.js - Reservation management routes
 * 
 * Defines all reservation-related API endpoints.
 * 
 * Endpoints:
 * - GET    /                       - Get all reservations
 * - GET    /guest/:guest_id        - Get guest's reservations
 * - GET    /:id                    - Get reservation by ID
 * - GET    /calculate-price        - Calculate reservation price
 * - POST   /                       - Create new reservation
 * - PUT    /:id                    - Update reservation
 * - PUT    /:id/cancel             - Cancel reservation
 * - PUT    /:id/check-in           - Check in guest
 * - PUT    /:id/check-out          - Check out guest
 * 
 * Dependencies:
 * - ReservationController for business logic
 * - AuthMiddleware for authentication
 */

import { Router } from 'express';
import ReservationController from '../controllers/reservationController.js';
import AuthMiddleware from '../middleware/authMiddleware.js';
import ErrorMiddleware from '../middleware/errorMiddleware.js';

const router = Router();

// All routes require authentication
router.use(AuthMiddleware.authenticate);

/**
 * @route   GET /api/reservations
 * @desc    Get all reservations with filters
 * @access  Private (admin, receptionist)
 */
router.get(
  '/',
  AuthMiddleware.authorizeRoles('admin', 'receptionist'),
  ErrorMiddleware.asyncHandler(ReservationController.getAllReservations)
);

/**
 * @route   GET /api/reservations/guest/:guest_id
 * @desc    Get guest's reservations
 * @access  Private (admin, receptionist, guest - own reservations only)
 */
router.get(
  '/guest/:guest_id',
  (req, res, next) => {
    // Guests can only view their own reservations
    if (req.user.role === 'guest') {
      // TODO: Validate that guest_id matches user's guest profile
    }
    next();
  },
  ErrorMiddleware.asyncHandler(ReservationController.getGuestReservations)
);

/**
 * @route   GET /api/reservations/:id
 * @desc    Get reservation by ID
 * @access  Private (admin, receptionist, guest - own reservation only)
 */
router.get(
  '/:id',
  ErrorMiddleware.asyncHandler(ReservationController.getReservationById)
);

/**
 * @route   POST /api/reservations/calculate-price
 * @desc    Calculate reservation price
 * @access  Private (admin, receptionist, guest)
 */
router.post(
  '/calculate-price',
  AuthMiddleware.authorizeRoles('admin', 'receptionist', 'guest'),
  ErrorMiddleware.asyncHandler(ReservationController.calculatePrice)
);

/**
 * @route   POST /api/reservations
 * @desc    Create new reservation
 * @access  Private (admin, receptionist, guest)
 */
router.post(
  '/',
  AuthMiddleware.authorizeRoles('admin', 'receptionist', 'guest'),
  ErrorMiddleware.asyncHandler(ReservationController.createReservation)
);

/**
 * @route   PUT /api/reservations/:id
 * @desc    Update reservation
 * @access  Private (admin, receptionist)
 */
router.put(
  '/:id',
  AuthMiddleware.authorizeRoles('admin', 'receptionist'),
  ErrorMiddleware.asyncHandler(ReservationController.updateReservation)
);

/**
 * @route   PUT /api/reservations/:id/cancel
 * @desc    Cancel reservation
 * @access  Private (admin, receptionist, guest - own reservation only)
 */
router.put(
  '/:id/cancel',
  ErrorMiddleware.asyncHandler(ReservationController.cancelReservation)
);

/**
 * @route   PUT /api/reservations/:id/check-in
 * @desc    Check in guest
 * @access  Private (admin, receptionist)
 */
router.put(
  '/:id/check-in',
  AuthMiddleware.authorizeRoles('admin', 'receptionist'),
  ErrorMiddleware.asyncHandler(ReservationController.checkIn)
);

/**
 * @route   PUT /api/reservations/:id/check-out
 * @desc    Check out guest
 * @access  Private (admin, receptionist)
 */
router.put(
  '/:id/check-out',
  AuthMiddleware.authorizeRoles('admin', 'receptionist'),
  ErrorMiddleware.asyncHandler(ReservationController.checkOut)
);

export default router;
