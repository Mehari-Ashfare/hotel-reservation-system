/**
 * authMiddleware.js - Authentication middleware
 * * JWT token verification and authentication middleware.
 * Protects routes by verifying tokens and extracting user info.
 * * Dependencies:
 * - jsonwebtoken for token verification
 * - User model for user operations
 */

import jwt from 'jsonwebtoken';
import User from '../models/User.js';

class AuthMiddleware {
  /**
   * Verify JWT token from Authorization header
   */
  static authenticate = (req, res, next) => {
    try {
      // Get token from header
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. No token provided.'
        });
      }

      const token = authHeader.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Attach user info to request
      req.user = decoded;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired'
        });
      }
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Authentication failed'
      });
    }
  };

  /**
   * Optional authentication
   * Sets user if token exists, but doesn't fail if no token
   */
  static optionalAuth = (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
      }
      
      next();
    } catch (error) {
      // If token is invalid, just continue without user
      next();
    }
  };

  /**
   * Check if user has any of the required roles
   * @param {Array} allowedRoles - Array of allowed role names
   */
  static authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Requires one of: ${allowedRoles.join(', ')}`
        });
      }

      next();
    };
  };

  /**
   * Check if user has specific permission
   * @param {string} permission - Required permission
   */
  static requirePermission = (permission) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Check if user has permission
      // 'permissions' is an array in the token payload
      const hasPermission = req.user.permissions && (
        req.user.permissions.includes('*') || 
        req.user.permissions.includes(permission)
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Requires permission: ${permission}`
        });
      }

      next();
    };
  };

  /**
   * Validate user exists and is active (Hits database)
   */
  static validateUser = async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const user = await User.findById(req.user.id);
      if (!user || !user.is_active) {
        return res.status(401).json({
          success: false,
          message: 'User account is inactive or not found'
        });
      }

      // Merge latest DB user info with token info
      req.user = { ...req.user, ...user };
      next();
    } catch (error) {
      console.error('User validation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
}

export default AuthMiddleware;