/**
 * env.js - Environment variable validation and configuration
 * * Validates all required environment variables and provides
 * default values for development.
 * * Features:
 * - Validates required environment variables
 * - Provides default values for development
 * - Validates data types and formats
 * - Throws clear error messages
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define required environment variables
const requiredEnvVars = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
];

// Define optional environment variables with defaults
const optionalEnvVars = {
  NODE_ENV: 'development',
  PORT: 5000,
  CORS_ORIGIN: 'http://localhost:3000',
  BCRYPT_SALT_ROUNDS: 12,
  JWT_EXPIRES_IN: '7d',
  LOG_LEVEL: 'info',
  RATE_LIMIT_WINDOW_MS: 900000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
};

// Validate required environment variables
function validateEnvVars() {
  const missingVars = [];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missingVars.push(envVar);
    }
  }
  
  if (missingVars.length > 0) {
    // FIX: Added backticks and variable interpolation
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please check your .env file or set these environment variables.'
    );
  }
}

// Set default values for optional environment variables
function setDefaultEnvVars() {
  for (const [key, defaultValue] of Object.entries(optionalEnvVars)) {
    if (!process.env[key]) {
      process.env[key] = defaultValue.toString();
    }
  }
}

// Validate data types and formats
function validateEnvTypes() {
  const errors = [];
  
  // Validate PORT is a number
  if (isNaN(parseInt(process.env.PORT))) {
    errors.push('PORT must be a number');
  }
  
  // Validate DB_PORT is a number
  if (isNaN(parseInt(process.env.DB_PORT))) {
    errors.push('DB_PORT must be a number');
  }
  
  // Validate BCRYPT_SALT_ROUNDS is a number
  if (isNaN(parseInt(process.env.BCRYPT_SALT_ROUNDS))) {
    errors.push('BCRYPT_SALT_ROUNDS must be a number');
  }
  
  // Validate JWT_SECRET length
  if (process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long for security');
  }
  
  // Validate NODE_ENV
  const validEnvironments = ['development', 'production', 'test'];
  if (!validEnvironments.includes(process.env.NODE_ENV)) {
    // FIX: Added backticks and variable interpolation
    errors.push(`NODE_ENV must be one of: ${validEnvironments.join(', ')}`);
  }
  
  if (errors.length > 0) {
    // FIX: Added backticks and error joining
    throw new Error(`Environment validation errors:\n${errors.join('\n')}`);
  }
}

// Export configuration object
const config = {
  // Server
  nodeEnv: process.env.NODE_ENV,
  port: parseInt(process.env.PORT),
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  
  // Database
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    poolMax: parseInt(process.env.DB_POOL_MAX) || 20,
    poolMin: parseInt(process.env.DB_POOL_MIN) || 2,
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
  },
  
  // Security
  security: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN,
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS),
    corsOrigin: process.env.CORS_ORIGIN,
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL,
    enableFileLogging: process.env.ENABLE_FILE_LOGGING === 'true',
    logDirectory: process.env.LOG_DIRECTORY || 'logs',
  },
  
  // Email (optional)
  email: {
    smtpHost: process.env.SMTP_HOST,
    smtpPort: parseInt(process.env.SMTP_PORT) || 587,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    fromEmail: process.env.FROM_EMAIL || 'noreply@hotel-reservation.com',
  },
};

// Initialize environment configuration
function initializeEnv() {
  try {
    validateEnvVars();
    setDefaultEnvVars();
    validateEnvTypes();
    
    console.log(' Environment configuration validated successfully');
    // FIX: Added backticks and variable interpolation to logs
    console.log(` Environment: ${config.nodeEnv}`);
    console.log(` Server Port: ${config.port}`);
    console.log(` Database: ${config.database.host}`);
    
    return config;
  } catch (error) {
    console.error(' Environment configuration failed:', error.message);
    process.exit(1);
  }
}

// Initialize and export
export default initializeEnv();