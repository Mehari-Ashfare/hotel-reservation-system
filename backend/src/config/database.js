/**
 * database.js - Enhanced PostgreSQL connection manager
 * * Now includes connection pool management, health checks,
 * * retry logic, and query logging.
 */

import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
// We assume this file exists. If you get an error, we can swap this for a simple console logger.
import logger from '../utils/logger.js'; 

dotenv.config();

// Configuration for connection pool
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'hotel_db', // Check this name matches your .env
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: parseInt(process.env.DB_POOL_MAX) || 20, 
  min: parseInt(process.env.DB_POOL_MIN) || 2,  
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000, 
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 5000, 
  allowExitOnIdle: false,
};

// Create the connection pool
let pool = null;
let isConnected = false;

/**
 * Initialize the database connection pool
 */
export const initPool = () => {
  try {
    pool = new Pool(poolConfig);
    
    // Test the connection
    pool.on('connect', () => {
      isConnected = true;
      logger.info('✅ PostgreSQL pool connected');
    });
    
    // Handle connection errors
    pool.on('error', (err) => {
      logger.error('❌ PostgreSQL pool error', { error: err.message });
      isConnected = false;
      
      // Attempt to reconnect after delay
      setTimeout(() => {
        if (!isConnected) {
          logger.info('Attempting to reconnect to PostgreSQL...');
          initPool();
        }
      }, 5000);
    });
    
    // Remove idle clients
    setInterval(() => {
      if (pool && isConnected) {
        pool.query('SELECT 1').catch(() => {
          isConnected = false;
        });
      }
    }, 30000); // Check every 30 seconds
    
    return pool;
  } catch (error) {
    logger.error('Failed to initialize PostgreSQL pool', { error: error.message });
    throw error;
  }
};

/**
 * Get the connection pool (singleton pattern)
 */
export const getPool = () => {
  if (!pool) {
    return initPool();
  }
  return pool;
};

/**
 * Test database connection
 */
export const testConnection = async () => {
  try {
    const client = await getPool().connect();
    const result = await client.query('SELECT NOW() as time, version() as version');
    client.release();
    
    logger.info('✅ PostgreSQL connection test successful', {
      time: result.rows[0].time,
      version: result.rows[0].version.split(' ').slice(0, 4).join(' '),
    });
    
    return true;
  } catch (error) {
    logger.error('❌ PostgreSQL connection test failed', { error: error.message });
    return false;
  }
};

/**
 * Get database statistics
 */
export const getPoolStats = () => {
  if (!pool) {
    return { status: 'not_initialized' };
  }
  
  return {
    status: isConnected ? 'connected' : 'disconnected',
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
};

/**
 * Execute a query with logging
 */
export const query = async (text, params = []) => {
  const start = Date.now();
  
  try {
    const result = await getPool().query(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries
    if (duration > 1000) { 
      logger.warn('⚠️ Slow query detected', {
        query: text,
        duration: `${duration}ms`,
        rows: result.rowCount,
      });
    }
    
    // Log all queries in development
    if (process.env.NODE_ENV === 'development') {
      logger.debug('📦 Database query executed', {
        query: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
        params: params.slice(0, 5), 
        duration: `${duration}ms`,
        rows: result.rowCount,
      });
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('❌ Database query failed', {
      query: text,
      params,
      duration: `${duration}ms`,
      error: error.message,
      code: error.code,
    });
    
    throw error;
  }
};

/**
 * Execute a transaction
 */
export const transaction = async (callback) => {
  const client = await getPool().connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('❌ Transaction failed', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Close the connection pool
 */
export const closePool = async () => {
  try {
    if (pool) {
      await pool.end();
      logger.info('PostgreSQL connection pool closed');
      pool = null;
      isConnected = false;
    }
  } catch (error) {
    logger.error('Error closing PostgreSQL pool', { error: error.message });
  }
};

/**
 * Health check for database
 */
export const healthCheck = async () => {
  try {
    const stats = getPoolStats();
    const connectionTest = await testConnection();
    
    return {
      status: connectionTest ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      details: {
        connected: isConnected,
        poolStats: stats,
        lastCheck: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    };
  }
};

// Initialize pool on module load
initPool();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Closing database pool...');
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Closing database pool...');
  await closePool();
  process.exit(0);
});

// Export everything
export default {
  query,
  transaction,
  getPool,
  testConnection,
  getPoolStats,
  closePool,
  healthCheck,
  isConnected: () => isConnected,
  // === THIS IS THE CRITICAL FIX ===
  connect: () => getPool().connect(), 
};








// /**
//  * database.js - Enhanced PostgreSQL connection manager
//  * * Now includes connection pool management, health checks,
//  * retry logic, and query logging.
//  */

// import pg from 'pg';
// const { Pool } = pg;
// import dotenv from 'dotenv';
// import logger from '../utils/logger.js';

// dotenv.config();

// // Configuration for connection pool
// const poolConfig = {
//   host: process.env.DB_HOST || 'localhost',
//   port: parseInt(process.env.DB_PORT) || 5432,
//   database: process.env.DB_NAME || 'hotel-reservation-db',
//   user: process.env.DB_USER || 'postgres',
//   password: process.env.DB_PASSWORD || '',
//   max: parseInt(process.env.DB_POOL_MAX) || 20, // Maximum number of clients in the pool
//   min: parseInt(process.env.DB_POOL_MIN) || 2,  // Minimum number of clients in the pool
//   idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000, // 30 seconds
//   connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 5000, // 5 seconds
//   allowExitOnIdle: false,
// };

// // Create the connection pool
// let pool = null;
// let isConnected = false;

// /**
//  * Initialize the database connection pool
//  */
// export const initPool = () => {
//   try {
//     pool = new Pool(poolConfig);
    
//     // Test the connection
//     pool.on('connect', () => {
//       isConnected = true;
//       logger.info('✅ PostgreSQL pool connected');
//     });
    
//     // Handle connection errors
//     pool.on('error', (err) => {
//       logger.error('❌ PostgreSQL pool error', { error: err.message });
//       isConnected = false;
      
//       // Attempt to reconnect after delay
//       setTimeout(() => {
//         if (!isConnected) {
//           logger.info('Attempting to reconnect to PostgreSQL...');
//           initPool();
//         }
//       }, 5000);
//     });
    
//     // Remove idle clients
//     setInterval(() => {
//       if (pool && isConnected) {
//         pool.query('SELECT 1').catch(() => {
//           isConnected = false;
//         });
//       }
//     }, 30000); // Check every 30 seconds
    
//     return pool;
//   } catch (error) {
//     logger.error('Failed to initialize PostgreSQL pool', { error: error.message });
//     throw error;
//   }
// };

// /**
//  * Get the connection pool (singleton pattern)
//  */
// export const getPool = () => {
//   if (!pool) {
//     return initPool();
//   }
//   return pool;
// };

// /**
//  * Test database connection
//  */
// export const testConnection = async () => {
//   try {
//     const client = await getPool().connect();
//     const result = await client.query('SELECT NOW() as time, version() as version');
//     client.release();
    
//     logger.info('✅ PostgreSQL connection test successful', {
//       time: result.rows[0].time,
//       version: result.rows[0].version.split(' ').slice(0, 4).join(' '),
//     });
    
//     return true;
//   } catch (error) {
//     logger.error('❌ PostgreSQL connection test failed', { error: error.message });
//     return false;
//   }
// };

// /**
//  * Get database statistics
//  */
// export const getPoolStats = () => {
//   if (!pool) {
//     return { status: 'not_initialized' };
//   }
  
//   return {
//     status: isConnected ? 'connected' : 'disconnected',
//     totalCount: pool.totalCount,
//     idleCount: pool.idleCount,
//     waitingCount: pool.waitingCount,
//   };
// };

// /**
//  * Execute a query with logging
//  */
// export const query = async (text, params = []) => {
//   const start = Date.now();
  
//   try {
//     const result = await getPool().query(text, params);
//     const duration = Date.now() - start;
    
//     // Log slow queries
//     if (duration > 1000) { // More than 1 second
//       // Fix: Added backticks
//       logger.warn('⚠️ Slow query detected', {
//         query: text,
//         duration: `${duration}ms`,
//         rows: result.rowCount,
//       });
//     }
    
//     // Log all queries in development
//     if (process.env.NODE_ENV === 'development') {
//       // Fix: Added backticks
//       logger.debug('📦 Database query executed', {
//         query: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
//         params: params.slice(0, 5), // Limit params in log
//         duration: `${duration}ms`,
//         rows: result.rowCount,
//       });
//     }
    
//     return result;
//   } catch (error) {
//     const duration = Date.now() - start;
//     // Fix: Added backticks
//     logger.error('❌ Database query failed', {
//       query: text,
//       params,
//       duration: `${duration}ms`,
//       error: error.message,
//       code: error.code,
//     });
    
//     throw error;
//   }
// };

// /**
//  * Execute a transaction
//  */
// export const transaction = async (callback) => {
//   const client = await getPool().connect();
  
//   try {
//     await client.query('BEGIN');
//     const result = await callback(client);
//     await client.query('COMMIT');
//     return result;
//   } catch (error) {
//     await client.query('ROLLBACK');
//     logger.error('❌ Transaction failed', { error: error.message });
//     throw error;
//   } finally {
//     client.release();
//   }
// };

// /**
//  * Close the connection pool
//  */
// export const closePool = async () => {
//   try {
//     if (pool) {
//       await pool.end();
//       logger.info('PostgreSQL connection pool closed');
//       pool = null;
//       isConnected = false;
//     }
//   } catch (error) {
//     logger.error('Error closing PostgreSQL pool', { error: error.message });
//   }
// };

// /**
//  * Health check for database
//  */
// export const healthCheck = async () => {
//   try {
//     const stats = getPoolStats();
//     const connectionTest = await testConnection();
    
//     return {
//       status: connectionTest ? 'healthy' : 'unhealthy',
//       timestamp: new Date().toISOString(),
//       details: {
//         connected: isConnected,
//         poolStats: stats,
//         lastCheck: new Date().toISOString(),
//       },
//     };
//   } catch (error) {
//     return {
//       status: 'unhealthy',
//       timestamp: new Date().toISOString(),
//       error: error.message,
//     };
//   }
// };

// // Initialize pool on module load
// initPool();

// // Graceful shutdown
// process.on('SIGTERM', async () => {
//   logger.info('SIGTERM received. Closing database pool...');
//   await closePool();
//   process.exit(0);
// });

// process.on('SIGINT', async () => {
//   logger.info('SIGINT received. Closing database pool...');
//   await closePool();
//   process.exit(0);
// });

// // Export everything
// export default {
//   query,
//   transaction,
//   getPool,
//   testConnection,
//   getPoolStats,
//   closePool,
//   healthCheck,
//   isConnected: () => isConnected,
// };