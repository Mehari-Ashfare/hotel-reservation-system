/**
 * roomRoutes.js - Room management routes
 * * Defines all room-related API endpoints.
 * * Endpoints:
 * - GET    /                   - Get all rooms
 * - GET    /available          - Get available rooms
 * - GET    /types              - Get room types
 * - GET    /occupancy          - Get occupancy rate
 * - GET    /:id                - Get room by ID
 * - POST   /                   - Create new room
 * - POST   /types              - Create room type
 * - PUT    /:id                - Update room
 * * Dependencies:
 * - RoomController for business logic
 * - AuthMiddleware for authentication
 */

import { Router } from 'express';
import RoomController from '../controllers/roomController.js';
import AuthMiddleware from '../middleware/authMiddleware.js';
import ErrorMiddleware from '../middleware/errorMiddleware.js';

const router = Router();

// All routes require authentication
router.use(AuthMiddleware.authenticate);

/**
 * @route   GET /api/rooms
 * @desc    Get all rooms with filters
 * @access  Private (receptionist, admin)
 */
router.get(
  '/',
  AuthMiddleware.authorizeRoles('admin', 'receptionist'),
  ErrorMiddleware.asyncHandler(RoomController.getAllRooms)
);

/**
 * @route   GET /api/rooms/available
 * @desc    Get available rooms for date range
 * @access  Private (receptionist, admin, guest)
 */
router.get(
  '/available',
  AuthMiddleware.authorizeRoles('admin', 'receptionist', 'guest'),
  ErrorMiddleware.asyncHandler(RoomController.getAvailableRooms)
);

/**
 * @route   GET /api/rooms/types
 * @desc    Get all room types
 * @access  Private (receptionist, admin, guest)
 */
router.get(
  '/types',
  AuthMiddleware.authorizeRoles('admin', 'receptionist', 'guest'),
  ErrorMiddleware.asyncHandler(RoomController.getRoomTypes)
);

/**
 * @route   GET /api/rooms/occupancy
 * @desc    Get occupancy rate for date range
 * @access  Private (admin, receptionist)
 */
router.get(
  '/occupancy',
  AuthMiddleware.authorizeRoles('admin', 'receptionist'),
  ErrorMiddleware.asyncHandler(RoomController.getOccupancyRate)
);

/**
 * @route   GET /api/rooms/:id
 * @desc    Get room by ID
 * @access  Private (receptionist, admin, guest)
 */
router.get(
  '/:id',
  // FIX: Added 'guest' here so the booking page can load room details
  AuthMiddleware.authorizeRoles('admin', 'receptionist', 'guest'),
  ErrorMiddleware.asyncHandler(RoomController.getRoomById)
);

/**
 * @route   POST /api/rooms
 * @desc    Create new room
 * @access  Private (admin only)
 */
router.post(
  '/',
  AuthMiddleware.authorizeRoles('admin'),
  ErrorMiddleware.asyncHandler(RoomController.createRoom)
);

/**
 * @route   POST /api/rooms/types
 * @desc    Create new room type
 * @access  Private (admin only)
 */
router.post(
  '/types',
  AuthMiddleware.authorizeRoles('admin'),
  ErrorMiddleware.asyncHandler(RoomController.createRoomType)
);

/**
 * @route   PUT /api/rooms/:id
 * @desc    Update room information
 * @access  Private (admin, receptionist)
 */
router.put(
  '/:id',
  AuthMiddleware.authorizeRoles('admin', 'receptionist'),
  ErrorMiddleware.asyncHandler(RoomController.updateRoom)
);

export default router;