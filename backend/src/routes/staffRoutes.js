/**
 * staffRoutes.js - Staff management routes
 */

import { Router } from 'express';
import StaffController from '../controllers/staffController.js';
import AuthMiddleware from '../middleware/authMiddleware.js';
import StaffMiddleware from '../middleware/staffMiddleware.js';
import ErrorMiddleware from '../middleware/errorMiddleware.js';

const router = Router();

// All routes require authentication
router.use(AuthMiddleware.authenticate);
router.use(StaffMiddleware.validateStaff);

// 1. Profile (Self)
router.get('/profile', StaffMiddleware.requireStaff, ErrorMiddleware.asyncHandler(StaffMiddleware.getStaffProfile));

// 2. Change Password (Self) - NEW ROUTE
router.put('/change-password', ErrorMiddleware.asyncHandler(StaffController.changePassword));

// 3. Stats (Admin)
router.get('/department/stats', AuthMiddleware.authorizeRoles('admin'), ErrorMiddleware.asyncHandler(StaffController.getDepartmentStats));

// 4. Get All (Admin)
router.get('/', AuthMiddleware.authorizeRoles('admin'), ErrorMiddleware.asyncHandler(StaffController.getAllStaff));

// 5. Get By ID
router.get('/:id', ErrorMiddleware.asyncHandler(StaffController.getStaffById));

// 6. Create (Admin)
router.post('/', AuthMiddleware.authorizeRoles('admin'), ErrorMiddleware.asyncHandler(StaffController.createStaff));

// 7. Update (Admin or Self)
router.put('/:id', ErrorMiddleware.asyncHandler(StaffController.updateStaff));

export default router;
