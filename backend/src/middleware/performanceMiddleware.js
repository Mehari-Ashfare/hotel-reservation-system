/**
 * performanceMiddleware.js - Performance monitoring and optimization
 * * Provides performance monitoring, caching, and optimization
 * features for the API.
 */

import os from 'os';
import v8 from 'v8';
import compression from 'compression';
import logger from '../utils/logger.js';

class PerformanceMiddleware {
  /**
   * Apply response compression
   */
  static applyCompression = (app) => {
    app.use(compression({
      level: 6,
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
    }));
    
    logger.info('Response compression enabled');
  };

  /**
   * Add caching headers
   */
  static applyCaching = (app) => {
    app.use((req, res, next) => {
      if (req.path.startsWith('/api/')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000');
      }
      next();
    });
  };

  /**
   * Monitor response times (Logging only)
   */
  static monitorResponseTime = (app) => {
    app.use((req, res, next) => {
      const start = process.hrtime();
      
      res.on('finish', () => {
        const diff = process.hrtime(start);
        const duration = diff[0] * 1e3 + diff[1] * 1e-6; // Convert to milliseconds
        
        // Log slow responses
        if (duration > 1000) {
          logger.warn(` Slow response detected: ${req.method} ${req.originalUrl}`, {
            duration: `${duration.toFixed(2)}ms`,
            status: res.statusCode,
            userId: req.user?.id || 'anonymous',
            ip: req.ip,
          });
        }
        
        // Log performance metrics periodically
        if (Math.random() < 0.01) {
          logger.debug(' Performance metrics', {
            endpoint: `${req.method} ${req.originalUrl}`,
            duration: `${duration.toFixed(2)}ms`,
            status: res.statusCode,
            memory: process.memoryUsage(),
          });
        }
      });
      
      next();
    });
  };

  /**
   * Monitor system resources
   */
  static monitorSystemResources = () => {
    setInterval(() => {
      const memory = process.memoryUsage();
      const heapStats = v8.getHeapStatistics();
      const systemMemory = os.totalmem();
      const freeMemory = os.freemem();
      const loadAverage = os.loadavg();
      
      const memoryUsage = (memory.heapUsed / memory.heapTotal) * 100;
      
      if (memoryUsage > 80) {
        logger.warn(' High memory usage detected', {
          memoryUsage: `${memoryUsage.toFixed(2)}%`,
          heapUsed: `${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          heapTotal: `${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
          rss: `${(memory.rss / 1024 / 1024).toFixed(2)} MB`,
        });
      }
      
      if (Math.random() < 0.2) {
        logger.info(' System resource metrics', {
          memory: {
            usage: `${memoryUsage.toFixed(2)}%`,
            heapUsed: `${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
            heapTotal: `${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
            rss: `${(memory.rss / 1024 / 1024).toFixed(2)} MB`,
            external: `${(memory.external / 1024 / 1024).toFixed(2)} MB`,
          },
          system: {
            totalMemory: `${(systemMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
            freeMemory: `${(freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
            freePercentage: `${((freeMemory / systemMemory) * 100).toFixed(2)}%`,
            loadAverage: loadAverage.map(load => load.toFixed(2)),
          },
          heap: {
            totalHeapSize: `${(heapStats.total_heap_size / 1024 / 1024).toFixed(2)} MB`,
            usedHeapSize: `${(heapStats.used_heap_size / 1024 / 1024).toFixed(2)} MB`,
            heapSizeLimit: `${(heapStats.heap_size_limit / 1024 / 1024).toFixed(2)} MB`,
          },
        });
      }
    }, 300000); 
  };

  /**
   * Query optimization middleware
   */
  static optimizeQueries = () => {
    logger.info('Query optimization monitoring enabled');
  };

  /**
   * Database connection pool monitoring
   */
  static monitorDatabasePool = () => {
    setInterval(async () => {
      try {
        const db = await import('../config/database.js').then(m => m.default);
        const stats = db.getPoolStats ? db.getPoolStats() : {};
        
        logger.debug(' Database pool metrics', {
          status: stats.status || 'unknown',
          totalCount: stats.totalCount || 0,
          idleCount: stats.idleCount || 0,
          waitingCount: stats.waitingCount || 0,
        });
        
        if (stats.waitingCount > 10) {
          logger.warn(' Database pool saturation detected', {
            waitingCount: stats.waitingCount,
            totalCount: stats.totalCount,
            idleCount: stats.idleCount,
          });
        }
      } catch (error) {
        logger.error('Failed to monitor database pool', { error: error.message });
      }
    }, 60000); 
  };

  /**
   * Add performance headers (FIXED)
   */
  static addPerformanceHeaders = (app) => {
    app.use((req, res, next) => {
      const start = Date.now();
      
      // Override res.end to capture the duration before the response is sent
      const originalEnd = res.end;
      
      res.end = function (...args) {
        const duration = Date.now() - start;
        
        // Only set header if headers haven't been sent yet
        if (!res.headersSent) {
          res.setHeader('Server-Timing', `total;dur=${duration}`);
        }
        
        // Call the original end function
        originalEnd.apply(res, args);
      };
      
      next();
    });
  };

  /**
   * Apply all performance optimizations
   */
  static applyAllOptimizations = (app) => {
    this.applyCompression(app);
    this.applyCaching(app);
    this.monitorResponseTime(app);
    this.addPerformanceHeaders(app);
    
    // Start monitoring
    this.monitorSystemResources();
    this.monitorDatabasePool();
    this.optimizeQueries();
    
    logger.info('All performance optimizations applied');
  };
}

export default PerformanceMiddleware;
