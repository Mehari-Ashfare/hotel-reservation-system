/**
 * server.js - Application Entry Point
 * * This file orchestrates the entire backend startup process:
 * 1. Connects to the PostgreSQL database.
 * 2. Starts the Express server.
 * 3. Logs all available API endpoints for easy development reference.
 * 4. Handles graceful shutdowns and uncaught errors.
 */

import app from './app.js';
import logger from './src/utils/logger.js';
import { testConnection } from './src/config/database.js';

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

// ============================================
// 1. DATABASE INITIALIZATION
// ============================================

/**
 * Connects to the database before starting the HTTP server.
 * This prevents the app from accepting requests if the DB is down.
 */
async function initializeDatabase() {
  try {
    const isConnected = await testConnection();
    
    if (!isConnected) {
      logger.error('❌ Database connection failed');
      throw new Error('Database connection failed');
    }
    
    logger.info('✅ PostgreSQL database connected successfully');
    return true;
  } catch (error) {
    logger.error('❌ Database initialization failed:', { error: error.message });
    throw error;
  }
}

// ============================================
// 2. SERVER STARTUP
// ============================================

async function startServer() {
  try {
    // Step 1: Initialize Database
    await initializeDatabase();
    
    // Step 2: Start Express Server
    const server = app.listen(PORT, () => {
      // Step 3: Log Operational Dashboard
      // This provides a quick reference to all 51 active endpoints
      logger.info(`
      🏨 Hotel Reservation System Backend
      ============================================
      🚀 Server running in ${process.env.NODE_ENV || 'development'} mode
      📡 Listening on port ${PORT}

      🔗 MAIN LINKS
      🌐 API Base URL:    ${BASE_URL}/api
      📚 Swagger Docs:    ${BASE_URL}/api-docs
      📊 Health Check:    ${BASE_URL}/api/health
      📈 System Metrics:  ${BASE_URL}/api/metrics

      🔐 AUTHENTICATION (6 Endpoints)
      POST   ${BASE_URL}/api/auth/register
      POST   ${BASE_URL}/api/auth/login
      GET    ${BASE_URL}/api/auth/me
      POST   ${BASE_URL}/api/auth/refresh
      POST   ${BASE_URL}/api/auth/logout
      POST   ${BASE_URL}/api/auth/change-password

      👥 GUEST MANAGEMENT (6 Endpoints)
      GET    ${BASE_URL}/api/guests
      GET    ${BASE_URL}/api/guests/search?query=name
      GET    ${BASE_URL}/api/guests/:id
      POST   ${BASE_URL}/api/guests
      PUT    ${BASE_URL}/api/guests/:id
      DELETE ${BASE_URL}/api/guests/:id

      👔 STAFF MANAGEMENT (6 Endpoints)
      GET    ${BASE_URL}/api/staff (Admin)
      POST   ${BASE_URL}/api/staff (Admin)
      GET    ${BASE_URL}/api/staff/profile (Self)
      GET    ${BASE_URL}/api/staff/:id
      PUT    ${BASE_URL}/api/staff/:id
      GET    ${BASE_URL}/api/staff/department/stats

      🛏️ ROOM MANAGEMENT (8 Endpoints)
      GET    ${BASE_URL}/api/rooms
      POST   ${BASE_URL}/api/rooms
      GET    ${BASE_URL}/api/rooms/available
      GET    ${BASE_URL}/api/rooms/types
      POST   ${BASE_URL}/api/rooms/types
      GET    ${BASE_URL}/api/rooms/occupancy
      GET    ${BASE_URL}/api/rooms/:id
      PUT    ${BASE_URL}/api/rooms/:id

      📅 RESERVATIONS (9 Endpoints)
      GET    ${BASE_URL}/api/reservations
      POST   ${BASE_URL}/api/reservations
      GET    ${BASE_URL}/api/reservations/calculate-price
      GET    ${BASE_URL}/api/reservations/guest/:guest_id
      GET    ${BASE_URL}/api/reservations/:id
      PUT    ${BASE_URL}/api/reservations/:id
      PUT    ${BASE_URL}/api/reservations/:id/cancel
      PUT    ${BASE_URL}/api/reservations/:id/check-in
      PUT    ${BASE_URL}/api/reservations/:id/check-out

      💳 PAYMENTS (7 Endpoints)
      GET    ${BASE_URL}/api/payments
      POST   ${BASE_URL}/api/payments
      GET    ${BASE_URL}/api/payments/financial-report
      GET    ${BASE_URL}/api/payments/reservation/:id
      GET    ${BASE_URL}/api/payments/:id
      PUT    ${BASE_URL}/api/payments/:id/process
      PUT    ${BASE_URL}/api/payments/:id/refund

      📈 REPORTS & ANALYTICS (4 Endpoints)
      GET    ${BASE_URL}/api/reports/daily
      GET    ${BASE_URL}/api/reports/weekly
      GET    ${BASE_URL}/api/reports/monthly
      GET    ${BASE_URL}/api/reports/custom

      👁️ AUDIT LOGS (3 Endpoints)
      GET    ${BASE_URL}/api/audit
      GET    ${BASE_URL}/api/audit/recent
      GET    ${BASE_URL}/api/audit/record/:table/:id
      ============================================
      `);
      
      // Log metadata for debugging (saved to JSON logs, hidden from console)
      logger.info('Server startup completed successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage(),
      });
    });

    // Handle startup errors (e.g., port in use)
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        logger.error('❌ Server error:', { error: error.message });
        throw error;
      }
    });

    // ============================================
    // 3. GRACEFUL SHUTDOWN
    // ============================================
    // Ensures ongoing requests are completed before killing the process
    const shutdown = async () => {
      logger.info('🛑 Received shutdown signal');
      
      server.close(() => {
        logger.info('✅ HTTP server closed');
        process.exit(0);
      });
      
      // Force shutdown if it hangs for more than 10 seconds
      setTimeout(() => {
        logger.error('⚠️ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    return server;
  } catch (error) {
    logger.error('❌ Failed to start server:', { error: error.message });
    process.exit(1);
  }
}

// ============================================
// 4. GLOBAL ERROR HANDLERS
// ============================================

// Catch unhandled Promise rejections (async code crashes)
process.on('unhandledRejection', (reason, promise) => {
  logger.error('🔥 UNHANDLED REJECTION at:', { promise, reason: reason.message || reason });
  // In production, it's safer to crash and restart than to run in an unstable state
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Catch uncaught exceptions (synchronous code crashes)
process.on('uncaughtException', (error) => {
  logger.error('🔥 UNCAUGHT EXCEPTION:', { error: error.message, stack: error.stack });
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Start the server
startServer();
