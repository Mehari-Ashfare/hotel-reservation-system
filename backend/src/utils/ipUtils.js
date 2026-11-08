/**
 * ipUtils.js - Utility for getting client IP address
 */

export const getClientIp = (req) => {
  return req.ip || 
         req.headers['x-forwarded-for'] || 
         req.connection.remoteAddress || 
         'unknown';
};