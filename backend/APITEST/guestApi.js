/**
 * guest-api-test.js - Comprehensive Guest API Testing Script
 * 
 * Tests all Guest-related API endpoints:
 * 
 * 1. GET    /              - Get all guests (with pagination)
 * 2. GET    /search        - Search guests
 * 3. GET    /:id           - Get guest by ID
 * 4. POST   /              - Create new guest
 * 5. PUT    /:id           - Update guest
 * 6. DELETE /:id           - Delete guest
 * 
 * Usage: node guest-api-test.js
 */

import axios from 'axios';
import readline from 'readline';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration - MATCHES OUR BACKEND STRUCTURE
const API_BASE_URL = 'http://localhost:5000/api';
const ADMIN_CREDENTIALS = {
  email: 'admin@hotel.com',
  password: 'Admin123!'
};

let authToken = '';
let createdGuestId = null;
let testGuestEmail = '';
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

const logHeader = (title) => {
  console.log('\n' + '='.repeat(60));
  console.log(` ${title}`);
  console.log('='.repeat(60));
};

const generateTestEmail = () => {
  const timestamp = Date.now();
  return `guest${timestamp}@test.com`;
};

// API Test Functions - COMPATIBLE WITH OUR BACKEND
class GuestAPITester {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.axiosInstance = axios.create({
      baseURL: `${baseURL}/guests`,
      timeout: 10000,
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

  // 1. GET / - Get all guests (with pagination)
  async getAllGuests(filters = {}) {
    try {
      const response = await this.axiosInstance.get('/', { params: filters });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 2. GET /search - Search guests
  async searchGuests(searchParams) {
    try {
      const response = await this.axiosInstance.get('/search', { params: searchParams });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 3. GET /:id - Get guest by ID
  async getGuestById(guestId) {
    try {
      const response = await this.axiosInstance.get(`/${guestId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 4. POST / - Create new guest
  async createGuest(guestData) {
    try {
      const response = await this.axiosInstance.post('/', guestData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 5. PUT /:id - Update guest
  async updateGuest(guestId, updateData) {
    try {
      const response = await this.axiosInstance.put(`/${guestId}`, updateData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 6. DELETE /:id - Delete guest
  async deleteGuest(guestId) {
    try {
      const response = await this.axiosInstance.delete(`/${guestId}`);
      return response.data;
    } catch (error) {
      throw error;
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
  const tester = new GuestAPITester(API_BASE_URL);
  
  logHeader('GUEST API TEST SUITE');
  console.log('Testing all Guest API endpoints...\n');

  // Login first - OUR BACKEND REQUIRES AUTHENTICATION
  try {
    logInfo('Logging in as admin...');
    await tester.login(ADMIN_CREDENTIALS);
    logSuccess('Admin Login', `Token received: ${authToken.substring(0, 30)}...`);
    await sleep(500);
  } catch (error) {
    logError('Admin Login', error);
    console.log('\n  Please ensure:');
    console.log('1. Server is running: npm run dev');
    console.log('2. Database is seeded with admin user');
    console.log('3. Admin credentials:', ADMIN_CREDENTIALS);
    process.exit(1);
  }

  // Generate unique test guest email
  testGuestEmail = generateTestEmail();

  // Test 1: Create New Guest
  logHeader('TEST 1: CREATE NEW GUEST (POST /)');
  const guestData = {
    first_name: 'John',
    last_name: 'Doe',
    email: testGuestEmail,
    phone: '+1234567890',
    address: '123 Main Street, New York, NY 10001',
    guest_type: 'online',  // 'online' or 'walk-in' as per our schema
    date_of_birth: '1990-01-15',
    nationality: 'American',
    id_type: 'passport',  // 'passport', 'driver_license', 'id_card'
    id_number: 'P123456789',
    gender: 'male'  // 'male', 'female', 'other'
  };

  try {
    const result = await tester.createGuest(guestData);
    createdGuestId = result.data.guest_id || result.data.id;
    logSuccess('Create New Guest', 
      `Guest ${guestData.first_name} ${guestData.last_name} created successfully`);
    
    console.log('\n Created Guest Details:');
    console.table({
      'Guest ID': createdGuestId,
      'First Name': guestData.first_name,
      'Last Name': guestData.last_name,
      'Email': guestData.email,
      'Phone': guestData.phone,
      'Guest Type': guestData.guest_type,
      'ID Type': guestData.id_type,
      'ID Number': guestData.id_number,
      'Status': 'Active'
    });
  } catch (error) {
    logError('Create New Guest', error);
    console.log('  Trying to find existing guest for testing...');
    
    // Try to get existing guest for further tests
    try {
      const guests = await tester.getAllGuests({ limit: 1 });
      if (guests.data.guests?.length > 0) {
        createdGuestId = guests.data.guests[0].guest_id;
        logSuccess('Using Existing Guest', `ID: ${createdGuestId}`);
      } else {
        console.log(' Cannot proceed without a guest.');
        process.exit(1);
      }
    } catch (fetchError) {
      logError('Fetch Existing Guest', fetchError);
      process.exit(1);
    }
  }
  await sleep(500);

  // Test 2: Get Guest by ID
  logHeader('TEST 2: GET GUEST BY ID (GET /:id)');
  try {
    const result = await tester.getGuestById(createdGuestId);
    const guest = result.data;
    
    logSuccess('Get Guest by ID', 
      `Guest ${guest.first_name} ${guest.last_name} retrieved successfully`);
    
    console.log('\n Guest Details:');
    console.table({
      'Guest ID': guest.guest_id,
      'Full Name': `${guest.first_name} ${guest.last_name}`,
      'Email': guest.email,
      'Phone': guest.phone,
      'Address': guest.address,
      'Guest Type': guest.guest_type,
      'Nationality': guest.nationality,
      'Date of Birth': guest.date_of_birth,
      'ID Type': guest.id_type,
      'ID Number': guest.id_number,
      'Total Reservations': guest.total_reservations || 0,
      'Total Spent': guest.total_spent ? `$${guest.total_spent}` : '$0',
      'Created At': guest.created_at ? new Date(guest.created_at).toLocaleDateString() : 'N/A'
    });
  } catch (error) {
    logError('Get Guest by ID', error);
  }
  await sleep(500);

  // Test 3: Update Guest Information
  logHeader('TEST 3: UPDATE GUEST (PUT /:id)');
  const updateData = {
    first_name: 'Jonathan',
    phone: '+1987654321',
    address: '456 Broadway, New York, NY 10002',
    guest_type: 'walk-in',
    // Only include fields that exist in our schema
  };

  try {
    const result = await tester.updateGuest(createdGuestId, updateData);
    logSuccess('Update Guest Information', 
      `Guest ${createdGuestId} updated successfully`);
    
    console.log('\n Updated Fields:');
    console.table(updateData);
    
    // Verify update
    const verifyResult = await tester.getGuestById(createdGuestId);
    console.log('\n Verified Update:');
    console.log(`   Name: ${verifyResult.data.first_name} ${verifyResult.data.last_name}`);
    console.log(`   Phone: ${verifyResult.data.phone}`);
    console.log(`   Guest Type: ${verifyResult.data.guest_type}`);
  } catch (error) {
    logError('Update Guest Information', error);
    console.log('ℹ  Note: Check if all fields exist in your database schema');
  }
  await sleep(500);

  // Test 4: Get All Guests with Pagination
  logHeader('TEST 4: GET ALL GUESTS (GET /)');
  
  // Test different pagination and filters
  const paginationTests = [
    { name: 'No filters (default pagination)', filters: {} },
    { name: 'Page 1, Limit 3', filters: { page: 1, limit: 3 } },
    { name: 'By guest type (online)', filters: { guest_type: 'online' } },
    { name: 'By guest type (walk-in)', filters: { guest_type: 'walk-in' } },
    { name: 'Sorted by name', filters: { sort_by: 'last_name', sort_order: 'asc' } },
    { name: 'Search term in name', filters: { search: 'John' } }
  ];

  for (const test of paginationTests) {
    try {
      const result = await tester.getAllGuests(test.filters);
      const guests = result.data.guests || result.data;
      const total = result.data.total || result.data.total_count || guests.length;
      const page = result.data.page || 1;
      const limit = result.data.limit || 10;
      const totalPages = result.data.totalPages || Math.ceil(total / limit);
      
      logSuccess(`Get Guests - ${test.name}`, 
        `Page ${page}/${totalPages}, Showing ${guests.length} of ${total} guests`);
      
      if (guests.length > 0) {
        console.log(`    Sample (${test.name}):`);
        guests.slice(0, 2).forEach(guest => {
          console.log(`   - ${guest.first_name} ${guest.last_name}: ${guest.email} (${guest.guest_type})`);
        });
      }
      await sleep(200);
    } catch (error) {
      logError(`Get Guests - ${test.name}`, error);
    }
  }
  await sleep(500);

  // Test 5: Search Guests
  logHeader('TEST 5: SEARCH GUESTS (GET /search)');
  
  const searchTests = [
    { name: 'Search by name', params: { q: 'John' } },
    { name: 'Search by email', params: { q: testGuestEmail } },
    { name: 'Search by phone', params: { q: '1234567890' } },
    { name: 'Search with empty query', params: { q: '' } }
  ];

  for (const test of searchTests) {
    try {
      const result = await tester.searchGuests(test.params);
      const guests = result.data.guests || result.data;
      
      logSuccess(`Search Guests - ${test.name}`, 
        `Found ${guests.length} guests for query: "${test.params.q}"`);
      
      if (guests.length > 0) {
        console.log(`    Results (${test.name}):`);
        guests.slice(0, 2).forEach(guest => {
          console.log(`   - ${guest.first_name} ${guest.last_name} (${guest.email})`);
        });
      }
      await sleep(200);
    } catch (error) {
      logError(`Search Guests - ${test.name}`, error);
    }
  }
  await sleep(500);

  // Test 6: Create Additional Guest for Testing
  logHeader('TEST 6: CREATE ADDITIONAL GUEST');
  const additionalGuestData = {
    first_name: 'Jane',
    last_name: 'Smith',
    email: `jane${Date.now()}@test.com`,
    phone: '+15551234567',
    address: '789 Park Avenue, New York, NY 10003',
    guest_type: 'online',
    date_of_birth: '1985-07-22',
    nationality: 'British',
    id_type: 'passport',
    id_number: 'GB987654321',
    gender: 'female'
  };

  let additionalGuestId = null;
  try {
    const result = await tester.createGuest(additionalGuestData);
    additionalGuestId = result.data.guest_id || result.data.id;
    logSuccess('Create Additional Guest', 
      `Guest ${additionalGuestData.first_name} ${additionalGuestData.last_name} created`);
    
    console.log(`   Created with ID: ${additionalGuestId}`);
  } catch (error) {
    logError('Create Additional Guest', error);
  }
  await sleep(500);

  // Test 7: Test Edge Cases and Validations
  logHeader('TEST 7: VALIDATION TESTS');
  
  // Test duplicate email
  try {
    await tester.createGuest(guestData);
    logError('Duplicate Email Test', new Error('Should have rejected duplicate email'));
  } catch (error) {
    if (error.response?.status === 409) {
      logSuccess('Duplicate Email Test', 'Correctly rejected duplicate email');
    } else if (error.response?.status === 400) {
      logSuccess('Duplicate Email Test', 'Correctly rejected duplicate email (400)');
    } else {
      logError('Duplicate Email Test', error);
    }
  }
  await sleep(300);

  // Test invalid email format
  try {
    await tester.createGuest({
      ...guestData,
      email: 'invalid-email',
      first_name: 'Invalid',
      last_name: 'Email'
    });
    logError('Invalid Email Test', new Error('Should have rejected invalid email'));
  } catch (error) {
    if (error.response?.status === 400) {
      logSuccess('Invalid Email Test', 'Correctly rejected invalid email format');
    } else {
      logError('Invalid Email Test', error);
    }
  }
  await sleep(300);

  // Test missing required fields
  try {
    await tester.createGuest({
      first_name: 'Missing',
      last_name: 'Fields'
      // Missing email and phone
    });
    logError('Missing Fields Test', new Error('Should have rejected missing required fields'));
  } catch (error) {
    if (error.response?.status === 400) {
      logSuccess('Missing Fields Test', 'Correctly rejected incomplete data');
    } else {
      logError('Missing Fields Test', error);
    }
  }
  await sleep(500);

  // Test 8: Delete Guest (Cleanup)
  logHeader('TEST 8: DELETE GUEST (DELETE /:id)');
  
  if (additionalGuestId) {
    try {
      const result = await tester.deleteGuest(additionalGuestId);
      logSuccess('Delete Additional Guest', 
        `Guest ${additionalGuestId} deleted successfully`);
      
      // Verify deletion
      await sleep(300);
      try {
        await tester.getGuestById(additionalGuestId);
        logError('Deletion Verification', new Error('Guest should not exist after deletion'));
      } catch (error) {
        if (error.response?.status === 404) {
          logSuccess('Deletion Verification', 'Guest correctly not found after deletion');
        }
      }
    } catch (error) {
      logError('Delete Additional Guest', error);
    }
  } else {
    logInfo('No additional guest to delete (creation might have failed)');
  }
  
  // Test 9: Attempt to delete main test guest (Optional - comment out to keep data)
  logHeader('TEST 9: CLEANUP - DELETE MAIN TEST GUEST');
  rl.question('Delete main test guest? (y/n): ', async (answer) => {
    if (answer.toLowerCase() === 'y') {
      try {
        const result = await tester.deleteGuest(createdGuestId);
        logSuccess('Delete Main Test Guest', 
          `Guest ${createdGuestId} deleted successfully`);
        createdGuestId = null;
      } catch (error) {
        logError('Delete Main Test Guest', error);
      }
    } else {
      logInfo('Keeping test guest for future reference');
    }
    
    // Print Summary
    await printSummary();
    rl.close();
  });
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
  console.log('    GET /              - Get all guests (with pagination)');
  console.log('    GET /search        - Search guests');
  console.log('    GET /:id           - Get guest by ID');
  console.log('    POST /             - Create new guest');
  console.log('    PUT /:id           - Update guest');
  console.log('    DELETE /:id        - Delete guest');
  console.log('    Validation tests   - Edge cases and error handling');

  // Save test results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsDir = path.join(__dirname, 'test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  const resultsFile = path.join(resultsDir, `guest-api-test-${timestamp}.json`);
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: total,
      passed,
      failed: total - passed,
      successRate: `${successRate}%`
    },
    testData: {
      guestId: createdGuestId,
      guestEmail: testGuestEmail,
      guestKept: createdGuestId !== null
    },
    testDetails: testResults,
    apiEndpointsTested: [
      'GET /guests',
      'GET /guests/search',
      'GET /guests/:id',
      'POST /guests',
      'PUT /guests/:id',
      'DELETE /guests/:id'
    ],
    environment: {
      apiBaseUrl: API_BASE_URL,
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString()
    },
    schemaCompatibility: {
      testedFields: ['first_name', 'last_name', 'email', 'phone', 'address', 'guest_type', 'date_of_birth', 'nationality', 'id_type', 'id_number', 'gender'],
      requiredFields: ['first_name', 'last_name', 'email', 'phone'],
      guestTypes: ['online', 'walk-in'],
      idTypes: ['passport', 'driver_license', 'id_card']
    }
  };

  fs.writeFileSync(resultsFile, JSON.stringify(report, null, 2));
  console.log(`\n Detailed results saved to: ${resultsFile}`);

  // Recommendations
  console.log('\n RECOMMENDATIONS:');
  if (successRate === '100.0') {
    console.log(' EXCELLENT! All Guest API endpoints are fully functional and compatible.');
    console.log('   Next steps:');
    console.log('   1. Test with different user roles (receptionist vs admin)');
    console.log('   2. Test guest reservation history endpoints');
    console.log('   3. Load test with multiple concurrent guest creations');
  } else if (successRate >= '80.0') {
    console.log(' GOOD! Most endpoints are working.');
    console.log('   Review failed tests - check schema compatibility.');
  } else {
    console.log('  NEEDS ATTENTION. Several endpoints failed.');
    console.log('   Check:');
    console.log('   1. Database schema matches our field names');
    console.log('   2. Authentication is properly configured');
    console.log('   3. Required fields in guest creation');
    console.log('   4. Check backend/logs for detailed errors');
  }

  console.log('\n QUICK LINKS:');
  console.log('   Test Guest Created:');
  if (createdGuestId) {
    console.log(`     Guest ID: ${createdGuestId}`);
    console.log(`     Email: ${testGuestEmail}`);
    console.log('     Status: Still in database (not deleted)');
  } else {
    console.log('     Test guest was deleted');
  }
  console.log('\n   API Documentation: http://localhost:5000/api-docs');
  console.log('   Database Schema: Check ../database/schema.sql for field names');
}

// Interactive test menu
async function showMenu() {
  console.log('\n GUEST API TESTER');
  console.log('==================');
  console.log('1. Run All Tests');
  console.log('2. Test Specific Endpoint');
  console.log('3. View Previous Results');
  console.log('4. Quick Health Check');
  console.log('5. Exit');
  
  rl.question('\nSelect option (1-5): ', async (choice) => {
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
  console.log('\n SPECIFIC GUEST ENDPOINT TESTING');
  console.log('==================================');
  console.log('1. GET /guests - Get all guests');
  console.log('2. GET /guests/search - Search guests');
  console.log('3. GET /guests/:id - Get guest by ID');
  console.log('4. POST /guests - Create new guest');
  console.log('5. PUT /guests/:id - Update guest');
  console.log('6. DELETE /guests/:id - Delete guest');
  console.log('7. Back to Main Menu');
  
  rl.question('\nSelect endpoint to test (1-7): ', async (choice) => {
    const tester = new GuestAPITester(API_BASE_URL);
    
    // Login first
    try {
      await tester.login(ADMIN_CREDENTIALS);
      console.log(' Logged in successfully');
    } catch (error) {
      console.log(' Login failed:', error.message);
      rl.close();
      return;
    }
    
    switch (choice) {
      case '1': // Get all guests
        rl.question('Enter filters (JSON format or press enter for none): ', async (filterInput) => {
          try {
            const filters = filterInput ? JSON.parse(filterInput) : {};
            const result = await tester.getAllGuests(filters);
            console.log(' GET /guests - Success:');
            console.log(`Total: ${result.data.total || result.data.guests?.length || 0} guests`);
            console.log(JSON.stringify(result.data, null, 2));
          } catch (error) {
            console.log(' Error:', error.response?.data || error.message);
          }
          rl.close();
        });
        break;
        
      case '2': // Search guests
        rl.question('Enter search query: ', async (query) => {
          try {
            // CHANGE THIS LINE: Use 'query' instead of 'q'
            const result = await tester.searchGuests({ query: query });
            console.log(' GET /guests/search - Success:');
            console.log(`Found ${result.data.guests?.length || 0} guests`);
            console.log(JSON.stringify(result.data, null, 2));
          } catch (error) {
            console.log(' Error:', error.response?.data || error.message);
          }
          rl.close();
        });
        break;
        
      case '3': // Get guest by ID
        rl.question('Enter Guest ID: ', async (guestId) => {
          try {
            const result = await tester.getGuestById(parseInt(guestId));
            console.log(' GET /guests/:id - Success:');
            console.log(JSON.stringify(result.data, null, 2));
          } catch (error) {
            console.log(' Error:', error.response?.data || error.message);
          }
          rl.close();
        });
        break;
        
      case '4': // Create new guest
        const guestData = {
          first_name: 'Test',
          last_name: 'Guest',
          email: `test.guest.${Date.now()}@test.com`,
          phone: '+1234567890',
          address: '123 Test Street',
          guest_type: 'walk-in',
        };
        try {
          const result = await tester.createGuest(guestData);
          console.log(' POST /guests - Success:');
          console.log(`Created guest ID: ${result.data.guest_id || result.data.id}`);
          console.log(JSON.stringify(result.data, null, 2));
        } catch (error) {
          console.log(' Error:', error.response?.data || error.message);
        }
        rl.close();
        break;
        
      case '5': // Update guest
        rl.question('Enter Guest ID to update: ', async (guestId) => {
          const updateData = {
            phone: '+1987654345',
            address: 'Updated Address',
            guest_type: 'walk-in'
          };
          try {
            const result = await tester.updateGuest(parseInt(guestId), updateData);
            console.log(' PUT /guests/:id - Success:');
            console.log(JSON.stringify(result.data, null, 2));
          } catch (error) {
            console.log(' Error:', error.response?.data || error.message);
          }
          rl.close();
        });
        break;
        
      case '6': // Delete guest
        rl.question('Enter Guest ID to delete: ', async (guestId) => {
          rl.question('Are you sure? (y/n): ', async (confirm) => {
            if (confirm.toLowerCase() === 'y') {
              try {
                const result = await tester.deleteGuest(parseInt(guestId));
                console.log(' DELETE /guests/:id - Success:');
                console.log(JSON.stringify(result, null, 2));
              } catch (error) {
                console.log(' Error:', error.response?.data || error.message);
              }
            } else {
              console.log('Deletion cancelled');
            }
            rl.close();
          });
        });
        break;
        
      case '7':
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
    .filter(f => f.startsWith('guest-api-test-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.log('No previous guest test results found.');
  } else {
    console.log('\n PREVIOUS GUEST TEST RESULTS:');
    files.forEach((file, index) => {
      const filePath = path.join(resultsDir, file);
      const stats = fs.statSync(filePath);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      console.log(`${index + 1}. ${file}`);
      console.log(`   Date: ${new Date(data.timestamp).toLocaleString()}`);
      console.log(`   Results: ${data.summary.passed}/${data.summary.totalTests} passed (${data.summary.successRate})`);
      console.log(`   Test Guest: ${data.testData?.guestEmail || 'N/A'}`);
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
  console.log('\n QUICK GUEST API HEALTH CHECK');
  console.log('===============================');
  
  const tester = new GuestAPITester(API_BASE_URL);
  
  try {
    // Test 1: API Health
    console.log('1. Testing API health...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log(`    API Health: ${healthResponse.data.status}`);
    
    // Test 2: Login
    console.log('2. Testing authentication...');
    await tester.login(ADMIN_CREDENTIALS);
    console.log(`    Authentication: Success`);
    
    // Test 3: Get all guests
    console.log('3. Testing guest endpoint...');
    const guests = await tester.getAllGuests({ limit: 1 });
    const totalGuests = guests.data.total || guests.data.guests?.length || 0;
    console.log(`    Guest API: Accessible (Found ${totalGuests} guests)`);
    
    // Test 4: Check response structure
    console.log('4. Checking response structure...');
    if (guests.data.guests || guests.data.data) {
      console.log(`    Response structure: Correct`);
    } else {
      console.log(`     Response structure: Unexpected format`);
    }
    
    console.log('\n GUEST API IS HEALTHY!');
    console.log('\n Quick Stats:');
    console.log(`   - Total Guests: ${totalGuests}`);
    console.log(`   - API Status: ${healthResponse.data.status}`);
    console.log(`   - Authentication: Working`);
    
  } catch (error) {
    console.log(` Health check failed: ${error.message}`);
    console.log('\n Troubleshooting:');
    console.log('   1. Is the server running? (npm run dev)');
    console.log('   2. Is the database seeded? (npm run seed)');
    console.log('   3. Check authentication credentials');
    console.log('   4. Check backend/logs for errors');
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
  } else if (command === '--help' || command === '-h') {
    console.log(`
 Guest API Test Script
========================
Usage:
  node guest-api-test.js [option]

Options:
  --all, -a      Run all guest tests
  --quick, -q    Quick guest API health check
  --help, -h     Show this help
  (no args)      Interactive menu

Examples:
  node guest-api-test.js --all     # Run comprehensive guest tests
  node guest-api-test.js --quick   # Quick guest system check
  node guest-api-test.js          # Interactive testing menu
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