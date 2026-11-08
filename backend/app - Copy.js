/**
 * app.js - Main Express application configuration (COMPLETE WITH ALL FEATURES)
 * 
 * Now includes all middleware, security, performance, documentation features,
 * PLUS audit logging and staff management.
 */

import express from 'express';
import dotenv from 'dotenv';
import os from 'os';

// Load environment variables
dotenv.config();

// Import middleware
import { httpLogger } from './src/utils/logger.js';
import SecurityMiddleware from './src/middleware/securityMiddleware.js';
import PerformanceMiddleware from './src/middleware/performanceMiddleware.js';
import ErrorMiddleware from './src/middleware/errorMiddleware.js';
import setupSwagger from './src/config/swagger.js';

// NEW: Import audit and staff middleware
import AuditMiddleware from './src/middleware/auditMiddleware.js';
import StaffMiddleware from './src/middleware/staffMiddleware.js';

// Import routes
import authRoutes from './src/routes/authRoutes.js';
import guestRoutes from './src/routes/guestRoutes.js';
import roomRoutes from './src/routes/roomRoutes.js';
import reservationRoutes from './src/routes/reservationRoutes.js';
import paymentRoutes from './src/routes/paymentRoutes.js';
import reportRoutes from './src/routes/reportRoutes.js';

// NEW: Import staff and audit routes
import staffRoutes from './src/routes/staffRoutes.js';
import auditRoutes from './src/routes/auditRoutes.js';
import cors from 'cors'; // Add this at the top with other imports

// Create Express app
const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'], // Frontend URLs
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// OR simpler version for development:
app.use(cors({
  origin: 'http://localhost:5173', // Your React dev server
  credentials: true
}));

// ============================================
// SECURITY SETUP
// ============================================

SecurityMiddleware.applyAllSecurity(app);

// ============================================
// PERFORMANCE OPTIMIZATIONS
// ============================================

PerformanceMiddleware.applyAllOptimizations(app);

// ============================================
// LOGGING MIDDLEWARE
// ============================================

app.use(httpLogger);

// ============================================
// AUDIT LOGGING MIDDLEWARE (NEW)
// ============================================

// This should come after logging but before body parsing for some operations
app.use(AuditMiddleware.logOperation);

// ============================================
// BODY PARSING MIDDLEWARE
// ============================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// STAFF MIDDLEWARE (NEW)
// ============================================

// This populates req.staff if user has staff record
app.use(StaffMiddleware.validateStaff);

// ============================================
// API DOCUMENTATION (Swagger)
// ============================================

if (process.env.NODE_ENV !== 'production') {
  setupSwagger(app);
}

// ============================================
// HEALTH CHECK & MONITORING ENDPOINTS
// ============================================

app.get('/api/health', async (req, res) => {
  try {
    const db = await import('./src/config/database.js').then(m => m.default);
    const dbHealth = await db.healthCheck ? await db.healthCheck() : { status: 'unknown' };
    
    // Check audit logs health
    let auditHealth = { status: 'unknown' };
    try {
      const AuditLog = await import('./src/models/AuditLog.js').then(m => m.default);
      // Try a simple query to check audit logs table
      const testQuery = await import('./src/config/database.js').then(m => m.query('SELECT COUNT(*) FROM audit_logs LIMIT 1'));
      auditHealth = { status: 'healthy', total_logs: testQuery.rows[0]?.count || 0 };
    } catch (auditError) {
      auditHealth = { status: 'unhealthy', error: auditError.message };
    }
    
    // Check staff health
    let staffHealth = { status: 'unknown' };
    try {
      const Staff = await import('./src/models/Staff.js').then(m => m.default);
      // Try a simple query to check staff table
      const testQuery = await import('./src/config/database.js').then(m => m.query('SELECT COUNT(*) FROM staff LIMIT 1'));
      staffHealth = { status: 'healthy', total_staff: testQuery.rows[0]?.count || 0 };
    } catch (staffError) {
      staffHealth = { status: 'unhealthy', error: staffError.message };
    }
    
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Hotel Reservation API',
      version: '1.1.0', // Updated version
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: dbHealth,
      audit_system: auditHealth,
      staff_system: staffHealth,
      endpoints: {
        auth: '/api/auth',
        guests: '/api/guests',
        rooms: '/api/rooms',
        reservations: '/api/reservations',
        payments: '/api/payments',
        reports: '/api/reports',
        staff: '/api/staff',
        audit: '/api/audit'
      },
      features: {
        audit_logging: true,
        staff_management: true,
        role_based_access: true,
        real_time_monitoring: true
      }
    };
    
    res.status(200).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Health check failed',
      error: error.message,
    });
  }
});

// System metrics endpoint (protected)
app.get('/api/metrics', (req, res) => {
  // This would be protected in production
  if (process.env.NODE_ENV === 'production' && !req.headers['x-internal-metrics']) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const metrics = {
    timestamp: new Date().toISOString(),
    process: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      versions: process.versions,
    },
    system: {
      arch: process.arch,
      platform: process.platform,
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      loadAverage: os.loadavg(),
    },
    requests: {
      // This would track request counts in a real implementation
    },
    // NEW: Audit metrics
    audit: {
      logging_enabled: true,
      middleware_active: true
    },
    staff: {
      management_enabled: true,
      middleware_active: true
    }
  };
  
  res.json(metrics);
});

// NEW: Audit statistics endpoint (admin only)
app.get('/api/audit/stats', async (req, res) => {
  try {
    // Check if user is admin
    if (!req.headers.authorization) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // In a real implementation, verify JWT and check role
    // For now, we'll add basic protection
    if (process.env.NODE_ENV === 'production' && !req.headers['x-internal-metrics']) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const db = await import('./src/config/database.js').then(m => m.default);
    
    // Get audit statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_logs,
        COUNT(DISTINCT table_name) as tables_tracked,
        COUNT(DISTINCT user_id) as users_tracked,
        MIN(timestamp) as oldest_log,
        MAX(timestamp) as newest_log,
        COUNT(CASE WHEN action = 'CREATE' THEN 1 END) as creations,
        COUNT(CASE WHEN action = 'UPDATE' THEN 1 END) as updates,
        COUNT(CASE WHEN action = 'DELETE' THEN 1 END) as deletions
      FROM audit_logs
    `;
    
    const statsResult = await db.query(statsQuery);
    
    // Get recent activity summary
    const recentQuery = `
      SELECT 
        table_name,
        action,
        COUNT(*) as count
      FROM audit_logs
      WHERE timestamp >= NOW() - INTERVAL '24 HOURS'
      GROUP BY table_name, action
      ORDER BY count DESC
      LIMIT 10
    `;
    
    const recentResult = await db.query(recentQuery);
    
    // Get top users by activity
    const usersQuery = `
      SELECT 
        u.email,
        COALESCE(s.first_name || ' ' || s.last_name, 'System') as user_name,
        COUNT(al.audit_id) as activity_count
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.user_id
      LEFT JOIN staff s ON u.user_id = s.user_id
      WHERE al.timestamp >= NOW() - INTERVAL '7 DAYS'
      GROUP BY u.email, s.first_name, s.last_name
      ORDER BY activity_count DESC
      LIMIT 5
    `;
    
    const usersResult = await db.query(usersQuery);
    
    res.json({
      timestamp: new Date().toISOString(),
      summary: statsResult.rows[0],
      recent_activity: recentResult.rows,
      top_users: usersResult.rows,
      system: {
        audit_logging: 'active',
        retention_period: 'permanent', // or specify your retention policy
        auto_cleanup: false // set to true if you have cleanup jobs
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get audit statistics',
      message: error.message
    });
  }
});

// ============================================
// API ROUTES
// ============================================

// Core business routes
app.use('/api/auth', authRoutes);
app.use('/api/guests', guestRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);

// NEW: Staff management routes
app.use('/api/staff', staffRoutes);

// NEW: Audit log viewing routes (admin only)
app.use('/api/audit', auditRoutes);

// ============================================
// ADDITIONAL UTILITY ENDPOINTS
// ============================================

// System information endpoint
app.get('/api/system/info', (req, res) => {
  const info = {
    service: 'Hotel Reservation System',
    version: '1.1.0',
    environment: process.env.NODE_ENV || 'development',
    features: [
      'Guest Management',
      'Room Management',
      'Reservation System',
      'Payment Processing',
      'Reporting System',
      'Audit Logging (NEW)',
      'Staff Management (NEW)',
      'Role-Based Access Control',
      'API Documentation',
      'Health Monitoring'
    ],
    database: {
      type: 'PostgreSQL',
      pooling: 'Enabled',
      audit_trail: 'Active'
    },
    security: {
      authentication: 'JWT',
      authorization: 'Role-based',
      audit_logging: 'Enabled',
      rate_limiting: 'Enabled'
    },
    documentation: {
      swagger_ui: '/api-docs',
      openapi_spec: '/api-docs.json'
    }
  };
  
  res.json(info);
});

// Manual audit log endpoint (for testing)
app.post('/api/system/log-test', async (req, res) => {
  try {
    const { action, table_name, record_id, description } = req.body;
    
    // Create a test audit log
    const AuditLog = await import('./src/models/AuditLog.js').then(m => m.default);
    
    const auditEntry = await AuditLog.create({
      table_name: table_name || 'system',
      record_id: record_id || 0,
      action: action || 'TEST',
      old_values: JSON.stringify({ test: 'old' }),
      new_values: JSON.stringify({ test: 'new', description }),
      user_id: req.user?.user_id || null,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });
    
    res.json({
      success: true,
      message: 'Test audit log created',
      data: auditEntry
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create test audit log',
      error: error.message
    });
  }
});

// Staff system status endpoint
app.get('/api/system/staff-status', async (req, res) => {
  try {
    const Staff = await import('./src/models/Staff.js').then(m => m.default);
    const db = await import('./src/config/database.js').then(m => m.default);
    
    // Get staff statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_staff,
        SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active_staff,
        COUNT(DISTINCT department) as departments,
        COUNT(DISTINCT position) as positions
      FROM staff
    `;
    
    const statsResult = await db.query(statsQuery);
    
    // Get department breakdown
    const deptQuery = `
      SELECT 
        COALESCE(department, 'Unassigned') as department,
        COUNT(*) as count,
        STRING_AGG(position, ', ') as positions
      FROM staff
      WHERE is_active = true
      GROUP BY department
      ORDER BY count DESC
    `;
    
    const deptResult = await db.query(deptQuery);
    
    res.json({
      timestamp: new Date().toISOString(),
      system_status: 'active',
      statistics: statsResult.rows[0],
      departments: deptResult.rows,
      features: {
        staff_profiles: true,
        department_management: true,
        role_integration: true,
        audit_trail: true
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get staff system status',
      message: error.message
    });
  }
});

// ============================================
// ERROR HANDLING
// ============================================

ErrorMiddleware.handleErrors(app);

// ============================================
// AUDIT CLEANUP SCHEDULER (Optional - Comment out if not needed)
// ============================================

// This is optional - uncomment if you want automatic audit log cleanup
/*
if (process.env.NODE_ENV === 'production') {
  const scheduleAuditCleanup = async () => {
    try {
      const db = await import('./src/config/database.js').then(m => m.default);
      
      // Delete audit logs older than 90 days
      const cleanupQuery = `
        DELETE FROM audit_logs 
        WHERE timestamp < NOW() - INTERVAL '90 DAYS'
      `;
      
      const result = await db.query(cleanupQuery);
      
      if (result.rowCount > 0) {
        console.log(`Audit cleanup: Removed ${result.rowCount} old audit logs`);
        
        // Log the cleanup operation itself
        const AuditLog = await import('./src/models/AuditLog.js').then(m => m.default);
        await AuditLog.create({
          table_name: 'audit_logs',
          record_id: 0,
          action: 'CLEANUP',
          new_values: JSON.stringify({ 
            logs_removed: result.rowCount, 
            older_than: '90 days' 
          }),
          user_id: null, // System operation
          ip_address: '127.0.0.1',
          user_agent: 'System-Cleanup-Job'
        });
      }
    } catch (error) {
      console.error('Audit cleanup failed:', error.message);
    }
  };
  
  // Run cleanup daily at 2 AM
  const cron = require('node-cron');
  cron.schedule('0 2 * * *', scheduleAuditCleanup);
  
  console.log('Audit log cleanup scheduled: Daily at 2 AM');
}
*/

// ============================================
// GRACEFUL SHUTDOWN HANDLERS (Updated)
// ============================================

const gracefulShutdown = async () => {
  console.log('Received shutdown signal. Starting graceful shutdown...');
  
  try {
    // Log shutdown event
    try {
      const AuditLog = await import('./src/models/AuditLog.js').then(m => m.default);
      await AuditLog.create({
        table_name: 'system',
        record_id: 0,
        action: 'SHUTDOWN',
        new_values: JSON.stringify({ 
          reason: 'graceful_shutdown',
          timestamp: new Date().toISOString(),
          uptime: process.uptime()
        }),
        user_id: null,
        ip_address: '127.0.0.1',
        user_agent: 'System-Shutdown-Handler'
      });
      console.log('Shutdown audit log created');
    } catch (auditError) {
      console.warn('Could not create shutdown audit log:', auditError.message);
    }
    
    // Close database connections
    const db = await import('./src/config/database.js').then(m => m.default);
    if (db.closePool) {
      await db.closePool();
      console.log('Database connection pool closed');
    }
    
    console.log('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Log startup
console.log(`
 Hotel Reservation System Backend v1.1.0
============================================
 Server starting in ${process.env.NODE_ENV || 'development'} mode
 Authentication: JWT with role-based access
 Audit Logging:  ENABLED
 Staff Management:  ENABLED
 Health Check: /api/health
 API Docs: /api-docs
 Audit Logs: /api/audit (admin only)
 Staff System: /api/staff
============================================
`);

export default app;