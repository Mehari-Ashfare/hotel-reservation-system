/**
 * roleMiddleware.js - Role-based access control middleware
 * * Provides advanced role and permission checking beyond basic
 * authorization. Includes department-based access and time-based
 * permissions.
 * * Dependencies:
 * - AuthMiddleware for user authentication
 */

import Role from '../models/Role.js';

class RoleMiddleware {
  /**
   * Check if user has specific permission (with department context)
   * @param {string} permission - Required permission
   * @param {string} department - Optional department restriction
   */
  static requirePermissionWithDepartment = (permission, department = null) => {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required'
          });
        }

        // Check basic permission
        const hasPermission = req.user.permissions.includes('*') || 
                             req.user.permissions.includes(permission);

        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: `Access denied. Requires permission: ${permission}`
          });
        }

        // Check department restriction if specified
        if (department && req.user.role === 'receptionist') {
          // Get staff department info
          const Staff = await import('../models/Staff.js').then(m => m.default);
          const staff = await Staff.findByUserId(req.user.id);
          
          if (staff && staff.department !== department) {
            return res.status(403).json({
              success: false,
              message: `Access denied. Requires department: ${department}`
            });
          }
        }

        next();
      } catch (error) {
        console.error('Department permission check error:', error);
        return res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    };
  };

  /**
   * Check if user can manage specific resource (owner or admin)
   * @param {string} resourceType - Type of resource (guest, reservation, etc.)
   */
  static canManageResource = (resourceType) => {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required'
          });
        }

        // Admins can manage everything
        if (req.user.role === 'admin') {
          return next();
        }

        // Receptionists can manage most resources
        if (req.user.role === 'receptionist') {
          const allowedResources = ['guests', 'reservations', 'payments', 'rooms'];
          if (allowedResources.includes(resourceType)) {
            return next();
          }
        }

        // Guests can only manage their own resources
        if (req.user.role === 'guest') {
          const { id } = req.params;
          
          // This would need to check if the resource belongs to the guest
          // For now, we'll allow access to their own profile
          if (resourceType === 'guests' && req.user.guest_id === parseInt(id)) {
            return next();
          }
        }

        return res.status(403).json({
          success: false,
          message: `Access denied to manage ${resourceType}`
        });
      } catch (error) {
        console.error('Resource management check error:', error);
        return res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    };
  };

  /**
   * Time-based access control (e.g., no check-ins after 10 PM)
   * @param {Object} timeRestrictions - Time restrictions
   */
  static timeRestrictedAccess = (timeRestrictions = {}) => {
    return (req, res, next) => {
      const now = new Date();
      const currentHour = now.getHours();

      // Check if current time is within allowed hours
      if (timeRestrictions.startHour !== undefined && currentHour < timeRestrictions.startHour) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Service available from ${timeRestrictions.startHour}:00`
        });
      }

      if (timeRestrictions.endHour !== undefined && currentHour >= timeRestrictions.endHour) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Service available until ${timeRestrictions.endHour}:00`
        });
      }

      next();
    };
  };

  /**
   * Check if user has any of multiple permissions
   * @param {Array} permissions - Array of allowed permissions
   */
  static requireAnyPermission = (permissions) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const hasAnyPermission = req.user.permissions.includes('*') || 
                               permissions.some(permission => 
                                 req.user.permissions.includes(permission)
                               );

      if (!hasAnyPermission) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Requires one of: ${permissions.join(', ')}`
        });
      }

      next();
    };
  };

  /**
   * Check if user has all required permissions
   * @param {Array} permissions - Array of required permissions
   */
  static requireAllPermissions = (permissions) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const hasAllPermissions = req.user.permissions.includes('*') || 
                               permissions.every(permission => 
                                 req.user.permissions.includes(permission)
                               );

      if (!hasAllPermissions) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Requires all: ${permissions.join(', ')}`
        });
      }

      next();
    };
  };
}

export default RoleMiddleware;
