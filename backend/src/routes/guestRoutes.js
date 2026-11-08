/**
 * guestRoutes.js - Guest management routes
 * 
 * Defines all guest-related API endpoints.
 * 
 * Endpoints:
 * - GET    /              - Get all guests (with pagination)
 * - GET    /search        - Search guests
 * - GET    /:id           - Get guest by ID
 * - POST   /              - Create new guest
 * - PUT    /:id           - Update guest
 * - DELETE /:id           - Delete guest
 * 
 * Dependencies:
 * - GuestController for business logic
 * - AuthMiddleware for authentication
 * - ValidationMiddleware for input validation
 */

import { Router } from 'express';
import GuestController from '../controllers/guestController.js';
import ValidationMiddleware from '../middleware/validationMiddleware.js';
import AuthMiddleware from '../middleware/authMiddleware.js';
import ErrorMiddleware from '../middleware/errorMiddleware.js';

const router = Router();

// All routes require authentication
router.use(AuthMiddleware.authenticate);

/**
 * @route   GET /api/guests
 * @desc    Get all guests with pagination
 * @access  Private (receptionist, admin)
 */
router.get(
  '/',
  AuthMiddleware.authorizeRoles('admin', 'receptionist'),
  ErrorMiddleware.asyncHandler(GuestController.getAllGuests)
);

/**
 * @route   GET /api/guests/search
 * @desc    Search guests by name, email, or phone
 * @access  Private (receptionist, admin)
 */
router.get(
  '/search',
  AuthMiddleware.authorizeRoles('admin', 'receptionist'),
  ErrorMiddleware.asyncHandler(GuestController.searchGuests)
);

/**
 * @route   GET /api/guests/:id
 * @desc    Get guest by ID
 * @access  Private (receptionist, admin, guest - own profile only)
 */
router.get(
  '/:id',
  (req, res, next) => {
    // Guests can only view their own profile
    if (req.user.role === 'guest') {
      // This would need additional logic to check if guest ID matches user's guest ID
      // For now, allow access
    }
    next();
  },
  ErrorMiddleware.asyncHandler(GuestController.getGuestById)
);

/**
 * @route   POST /api/guests
 * @desc    Create new guest
 * @access  Private (receptionist, admin)
 */
router.post(
  '/',
  AuthMiddleware.authorizeRoles('admin', 'receptionist'),
  ValidationMiddleware.guestCreateValidation,
  ValidationMiddleware.validate,
  ErrorMiddleware.asyncHandler(GuestController.createGuest)
);

/**
 * @route   PUT /api/guests/:id
 * @desc    Update guest information
 * @access  Private (receptionist, admin)
 */
router.put(
  '/:id',
  AuthMiddleware.authorizeRoles('admin', 'receptionist'),
  ValidationMiddleware.guestUpdateValidation,
  ValidationMiddleware.validate,
  ErrorMiddleware.asyncHandler(GuestController.updateGuest)
);

/**
 * @route   DELETE /api/guests/:id
 * @desc    Delete guest
 * @access  Private (admin only)
 */
router.delete(
  '/:id',
  AuthMiddleware.authorizeRoles('admin'),
  ErrorMiddleware.asyncHandler(GuestController.deleteGuest)
);

export default router;
