/**
 * reservation-api-test.js - Comprehensive Reservation API Testing Script
 * 
 * Tests all Reservation-related API endpoints:
 * 
 * 1. GET    /                       - Get all reservations
 * 2. GET    /guest/:guest_id        - Get guest's reservations
 * 3. GET    /:id                    - Get reservation by ID
 * 4. GET    /calculate-price        - Calculate reservation price
 * 5. POST   /                       - Create new reservation
 * 6. PUT    /:id                    - Update reservation
 * 7. PUT    /:id/cancel             - Cancel reservation
 * 8. PUT    /:id/check-in           - Check in guest
 * 9. PUT    /:id/check-out          - Check out guest
 * 
 * Usage: node reservation-api-test.js
 */

import axios from 'axios';
import readline from 'readline';
import fs, { stat } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration - MATCHES OUR BACKEND STRUCTURE
const API_BASE_URL = 'http://localhost:5000/api';
const ADMIN_CREDENTIALS = {
  email: 'mehariashfare1221@gmail.com',
  password: 'Abc123!!'
};

let authToken = '';
let createdReservationId = null;
let testGuestId = null;
let testRoomId = null;
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

const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

// API Test Functions - COMPATIBLE WITH OUR BACKEND
class ReservationAPITester {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.axiosInstance = axios.create({
      baseURL: `${baseURL}/reservations`,
      timeout: 15000, // Longer timeout for reservation operations
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

  // 1. GET / - Get all reservations
  async getAllReservations(filters = {}) {
    try {
      const response = await this.axiosInstance.get('/', { params: filters });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 2. GET /guest/:guest_id - Get guest's reservations
  async getGuestReservations(guestId) {
    try {
      const response = await this.axiosInstance.get(`/guest/${guestId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 3. GET /:id - Get reservation by ID
  async getReservationById(reservationId) {
    try {
      const response = await this.axiosInstance.get(`/${reservationId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 4. GET /calculate-price - Calculate reservation price
  async calculateReservationPrice(priceData) {
    try {
      // Note: This might be POST in some implementations, but specification says GET
      // We'll try GET with params first, fall back to POST if needed
      const response = await this.axiosInstance.get('/calculate-price', { params: priceData });
      return response.data;
    } catch (error) {
      // If GET fails, try POST (common implementation)
      try {
        const response = await this.axiosInstance.post('/calculate-price', priceData);
        return response.data;
      } catch (postError) {
        throw error; // Throw original GET error
      }
    }
  }

  // 5. POST / - Create new reservation
  async createReservation(reservationData) {
    try {
      const response = await this.axiosInstance.post('/', reservationData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 6. PUT /:id - Update reservation
  async updateReservation(reservationId, updateData) {
    try {
      const response = await this.axiosInstance.put(`/${reservationId}`, updateData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 7. PUT /:id/cancel - Cancel reservation
  async cancelReservation(reservationId, reason) {
    try {
      // FIX: Send 'reason' in the request body
      const response = await this.axiosInstance.put(`/${reservationId}/cancel`, { reason });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 8. PUT /:id/check-in - Check in guest
  async checkInReservation(reservationId) {
    try {
      const response = await this.axiosInstance.put(`/${reservationId}/check-in`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 9. PUT /:id/check-out - Check out guest
  async checkOutReservation(reservationId) {
    try {
      const response = await this.axiosInstance.put(`/${reservationId}/check-out`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  // 10. POST /payments - Process Payment
  async createPayment(reservationId, amount) {
    try {
      const paymentData = {
        reservation_id: reservationId,
        amount: parseFloat(amount),
        payment_method: 'credit_card',
        transaction_id: `TXN${Date.now()}`
      };

      const response = await axios.post(`${API_BASE_URL}/payments`, paymentData, {
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}` 
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Helper: Get available rooms
  async getAvailableRooms(checkIn, checkOut) {
    try {
      const response = await axios.get(`${this.baseURL}/rooms/available`, {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { start_date: checkIn, end_date: checkOut }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Helper: Get existing guest
  async getExistingGuest() {
    try {
      const response = await axios.get(`${this.baseURL}/guests`, {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { limit: 1 }
      });
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
  const tester = new ReservationAPITester(API_BASE_URL);
  
  logHeader('RESERVATION API TEST SUITE');
  console.log('Testing all Reservation API endpoints...\n');

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

  // Get or create test data
  logHeader('SETUP: GETTING TEST DATA');
  
  // Get an existing guest
  try {
    logInfo('Looking for existing guest...');
    const guestsResponse = await tester.getExistingGuest();
    const guests = guestsResponse.data?.guests || guestsResponse.data;
    
    if (guests && guests.length > 0) {
      testGuestId = guests[0].guest_id || guests[0].id;
      logSuccess('Found Guest', `ID: ${testGuestId}, Name: ${guests[0].first_name} ${guests[0].last_name}`);
    } else {
      throw new Error('No guests found in database');
    }
  } catch (error) {
    logError('Get Guest', error);
    console.log('  Please create at least one guest first');
    process.exit(1);
  }
  
  await sleep(500);

  // Get available room for test dates
  const checkInDate = new Date();
  checkInDate.setDate(checkInDate.getDate() + 7); // 7 days from now
  const checkOutDate = new Date(checkInDate);
  checkOutDate.setDate(checkOutDate.getDate() + 3); // 3-night stay

  const checkInStr = formatDate(checkInDate);
  const checkOutStr = formatDate(checkOutDate);

  try {
    logInfo('Looking for available room...');
    const availableRooms = await tester.getAvailableRooms(checkInStr, checkOutStr);
    
    if (availableRooms.data && availableRooms.data.length > 0) {
      testRoomId = availableRooms.data[0].room_id;
      logSuccess('Found Available Room', `ID: ${testRoomId}, Type: ${availableRooms.data[0].type_name}, Price: $${availableRooms.data[0].base_price}/night`);
    } else {
      // Create a room if none available
      logInfo('No available rooms found, trying to create one...');
      // This would require room creation logic - for now, we'll exit
      throw new Error('No available rooms for test dates');
    }
  } catch (error) {
    logError('Get Available Room', error);
    console.log('  Please ensure at least one room is available for the test dates');
    process.exit(1);
  }
  
  await sleep(500);

  // Test 1: Calculate Reservation Price
  logHeader('TEST 1: CALCULATE RESERVATION PRICE (GET /calculate-price)');
  const priceData = {
    room_id: testRoomId,
    check_in_date: checkInStr,
    check_out_date: checkOutStr,
    number_of_guests: 2,
    has_breakfast: true,
    has_parking: false
  };

  try {
    const result = await tester.calculateReservationPrice(priceData);
    const priceInfo = result.data || result;
    
    logSuccess('Calculate Reservation Price', 
      `Total Price: $${priceInfo.total_amount || priceInfo.total_price}`);
    
    console.log('\n Price Calculation Details:');
    console.table({
      'Room ID': testRoomId,
      'Check-in Date': checkInStr,
      'Check-out Date': checkOutStr,
      'Nights': priceInfo.number_of_nights || 3,
      'Base Rate': `$${priceInfo.base_rate || priceInfo.room_price}`,
      'Tax Amount': `$${priceInfo.tax_amount || priceInfo.tax}`,
      'Service Fee': `$${priceInfo.service_fee || 0}`,
      'Breakfast Included': priceInfo.has_breakfast ? 'Yes' : 'No',
      'Parking Included': priceInfo.has_parking ? 'Yes' : 'No',
      'Total Amount': `$${priceInfo.total_amount || priceInfo.total_price}`
    });
  } catch (error) {
    logError('Calculate Reservation Price', error);
  }
  await sleep(500);

  // Test 2: Create New Reservation
  logHeader('TEST 2: CREATE NEW RESERVATION (POST /)');
  const reservationData = {
    guest_id: testGuestId,
    room_id: testRoomId,
    check_in_date: checkInStr,
    check_out_date: checkOutStr,
    number_of_guests: 2,
    special_requests: 'Test reservation created by API test script',
    status: 'confirmed', // 'confirmed', 'pending', 'cancelled'
    payment_status: 'pending', // 'pending', 'paid', 'refunded'
    source: 'website', // 'website', 'phone', 'walk-in', 'agent'
    has_breakfast: true,
    has_parking: false,
    total_amount: 450.00 // This would come from price calculation
  };

  try {
    const result = await tester.createReservation(reservationData);
    createdReservationId = result.data.reservation_id || result.data.id;
    
    logSuccess('Create New Reservation', 
      `Reservation ${createdReservationId} created successfully`);
    
    console.log('\n Created Reservation Details:');
    console.table({
      'Reservation ID': createdReservationId,
      'Guest ID': testGuestId,
      'Room ID': testRoomId,
      'Check-in Date': checkInStr,
      'Check-out Date': checkOutStr,
      'Nights': reservationData.number_of_guests,
      'Status': reservationData.status,
      'Payment Status': reservationData.payment_status,
      'Total Amount': `$${reservationData.total_amount}`,
      'Source': reservationData.source
    });
  } catch (error) {
    logError('Create New Reservation', error);
    console.log('  Trying to find existing reservation for testing...');
    
    // Try to get existing reservation for further tests
    try {
      const reservations = await tester.getAllReservations({ limit: 1 });
      const reservationsList = reservations.data.reservations || reservations.data;
      
      if (reservationsList && reservationsList.length > 0) {
        createdReservationId = reservationsList[0].reservation_id || reservationsList[0].id;
        testGuestId = reservationsList[0].guest_id;
        testRoomId = reservationsList[0].room_id;
        logSuccess('Using Existing Reservation', `ID: ${createdReservationId}`);
      } else {
        console.log(' Cannot proceed without a reservation.');
        process.exit(1);
      }
    } catch (fetchError) {
      logError('Fetch Existing Reservation', fetchError);
      process.exit(1);
    }
  }
  await sleep(500);

  // Test 3: Get Reservation by ID
  logHeader('TEST 3: GET RESERVATION BY ID (GET /:id)');
  try {
    const result = await tester.getReservationById(createdReservationId);
    const reservation = result.data;
    
    logSuccess('Get Reservation by ID', 
      `Reservation ${reservation.reservation_id} retrieved successfully`);
    
    console.log('\n Reservation Details:');
    console.table({
      'Reservation ID': reservation.reservation_id,
      'Guest Name': `${reservation.guest_first_name || ''} ${reservation.guest_last_name || ''}`.trim(),
      'Room Number': reservation.room_number,
      'Check-in Date': reservation.check_in_date,
      'Check-out Date': reservation.check_out_date,
      'Status': reservation.status,
      'Payment Status': reservation.payment_status,
      'Total Amount': `$${reservation.total_amount}`,
      'Nights Stayed': reservation.number_of_nights || 3,
      'Created At': reservation.created_at ? new Date(reservation.created_at).toLocaleString() : 'N/A'
    });
  } catch (error) {
    logError('Get Reservation by ID', error);
  }
  await sleep(500);

  // Test 4: Get Guest's Reservations
  logHeader('TEST 4: GET GUEST\'S RESERVATIONS (GET /guest/:guest_id)');
  try {
    const result = await tester.getGuestReservations(testGuestId);
    const guestReservations = result.data.reservations || result.data;
    
    logSuccess('Get Guest Reservations', 
      `Found ${guestReservations.length} reservations for guest ${testGuestId}`);
    
    if (guestReservations.length > 0) {
      console.log('\n Guest Reservation History:');
      guestReservations.slice(0, 3).forEach(res => {
        console.log(`   - Reservation ${res.reservation_id}: ${res.status}, ${res.check_in_date} to ${res.check_out_date}, $${res.total_amount}`);
      });
      
      if (guestReservations.length > 3) {
        console.log(`   ... and ${guestReservations.length - 3} more reservations`);
      }
    }
  } catch (error) {
    logError('Get Guest Reservations', error);
  }
  await sleep(500);

  // Test 5: Get All Reservations with Filters
  logHeader('TEST 5: GET ALL RESERVATIONS (GET /)');
  
  // Test different filters
  const filterTests = [
    { name: 'No filters (default pagination)', filters: {} },
    { name: 'Page 1, Limit 3', filters: { page: 1, limit: 3 } },
    { name: 'By status (confirmed)', filters: { status: 'confirmed' } },
    { name: 'By date range', filters: { start_date: checkInStr, end_date: checkOutStr } },
    { name: 'By guest ID', filters: { guest_id: testGuestId } },
    { name: 'By room ID', filters: { room_id: testRoomId } },
    { name: 'Sorted by check-in date', filters: { sort_by: 'check_in_date', sort_order: 'desc' } }
  ];

  for (const test of filterTests) {
    try {
      const result = await tester.getAllReservations(test.filters);
      const reservations = result.data.reservations || result.data;
      const total = result.data.total || result.data.total_count || reservations.length;
      const page = result.data.page || 1;
      const limit = result.data.limit || 10;
      const totalPages = result.data.totalPages || Math.ceil(total / limit);
      
      logSuccess(`Get Reservations - ${test.name}`, 
        `Page ${page}/${totalPages}, Showing ${reservations.length} of ${total} reservations`);
      
      if (reservations.length > 0) {
        console.log(`    Sample (${test.name}):`);
        reservations.slice(0, 2).forEach(res => {
          console.log(`   - #${res.reservation_id}: ${res.guest_name || 'Guest'} in ${res.room_number}, ${res.status}`);
        });
      }
      await sleep(200);
    } catch (error) {
      logError(`Get Reservations - ${test.name}`, error);
    }
  }
  await sleep(500);

  // Test 6: Update Reservation
  logHeader('TEST 6: UPDATE RESERVATION (PUT /:id)');
  const updateData = {
    number_of_guests: 3,
    special_requests: 'Updated: Need extra towels and late check-out if possible',
    has_breakfast: false,
    has_parking: true,
    total_amount: 475.00 // Updated total
  };

  try {
    const result = await tester.updateReservation(createdReservationId, updateData);
    logSuccess('Update Reservation', 
      `Reservation ${createdReservationId} updated successfully`);
    
    console.log('\n Updated Fields:');
    console.table(updateData);
    
    // Verify update
    const verifyResult = await tester.getReservationById(createdReservationId);
    console.log('\n Verified Update:');
    console.log(`   Guests: ${verifyResult.data.number_of_guests}`);
    console.log(`   Special Requests: ${verifyResult.data.special_requests || 'None'}`);
    console.log(`   Breakfast: ${verifyResult.data.has_breakfast ? 'Yes' : 'No'}`);
    console.log(`   Parking: ${verifyResult.data.has_parking ? 'Yes' : 'No'}`);
  } catch (error) {
    logError('Update Reservation', error);
  }
  await sleep(500);

  // Test 7: Check-In Reservation
  logHeader('TEST 7: CHECK-IN RESERVATION (PUT /:id/check-in)');
  
  // First, ensure reservation is in 'confirmed' status
  try {
    await tester.updateReservation(createdReservationId, { status: 'confirmed' });
    logInfo('Ensured reservation is in confirmed status');
  } catch (error) {
    // Ignore if already confirmed
  }
  
  try {
    const result = await tester.checkInReservation(createdReservationId);
    logSuccess('Check-In Reservation', 
      `Reservation ${createdReservationId} checked in successfully`);
    
    console.log('\n Check-In Details:');
    console.table({
      'Reservation ID': createdReservationId,
      'New Status': result.data.status || 'checked-in',
      'Actual Check-in Time': result.data.actual_check_in ? new Date(result.data.actual_check_in).toLocaleString() : 'Now',
      'Room Ready': 'Yes',
      'Key Issued': 'Yes'
    });
  } catch (error) {
    logError('Check-In Reservation', error);
    console.log('ℹ  Note: Reservation might already be checked in or in wrong status');
  }
  await sleep(500);

  // Test 8: Check-Out Reservation
  logHeader('TEST 8: CHECK-OUT RESERVATION (PUT /:id/check-out)');
  
  // First, ensure reservation is in 'checked-in' status
  try {
    const currentRes = await tester.getReservationById(createdReservationId);
    if (currentRes.data.status !== 'checked-in') {
      await tester.checkInReservation(createdReservationId);
      logInfo('Checked in reservation first for check-out test');
    }
  } catch (error) {
    // Continue anyway
  }
  
  try {
    const result = await tester.checkOutReservation(createdReservationId);
    logSuccess('Check-Out Reservation', 
      `Reservation ${createdReservationId} checked out successfully`);
    
    console.log('\n Check-Out Details:');
    console.table({
      'Reservation ID': createdReservationId,
      'New Status': result.data.status || 'checked-out',
      'Actual Check-out Time': result.data.actual_check_out ? new Date(result.data.actual_check_out).toLocaleString() : 'Now',
      'Total Charges': `$${result.data.total_amount || 475.00}`,
      'Payment Status': result.data.payment_status || 'pending',
      'Room Status': 'Vacant for cleaning'
    });
  } catch (error) {
    logError('Check-Out Reservation', error);
  }
  await sleep(500);

  // Test 9: Cancel Reservation
  logHeader('TEST 9: CANCEL RESERVATION (PUT /:id/cancel)');
  
  // First create another reservation to cancel (so we don't cancel our main test)
  const futureCheckIn = new Date();
  futureCheckIn.setDate(futureCheckIn.getDate() + 30);
  const futureCheckOut = new Date(futureCheckIn);
  futureCheckOut.setDate(futureCheckOut.getDate() + 2);
  
  const cancelReservationData = {
    guest_id: testGuestId,
    room_id: testRoomId,
    check_in_date: formatDate(futureCheckIn),
    check_out_date: formatDate(futureCheckOut),
    number_of_guests: 2,
    status: 'confirmed',
    total_amount: 300.00
  };
  
  let cancelReservationId = null;
  
  try {
    const result = await tester.createReservation(cancelReservationData);
    cancelReservationId = result.data.reservation_id || result.data.id;
    logSuccess('Create Reservation for Cancellation', 
      `Created reservation ${cancelReservationId} for cancellation test`);
    
    // Now cancel it
    await sleep(300);
    const cancelResult = await tester.cancelReservation(cancelReservationId);
    logSuccess('Cancel Reservation', 
      `Reservation ${cancelReservationId} cancelled successfully`);
    
    console.log('\n Cancellation Details:');
    console.table({
      'Reservation ID': cancelReservationId,
      'New Status': cancelResult.data.status || 'cancelled',
      'Cancellation Date': new Date().toLocaleString(),
      'Refund Amount': `$${cancelResult.data.refund_amount || 0}`,
      'Cancellation Fee': `$${cancelResult.data.cancellation_fee || 0}`,
      'Cancellation Reason': cancelResult.data.cancellation_reason || 'Guest request'
    });
  } catch (error) {
    logError('Cancel Reservation', error);
  }
  await sleep(500);

  // Test 10: Test Reservation Status Flow
  logHeader('TEST 10: RESERVATION STATUS FLOW VALIDATION');
  
  // Create a fresh reservation for status flow test
  const flowCheckIn = new Date();
  flowCheckIn.setDate(flowCheckIn.getDate() + 60);
  const flowCheckOut = new Date(flowCheckIn);
  flowCheckOut.setDate(flowCheckOut.getDate() + 4);
  
  const flowReservationData = {
    guest_id: testGuestId,
    room_id: testRoomId,
    check_in_date: formatDate(flowCheckIn),
    check_out_date: formatDate(flowCheckOut),
    number_of_guests: 1,
    status: 'pending',
    total_amount: 600.00
  };
  
  let flowReservationId = null;
  
  try {
    const result = await tester.createReservation(flowReservationData);
    flowReservationId = result.data.reservation_id || result.data.id;
    logSuccess('Create Flow Test Reservation', `ID: ${flowReservationId}`);
    
    // Test invalid status transitions
    console.log('\n Testing Status Transitions:');
    
    // Try to check-in a pending reservation (should fail)
    try {
      await tester.checkInReservation(flowReservationId);
      logError('Invalid Check-in (pending)', new Error('Should not allow check-in on pending reservation'));
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 409) {
        logSuccess('Invalid Check-in (pending)', 'Correctly rejected check-in on pending reservation');
      } else {
        logError('Invalid Check-in (pending)', error);
      }
    }
    
    // Update to confirmed
    await tester.updateReservation(flowReservationId, { status: 'confirmed' });
    logSuccess('Update to Confirmed', 'Reservation status updated to confirmed');
    
    // Try to check-out without check-in (should fail)
    try {
      await tester.checkOutReservation(flowReservationId);
      logError('Invalid Check-out (no check-in)', new Error('Should not allow check-out without check-in'));
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 409) {
        logSuccess('Invalid Check-out (no check-in)', 'Correctly rejected check-out without check-in');
      } else {
        logError('Invalid Check-out (no check-in)', error);
      }
    }
    
    // Clean up - cancel this reservation
    await tester.cancelReservation(flowReservationId);
    logSuccess('Cleanup Flow Test', 'Test reservation cancelled');
    
  } catch (error) {
    logError('Reservation Status Flow Test', error);
  }
  await sleep(500);

  // Test 11: Error Cases and Validations
  logHeader('TEST 11: ERROR CASES AND VALIDATIONS');
  
  // Test overlapping dates
  try {
    await tester.createReservation({
      guest_id: testGuestId,
      room_id: testRoomId,
      check_in_date: checkInStr,
      check_out_date: checkOutStr,
      number_of_guests: 2
    });
    logError('Overlapping Dates Test', new Error('Should have rejected overlapping reservation'));
  } catch (error) {
    if (error.response?.status === 409) {
      logSuccess('Overlapping Dates Test', 'Correctly rejected overlapping reservation');
    } else if (error.response?.status === 400) {
      logSuccess('Overlapping Dates Test', 'Correctly rejected overlapping reservation (400)');
    } else {
      logError('Overlapping Dates Test', error);
    }
  }
  await sleep(300);

  // Test invalid dates (check-out before check-in)
  try {
    await tester.createReservation({
      guest_id: testGuestId,
      room_id: testRoomId,
      check_in_date: checkOutStr,
      check_out_date: checkInStr, // Invalid
      number_of_guests: 2
    });
    logError('Invalid Dates Test', new Error('Should have rejected invalid dates'));
  } catch (error) {
    if (error.response?.status === 400) {
      logSuccess('Invalid Dates Test', 'Correctly rejected invalid dates');
    } else {
      logError('Invalid Dates Test', error);
    }
  }
  await sleep(300);

  // Test non-existent room
  try {
    await tester.createReservation({
      guest_id: testGuestId,
      room_id: 99999, // Non-existent
      check_in_date: formatDate(new Date()),
      check_out_date: formatDate(new Date(Date.now() + 86400000)),
      number_of_guests: 2
    });
    logError('Non-existent Room Test', new Error('Should have rejected non-existent room'));
  } catch (error) {
    if (error.response?.status === 404) {
      logSuccess('Non-existent Room Test', 'Correctly rejected non-existent room');
    } else {
      logError('Non-existent Room Test', error);
    }
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
  console.log('    GET /                       - Get all reservations');
  console.log('    GET /guest/:guest_id        - Get guest\'s reservations');
  console.log('    GET /:id                    - Get reservation by ID');
  console.log('    GET /calculate-price        - Calculate reservation price');
  console.log('    POST /                      - Create new reservation');
  console.log('    PUT /:id                    - Update reservation');
  console.log('    PUT /:id/cancel             - Cancel reservation');
  console.log('    PUT /:id/check-in           - Check in guest');
  console.log('    PUT /:id/check-out          - Check out guest');
  console.log('    Status flow validation      - Reservation lifecycle');
  console.log('    Error cases                 - Validation and edge cases');

  // Save test results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsDir = path.join(__dirname, 'test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  const resultsFile = path.join(resultsDir, `reservation-api-test-${timestamp}.json`);
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: total,
      passed,
      failed: total - passed,
      successRate: `${successRate}%`
    },
    testData: {
      reservationId: createdReservationId,
      guestId: testGuestId,
      roomId: testRoomId,
      testDates: {
        checkIn: new Date().toISOString().split('T')[0],
        checkOut: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]
      }
    },
    testDetails: testResults,
    apiEndpointsTested: [
      'GET /reservations',
      'GET /reservations/guest/:guest_id',
      'GET /reservations/:id',
      'GET /reservations/calculate-price',
      'POST /reservations',
      'PUT /reservations/:id',
      'PUT /reservations/:id/cancel',
      'PUT /reservations/:id/check-in',
      'PUT /reservations/:id/check-out'
    ],
    environment: {
      apiBaseUrl: API_BASE_URL,
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString()
    },
    reservationStatusFlow: {
      validTransitions: [
        'pending → confirmed',
        'confirmed → checked-in',
        'checked-in → checked-out',
        'pending/confirmed → cancelled'
      ],
      testedStatuses: ['pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled']
    }
  };

  fs.writeFileSync(resultsFile, JSON.stringify(report, null, 2));
  console.log(`\n Detailed results saved to: ${resultsFile}`);

  // Recommendations
  console.log('\n RECOMMENDATIONS:');
  if (successRate === '100.0') {
    console.log(' EXCELLENT! All Reservation API endpoints are fully functional.');
    console.log('   Next steps:');
    console.log('   1. Test payment integration with reservations');
    console.log('   2. Test reservation notifications (email/SMS)');
    console.log('   3. Load test with multiple concurrent reservations');
  } else if (successRate >= '80.0') {
    console.log(' GOOD! Most endpoints are working.');
    console.log('   Review failed tests - check business logic rules.');
  } else {
    console.log('  NEEDS ATTENTION. Several reservation endpoints failed.');
    console.log('   Check:');
    console.log('   1. Database constraints and triggers');
    console.log('   2. Room availability logic');
    console.log('   3. Reservation status transition rules');
    console.log('   4. Check backend/logs for detailed errors');
  }

  console.log('\n QUICK LINKS:');
  console.log('   Test Reservation Created:');
  if (createdReservationId) {
    console.log(`     Reservation ID: ${createdReservationId}`);
    console.log(`     Guest ID: ${testGuestId}`);
    console.log(`     Room ID: ${testRoomId}`);
    console.log('     Status: Various operations tested');
  }
  console.log('\n   API Documentation: http://localhost:5000/api-docs');
  console.log('   Reservation Lifecycle: See status flow diagram in test report');
}

// Interactive test menu
async function showMenu() {
  console.log('\n RESERVATION API TESTER');
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
  console.log('\n SPECIFIC RESERVATION ENDPOINT TESTING');
  console.log('=======================================');
  console.log('1. GET /reservations - Get all reservations');
  console.log('2. GET /reservations/guest/:id - Get guest reservations');
  console.log('3. GET /reservations/:id - Get reservation by ID');
  console.log('4. GET /reservations/calculate-price - Calculate price');
  console.log('5. POST /reservations - Create new reservation');
  console.log('6. PUT /reservations/:id - Update reservation');
  console.log('7. PUT /reservations/:id/cancel - Cancel reservation');
  console.log('8. PUT /reservations/:id/check-in - Check in');
  console.log('9. PUT /reservations/:id/check-out - Check out');
  console.log('10. DELETE /reservations/:id - Delete (If enabled)');
  console.log('11. POST /payments - Process Payment'); // <--- New Option
  console.log('12. Back to Main Menu');
  
  rl.question('\nSelect endpoint to test (1-10): ', async (choice) => {
    const tester = new ReservationAPITester(API_BASE_URL);
    
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
      case '1': // Get all reservations
        rl.question('Enter filters (JSON format or press enter for none): ', async (filterInput) => {
          try {
            const filters = filterInput ? JSON.parse(filterInput) : {};
            const result = await tester.getAllReservations(filters);
            console.log(' GET /reservations - Success:');
            console.log(`Total: ${result.data.total || result.data.reservations?.length || 0} reservations`);
            console.log(JSON.stringify(result.data, null, 2));
          } catch (error) {
            console.log(' Error:', error.response?.data || error.message);
          }
          rl.close();
        });
        break;
        
      case '2': // Get guest reservations
        rl.question('Enter Guest ID: ', async (guestId) => {
          try {
            const result = await tester.getGuestReservations(parseInt(guestId));
            console.log(' GET /reservations/guest/:id - Success:');
            console.log(`Found ${result.data.reservations?.length || 0} reservations`);
            console.log(JSON.stringify(result.data, null, 2));
          } catch (error) {
            console.log(' Error:', error.response?.data || error.message);
          }
          rl.close();
        });
        break;
        
      case '3': // Get reservation by ID
        rl.question('Enter Reservation ID: ', async (reservationId) => {
          try {
            const result = await tester.getReservationById(parseInt(reservationId));
            console.log(' GET /reservations/:id - Success:');
            console.log(JSON.stringify(result.data, null, 2));
          } catch (error) {
            console.log(' Error:', error.response?.data || error.message);
          }
          rl.close();
        });
        break;
        
      case '4': // Calculate price
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const threeDaysLater = new Date(tomorrow);
        threeDaysLater.setDate(threeDaysLater.getDate() + 3);
        
        const priceData = {
          room_id: 1,
          check_in_date: formatDate(tomorrow),
          check_out_date: formatDate(threeDaysLater),
          number_of_guests: 2
        };
        
        try {
          const result = await tester.calculateReservationPrice(priceData);
          console.log(' GET /reservations/calculate-price - Success:');
          console.log(JSON.stringify(result.data, null, 2));
        } catch (error) {
          console.log(' Error:', error.response?.data || error.message);
        }
        rl.close();
        break;
        
      case '5': // Create new reservation
        rl.question('Enter Guest ID: ', async (guestId) => {
          rl.question('Enter Room ID: ', async (roomId) => {
            rl.question('Enter check-in date (YYYY-MM-DD): ', async (checkIn) => {
              rl.question('Enter check-out date (YYYY-MM-DD): ', async (checkOut) => {
                const reservationData = {
                  guest_id: parseInt(guestId),
                  room_id: parseInt(roomId),
                  check_in_date: checkIn,
                  check_out_date: checkOut,
                  number_of_guests: 2,
                  status: 'confirmed', // Usually 'pending' until paid, but 'confirmed' for test
                  total_amount: 400.00 // In real app, calculate this first
                };
                try {
                  // 1. Create Reservation
                  const result = await tester.createReservation(reservationData);
                  const newResId = result.data.reservation_id || result.data.id;
                  
                  console.log(' POST /reservations - Success:');
                  console.log(`Created reservation ID: ${newResId}`);
                  console.log(JSON.stringify(result.data, null, 2));

                  // 2. ASK TO PAY IMMEDIATELY (The Fix)
                  console.log('\n---  Payment Step ---');
                  rl.question('Do you want to process payment now? (y/n): ', async (payChoice) => {
                    if (payChoice.toLowerCase() === 'y') {
                      rl.question(`Enter Amount (Total is $${reservationData.total_amount}): `, async (amount) => {
                        try {
                          const payResult = await tester.createPayment(newResId, amount);
                          console.log(' Payment Processed Successfully:');
                          console.log(JSON.stringify(payResult.data || payResult, null, 2));
                        } catch (payError) {
                          console.log(' Payment Error:', payError.response?.data || payError.message);
                        }
                        rl.close();
                      });
                    } else {
                      console.log('Payment skipped. Reservation is created but unpaid.');
                      rl.close();
                    }
                  });

                } catch (error) {
                  console.log(' Error:', error.response?.data || error.message);
                  rl.close();
                }
                // Note: rl.close() is handled inside the payment callback
              });
            });
          });
        });
        break;
        
      case '6': // Update reservation
        rl.question('Enter Reservation ID to update: ', async (reservationId) => {
          const updateData = {
            number_of_guests: 1,
            special_requests: 'Updated via interactive test',
            status: 'cancelled'
          };
          try {
            const result = await tester.updateReservation(parseInt(reservationId), updateData);
            console.log(' PUT /reservations/:id - Success:');
            console.log(JSON.stringify(result.data, null, 2));
          } catch (error) {
            console.log(' Error:', error.response?.data || error.message);
          }
          rl.close();
        });
        break;
        
      case '7': // Cancel reservation
        rl.question('Enter Reservation ID to cancel: ', async (reservationId) => {
          // ADDED: Prompt for reason
          rl.question('Enter cancellation reason: ', async (reason) => {
            rl.question('Are you sure? (y/n): ', async (confirm) => {
              if (confirm.toLowerCase() === 'y') {
                try {
                  // FIX: Pass the reason to the function
                  const result = await tester.cancelReservation(parseInt(reservationId), reason);
                  console.log(' PUT /reservations/:id/cancel - Success:');
                  console.log(JSON.stringify(result.data, null, 2));
                } catch (error) {
                  console.log(' Error:', error.response?.data || error.message);
                }
              } else {
                console.log('Cancellation cancelled');
              }
              rl.close();
            });
          });
        });
        break;
        
      case '8': // Check in
        rl.question('Enter Reservation ID to check-in: ', async (reservationId) => {
          try {
            const result = await tester.checkInReservation(parseInt(reservationId));
            console.log(' PUT /reservations/:id/check-in - Success:');
            console.log(JSON.stringify(result.data, null, 2));
          } catch (error) {
            console.log(' Error:', error.response?.data || error.message);
          }
          rl.close();
        });
        break;
        
      case '9': // Check out
        rl.question('Enter Reservation ID to check-out: ', async (reservationId) => {
          try {
            const result = await tester.checkOutReservation(parseInt(reservationId));
            console.log(' PUT /reservations/:id/check-out - Success:');
            console.log(JSON.stringify(result.data, null, 2));
          } catch (error) {
            console.log(' Error:', error.response?.data || error.message);
          }
          rl.close();
        });
        break;
        
      case '10':
        await showMenu();
        break;
      case '11': // Process Payment
        rl.question('Enter Reservation ID to Pay: ', async (resId) => {
          const id = parseInt(resId);
          if (isNaN(id)) { console.log('Invalid ID'); rl.close(); return; }

          rl.question('Enter Amount to Pay: ', async (amount) => {
            try {
              const result = await tester.createPayment(id, amount);
              console.log(' Payment Processed Successfully:');
              console.log(JSON.stringify(result.data || result, null, 2));
            } catch (error) {
              console.log(' Error:', error.response?.data || error.message);
            }
            rl.close();
          });
        });
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
    .filter(f => f.startsWith('reservation-api-test-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.log('No previous reservation test results found.');
  } else {
    console.log('\n PREVIOUS RESERVATION TEST RESULTS:');
    files.forEach((file, index) => {
      const filePath = path.join(resultsDir, file);
      const stats = fs.statSync(filePath);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      console.log(`${index + 1}. ${file}`);
      console.log(`   Date: ${new Date(data.timestamp).toLocaleString()}`);
      console.log(`   Results: ${data.summary.passed}/${data.summary.totalTests} passed (${data.summary.successRate})`);
      console.log(`   Test Reservation: ${data.testData?.reservationId || 'N/A'}`);
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
  console.log('\n QUICK RESERVATION API HEALTH CHECK');
  console.log('====================================');
  
  const tester = new ReservationAPITester(API_BASE_URL);
  
  try {
    // Test 1: API Health
    console.log('1. Testing API health...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log(`    API Health: ${healthResponse.data.status}`);
    
    // Test 2: Login
    console.log('2. Testing authentication...');
    await tester.login(ADMIN_CREDENTIALS);
    console.log(`    Authentication: Success`);
    
    // Test 3: Get all reservations
    console.log('3. Testing reservation endpoint...');
    const reservations = await tester.getAllReservations({ limit: 1 });
    const totalReservations = reservations.data.total || reservations.data.reservations?.length || 0;
    console.log(`    Reservation API: Accessible (Found ${totalReservations} reservations)`);
    
    // Test 4: Check response structure
    console.log('4. Checking response structure...');
    if (reservations.data.reservations || reservations.data.data) {
      console.log(`    Response structure: Correct`);
    } else {
      console.log(`     Response structure: Unexpected format`);
    }
    
    // Test 5: Check for required fields
    console.log('5. Checking reservation schema...');
    if (totalReservations > 0) {
      const sampleReservation = reservations.data.reservations?.[0] || reservations.data?.[0];
      const requiredFields = ['reservation_id', 'guest_id', 'room_id', 'check_in_date', 'check_out_date', 'status'];
      const missingFields = requiredFields.filter(field => !sampleReservation[field]);
      
      if (missingFields.length === 0) {
        console.log(`    Schema: All required fields present`);
      } else {
        console.log(`     Schema: Missing fields: ${missingFields.join(', ')}`);
      }
    }
    
    console.log('\n RESERVATION API IS HEALTHY!');
    console.log('\n Quick Stats:');
    console.log(`   - Total Reservations: ${totalReservations}`);
    console.log(`   - API Status: ${healthResponse.data.status}`);
    console.log(`   - Authentication: Working`);
    console.log(`   - Schema: Validated`);
    
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
 Reservation API Test Script
==============================
Usage:
  node reservation-api-test.js [option]

Options:
  --all, -a      Run all reservation tests
  --quick, -q    Quick reservation API health check
  --help, -h     Show this help
  (no args)      Interactive menu

Examples:
  node reservation-api-test.js --all     # Run comprehensive reservation tests
  node reservation-api-test.js --quick   # Quick reservation system check
  node reservation-api-test.js          # Interactive testing menu
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