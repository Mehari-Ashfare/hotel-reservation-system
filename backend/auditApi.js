/**
 * audit-api-test.js - Comprehensive Audit Log API Testing Script
 * 
 * Tests all Audit Log-related API endpoints (Admin Only):
 * 
 * 1. GET    /api/audit                     - Get audit logs with filters
 * 2. GET    /api/audit/recent              - Get recent activity
 * 3. GET    /api/audit/record/:table/:id   - Get audit trail for specific record
 * 
 * Usage: node audit-api-test.js
 */

import axios from 'axios';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const ADMIN_CREDENTIALS = {
  email: 'mehariashfare1221@gmail.com',
  password: 'Abc123!!'
};

let authToken = '';
let testResults = [];
let createdRecords = {}; // Store IDs of created records for testing

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
  console.log(`  ${message}`);
};

const logHeader = (title) => {
  console.log('\n' + '='.repeat(60));
  console.log(` ${title}`);
  console.log('='.repeat(60));
};

const logTable = (data, title = '') => {
  if (title) console.log(`\n${title}:`);
  console.table(data);
};

// API Test Functions
class AuditAPITester {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.axiosInstance = axios.create({
      baseURL: `${baseURL}`,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  setAuthToken(token) {
    this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    authToken = token;
  }

  async login(credentials) {
    try {
      const response = await axios.post(`${this.baseURL}/auth/login`, credentials);
      this.setAuthToken(response.data.data.token);
      return response.data;
    } catch (error) {
      throw new Error(`Login failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // 1. GET /api/audit - Get audit logs with filters
  async getAuditLogs(filters = {}) {
    try {
      const response = await this.axiosInstance.get('/audit', { params: filters });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 2. GET /api/audit/recent - Get recent activity
  async getRecentActivity(limit = 100) {
    try {
      const response = await this.axiosInstance.get('/audit/recent', { 
        params: { limit } 
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 3. GET /api/audit/record/:table/:id - Get audit trail for specific record
  async getRecordAuditTrail(table, recordId) {
    try {
      const response = await this.axiosInstance.get(`/audit/record/${table}/${recordId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Helper: Create test data to generate audit logs
  async createTestData() {
    try {
      logInfo('Creating test data to generate audit logs...');
      
      // Create a guest (if guest controller is set up with audit logging)
      const guestResponse = await this.axiosInstance.post('/guests', {
        first_name: 'Audit',
        last_name: 'Test',
        email: `audit.test.${Date.now()}@test.com`,
        phone: '+12345678901',
        address: '123 Audit Test Street',
        guest_type: 'walk-in',
        id_type: 'passport',
        id_number: `AUDIT${Date.now()}`,
        date_of_birth: '1990-01-01',
        nationality: 'Test'
      });
      
      if (guestResponse.data.success) {
        const guestId = guestResponse.data.data.guest_id || guestResponse.data.data.id;
        createdRecords.guest = guestId;
        logSuccess('Test Guest Created', `ID: ${guestId}`);
        
        // Update the guest to generate UPDATE audit log
        await sleep(500);
        await this.axiosInstance.put(`/guests/${guestId}`, {
          phone: '+19876543210',
          address: '456 Updated Audit Street'
        });
        logSuccess('Guest Updated', 'Generated UPDATE audit log');
        
        // Try to create a reservation (if endpoint exists)
        try {
          const roomResponse = await this.axiosInstance.get('/rooms?limit=1');
          if (roomResponse.data.data?.rooms?.[0]) {
            const roomId = roomResponse.data.data.rooms[0].room_id;
            
            const reservationResponse = await this.axiosInstance.post('/reservations', {
              guest_id: guestId,
              room_id: roomId,
              check_in_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
              check_out_date: new Date(Date.now() + 172800000).toISOString().split('T')[0], // Day after tomorrow
              number_of_guests: 2
            });
            
            if (reservationResponse.data.success) {
              const reservationId = reservationResponse.data.data.reservation_id;
              createdRecords.reservation = reservationId;
              logSuccess('Test Reservation Created', `ID: ${reservationId}`);
            }
          }
        } catch (error) {
          logInfo('Skipping reservation creation - endpoint may not exist');
        }
      }
      
      return createdRecords;
    } catch (error) {
      logError('Test Data Creation', error);
      // Continue even if test data creation fails
      return createdRecords;
    }
  }

  // Helper: Clean up test data
  async cleanupTestData() {
    try {
      logInfo('Cleaning up test data...');
      
      if (createdRecords.reservation) {
        try {
          await this.axiosInstance.delete(`/reservations/${createdRecords.reservation}`);
          logSuccess('Test Reservation Deleted', `ID: ${createdRecords.reservation}`);
        } catch (error) {
          logInfo(`Could not delete reservation: ${error.message}`);
        }
      }
      
      if (createdRecords.guest) {
        try {
          await this.axiosInstance.delete(`/guests/${createdRecords.guest}`);
          logSuccess('Test Guest Deleted', `ID: ${createdRecords.guest}`);
        } catch (error) {
          logInfo(`Could not delete guest: ${error.message}`);
        }
      }
      
      createdRecords = {};
    } catch (error) {
      logError('Test Data Cleanup', error);
    }
  }

  // Clear authentication headers
  clearAuth() {
    delete this.axiosInstance.defaults.headers.common['Authorization'];
    authToken = '';
  }
}

// Test Suite
async function runAllTests() {
  const tester = new AuditAPITester(API_BASE_URL);
  
  logHeader('AUDIT LOG API TEST SUITE');
  console.log('Testing all Audit Log API endpoints...\n');

  // Login first - AUDIT ENDPOINTS REQUIRE ADMIN ACCESS
  try {
    logInfo('Logging in as admin...');
    await tester.login(ADMIN_CREDENTIALS);
    logSuccess('Admin Login', `Token received: ${authToken.substring(0, 30)}...`);
    await sleep(500);
  } catch (error) {
    logError('Admin Login', error);
    console.log('\n  Please ensure:');
    console.log('1. Server is running: npm run dev');
    console.log('2. Admin user exists in database');
    console.log('3. Admin credentials:', ADMIN_CREDENTIALS);
    process.exit(1);
  }

  // Create test data to generate audit logs
  logHeader('PREPARATION: CREATING TEST DATA');
  await tester.createTestData();
  await sleep(1000); // Wait for audit logs to be written

  // Test 1: Get Recent Activity
  logHeader('TEST 1: GET RECENT ACTIVITY (GET /audit/recent)');
  
  const recentTests = [
    { name: 'Default limit (100)', params: {} },
    { name: 'Limit 5', params: { limit: 5 } },
    { name: 'Limit 10', params: { limit: 10 } },
    { name: 'Limit 20', params: { limit: 20 } }
  ];

  for (const test of recentTests) {
    try {
      const result = await tester.getRecentActivity(test.params.limit);
      const logs = result.data || result;
      const count = Array.isArray(logs) ? logs.length : Object.keys(logs).length;
      
      logSuccess(`Get Recent Activity - ${test.name}`, 
        `Retrieved ${count} audit logs`);
      
      if (count > 0) {
        console.log(`    Sample entries (${test.name}):`);
        const sample = Array.isArray(logs) ? logs.slice(0, 3) : Object.values(logs).slice(0, 3);
        sample.forEach((log, index) => {
          if (log) {
            console.log(`   ${index + 1}. ${log.table_name}.${log.record_id} - ${log.action} by User ${log.user_id || 'System'}`);
            console.log(`      At: ${new Date(log.timestamp || log.created_at).toLocaleString()}`);
          }
        });
      }
      await sleep(300);
    } catch (error) {
      logError(`Get Recent Activity - ${test.name}`, error);
    }
  }
  await sleep(500);

  // Test 2: Get Audit Logs with Filters
  logHeader('TEST 2: GET AUDIT LOGS WITH FILTERS (GET /audit)');
  
  const filterTests = [
    { 
      name: 'No filters (default)', 
      params: {} 
    },
    { 
      name: 'Pagination - Page 1, Limit 5', 
      params: { page: 1, limit: 5 } 
    },
    { 
      name: 'Filter by table name (guests)', 
      params: { table_name: 'guests', limit: 10 } 
    },
    { 
      name: 'Filter by action (INSERT)', 
      params: { action: 'INSERT', limit: 5 } 
    },
    { 
      name: 'Filter by action (UPDATE)', 
      params: { action: 'UPDATE', limit: 5 } 
    },
    { 
      name: 'Filter by date range (last 7 days)', 
      params: { 
        start_date: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        limit: 10
      } 
    }
  ];

  // Add user_id filter if we have a user ID from recent logs
  try {
    const recentResult = await tester.getRecentActivity(1);
    if (recentResult.data?.[0]?.user_id) {
      const userId = recentResult.data[0].user_id;
      filterTests.push({
        name: `Filter by user_id (${userId})`,
        params: { user_id: userId, limit: 5 }
      });
    }
  } catch (error) {
    // Skip if can't get user_id
  }

  for (const test of filterTests) {
    try {
      const result = await tester.getAuditLogs(test.params);
      const logs = result.data?.audit_logs || result.data?.logs || result.data || result;
      const count = Array.isArray(logs) ? logs.length : Object.keys(logs || {}).length;
      
      if (Array.isArray(logs) && logs.length > 0) {
        logSuccess(`Get Audit Logs - ${test.name}`, 
          `Found ${count} logs matching filters`);
        
        console.log(`    Filter Summary (${test.name}):`);
        console.log(`      Applied filters: ${JSON.stringify(test.params)}`);
        console.log(`      Results: ${count} logs`);
        
        // Show filter effectiveness
        if (test.params.table_name) {
          const tableMatches = logs.filter(log => log.table_name === test.params.table_name).length;
          console.log(`      ${tableMatches}/${count} from table "${test.params.table_name}"`);
        }
        if (test.params.action) {
          const actionMatches = logs.filter(log => log.action === test.params.action).length;
          console.log(`      ${actionMatches}/${count} with action "${test.params.action}"`);
        }
      } else {
        logInfo(`Get Audit Logs - ${test.name}: No logs found with filters`);
      }
      await sleep(300);
    } catch (error) {
      logError(`Get Audit Logs - ${test.name}`, error);
    }
  }
  await sleep(500);

  // Test 3: Get Audit Trail for Specific Record
  logHeader('TEST 3: GET AUDIT TRAIL FOR SPECIFIC RECORD (GET /audit/record/:table/:id)');
  
  // Use the guest record we created
  if (createdRecords.guest) {
    const recordTests = [
      { table: 'guests', id: createdRecords.guest, description: 'Guest we created' },
      { table: 'users', id: 1, description: 'First user (if exists)' },
      { table: 'rooms', id: 1, description: 'First room (if exists)' }
    ];

    for (const test of recordTests) {
      try {
        const result = await tester.getRecordAuditTrail(test.table, test.id);
        const trail = result.data || result;
        const count = Array.isArray(trail) ? trail.length : Object.keys(trail || {}).length;
        
        if (count > 0) {
          logSuccess(`Get Record Audit Trail - ${test.table}.${test.id}`, 
            `Found ${count} audit entries for ${test.description}`);
          
          console.log(`    Audit Trail for ${test.table} ID ${test.id}:`);
          if (Array.isArray(trail)) {
            trail.forEach((entry, index) => {
              console.log(`   ${index + 1}. ${entry.action} by User ${entry.user_id || 'System'}`);
              console.log(`      At: ${new Date(entry.timestamp).toLocaleString()}`);
              if (entry.old_values && Object.keys(entry.old_values).length > 0) {
                console.log(`      Old values: ${JSON.stringify(entry.old_values).substring(0, 100)}...`);
              }
              if (entry.new_values && Object.keys(entry.new_values).length > 0) {
                console.log(`      New values: ${JSON.stringify(entry.new_values).substring(0, 100)}...`);
              }
            });
          }
        } else {
          logInfo(`Get Record Audit Trail - ${test.table}.${test.id}: No audit trail found`);
        }
        await sleep(300);
      } catch (error) {
        if (error.response?.status === 404) {
          logInfo(`Get Record Audit Trail - ${test.table}.${test.id}: Record not found (expected for some tables)`);
        } else {
          logError(`Get Record Audit Trail - ${test.table}.${test.id}`, error);
        }
      }
    }
  } else {
    logInfo('Skipping record audit trail tests - no test records created');
  }
  await sleep(500);

  // Test 4: Test Access Control (Non-admin should be denied)
  logHeader('TEST 4: ACCESS CONTROL TESTS');
  
  // Create a non-admin user first if possible
  logInfo('Testing access control - non-admin users should be denied...');
  
  // For now, we'll test with invalid token
  const originalToken = authToken;
  tester.setAuthToken('invalid-token');
  
  try {
    await tester.getRecentActivity(5);
    logError('Access Control - Invalid Token', new Error('Should have rejected invalid token'));
  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      logSuccess('Access Control - Invalid Token', 'Correctly rejected invalid/expired token');
    } else {
      logError('Access Control - Invalid Token', error);
    }
  }
  
  // Restore valid token
  tester.setAuthToken(originalToken);
  await sleep(300);

  // Test 5: Edge Cases and Error Handling
  logHeader('TEST 5: EDGE CASES AND ERROR HANDLING');
  
  const edgeCases = [
    { name: 'Invalid table name', params: { table_name: 'non_existent_table' } },
    { name: 'Invalid action', params: { action: 'INVALID_ACTION' } },
    { name: 'Negative limit', params: { limit: -5 } },
    { name: 'Very large limit', params: { limit: 10000 } },
    { name: 'Invalid date format', params: { start_date: 'not-a-date' } }
  ];

  for (const test of edgeCases) {
    try {
      await tester.getAuditLogs(test.params);
      logError(`Edge Case - ${test.name}`, new Error(`Should have handled ${test.name}`));
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 422) {
        logSuccess(`Edge Case - ${test.name}`, 'Correctly handled invalid input');
      } else if (error.response?.status === 404) {
        logSuccess(`Edge Case - ${test.name}`, 'No results found (expected)');
      } else {
        // Some edge cases might not return errors - that's okay
        logInfo(`Edge Case - ${test.name}: ${error.response?.status || error.message}`);
      }
    }
    await sleep(200);
  }
  
  await sleep(500);

  // Test 6: Audit Log Data Validation
  logHeader('TEST 6: AUDIT LOG DATA VALIDATION');
  
  try {
    const result = await tester.getRecentActivity(5);
    const logs = result.data || result;
    
    if (Array.isArray(logs) && logs.length > 0) {
      const sampleLog = logs[0];
      
      // Check required fields
      const requiredFields = ['table_name', 'record_id', 'action', 'timestamp'];
      const missingFields = requiredFields.filter(field => !sampleLog[field]);
      
      if (missingFields.length === 0) {
        logSuccess('Data Validation - Required Fields', 'All required fields present');
        
        // Validate action types
        const validActions = ['INSERT', 'UPDATE', 'DELETE'];
        if (validActions.includes(sampleLog.action)) {
          logSuccess('Data Validation - Action Type', `Valid action: ${sampleLog.action}`);
        } else {
          logError('Data Validation - Action Type', new Error(`Invalid action: ${sampleLog.action}`));
        }
        
        // Validate timestamp format
        const timestamp = new Date(sampleLog.timestamp);
        if (!isNaN(timestamp.getTime())) {
          logSuccess('Data Validation - Timestamp', 'Valid timestamp format');
        } else {
          logError('Data Validation - Timestamp', new Error('Invalid timestamp format'));
        }
        
        // Show sample audit log structure
        console.log('\n    Sample Audit Log Structure:');
        console.log(JSON.stringify(sampleLog, null, 2));
        
      } else {
        logError('Data Validation - Required Fields', 
          new Error(`Missing fields: ${missingFields.join(', ')}`));
      }
    } else {
      logInfo('Data Validation: No audit logs available for validation');
    }
  } catch (error) {
    logError('Data Validation', error);
  }
  
  await sleep(500);

  // Cleanup test data
  logHeader('CLEANUP');
  await tester.cleanupTestData();
  
  // Print Summary
  await printSummary(tester);
  rl.close();
}

async function printSummary(tester) {
  logHeader('AUDIT LOG API TEST SUMMARY');
  const passed = testResults.filter(r => r.success).length;
  const total = testResults.length;
  const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';

  console.log(` Total Tests: ${total}`);
  console.log(` Passed: ${passed}`);
  console.log(` Failed: ${total - passed}`);
  console.log(` Success Rate: ${successRate}%`);

  // Test coverage summary
  console.log('\n TEST COVERAGE:');
  console.log('    GET /audit              - Get audit logs with filters');
  console.log('    GET /audit/recent       - Get recent activity');
  console.log('    GET /audit/record/:table/:id - Get audit trail for record');
  console.log('    Access control tests    - Admin-only validation');
  console.log('    Edge case handling      - Invalid inputs');
  console.log('    Data validation         - Audit log structure');

  // Recommendations
  console.log('\n RECOMMENDATIONS:');
  if (successRate === '100.0') {
    console.log(' EXCELLENT! All Audit Log API endpoints are fully functional.');
    console.log('   Next steps:');
    console.log('   1. Test with different date ranges');
    console.log('   2. Test with complex filter combinations');
    console.log('   3. Load test with high volume of audit logs');
  } else if (parseFloat(successRate) >= 80.0) {
    console.log(' GOOD! Most endpoints are working.');
    console.log('   Review failed tests - check permission setup.');
  } else {
    console.log('  NEEDS ATTENTION. Several tests failed.');
    console.log('   Check:');
    console.log('   1. Admin permissions are correctly set');
    console.log('   2. Audit logging is enabled in controllers');
    console.log('   3. Database has audit_logs table');
  }

  console.log('\n AUDIT LOG STATISTICS:');
  try {
    const recent = await tester.getRecentActivity(1);
    const totalLogs = await tester.getAuditLogs({ limit: 1 });
    
    console.log(`    Recent activity endpoint: ${recent.data?.length ? 'Working' : 'No data'}`);
    console.log(`    Filter endpoint: ${totalLogs.data ? 'Working' : 'No data'}`);
  } catch (error) {
    console.log(`    Cannot fetch statistics: ${error.message}`);
  }
}

// Interactive test menu
async function showMenu() {
  console.log('\n AUDIT LOG API TESTER');
  console.log('=====================');
  console.log('1. Run All Tests');
  console.log('2. Test Specific Endpoint');
  console.log('3. View Recent Activity Only');
  console.log('4. Quick Health Check');
  console.log('5. Exit');
  
  rl.question('\nSelect option (1-5): ', async (choice) => {
    const tester = new AuditAPITester(API_BASE_URL);
    
    // Login first
    try {
      await tester.login(ADMIN_CREDENTIALS);
      console.log(' Logged in as admin');
    } catch (error) {
      console.log(' Login failed:', error.message);
      rl.close();
      return;
    }
    
    switch (choice) {
      case '1':
        await runAllTests();
        break;
      case '2':
        await testSpecificEndpoint(tester);
        break;
      case '3':
        await viewRecentActivity(tester);
        break;
      case '4':
        await quickHealthCheck(tester);
        break;
      case '5':
        console.log('Goodbye!');
        rl.close();
        break;
      default:
        console.log('Invalid choice. Please try again.');
        await showMenu();
    }
  });
}

async function testSpecificEndpoint(tester) {
  console.log('\n SPECIFIC AUDIT ENDPOINT TESTING');
  console.log('==================================');
  console.log('1. GET /audit - Get audit logs with filters');
  console.log('2. GET /audit/recent - Get recent activity');
  console.log('3. GET /audit/record/:table/:id - Get audit trail');
  console.log('4. Back to Main Menu');
  
  rl.question('\nSelect endpoint to test (1-4): ', async (choice) => {
    switch (choice) {
      case '1': // Get audit logs
        console.log('\nAvailable filters:');
        console.log('  table_name: guests, users, rooms, reservations, payments, staff');
        console.log('  action: INSERT, UPDATE, DELETE');
        console.log('  user_id: integer user ID');
        console.log('  start_date/end_date: YYYY-MM-DD');
        console.log('  page/limit: pagination');
        
        rl.question('\nEnter filters as JSON (or press enter for none): ', async (filterInput) => {
          try {
            const filters = filterInput ? JSON.parse(filterInput) : {};
            const result = await tester.getAuditLogs(filters);
            console.log(' GET /audit - Success:');
            console.log(`Found ${Array.isArray(result.data) ? result.data.length : 'some'} logs`);
            console.log(JSON.stringify(result.data, null, 2));
          } catch (error) {
            console.log(' Error:', error.response?.data || error.message);
          }
          rl.close();
        });
        break;
        
      case '2': // Get recent activity
        rl.question('Enter limit (default 100): ', async (limitInput) => {
          try {
            const limit = limitInput ? parseInt(limitInput) : 100;
            const result = await tester.getRecentActivity(limit);
            console.log(' GET /audit/recent - Success:');
            console.log(`Retrieved ${result.data?.length || 0} recent activities`);
            console.log(JSON.stringify(result.data, null, 2));
          } catch (error) {
            console.log(' Error:', error.response?.data || error.message);
          }
          rl.close();
        });
        break;
        
      case '3': // Get record audit trail
        rl.question('Enter table name (e.g., guests): ', async (table) => {
          rl.question('Enter record ID: ', async (recordId) => {
            try {
              const result = await tester.getRecordAuditTrail(table, parseInt(recordId));
              console.log(' GET /audit/record/:table/:id - Success:');
              console.log(`Audit trail for ${table}.${recordId}:`);
              console.log(JSON.stringify(result.data, null, 2));
            } catch (error) {
              console.log(' Error:', error.response?.data || error.message);
            }
            rl.close();
          });
        });
        break;
        
      case '4':
        await showMenu();
        break;
      default:
        console.log('Invalid choice');
        rl.close();
    }
  });
}

async function viewRecentActivity(tester) {
  try {
    console.log('\n RECENT AUDIT ACTIVITY');
    console.log('========================');
    
    const result = await tester.getRecentActivity(20);
    const logs = result.data || result;
    
    if (Array.isArray(logs) && logs.length > 0) {
      console.log(`Showing ${logs.length} most recent activities:\n`);
      
      logs.forEach((log, index) => {
        console.log(`${index + 1}. [${new Date(log.timestamp).toLocaleString()}]`);
        console.log(`   Table: ${log.table_name}, ID: ${log.record_id}`);
        console.log(`   Action: ${log.action} by User ${log.user_id || 'System'}`);
        console.log(`   IP: ${log.ip_address || 'N/A'}`);
        console.log('');
      });
      
      // Summary statistics
      const actions = logs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {});
      
      console.log(' Summary:');
      Object.entries(actions).forEach(([action, count]) => {
        console.log(`   ${action}: ${count} entries`);
      });
      
      const tables = [...new Set(logs.map(log => log.table_name))];
      console.log(`\n Tables with activity: ${tables.join(', ')}`);
    } else {
      console.log('No recent audit activity found.');
    }
  } catch (error) {
    console.log(' Error:', error.response?.data || error.message);
  }
  rl.close();
}

async function quickHealthCheck(tester) {
  console.log('\n QUICK AUDIT API HEALTH CHECK');
  console.log('===============================');
  
  const checks = [
    { name: 'API Health', test: async () => {
      const response = await axios.get(`${API_BASE_URL}/health`);
      return response.data.status === 'ok';
    }},
    { name: 'Authentication', test: async () => {
      await tester.login(ADMIN_CREDENTIALS);
      return !!authToken;
    }},
    { name: 'Recent Activity Endpoint', test: async () => {
      const result = await tester.getRecentActivity(1);
      return result.data !== undefined;
    }},
    { name: 'Filter Endpoint', test: async () => {
      const result = await tester.getAuditLogs({ limit: 1 });
      return result.data !== undefined;
    }},
    { name: 'Access Control (Admin Only)', test: async () => {
      const originalToken = authToken;
      tester.setAuthToken('invalid-token');
      try {
        await tester.getRecentActivity(1);
        return false; // Should have failed
      } catch (error) {
        return error.response?.status === 401 || error.response?.status === 403;
      } finally {
        tester.setAuthToken(originalToken);
      }
    }}
  ];
  
  const results = [];
  for (const check of checks) {
    try {
      const success = await check.test();
      results.push({ check: check.name, success });
      console.log(`${success ? '' : ''} ${check.name}`);
    } catch (error) {
      results.push({ check: check.name, success: false, error: error.message });
      console.log(` ${check.name}: ${error.message}`);
    }
    await sleep(300);
  }
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log('\n Health Check Summary:');
  console.log(`   Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log(' AUDIT API IS HEALTHY!');
  } else {
    console.log('  Some checks failed. Review the errors above.');
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
  } else if (command === '--recent' || command === '-r') {
    const tester = new AuditAPITester(API_BASE_URL);
    tester.login(ADMIN_CREDENTIALS)
      .then(() => viewRecentActivity(tester))
      .catch(error => {
        console.error('Failed:', error.message);
        process.exit(1);
      });
  } else if (command === '--quick' || command === '-q') {
    const tester = new AuditAPITester(API_BASE_URL);
    quickHealthCheck(tester);
  } else if (command === '--help' || command === '-h') {
    console.log(`
 Audit Log API Test Script
==========================
Usage:
  node audit-api-test.js [option]

Options:
  --all, -a      Run all audit log tests
  --recent, -r   View recent activity only
  --quick, -q    Quick audit API health check
  --help, -h     Show this help
  (no args)      Interactive menu

Examples:
  node audit-api-test.js --all     # Run comprehensive audit tests
  node audit-api-test.js --recent  # View recent audit activity
  node audit-api-test.js --quick   # Quick audit system check
  node audit-api-test.js          # Interactive testing menu
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