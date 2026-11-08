/**
 * errorMiddleware.js - Enhanced global error handling middleware
 * * Now includes advanced error categorization, logging, and
 * appropriate HTTP responses for different error types.
 */
import logger from '../utils/logger.js';
//import logger from './logger.js'; // Ensure path matches your project structure

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    // Fix: Convert statusCode to string before checking startsWith
    this.status = String(statusCode).startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400);
    this.errors = errors;
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    // Fix: Added backticks
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500);
    this.name = 'DatabaseError';
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

class ErrorMiddleware {
  /**
   * Handle 404 - Route not found
   */
  static notFound = (req, res, next) => {
    // Fix: Added backticks and request URL
    const error = new NotFoundError(`Route ${req.originalUrl} not found`);
    logger.warn(`404 Not Found: ${req.originalUrl}`);
    next(error);
  };

  /**
   * Global error handler
   */
  static errorHandler = (err, req, res, next) => {
    // Set defaults
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Log the error with context
    // Fix: Added backticks
    logger.error(`Error: ${err.message}`, {
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack,
        code: err.code,
      },
      request: {
        method: req.method,
        url: req.originalUrl,
        params: req.params,
        query: req.query,
        body: req.body,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        userId: req.user?.id || 'anonymous',
      },
      timestamp: new Date().toISOString(),
    });

    // Handle specific error types
    let response = {
      success: false,
      message: err.message,
    };

    // Add validation errors if present
    if (err.name === 'ValidationError' && err.errors) {
      response.errors = err.errors;
    }

    // Handle database errors
    if (err.name === 'DatabaseError') {
      response.message = 'A database error occurred';
    }

    // Handle duplicate key errors (MongoDB code 11000 or Postgres 23505)
    if (err.code === 11000 || err.code === '23505') {
      const field = Object.keys(err.keyValue || {})[0] || 'field';
      // Fix: Added backticks
      response.message = `Duplicate value for field: ${field}`;
      err.statusCode = 409;
    }

    // Handle cast errors (invalid ObjectId)
    if (err.name === 'CastError') {
      // Fix: Added backticks
      response.message = `Invalid ${err.path}: ${err.value}`;
      err.statusCode = 400;
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
      response.message = 'Invalid token. Please log in again.';
      err.statusCode = 401;
    }

    if (err.name === 'TokenExpiredError') {
      response.message = 'Your token has expired. Please log in again.';
      err.statusCode = 401;
    }

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
      response.stack = err.stack;
      response.error = err;
    }

    // Production error handling - hide sensitive info for non-operational errors
    if (process.env.NODE_ENV === 'production' && !err.isOperational) {
      logger.error('ERROR 💥', err); // Log the real error to server
      response = {
        success: false,
        message: 'Something went wrong!', // Send generic message to client
      };
      err.statusCode = 500;
    }

    // Send error response
    res.status(err.statusCode).json(response);
  };

  /**
   * Async handler to avoid try-catch in controllers
   */
  static asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

  /**
   * Catch unhandled promise rejections
   */
  static catchUnhandledRejections = () => {
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('UNHANDLED REJECTION! 💥 Shutting down...', {
        reason: reason.message || reason,
        stack: reason.stack,
        promise: promise,
      });
      
      // Graceful shutdown
      process.exit(1);
    });
  };

  /**
   * Catch uncaught exceptions
   */
  static catchUncaughtExceptions = () => {
    process.on('uncaughtException', (err) => {
      logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', {
        error: err.message,
        stack: err.stack,
      });
      
      // Graceful shutdown
      process.exit(1);
    });
  };

  /**
   * Global error handler for Express
   */
  static handleErrors = (app) => {
    // Handle 404 errors
    app.use('*', this.notFound);

    // Handle all other errors
    app.use(this.errorHandler);

    // Catch unhandled rejections and exceptions
    this.catchUnhandledRejections();
    this.catchUncaughtExceptions();
  };
}

// Export error classes and middleware
export {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  RateLimitError,
};

export default ErrorMiddleware;