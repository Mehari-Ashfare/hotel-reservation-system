/**
 * validationMiddleware.js - Request validation middleware
 * Removed .normalizeEmail() to fix the "dot" issue.
 */

import { body, param, query, validationResult } from 'express-validator';

class ValidationMiddleware {
  // --- Common Validations ---

  static validate = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const extractedErrors = errors.array().map(err => ({ 
      field: err.path, 
      message: err.msg 
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: extractedErrors
    });
  };

  static validateId = (idName) => [
    param(idName)
      .isInt({ min: 1 })
      .withMessage(`Invalid ${idName} format. Must be a positive integer.`)
      .toInt(),
    ValidationMiddleware.validate
  ];

  // --- Auth Validations ---

  static registerValidation = [
    body('email')
      .isEmail()
      // REMOVED: .normalizeEmail()
      .withMessage('Valid email is required')
      .isLength({ max: 255 })
      .withMessage('Email must be less than 255 characters'),
    
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/)
      .withMessage('Password must contain uppercase, lowercase, and number'),
    
    body('role_name')
      .optional()
      .isIn(['admin', 'receptionist', 'guest'])
      .withMessage('Role must be admin, receptionist, or guest'),
    
    body('first_name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('First name must be 2-100 characters'),
    
    body('last_name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Last name must be 2-100 characters'),
    
    body('phone')
      .optional()
      .matches(/^[\+]?[0-9]{1,15}$/)
      .withMessage('Valid phone number required'),

    ValidationMiddleware.validate
  ];

  static loginValidation = [
    body('email')
      .isEmail()
      // REMOVED: .normalizeEmail()
      .withMessage('Valid email is required'),
    
    body('password')
      .notEmpty()
      .withMessage('Password is required'),

    ValidationMiddleware.validate
  ];

  static changePasswordValidation = [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters')
      .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/)
      .withMessage('Password must contain uppercase, lowercase, and number')
      .custom((value, { req }) => {
        if (value === req.body.currentPassword) {
          throw new Error('New password must be different from current password');
        }
        return true;
      }),

    ValidationMiddleware.validate
  ];

  // --- Guest Validations ---

  static guestCreateValidation = [
    body('first_name')
      .trim()
      .notEmpty()
      .withMessage('First name is required')
      .isLength({ min: 2, max: 100 }),
    
    body('last_name')
      .trim()
      .notEmpty()
      .withMessage('Last name is required')
      .isLength({ min: 2, max: 100 }),
    
    body('email')
      .optional()
      .isEmail(),
      // REMOVED: .normalizeEmail()
    
    body('phone')
      .notEmpty()
      .withMessage('Phone number is required')
      .matches(/^[\+]?[0-9]{1,15}$/)
      .withMessage('Valid phone number required'),
    
    body('guest_type')
      .optional()
      .isIn(['online', 'walk-in']),

    ValidationMiddleware.validate
  ];

  static guestUpdateValidation = [
    param('id').isInt({ min: 1 }).withMessage('Valid Guest ID required'),
    
    body('first_name').optional().trim().isLength({ min: 2, max: 100 }),
    body('last_name').optional().trim().isLength({ min: 2, max: 100 }),
    body('email').optional().isEmail(), // REMOVED: .normalizeEmail()
    body('phone').optional().matches(/^[\+]?[0-9]{1,15}$/),

    ValidationMiddleware.validate
  ];

  // --- Pagination Validations ---

  static paginationValidation = [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .toInt(),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .toInt(),

    ValidationMiddleware.validate
  ];
}

export default ValidationMiddleware;








// /**
//  * validationMiddleware.js - Request validation middleware
//  * * Centralizes validation rules (chains) and error handling.
//  * * Uses express-validator.
//  */

// import { body, param, query, validationResult } from 'express-validator';

// class ValidationMiddleware {
//   // --- Common Validations ---

//   /**
//    * Validate request and handle errors
//    * This is the actual middleware that stops the request if errors exist.
//    */
//   static validate = (req, res, next) => {
//     const errors = validationResult(req);
//     if (errors.isEmpty()) {
//       return next();
//     }

//     const extractedErrors = errors.array().map(err => ({ 
//       field: err.path, 
//       message: err.msg 
//     }));

//     return res.status(400).json({
//       success: false,
//       message: 'Validation Error',
//       errors: extractedErrors
//     });
//   };

//   /**
//    * Validate Integer ID (For PostgreSQL)
//    * Usage: ValidationMiddleware.validateId('id')
//    */
//   static validateId = (idName) => [
//     param(idName)
//       .isInt({ min: 1 })
//       .withMessage(`Invalid ${idName} format. Must be a positive integer.`)
//       .toInt(),
//     ValidationMiddleware.validate // Automatically checks for errors
//   ];

//   // --- Auth Validations ---

//   static registerValidation = [
//     body('email')
//       .isEmail()
//       .normalizeEmail()
//       .withMessage('Valid email is required')
//       .isLength({ max: 255 })
//       .withMessage('Email must be less than 255 characters'),
    
//     body('password')
//       .isLength({ min: 8 })
//       .withMessage('Password must be at least 8 characters')
//       .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/)
//       .withMessage('Password must contain uppercase, lowercase, and number'),
    
//     body('role_name')
//       .optional()
//       .isIn(['admin', 'receptionist', 'guest'])
//       .withMessage('Role must be admin, receptionist, or guest'),
    
//     body('first_name')
//       .optional()
//       .trim()
//       .isLength({ min: 2, max: 100 })
//       .withMessage('First name must be 2-100 characters'),
    
//     body('last_name')
//       .optional()
//       .trim()
//       .isLength({ min: 2, max: 100 })
//       .withMessage('Last name must be 2-100 characters'),
    
//     body('phone')
//       .optional()
//       .matches(/^[\+]?[0-9]{1,15}$/)
//       .withMessage('Valid phone number required'),

//     ValidationMiddleware.validate
//   ];

//   static loginValidation = [
//     body('email')
//       .isEmail()
//       .normalizeEmail()
//       .withMessage('Valid email is required'),
    
//     body('password')
//       .notEmpty()
//       .withMessage('Password is required'),

//     ValidationMiddleware.validate
//   ];

//   static changePasswordValidation = [
//     body('currentPassword')
//       .notEmpty()
//       .withMessage('Current password is required'),
    
//     body('newPassword')
//       .isLength({ min: 8 })
//       .withMessage('New password must be at least 8 characters')
//       .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/)
//       .withMessage('Password must contain uppercase, lowercase, and number')
//       .custom((value, { req }) => {
//         if (value === req.body.currentPassword) {
//           throw new Error('New password must be different from current password');
//         }
//         return true;
//       }),

//     ValidationMiddleware.validate
//   ];

//   // --- Guest Validations ---

//   static guestCreateValidation = [
//     body('first_name')
//       .trim()
//       .notEmpty()
//       .withMessage('First name is required')
//       .isLength({ min: 2, max: 100 }),
    
//     body('last_name')
//       .trim()
//       .notEmpty()
//       .withMessage('Last name is required')
//       .isLength({ min: 2, max: 100 }),
    
//     body('email')
//       .optional()
//       .isEmail()
//       .normalizeEmail(),
    
//     body('phone')
//       .notEmpty()
//       .withMessage('Phone number is required')
//       .matches(/^[\+]?[0-9]{1,15}$/)
//       .withMessage('Valid phone number required'),
    
//     body('guest_type')
//       .optional()
//       .isIn(['online', 'walk-in']),

//     ValidationMiddleware.validate
//   ];

//   static guestUpdateValidation = [
//     param('id').isInt({ min: 1 }).withMessage('Valid Guest ID required'),
    
//     body('first_name').optional().trim().isLength({ min: 2, max: 100 }),
//     body('last_name').optional().trim().isLength({ min: 2, max: 100 }),
//     body('email').optional().isEmail().normalizeEmail(),
//     body('phone').optional().matches(/^[\+]?[0-9]{1,15}$/),

//     ValidationMiddleware.validate
//   ];

//   // --- Pagination Validations ---

//   static paginationValidation = [
//     query('page')
//       .optional()
//       .isInt({ min: 1 })
//       .toInt(),
    
//     query('limit')
//       .optional()
//       .isInt({ min: 1, max: 100 })
//       .toInt(),

//     ValidationMiddleware.validate
//   ];
// }

// export default ValidationMiddleware;