/**
 * authRoutes.js - Authentication routes
 * * Defines all authentication-related API endpoints.
 * * Endpoints:
 * - POST /register - User registration
 * - POST /login - User login
 * - POST /forgot-password - Request password reset link (ADDED)
 * - POST /reset-password - Reset password with token (ADDED)
 * - GET /me - Get current user (Basic info)
 * - POST /refresh - Refresh token
 * - POST /logout - User logout
 * - POST /change-password - Change password
 * - GET /profile - Get FULL profile details
 * - PUT /profile - Update profile details
 * * Dependencies:
 * - AuthController for business logic
 * - ValidationMiddleware for input validation
 * - AuthMiddleware for authentication
 */

import { Router } from 'express';
import AuthController from '../controllers/authController.js';
import ValidationMiddleware from '../middleware/validationMiddleware.js';
import AuthMiddleware from '../middleware/authMiddleware.js';
import ErrorMiddleware from '../middleware/errorMiddleware.js';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post(
  '/register',
  ValidationMiddleware.registerValidation,
  ValidationMiddleware.validate,
  ErrorMiddleware.asyncHandler(AuthController.register)
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  ValidationMiddleware.loginValidation,
  ValidationMiddleware.validate,
  ErrorMiddleware.asyncHandler(AuthController.login)
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset link
 * @access  Public
 */
router.post(
  '/forgot-password',
  ErrorMiddleware.asyncHandler(AuthController.forgotPassword)
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Set new password using token
 * @access  Public
 */
router.post(
  '/reset-password',
  ErrorMiddleware.asyncHandler(AuthController.resetPassword)
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info (Basic)
 * @access  Private (requires authentication)
 */
router.get(
  '/me',
  AuthMiddleware.authenticate,
  AuthMiddleware.validateUser,
  ErrorMiddleware.asyncHandler(AuthController.getCurrentUser)
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh JWT token
 * @access  Private (requires authentication)
 */
router.post(
  '/refresh',
  AuthMiddleware.authenticate,
  ErrorMiddleware.asyncHandler(AuthController.refreshToken)
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private (requires authentication)
 */
router.post(
  '/logout',
  AuthMiddleware.authenticate,
  ErrorMiddleware.asyncHandler(AuthController.logout)
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private (requires authentication)
 */
router.post(
  '/change-password',
  AuthMiddleware.authenticate,
  AuthMiddleware.validateUser,
  ValidationMiddleware.changePasswordValidation,
  ValidationMiddleware.validate,
  ErrorMiddleware.asyncHandler(AuthController.changePassword)
);

/**
 * @route   GET /api/auth/profile
 * @desc    Get FULL profile details (from guests or staff table)
 * @access  Private
 */
router.get(
  '/profile',
  AuthMiddleware.authenticate,
  ErrorMiddleware.asyncHandler(AuthController.getProfile)
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update profile details
 * @access  Private
 */
router.put(
  '/profile',
  AuthMiddleware.authenticate,
  ErrorMiddleware.asyncHandler(AuthController.updateProfile)
);

export default router;



// /**
//  * authRoutes.js - Authentication routes
//  * * Defines all authentication-related API endpoints.
//  * * Endpoints:
//  * - POST /register - User registration
//  * - POST /login - User login
//  * - GET /me - Get current user (Basic info)
//  * - POST /refresh - Refresh token
//  * - POST /logout - User logout
//  * - POST /change-password - Change password
//  * - GET /profile - Get FULL profile details
//  * - PUT /profile - Update profile details
//  * * Dependencies:
//  * - AuthController for business logic
//  * - ValidationMiddleware for input validation
//  * - AuthMiddleware for authentication
//  */

// import { Router } from 'express';
// import AuthController from '../controllers/authController.js';
// import ValidationMiddleware from '../middleware/validationMiddleware.js';
// import AuthMiddleware from '../middleware/authMiddleware.js';
// import ErrorMiddleware from '../middleware/errorMiddleware.js';

// const router = Router();

// /**
//  * @route   POST /api/auth/register
//  * @desc    Register new user
//  * @access  Public
//  */
// router.post(
//   '/register',
//   ValidationMiddleware.registerValidation,
//   ValidationMiddleware.validate,
//   ErrorMiddleware.asyncHandler(AuthController.register)
// );

// /**
//  * @route   POST /api/auth/login
//  * @desc    Login user
//  * @access  Public
//  */
// router.post(
//   '/login',
//   ValidationMiddleware.loginValidation,
//   ValidationMiddleware.validate,
//   ErrorMiddleware.asyncHandler(AuthController.login)
// );

// /**
//  * @route   GET /api/auth/me
//  * @desc    Get current user info (Basic)
//  * @access  Private (requires authentication)
//  */
// router.get(
//   '/me',
//   AuthMiddleware.authenticate,
//   AuthMiddleware.validateUser,
//   ErrorMiddleware.asyncHandler(AuthController.getCurrentUser)
// );

// /**
//  * @route   POST /api/auth/refresh
//  * @desc    Refresh JWT token
//  * @access  Private (requires authentication)
//  */
// router.post(
//   '/refresh',
//   AuthMiddleware.authenticate,
//   ErrorMiddleware.asyncHandler(AuthController.refreshToken)
// );

// /**
//  * @route   POST /api/auth/logout
//  * @desc    Logout user
//  * @access  Private (requires authentication)
//  */
// router.post(
//   '/logout',
//   AuthMiddleware.authenticate,
//   ErrorMiddleware.asyncHandler(AuthController.logout)
// );

// /**
//  * @route   POST /api/auth/change-password
//  * @desc    Change user password
//  * @access  Private (requires authentication)
//  */
// router.post(
//   '/change-password',
//   AuthMiddleware.authenticate,
//   AuthMiddleware.validateUser,
//   ValidationMiddleware.changePasswordValidation,
//   ValidationMiddleware.validate,
//   ErrorMiddleware.asyncHandler(AuthController.changePassword)
// );

// /**
//  * @route   GET /api/auth/profile
//  * @desc    Get FULL profile details (from guests or staff table)
//  * @access  Private
//  */
// router.get(
//   '/profile',
//   AuthMiddleware.authenticate,
//   ErrorMiddleware.asyncHandler(AuthController.getProfile)
// );

// /**
//  * @route   PUT /api/auth/profile
//  * @desc    Update profile details
//  * @access  Private
//  */
// router.put(
//   '/profile',
//   AuthMiddleware.authenticate,
//   ErrorMiddleware.asyncHandler(AuthController.updateProfile)
// );

// export default router;








// // /**
// //  * authRoutes.js - Authentication routes
// //  * * Defines all authentication-related API endpoints.
// //  * * Endpoints:
// //  * - POST /register - User registration
// //  * - POST /login - User login
// //  * - GET /me - Get current user
// //  * - POST /refresh - Refresh token
// //  * - POST /logout - User logout
// //  * - POST /change-password - Change password
// //  * * Dependencies:
// //  * - AuthController for business logic
// //  * - ValidationMiddleware for input validation
// //  * - AuthMiddleware for authentication
// //  */

// // import { Router } from 'express';
// // import AuthController from '../controllers/authController.js';
// // import ValidationMiddleware from '../middleware/validationMiddleware.js';
// // import AuthMiddleware from '../middleware/authMiddleware.js';
// // import ErrorMiddleware from '../middleware/errorMiddleware.js';

// // const router = Router();

// // /**
// //  * @route   POST /api/auth/register
// //  * @desc    Register new user
// //  * @access  Public
// //  */
// // router.post(
// //   '/register',
// //   ValidationMiddleware.registerValidation,
// //   ValidationMiddleware.validate,
// //   ErrorMiddleware.asyncHandler(AuthController.register)
// // );

// // /**
// //  * @route   POST /api/auth/login
// //  * @desc    Login user
// //  * @access  Public
// //  */
// // router.post(
// //   '/login',
// //   ValidationMiddleware.loginValidation,
// //   ValidationMiddleware.validate,
// //   ErrorMiddleware.asyncHandler(AuthController.login)
// // );

// // /**
// //  * @route   GET /api/auth/me
// //  * @desc    Get current user info
// //  * @access  Private (requires authentication)
// //  */
// // router.get(
// //   '/me',
// //   AuthMiddleware.authenticate,
// //   AuthMiddleware.validateUser,
// //   ErrorMiddleware.asyncHandler(AuthController.getCurrentUser)
// // );

// // /**
// //  * @route   POST /api/auth/refresh
// //  * @desc    Refresh JWT token
// //  * @access  Private (requires authentication)
// //  */
// // router.post(
// //   '/refresh',
// //   AuthMiddleware.authenticate,
// //   ErrorMiddleware.asyncHandler(AuthController.refreshToken)
// // );

// // /**
// //  * @route   POST /api/auth/logout
// //  * @desc    Logout user
// //  * @access  Private (requires authentication)
// //  */
// // router.post(
// //   '/logout',
// //   AuthMiddleware.authenticate,
// //   ErrorMiddleware.asyncHandler(AuthController.logout)
// // );

// // /**
// //  * @route   POST /api/auth/change-password
// //  * @desc    Change user password
// //  * @access  Private (requires authentication)
// //  */
// // router.post(
// //   '/change-password',
// //   AuthMiddleware.authenticate,
// //   AuthMiddleware.validateUser,
// //   ValidationMiddleware.changePasswordValidation,
// //   ValidationMiddleware.validate,
// //   ErrorMiddleware.asyncHandler(AuthController.changePassword)
// // );

// // /**
// //  * @route   GET /api/auth/profile
// //  * @desc    Get full profile details
// //  * @access  Private
// //  */
// // router.get(
// //   '/profile',
// //   AuthMiddleware.authenticate,
// //   ErrorMiddleware.asyncHandler(AuthController.getProfile)
// // );

// // /**
// //  * @route   PUT /api/auth/profile
// //  * @desc    Update profile details
// //  * @access  Private
// //  */
// // router.put(
// //   '/profile',
// //   AuthMiddleware.authenticate,
// //   ErrorMiddleware.asyncHandler(AuthController.updateProfile)
// // );

// // export default router;



// // /**
// //  * authRoutes.js - Authentication routes
// //  * 
// //  * Defines all authentication-related API endpoints.
// //  * 
// //  * Endpoints:
// //  * - POST /register - User registration
// //  * - POST /login - User login
// //  * - GET /me - Get current user
// //  * - POST /refresh - Refresh token
// //  * - POST /logout - User logout
// //  * - POST /change-password - Change password
// //  * 
// //  * Dependencies:
// //  * - AuthController for business logic
// //  * - ValidationMiddleware for input validation
// //  * - AuthMiddleware for authentication
// //  */

// // import { Router } from 'express';
// // import AuthController from '../controllers/authController.js';
// // import ValidationMiddleware from '../middleware/validationMiddleware.js';
// // import AuthMiddleware from '../middleware/authMiddleware.js';
// // import ErrorMiddleware from '../middleware/errorMiddleware.js';

// // const router = Router();

// // /**
// //  * @route   POST /api/auth/register
// //  * @desc    Register new user
// //  * @access  Public
// //  */
// // router.post(
// //   '/register',
// //   ValidationMiddleware.registerValidation,
// //   ValidationMiddleware.validate,
// //   ErrorMiddleware.asyncHandler(AuthController.register)
// // );

// // /**
// //  * @route   POST /api/auth/login
// //  * @desc    Login user
// //  * @access  Public
// //  */
// // router.post(
// //   '/login',
// //   ValidationMiddleware.loginValidation,
// //   ValidationMiddleware.validate,
// //   ErrorMiddleware.asyncHandler(AuthController.login)
// // );

// // /**
// //  * @route   GET /api/auth/me
// //  * @desc    Get current user info
// //  * @access  Private (requires authentication)
// //  */
// // router.get(
// //   '/me',
// //   AuthMiddleware.authenticate,
// //   AuthMiddleware.validateUser,
// //   ErrorMiddleware.asyncHandler(AuthController.getCurrentUser)
// // );

// // /**
// //  * @route   POST /api/auth/refresh
// //  * @desc    Refresh JWT token
// //  * @access  Private (requires authentication)
// //  */
// // router.post(
// //   '/refresh',
// //   AuthMiddleware.authenticate,
// //   ErrorMiddleware.asyncHandler(AuthController.refreshToken)
// // );

// // /**
// //  * @route   POST /api/auth/logout
// //  * @desc    Logout user
// //  * @access  Private (requires authentication)
// //  */
// // router.post(
// //   '/logout',
// //   AuthMiddleware.authenticate,
// //   ErrorMiddleware.asyncHandler(AuthController.logout)
// // );

// // /**
// //  * @route   POST /api/auth/change-password
// //  * @desc    Change user password
// //  * @access  Private (requires authentication)
// //  */
// // router.post(
// //   '/change-password',
// //   AuthMiddleware.authenticate,
// //   AuthMiddleware.validateUser,
// //   ValidationMiddleware.changePasswordValidation,
// //   ValidationMiddleware.validate,
// //   ErrorMiddleware.asyncHandler(AuthController.changePassword)
// // );

// // export default router;
