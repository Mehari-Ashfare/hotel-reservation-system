/**
 * logger.js - Advanced logging utility with Winston
 */

import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'warn';
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to Winston
winston.addColors(colors);

// Custom format to display stack traces and metadata
const customFormat = winston.format.printf((info) => {
  const { timestamp, level, message, stack, ...meta } = info;
  
  // Create the base log message
  let logMessage = `${timestamp} ${level}: ${message}`;
  
  // Append stack trace if it exists (for errors)
  if (stack) {
    logMessage += `\n${stack}`;
  }
  
  // Append metadata if it exists (and isn't empty)
  if (Object.keys(meta).length > 0) {
    logMessage += `\n${JSON.stringify(meta, null, 2)}`;
  }
  
  return logMessage;
});

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }), // Important: Capture stack trace
  winston.format.splat(),
  process.env.NODE_ENV === 'production' 
    ? winston.format.json()
    : winston.format.combine(
        winston.format.colorize({ all: true }),
        customFormat // Use our custom format that shows everything
      )
);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log transports
const transports = [
  // Console transport
  new winston.transports.Console(),
  
  // Daily rotate file for errors
  new winston.transports.DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '14d',
    format: winston.format.combine(
      winston.format.uncolorize(),
      winston.format.json()
    ),
  }),
  
  // Daily rotate file for all logs
  new winston.transports.DailyRotateFile({
    filename: path.join(logsDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '7d',
    format: winston.format.combine(
      winston.format.uncolorize(),
      winston.format.json()
    ),
  }),
];

// Create the logger instance
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  exitOnError: false,
});

/**
 * HTTP request logging middleware
 */
export const httpLogger = (req, res, next) => {
  const start = Date.now();
  
  logger.http(`→ ${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id || 'anonymous',
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'http';
    
    logger.log(logLevel, `← ${req.method} ${req.url} ${res.statusCode} ${duration}ms`, {
      status: res.statusCode,
      duration,
      userId: req.user?.id || 'anonymous',
      contentLength: res.get('content-length'),
    });
  });

  next();
};

export default logger;
