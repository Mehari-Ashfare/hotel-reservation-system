/**
 * securityMiddleware.js - Security enhancements middleware
 * * Provides additional security layers including:
 * - Rate limiting
 * - Request sanitization
 * - Security headers
 * - CORS configuration
 * - Brute force protection
 */

import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import logger from '../utils/logger.js'; // Fix: Added missing logger import

class SecurityMiddleware {
  /**
   * Apply security headers
   */
  static applySecurityHeaders = (app) => {
    // Use Helmet for security headers
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }));

    // Additional security headers
    app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
      next();
    });
  };

  /**
   * Apply rate limiting
   */
  static applyRateLimiting = (app) => {
    // General API rate limiter
    const apiLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Limit each IP to 1000 requests per windowMs
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    // Auth endpoint rate limiter (stricter)
    const authLimiter = rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 50, // Limit each IP to 50 login attempts per hour
      message: {
        success: false,
        message: 'Too many login attempts from this IP, please try again after an hour'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    // Apply rate limiting
    app.use('/api/', apiLimiter);
    app.use('/api/auth/login', authLimiter);
    app.use('/api/auth/register', authLimiter);
  };

  /**
   * Apply request sanitization
   */
  static applySanitization = (app) => {
    // Data sanitization against NoSQL query injection
    app.use(mongoSanitize());

    // Data sanitization against XSS
    app.use(xss());

    // Prevent parameter pollution
    app.use(hpp({
      whitelist: [
        'page',
        'limit',
        'sort',
        'fields',
        'search',
        'status',
        'room_type_id',
        'start_date',
        'end_date'
      ]
    }));

    // Custom sanitization middleware
    app.use((req, res, next) => {
      // Sanitize request body
      if (req.body) {
        sanitizeObject(req.body);
      }
      
      // Sanitize request query
      if (req.query) {
        sanitizeObject(req.query);
      }
      
      // Sanitize request params
      if (req.params) {
        sanitizeObject(req.params);
      }
      
      next();
    });

    // Helper function to sanitize objects
    function sanitizeObject(obj) {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          // Remove potentially dangerous characters
          obj[key] = obj[key]
            .replace(/[<>]/g, '') // Remove < and >
            .trim();
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    }
  };

  /**
   * Apply CORS configuration
   */
  static applyCORS = (app) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    app.use((req, res, next) => {
      const origin = req.headers.origin;
      
      if (allowedOrigins.includes(origin) || !origin) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
      }
      
      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }
      
      next();
    });
  };

  /**
   * Request validation middleware
   */
  static validateRequest = (schema) => {
    return (req, res, next) => {
      try {
        // Validate against schema (using Joi or similar)
        // For now, we'll use a placeholder
        next();
      } catch (error) {
        res.status(400).json({
          success: false,
          message: 'Invalid request data',
          errors: error.details || [error.message]
        });
      }
    };
  };

  /**
   * Apply all security measures
   */
  static applyAllSecurity = (app) => {
    this.applySecurityHeaders(app);
    this.applyRateLimiting(app);
    this.applySanitization(app);
    this.applyCORS(app);
    
    // Log security events
    app.use((req, res, next) => {
      // Log suspicious requests
      const suspiciousPatterns = [
        /(<script>|javascript:|onload=|onerror=)/i,
        /(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)/i,
        /(\.\.\/|\.\.\\|\/etc\/|\/bin\/)/i,
      ];
      
      const requestString = JSON.stringify({
        url: req.originalUrl,
        body: req.body,
        query: req.query,
      }).toLowerCase();
      
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(requestString)) {
          // Fix: Added quotes around string
          logger.warn('Suspicious request detected:', {
            ip: req.ip,
            userAgent: req.get('user-agent'),
            pattern: pattern.toString(),
          });
          break;
        }
      }
      
      next();
    });
  };
}

export default SecurityMiddleware;