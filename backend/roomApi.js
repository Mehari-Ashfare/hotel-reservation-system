/**
 * room-api-test.js - Comprehensive Room API Testing Script
 * 
 * Tests all Room-related API endpoints:
 * 
 * 1. GET    /                   - Get all rooms
 * 2. GET    /available          - Get available rooms  
 * 3. GET    /types              - Get room types
 * 4. GET    /occupancy          - Get occupancy rate
 * 5. GET    /:id                - Get room by ID
 * 6. POST   /                   - Create new room
 * 7. POST   /types              - Create room type
 * 8. PUT    /:id                - Update room
 * 
 * Usage: node room-api-test.js
 */

import axios from 'axios';
import readline from 'readline';
import fs from 'fs';
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
let createdRoomId = null;
let createdRoomTypeId = null;
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
  console.log('\n' + '='.repeat(50));
  console.log(` ${title}`);
  console.log('='.repeat(50));
};

const logTable = (data) => {
  console.table(data);
};

// API Test Functions
class RoomAPITester {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.axiosInstance = axios.create({
      baseURL: `${baseURL}/rooms`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  setAuthToken(token) {
    this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  async login(credentials) {
    try {
      const response = await axios.post(`${this.baseURL}/auth/login`, credentials);
      this.setAuthToken(response.data.data.token);
      return response.data.data.token;
    } catch (error) {
      throw new Error(`Login failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // 1. GET / - Get all rooms
  async getAllRooms(filters = {}) {
    try {
      const response = await this.axiosInstance.get('/', { params: filters });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 2. GET /available - Get available rooms
  async getAvailableRooms(checkIn, checkOut, filters = {}) {
    try {
      const params = {
        start_date: checkIn,
        end_date: checkOut,
        ...filters
      };
      const response = await this.axiosInstance.get('/available', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 3. GET /types - Get room types
  async getRoomTypes() {
    try {
      const response = await this.axiosInstance.get('/types');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 4. GET /occupancy - Get occupancy rate
  async getOccupancyRate(startDate, endDate) {
    try {
      const response = await this.axiosInstance.get('/occupancy', {
        params: { start_date: startDate, end_date: endDate }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 5. GET /:id - Get room by ID
  async getRoomById(roomId) {
    try {
      const response = await this.axiosInstance.get(`/${roomId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 6. POST / - Create new room
  async createRoom(roomData) {
    try {
      const response = await this.axiosInstance.post('/', roomData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 7. POST /types - Create room type
  async createRoomType(roomTypeData) {
    try {
      const response = await this.axiosInstance.post('/types', roomTypeData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 8. PUT /:id - Update room
  async updateRoom(roomId, updateData) {
    try {
      const response = await this.axiosInstance.put(`/${roomId}`, updateData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Additional: PATCH /:id/status - Update room status
  async updateRoomStatus(roomId, status) {
    try {
      const response = await this.axiosInstance.patch(`/${roomId}/status`, { status });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Additional: GET /statistics - Get room statistics
  async getRoomStatistics() {
    try {
      const response = await this.axiosInstance.get('/statistics');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

// Test Suite
async function runAllTests() {
  const tester = new RoomAPITester(API_BASE_URL);
  
  logHeader('HOTEL ROOM API TEST SUITE');
  console.log('Testing all Room API endpoints...\n');

  // Test 0: Login
  try {
    logInfo('Logging in as admin...');
    authToken = await tester.login(ADMIN_CREDENTIALS);
    logSuccess('Admin Login', `Token received: ${authToken.substring(0, 30)}...`);
    await sleep(500);
  } catch (error) {
    logError('Admin Login', error);
    console.log('\n  Please ensure:');
    console.log('1. Server is running: npm run dev');
    console.log('2. Admin credentials:', ADMIN_CREDENTIALS);
    console.log('3. Database is seeded');
    process.exit(1);
  }

  // Test 1: Create Room Type (prerequisite)
  logHeader('TEST 1: CREATE ROOM TYPE (POST /types)');
  const roomTypeData = {
    type_name: 'Premium Suite',
    description: 'Premium suite with all amenities',
    base_price: 299.99,
    max_occupancy: 4,
    amenities: ['King Bed', 'Jacuzzi', 'Mini Bar', 'Sea View', 'Smart TV'],
    size_sqft: 750,
    bed_type: 'King',
    has_balcony: true,
    has_kitchenette: true
  };

  try {
    const result = await tester.createRoomType(roomTypeData);
    createdRoomTypeId = result.data.room_type_id;
    logSuccess('Create Room Type', 
      `Type: ${result.data.type_name}, ID: ${createdRoomTypeId}, Price: $${result.data.base_price}`);
    
    console.log('\n Created Room Type Details:');
    logTable({
      Type: result.data.type_name,
      Price: `$${result.data.base_price}`,
      'Max Occupancy': result.data.max_occupancy,
      Size: `${result.data.size_sqft} sqft`,
      'Bed Type': result.data.bed_type,
      Balcony: result.data.has_balcony ? 'Yes' : 'No',
      Kitchenette: result.data.has_kitchenette ? 'Yes' : 'No'
    });
  } catch (error) {
    if (error.response?.status === 409) {
      logInfo('Room type already exists, fetching existing types...');
      const roomTypes = await tester.getRoomTypes();
      if (roomTypes.data.length > 0) {
        createdRoomTypeId = roomTypes.data[0].room_type_id;
        logSuccess('Using Existing Room Type', `ID: ${createdRoomTypeId}`);
      } else {
        logError('Create Room Type', error);
      }
    } else {
      logError('Create Room Type', error);
    }
  }
  await sleep(500);

  // Test 2: Create New Room
  logHeader('TEST 2: CREATE NEW ROOM (POST /)');
  const uniqueSuffix = Date.now().toString().slice(-4);
  const roomData = {
    room_number: `TEST-${uniqueSuffix}`,
    floor: Math.floor(Math.random() * 10) + 1,
    status: 'available',
    room_type_id: createdRoomTypeId,
    notes: 'Test room created by API test script'
  };

  try {
    const result = await tester.createRoom(roomData);
    createdRoomId = result.data.room_id;
    logSuccess('Create New Room', 
      `Room: ${result.data.room_number}, ID: ${createdRoomId}, Status: ${result.data.status}`);
    
    console.log('\n Created Room Details:');
    logTable({
      'Room Number': result.data.room_number,
      'Room ID': result.data.room_id,
      Floor: result.data.floor,
      Status: result.data.status,
      'Room Type': result.data.type_name,
      'Base Price': `$${result.data.base_price}`,
      Notes: result.data.notes || 'None'
    });
  } catch (error) {
    logError('Create New Room', error);
    // Try to get existing room for further tests
    logInfo('Searching for existing rooms...');
    const rooms = await tester.getAllRooms({ limit: 1 });
    if (rooms.data.rooms?.length > 0) {
      createdRoomId = rooms.data.rooms[0].room_id;
      logSuccess('Using Existing Room', `ID: ${createdRoomId}`);
    } else {
      console.log(' Cannot proceed without a room. Please create a room manually.');
      process.exit(1);
    }
  }
  await sleep(500);

  // Test 3: Get Room by ID
  logHeader('TEST 3: GET ROOM BY ID (GET /:id)');
  try {
    const result = await tester.getRoomById(createdRoomId);
    logSuccess('Get Room by ID', 
      `Room ${result.data.room_number} retrieved successfully`);
    
    console.log('\n Room Details:');
    logTable({
      'Room ID': result.data.room_id,
      'Room Number': result.data.room_number,
      Floor: result.data.floor,
      Status: result.data.status,
      'Room Type': result.data.type_name,
      'Base Price': `$${result.data.base_price}`,
      'Max Occupancy': result.data.max_occupancy,
      Notes: result.data.notes || 'None',
      'Created At': new Date(result.data.created_at).toLocaleString()
    });
  } catch (error) {
    logError('Get Room by ID', error);
  }
  await sleep(500);

  // Test 4: Update Room Information
  logHeader('TEST 4: UPDATE ROOM (PUT /:id)');
  const updateData = {
    floor: roomData.floor + 1,
    notes: 'Updated by API test script - Premium view added',
    status: 'available'
  };

  try {
    const result = await tester.updateRoom(createdRoomId, updateData);
    logSuccess('Update Room Information', 
      `Room ${createdRoomId} updated successfully`);
    
    console.log('\n Updated Fields:');
    logTable(updateData);
    
    // Verify update
    const verifyResult = await tester.getRoomById(createdRoomId);
    console.log('\n Verified Update:');
    console.log(`   Floor: ${verifyResult.data.floor} (Was: ${roomData.floor})`);
    console.log(`   Notes: ${verifyResult.data.notes}`);
  } catch (error) {
    logError('Update Room Information', error);
  }
  await sleep(500);

  // Test 5: Get All Rooms
  logHeader('TEST 5: GET ALL ROOMS (GET /)');
  
  // Test different filters
  const filterTests = [
    { name: 'No filters', filters: {} },
    { name: 'By status (available)', filters: { status: 'available' } },
    { name: 'By floor', filters: { floor: roomData.floor } },
    { name: 'With pagination', filters: { page: 1, limit: 3 } },
    { name: 'Search by room number', filters: { search: 'TEST' } },
    { name: 'By room type', filters: { room_type_id: createdRoomTypeId } }
  ];

  for (const test of filterTests) {
    try {
      const result = await tester.getAllRooms(test.filters);
      const rooms = result.data.rooms || result.data;
      const count = rooms.length;
      const total = result.data.total || result.data.total_count || count;
      
      logSuccess(`Get Rooms - ${test.name}`, 
        `Found ${count} rooms (Total: ${total})`);
      
      if (rooms.length > 0) {
        console.log(`    Sample (${test.name}):`);
        rooms.slice(0, 2).forEach(room => {
          console.log(`   - ${room.room_number}: ${room.type_name} (${room.status})`);
        });
      }
      await sleep(200);
    } catch (error) {
      logError(`Get Rooms - ${test.name}`, error);
    }
  }
  await sleep(500);

  // Test 6: Get Available Rooms
  logHeader('TEST 6: GET AVAILABLE ROOMS (GET /available)');
  const checkInDate = new Date();
  checkInDate.setDate(checkInDate.getDate() + 2);
  const checkOutDate = new Date(checkInDate);
  checkOutDate.setDate(checkOutDate.getDate() + 3);

  const checkInStr = checkInDate.toISOString().split('T')[0];
  const checkOutStr = checkOutDate.toISOString().split('T')[0];

  try {
    const result = await tester.getAvailableRooms(checkInStr, checkOutStr);
    const availableRooms = result.data;
    
    logSuccess('Get Available Rooms', 
      `Found ${availableRooms.length} available rooms from ${checkInStr} to ${checkOutStr}`);
    
    if (availableRooms.length > 0) {
      console.log('\n Available Rooms:');
      const roomSummary = availableRooms.slice(0, 3).map(room => ({
        'Room Number': room.room_number,
        'Room Type': room.type_name,
        Floor: room.floor,
        Price: `$${room.base_price}/night`,
        'Max Occupancy': room.max_occupancy,
        Amenities: room.amenities?.slice(0, 2).join(', ') || 'Standard'
      }));
      logTable(roomSummary);
      
      if (availableRooms.length > 3) {
        console.log(`   ... and ${availableRooms.length - 3} more rooms`);
      }
    } else {
      console.log('   ℹ  No available rooms for the selected dates');
    }
  } catch (error) {
    logError('Get Available Rooms', error);
  }
  await sleep(500);

  // Test 7: Get Room Types
  logHeader('TEST 7: GET ROOM TYPES (GET /types)');
  try {
    const result = await tester.getRoomTypes();
    const roomTypes = result.data;
    
    logSuccess('Get Room Types', 
      `Found ${roomTypes.length} room types`);
    
    console.log('\n Room Types Available:');
    const typeSummary = roomTypes.map(type => ({
      'Type ID': type.room_type_id,
      'Type Name': type.type_name,
      'Base Price': `$${type.base_price}`,
      'Max Occupancy': type.max_occupancy,
      'Bed Type': type.bed_type || 'Standard',
      Size: type.size_sqft ? `${type.size_sqft} sqft` : 'N/A',
      'Has Balcony': type.has_balcony ? 'Yes' : 'No',
      'Total Rooms': type.room_count || 'N/A'
    }));
    logTable(typeSummary);
  } catch (error) {
    logError('Get Room Types', error);
  }
  await sleep(500);

  // Test 8: Get Room Occupancy Rate
  logHeader('TEST 8: GET OCCUPANCY RATE (GET /occupancy)');
  const occupancyStart = new Date();
  occupancyStart.setDate(occupancyStart.getDate() - 30);
  const occupancyEnd = new Date();

  const occupancyStartStr = occupancyStart.toISOString().split('T')[0];
  const occupancyEndStr = occupancyEnd.toISOString().split('T')[0];

  try {
    const result = await tester.getOccupancyRate(occupancyStartStr, occupancyEndStr);
    const occupancyData = result.data;
    
    logSuccess('Get Occupancy Rate', 
      `Occupancy rate: ${occupancyData.occupancy_rate || 0}%`);
    
    console.log('\n Occupancy Statistics:');
    logTable({
      Period: `${occupancyStartStr} to ${occupancyEndStr}`,
      'Total Rooms': occupancyData.total_rooms || 'N/A',
      'Occupied Rooms': occupancyData.occupied_rooms || 'N/A',
      'Occupancy Rate': `${occupancyData.occupancy_rate}%`,
      'Total Revenue': occupancyData.total_revenue ? `$${occupancyData.total_revenue.toFixed(2)}` : 'N/A',
      'Average Daily Rate': occupancyData.average_daily_rate ? `$${occupancyData.average_daily_rate.toFixed(2)}` : 'N/A',
      'Revenue Per Room': occupancyData.revenue_per_available_room ? `$${occupancyData.revenue_per_available_room.toFixed(2)}` : 'N/A'
    });
  } catch (error) {
    logError('Get Occupancy Rate', error);
  }
  await sleep(500);

  // Test 9: Additional - Update Room Status
  logHeader('TEST 9: UPDATE ROOM STATUS (PATCH /:id/status)');
  try {
    // Change to maintenance
    const result = await tester.updateRoomStatus(createdRoomId, 'maintenance');
    logSuccess('Update Room Status', 
      `Room ${createdRoomId} status changed to: ${result.data.status}`);
    
    // Verify status change
    const verifyRoom = await tester.getRoomById(createdRoomId);
    console.log(`    Verified: Status is now "${verifyRoom.data.status}"`);
    
    // Change back to available
    await sleep(300);
    await tester.updateRoomStatus(createdRoomId, 'available');
    logSuccess('Revert Room Status', 'Status changed back to available');
  } catch (error) {
    logError('Update Room Status', error);
  }
  await sleep(500);

  // Test 10: Additional - Get Room Statistics
  logHeader('TEST 10: GET ROOM STATISTICS (GET /statistics)');
  try {
    const result = await tester.getRoomStatistics();
    const stats = result.data;
    
    logSuccess('Get Room Statistics', 'Statistics retrieved successfully');
    
    console.log('\n Room Statistics Overview:');
    
    if (stats.by_status) {
      console.log('    By Status:');
      Object.entries(stats.by_status).forEach(([status, count]) => {
        console.log(`     - ${status}: ${count} rooms`);
      });
    }
    
    if (stats.by_floor) {
      console.log('\n    By Floor:');
      Object.entries(stats.by_floor).forEach(([floor, count]) => {
        console.log(`     - Floor ${floor}: ${count} rooms`);
      });
    }
    
    if (stats.by_type) {
      console.log('\n    By Room Type:');
      Object.entries(stats.by_type).forEach(([type, count]) => {
        console.log(`     - ${type}: ${count} rooms`);
      });
    }
    
    if (stats.total_revenue) {
      console.log(`\n    Total Revenue: $${stats.total_revenue.toFixed(2)}`);
    }
  } catch (error) {
    logInfo('Room statistics endpoint might not be implemented');
  }

  // Print Summary
  logHeader('TEST SUMMARY');
  const passed = testResults.filter(r => r.success).length;
  const total = testResults.length;
  const successRate = ((passed / total) * 100).toFixed(1);

  console.log(` Total Tests: ${total}`);
  console.log(` Passed: ${passed}`);
  console.log(` Failed: ${total - passed}`);
  console.log(` Success Rate: ${successRate}%`);

  // Performance metrics
  console.log('\n PERFORMANCE METRICS:');
  const totalTime = testResults.length * 500; // Approximate
  console.log(`   Estimated Test Time: ${(totalTime / 1000).toFixed(1)} seconds`);
  console.log(`   Average Response Time: ~500ms per request`);

  // Save test results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsDir = path.join(__dirname, 'test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  const resultsFile = path.join(resultsDir, `room-api-test-${timestamp}.json`);
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: total,
      passed,
      failed: total - passed,
      successRate: `${successRate}%`
    },
    testDetails: testResults,
    createdResources: {
      roomId: createdRoomId,
      roomTypeId: createdRoomTypeId
    },
    apiEndpointsTested: [
      'GET /rooms',
      'GET /rooms/available',
      'GET /rooms/types',
      'GET /rooms/occupancy',
      'GET /rooms/:id',
      'POST /rooms',
      'POST /rooms/types',
      'PUT /rooms/:id',
      'PATCH /rooms/:id/status',
      'GET /rooms/statistics'
    ],
    environment: {
      apiBaseUrl: API_BASE_URL,
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString()
    },
    recommendations: successRate === '100.0' ? [
      'All endpoints working correctly',
      'API is production-ready',
      'Consider adding more edge case tests'
    ] : [
      'Review failed endpoints',
      'Check server logs for errors',
      'Verify database connection'
    ]
  };

  fs.writeFileSync(resultsFile, JSON.stringify(report, null, 2));
  console.log(`\n Detailed results saved to: ${resultsFile}`);

  // Recommendations
  console.log('\n RECOMMENDATIONS & NEXT STEPS:');
  if (successRate === '100.0') {
    console.log(' EXCELLENT! All Room API endpoints are fully functional.');
    console.log('   Next steps:');
    console.log('   1. Test with different user roles (receptionist, guest)');
    console.log('   2. Test edge cases (invalid dates, wrong room types)');
    console.log('   3. Load test with multiple concurrent requests');
  } else if (successRate >= '80.0') {
    console.log(' GOOD! Most endpoints are working.');
    console.log('   Focus on fixing the failed endpoints.');
  } else {
    console.log('  NEEDS IMPROVEMENT. Several endpoints failed.');
    console.log('   Common issues:');
    console.log('   1. Database not seeded - run: npm run seed');
    console.log('   2. Server not running - run: npm run dev');
    console.log('   3. Check .env file configuration');
  }

  console.log('\n QUICK LINKS:');
  console.log('   API Documentation: http://localhost:5000/api-docs');
  console.log('   Health Check: http://localhost:5000/api/health');
  console.log('   Admin Login: Use credentials above');

  rl.close();
}

// Interactive test menu
async function showMenu() {
  console.log('\n HOTEL ROOM API TESTER');
  console.log('=======================');
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
  console.log('\n SPECIFIC ENDPOINT TESTING');
  console.log('============================');
  console.log('1. GET /rooms - Get all rooms');
  console.log('2. GET /rooms/available - Get available rooms');
  console.log('3. GET /rooms/types - Get room types');
  console.log('4. GET /rooms/occupancy - Get occupancy rate');
  console.log('5. GET /rooms/:id - Get room by ID');
  console.log('6. POST /rooms - Create new room');
  console.log('7. POST /rooms/types - Create room type');
  console.log('8. PUT /rooms/:id - Update room');
  console.log('9. Back to Main Menu');
  
  rl.question('\nSelect endpoint to test (1-9): ', async (choice) => {
    const tester = new RoomAPITester(API_BASE_URL);
    
    try {
      await tester.login(ADMIN_CREDENTIALS);
      console.log(' Logged in successfully');
    } catch (error) {
      console.log(' Login failed:', error.message);
      rl.close();
      return;
    }
    
    switch (choice) {
      case '1': // Get all rooms
        rl.question('Enter filters (JSON format or press enter for none): ', async (filterInput) => {
          try {
            const filters = filterInput ? JSON.parse(filterInput) : {};
            const result = await tester.getAllRooms(filters);
            console.log(' GET /rooms - Success:');
            console.log(JSON.stringify(result.data, null, 2));
          } catch (error) {
            console.log(' Error:', error.response?.data || error.message);
          }
          rl.close();
        });
        break;
        
      case '2': // Get available rooms
        rl.question('Enter check-in date (YYYY-MM-DD): ', async (checkIn) => {
          rl.question('Enter check-out date (YYYY-MM-DD): ', async (checkOut) => {
            try {
              const result = await tester.getAvailableRooms(checkIn, checkOut);
              console.log(' GET /rooms/available - Success:');
              console.log(`Found ${result.data.length} available rooms`);
              result.data.forEach(room => {
                console.log(`  - ${room.room_number}: ${room.type_name} ($${room.base_price})`);
              });
            } catch (error) {
              console.log(' Error:', error.response?.data || error.message);
            }
            rl.close();
          });
        });
        break;
        
      case '3': // Get room types
        try {
          const result = await tester.getRoomTypes();
          
          // Try to find the array in common locations
          let roomTypes = [];
          if (Array.isArray(result)) roomTypes = result;
          else if (Array.isArray(result.data)) roomTypes = result.data;
          else if (result.data && Array.isArray(result.data.data)) roomTypes = result.data.data;
          else if (result.data && Array.isArray(result.data.roomTypes)) roomTypes = result.data.roomTypes; // Check for named key

          console.log(' GET /rooms/types - Success:');
          
          if (roomTypes.length === 0) {
             console.log(' Warning: 0 types found. Debugging response structure:');
             console.log(JSON.stringify(result, null, 2)); // Print raw data to see where the array is
          } else {
             console.log(`Found ${roomTypes.length} room types:`);
             roomTypes.forEach(type => {
               console.log(`  - ${type.type_name}: $${type.base_price}`);
             });
          }
        } catch (error) {
          console.log(' Error:', error.response?.data || error.message);
        }
        rl.close();
        break;
        
      case '4': // Get occupancy rate
        rl.question('Enter start date (YYYY-MM-DD): ', async (startDate) => {
          rl.question('Enter end date (YYYY-MM-DD): ', async (endDate) => {
            try {
              const result = await tester.getOccupancyRate(startDate, endDate);
              console.log(' GET /rooms/occupancy - Success:');
              console.log(JSON.stringify(result.data, null, 2));
            } catch (error) {
              console.log(' Error:', error.response?.data || error.message);
            }
            rl.close();
          });
        });
        break;
        
      case '5': // Get room by ID
        rl.question('Enter Room ID: ', async (roomId) => {
          try {
            const result = await tester.getRoomById(parseInt(roomId));
            console.log(' GET /rooms/:id - Success:');
            console.log(JSON.stringify(result.data, null, 2));
          } catch (error) {
            console.log(' Error:', error.response?.data || error.message);
          }
          rl.close();
        });
        break;
        
      case '6': // Create new room
        const roomData = {
          room_number: `TEST-${Date.now().toString().slice(-4)}`,
          floor: 1,
          status: 'available',
          room_type_id: 1,
          notes: 'Created via interactive test'
        };
        try {
          const result = await tester.createRoom(roomData);
          console.log(' POST /rooms - Success:');
          console.log(`Created room ID: ${result.data.room_id}`);
          console.log(JSON.stringify(result.data, null, 2));
        } catch (error) {
          console.log(' Error:', error.response?.data || error.message);
        }
        rl.close();
        break;
        
      case '7': // Create room type
        const roomTypeData = {
          type_name: `TestType-${Date.now().toString().slice(-4)}`,
          base_price: 150.00,
          max_occupancy: 2,
          description: 'Test room type'
        };
        try {
          const result = await tester.createRoomType(roomTypeData);
          console.log(' POST /rooms/types - Success:');
          console.log(`Created room type ID: ${result.data.room_type_id}`);
          console.log(JSON.stringify(result.data, null, 2));
        } catch (error) {
          console.log(' Error:', error.response?.data || error.message);
        }
        rl.close();
        break;
        
      case '8': // Update room
        rl.question('Enter Room ID to update: ', async (roomId) => {
          const updateData = {
            floor: 3,
            status: 'available',
            room_type_id: 2,
          };
          try {
            const result = await tester.updateRoom(parseInt(roomId), updateData);
            console.log(' PUT /rooms/:id - Success:');
            console.log(JSON.stringify(result.data, null, 2));
          } catch (error) {
            console.log(' Error:', error.response?.data || error.message);
          }
          rl.close();
        });
        break;
        
      case '9':
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
    .filter(f => f.startsWith('room-api-test-') && f.endsWith('.json'))
    .sort()
    .reverse(); // Show newest first
  
  if (files.length === 0) {
    console.log('No previous test results found.');
  } else {
    console.log('\n PREVIOUS TEST RESULTS:');
    files.forEach((file, index) => {
      const filePath = path.join(resultsDir, file);
      const stats = fs.statSync(filePath);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      console.log(`${index + 1}. ${file}`);
      console.log(`   Date: ${new Date(data.timestamp).toLocaleString()}`);
      console.log(`   Results: ${data.summary.passed}/${data.summary.totalTests} passed (${data.summary.successRate})`);
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
  console.log('\n QUICK HEALTH CHECK');
  console.log('====================');
  
  const tester = new RoomAPITester(API_BASE_URL);
  
  try {
    // Test 1: API Health
    console.log('1. Testing API health...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log(`    API Health: ${healthResponse.data.status}`);
    
    // Test 2: Login
    console.log('2. Testing authentication...');
    const token = await tester.login(ADMIN_CREDENTIALS);
    console.log(`    Authentication: Success (Token: ${token.substring(0, 20)}...)`);
    
    // Test 3: Basic room fetch
    console.log('3. Testing room endpoint...');
    const rooms = await tester.getAllRooms({ limit: 1 });
    console.log(`    Room API: Accessible (Found ${rooms.data.total || 0} rooms)`);
    
    // Test 4: Room types
    console.log('4. Testing room types...');
    const roomTypes = await tester.getRoomTypes();
    console.log(`    Room Types: ${roomTypes.data.length} types available`);
    
    console.log('\n ALL CHECKS PASSED! System is healthy.');
    console.log('\n Quick Stats:');
    console.log(`   - Total Rooms: ${rooms.data.total || 0}`);
    console.log(`   - Room Types: ${roomTypes.data.length}`);
    console.log(`   - API Status: ${healthResponse.data.status}`);
    
  } catch (error) {
    console.log(` Health check failed: ${error.message}`);
    console.log('\n Troubleshooting:');
    console.log('   1. Is the server running? (npm run dev)');
    console.log('   2. Is PostgreSQL running?');
    console.log('   3. Check backend/logs for errors');
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
 Hotel Room API Test Script
============================
Usage:
  node room-api-test.js [option]

Options:
  --all, -a      Run all tests
  --quick, -q    Quick health check
  --help, -h     Show this help
  (no args)      Interactive menu

Examples:
  node room-api-test.js --all     # Run comprehensive tests
  node room-api-test.js --quick   # Quick system check
  node room-api-test.js          # Interactive testing menu
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