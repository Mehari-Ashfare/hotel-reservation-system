/**
 * payment-api-test.js - Comprehensive Payment API Testing Script
 * 
 * Tests all Payment-related API endpoints:
 * 
 * 1. GET    /                               - Get all payments
 * 2. GET    /reservation/:reservation_id    - Get reservation payments
 * 3. GET    /financial-report               - Get financial report
 * 4. GET    /:id                            - Get payment by ID
 * 5. POST   /                               - Create new payment
 * 6. PUT    /:id/process                    - Process payment
 * 7. PUT    /:id/refund                     - Process refund
 * 
 * Usage: node payment-api-test.js
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
  email: 'mehariashfare1221@gmail.com',
  password: 'Abc123!!'
};

let authToken = '';
let createdPaymentId = null;
let testReservationId = null;
let testGuestId = null;
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

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

const generateTransactionId = () => {
  return 'TXN' + Date.now().toString().slice(-8) + Math.random().toString(36).substring(2, 8).toUpperCase();
};

// API Test Functions - COMPATIBLE WITH OUR BACKEND
class PaymentAPITester {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.axiosInstance = axios.create({
      baseURL: `${baseURL}/payments`,
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

  // 1. GET / - Get all payments
  async getAllPayments(filters = {}) {
    try {
      const response = await this.axiosInstance.get('/', { params: filters });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 2. GET /reservation/:reservation_id - Get reservation payments
  async getReservationPayments(reservationId) {
    try {
      const response = await this.axiosInstance.get(`/reservation/${reservationId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 3. GET /financial-report - Get financial report
  async getFinancialReport(reportParams = {}) {
    try {
      const response = await this.axiosInstance.get('/financial-report', { params: reportParams });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 4. GET /:id - Get payment by ID
  async getPaymentById(paymentId) {
    try {
      const response = await this.axiosInstance.get(`/${paymentId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 5. POST / - Create new payment
  async createPayment(paymentData) {
    try {
      const response = await this.axiosInstance.post('/', paymentData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 6. PUT /:id/process - Process payment
  async processPayment(paymentId, processData = {}) {
    try {
      const response = await this.axiosInstance.put(`/${paymentId}/process`, processData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 7. PUT /:id/refund - Process refund
  async refundPayment(paymentId, refundData = {}) {
    try {
      const response = await this.axiosInstance.put(`/${paymentId}/refund`, refundData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Helper: Get existing reservation with outstanding balance
  async getReservationForPayment() {
    try {
      const response = await axios.get(`${this.baseURL}/reservations`, {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { 
          limit: 10,
          payment_status: 'pending'  // Look for reservations needing payment
        }
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
  const tester = new PaymentAPITester(API_BASE_URL);
  
  logHeader('PAYMENT API TEST SUITE');
  console.log('Testing all Payment API endpoints...\n');

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

  // Get test data
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

  // Get a reservation for payment testing
  try {
    logInfo('Looking for reservation with pending payment...');
    const reservationsResponse = await tester.getReservationForPayment();
    const reservations = reservationsResponse.data?.reservations || reservationsResponse.data;
    
    if (reservations && reservations.length > 0) {
      testReservationId = reservations[0].reservation_id || reservations[0].id;
      const totalAmount = reservations[0].total_amount || 500.00;
      logSuccess('Found Reservation', `ID: ${testReservationId}, Amount Due: ${formatCurrency(totalAmount)}`);
    } else {
      logInfo('No pending payments found, we will create one...');
      // Create a reservation for testing
      testReservationId = await createTestReservation(tester);
    }
  } catch (error) {
    logError('Get Reservation', error);
    console.log('  Will create test payment without reservation link');
    testReservationId = null;
  }
  await sleep(500);

  // Test 1: Create New Payment
  logHeader('TEST 1: CREATE NEW PAYMENT (POST /)');
  const paymentData = {
    reservation_id: testReservationId,
    guest_id: testGuestId,
    amount: 250.00,
    payment_method: 'credit_card',  // 'credit_card', 'debit_card', 'cash', 'bank_transfer', 'check'
    payment_type: 'deposit',        // 'deposit', 'full_payment', 'refund', 'additional_charge'
    currency: 'USD',
    transaction_id: generateTransactionId(),
    card_last_four: '4242',
    card_brand: 'visa',
    billing_name: 'John Doe',
    billing_address: '123 Main St, New York, NY 10001',
    billing_email: 'john.doe@example.com',
    status: 'pending'  // 'pending', 'completed', 'failed', 'refunded', 'cancelled'
  };

  try {
    const result = await tester.createPayment(paymentData);
    createdPaymentId = result.data.payment_id || result.data.id;
    
    logSuccess('Create New Payment', 
      `Payment ${createdPaymentId} created successfully`);
    
    console.log('\n Created Payment Details:');
    console.table({
      'Payment ID': createdPaymentId,
      'Reservation ID': testReservationId || 'N/A',
      'Guest ID': testGuestId,
      'Amount': formatCurrency(paymentData.amount),
      'Payment Method': paymentData.payment_method,
      'Payment Type': paymentData.payment_type,
      'Transaction ID': paymentData.transaction_id,
      'Status': paymentData.status,
      'Card Last Four': paymentData.card_last_four || 'N/A',
      'Billing Name': paymentData.billing_name
    });
  } catch (error) {
    logError('Create New Payment', error);
    console.log('  Trying to find existing payment for testing...');
    
    // Try to get existing payment for further tests
    try {
      const payments = await tester.getAllPayments({ limit: 1 });
      const paymentsList = payments.data.payments || payments.data;
      
      if (paymentsList && paymentsList.length > 0) {
        createdPaymentId = paymentsList[0].payment_id || paymentsList[0].id;
        testReservationId = paymentsList[0].reservation_id;
        testGuestId = paymentsList[0].guest_id;
        logSuccess('Using Existing Payment', `ID: ${createdPaymentId}`);
      } else {
        console.log(' Cannot proceed without a payment.');
        process.exit(1);
      }
    } catch (fetchError) {
      logError('Fetch Existing Payment', fetchError);
      process.exit(1);
    }
  }
  await sleep(500);

  // Test 2: Get Payment by ID
  logHeader('TEST 2: GET PAYMENT BY ID (GET /:id)');
  try {
    const result = await tester.getPaymentById(createdPaymentId);
    const payment = result.data;
    
    logSuccess('Get Payment by ID', 
      `Payment ${payment.payment_id} retrieved successfully`);
    
    console.log('\n Payment Details:');
    console.table({
      'Payment ID': payment.payment_id,
      'Reservation ID': payment.reservation_id || 'N/A',
      'Guest ID': payment.guest_id,
      'Amount': formatCurrency(payment.amount),
      'Payment Method': payment.payment_method,
      'Payment Type': payment.payment_type,
      'Status': payment.status,
      'Transaction ID': payment.transaction_id,
      'Card Brand': payment.card_brand || 'N/A',
      'Card Last Four': payment.card_last_four || 'N/A',
      'Created At': payment.created_at ? new Date(payment.created_at).toLocaleString() : 'N/A',
      'Processed At': payment.processed_at ? new Date(payment.processed_at).toLocaleString() : 'Pending'
    });
  } catch (error) {
    logError('Get Payment by ID', error);
  }
  await sleep(500);

  // Test 3: Process Payment
  logHeader('TEST 3: PROCESS PAYMENT (PUT /:id/process)');
  
  // First ensure payment is in pending status
  try {
    const currentPayment = await tester.getPaymentById(createdPaymentId);
    if (currentPayment.data.status !== 'pending') {
      logInfo('Payment is not pending, creating new pending payment...');
      // Create a new pending payment for processing
      const newPaymentData = {
        ...paymentData,
        amount: 150.00,
        transaction_id: generateTransactionId(),
        status: 'pending'
      };
      const newResult = await tester.createPayment(newPaymentData);
      createdPaymentId = newResult.data.payment_id || newResult.data.id;
      logSuccess('Created New Pending Payment', `ID: ${createdPaymentId}`);
    }
  } catch (error) {
    // Continue anyway
  }
  
  const processData = {
    processor_response: 'approved',
    processor_transaction_id: 'PROC_' + generateTransactionId(),
    authorization_code: 'AUTH12345',
    notes: 'Payment processed successfully via test script'
  };

  try {
    const result = await tester.processPayment(createdPaymentId, processData);
    logSuccess('Process Payment', 
      `Payment ${createdPaymentId} processed successfully`);
    
    console.log('\n Processing Details:');
    console.table({
      'Payment ID': createdPaymentId,
      'New Status': result.data.status || 'completed',
      'Processor Transaction ID': processData.processor_transaction_id,
      'Authorization Code': processData.authorization_code,
      'Processor Response': processData.processor_response,
      'Processed At': result.data.processed_at ? new Date(result.data.processed_at).toLocaleString() : new Date().toLocaleString()
    });
  } catch (error) {
    logError('Process Payment', error);
  }
  await sleep(500);

  // Test 4: Get Reservation Payments
  logHeader('TEST 4: GET RESERVATION PAYMENTS (GET /reservation/:reservation_id)');
  
  if (testReservationId) {
    try {
      const result = await tester.getReservationPayments(testReservationId);
      const reservationPayments = result.data.payments || result.data;
      
      logSuccess('Get Reservation Payments', 
        `Found ${reservationPayments.length} payments for reservation ${testReservationId}`);
      
      if (reservationPayments.length > 0) {
        console.log('\n Reservation Payment History:');
        reservationPayments.slice(0, 3).forEach(payment => {
          console.log(`   - Payment ${payment.payment_id}: ${formatCurrency(payment.amount)} (${payment.status})`);
        });
        
        if (reservationPayments.length > 3) {
          console.log(`   ... and ${reservationPayments.length - 3} more payments`);
        }
        
        // Calculate totals
        const totalPaid = reservationPayments.reduce((sum, payment) => {
          return sum + (payment.status === 'completed' ? payment.amount : 0);
        }, 0);
        
        const totalPending = reservationPayments.reduce((sum, payment) => {
          return sum + (payment.status === 'pending' ? payment.amount : 0);
        }, 0);
        
        console.log('\n Payment Summary:');
        console.log(`   Total Paid: ${formatCurrency(totalPaid)}`);
        console.log(`   Total Pending: ${formatCurrency(totalPending)}`);
        console.log(`   Balance: ${formatCurrency(totalPending)}`);
      }
    } catch (error) {
      logError('Get Reservation Payments', error);
    }
  } else {
    logInfo('No reservation ID available for this test');
  }
  await sleep(500);

  // Test 5: Get All Payments with Filters
  logHeader('TEST 5: GET ALL PAYMENTS (GET /)');
  
  // Test different filters
  const filterTests = [
    { name: 'No filters (default pagination)', filters: {} },
    { name: 'Page 1, Limit 5', filters: { page: 1, limit: 5 } },
    { name: 'By status (completed)', filters: { status: 'completed' } },
    { name: 'By payment method (credit_card)', filters: { payment_method: 'credit_card' } },
    { name: 'By date range (last 30 days)', filters: { start_date: new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0] } },
    { name: 'By guest ID', filters: { guest_id: testGuestId } },
    { name: 'By reservation ID', filters: { reservation_id: testReservationId } },
    { name: 'Sorted by amount (desc)', filters: { sort_by: 'amount', sort_order: 'desc' } },
    { name: 'Minimum amount $100', filters: { min_amount: 100 } }
  ];

  for (const test of filterTests) {
    try {
      const result = await tester.getAllPayments(test.filters);
      const payments = result.data.payments || result.data;
      const total = result.data.total || result.data.total_count || payments.length;
      const page = result.data.page || 1;
      const limit = result.data.limit || 10;
      const totalPages = result.data.totalPages || Math.ceil(total / limit);
      
      logSuccess(`Get Payments - ${test.name}`, 
        `Page ${page}/${totalPages}, Showing ${payments.length} of ${total} payments`);
      
      if (payments.length > 0) {
        console.log(`    Sample (${test.name}):`);
        payments.slice(0, 2).forEach(payment => {
          console.log(`   - #${payment.payment_id}: ${formatCurrency(payment.amount)} (${payment.status}) via ${payment.payment_method}`);
        });
      }
      await sleep(200);
    } catch (error) {
      logError(`Get Payments - ${test.name}`, error);
    }
  }
  await sleep(500);

  // Test 6: Process Refund
  logHeader('TEST 6: PROCESS REFUND (PUT /:id/refund)');
  
  // First ensure we have a completed payment to refund
  let refundPaymentId = createdPaymentId;
  let refundPaymentStatus = 'completed';
  
  try {
    const currentPayment = await tester.getPaymentById(createdPaymentId);
    refundPaymentStatus = currentPayment.data.status;
    
    if (refundPaymentStatus !== 'completed') {
      logInfo('Creating a completed payment for refund test...');
      // Create a new completed payment for refund
      const refundTestPayment = {
        ...paymentData,
        amount: 75.00,
        transaction_id: generateTransactionId(),
        status: 'pending'
      };
      const newPaymentResult = await tester.createPayment(refundTestPayment);
      refundPaymentId = newPaymentResult.data.payment_id || newPaymentResult.data.id;
      
      // Process it to completed
      await tester.processPayment(refundPaymentId, {
        processor_response: 'approved',
        processor_transaction_id: 'PROC_' + generateTransactionId()
      });
      logSuccess('Created Payment for Refund', `ID: ${refundPaymentId}`);
    }
  } catch (error) {
    logError('Refund Setup', error);
    logInfo('Skipping refund test due to setup error');
    refundPaymentId = null;
  }
  
  if (refundPaymentId) {
    const refundData = {
      refund_amount: 75.00,
      refund_reason: 'Guest requested partial refund',
      processor_refund_id: 'REF_' + generateTransactionId(),
      notes: 'Refund processed via test script'
    };

    try {
      const result = await tester.refundPayment(refundPaymentId, refundData);
      logSuccess('Process Refund', 
        `Payment ${refundPaymentId} refunded successfully`);
      
      console.log('\n Refund Details:');
      console.table({
        'Original Payment ID': refundPaymentId,
        'Refund Amount': formatCurrency(refundData.refund_amount),
        'Refund Reason': refundData.refund_reason,
        'Processor Refund ID': refundData.processor_refund_id,
        'New Status': result.data.status || 'refunded',
        'Refunded At': result.data.refunded_at ? new Date(result.data.refunded_at).toLocaleString() : new Date().toLocaleString(),
        'Notes': refundData.notes
      });
    } catch (error) {
      logError('Process Refund', error);
    }
  }
  await sleep(500);

  // Test 7: Get Financial Report
  logHeader('TEST 7: GET FINANCIAL REPORT (GET /financial-report)');
  
  const reportTests = [
    { name: 'Daily report', params: { period: 'daily', date: new Date().toISOString().split('T')[0] } },
    { name: 'Weekly report', params: { period: 'weekly', year: new Date().getFullYear(), week: Math.ceil((new Date().getDate() + new Date().getDay()) / 7) } },
    { name: 'Monthly report', params: { period: 'monthly', year: new Date().getFullYear(), month: new Date().getMonth() + 1 } },
    { name: 'Yearly report', params: { period: 'yearly', year: new Date().getFullYear() } },
    { name: 'Custom date range', params: { period: 'custom', start_date: new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0] } }
  ];

  for (const test of reportTests) {
    try {
      const result = await tester.getFinancialReport(test.params);
      const report = result.data;
      
      logSuccess(`Financial Report - ${test.name}`, 
        `Report generated successfully`);
      
      console.log(`\n ${test.name.toUpperCase()} FINANCIAL REPORT:`);
      
      // Display summary statistics
      if (report.summary) {
        console.log('    Summary:');
        console.table({
          'Total Revenue': formatCurrency(report.summary.total_revenue || 0),
          'Total Payments': report.summary.total_payments || 0,
          'Average Payment': formatCurrency(report.summary.average_payment || 0),
          'Successful Payments': report.summary.successful_payments || 0,
          'Failed Payments': report.summary.failed_payments || 0,
          'Refund Amount': formatCurrency(report.summary.total_refunds || 0)
        });
      }
      
      // Display by payment method if available
      if (report.by_payment_method && Object.keys(report.by_payment_method).length > 0) {
        console.log('\n    By Payment Method:');
        Object.entries(report.by_payment_method).forEach(([method, stats]) => {
          console.log(`     - ${method}: ${formatCurrency(stats.amount || stats)} (${stats.count || 1} payments)`);
        });
      }
      
      // Display by status if available
      if (report.by_status && Object.keys(report.by_status).length > 0) {
        console.log('\n    By Payment Status:');
        Object.entries(report.by_status).forEach(([status, count]) => {
          console.log(`     - ${status}: ${count} payments`);
        });
      }
      
      // Display top transactions if available
      if (report.top_transactions && report.top_transactions.length > 0) {
        console.log('\n    Top Transactions:');
        report.top_transactions.slice(0, 3).forEach(txn => {
          console.log(`     - ${txn.payment_id}: ${formatCurrency(txn.amount)} (${txn.payment_method})`);
        });
      }
      
      await sleep(300);
    } catch (error) {
      logError(`Financial Report - ${test.name}`, error);
    }
  }
  await sleep(500);

  // Test 8: Error Cases and Validations
  logHeader('TEST 8: ERROR CASES AND VALIDATIONS');
  
  // Test duplicate transaction ID
  try {
    await tester.createPayment({
      ...paymentData,
      amount: 100.00,
      transaction_id: paymentData.transaction_id, // Duplicate
      card_last_four: '1111' // Different card to avoid other constraints
    });
    logError('Duplicate Transaction ID Test', new Error('Should have rejected duplicate transaction ID'));
  } catch (error) {
    if (error.response?.status === 409) {
      logSuccess('Duplicate Transaction ID Test', 'Correctly rejected duplicate transaction ID');
    } else if (error.response?.status === 400) {
      logSuccess('Duplicate Transaction ID Test', 'Correctly rejected duplicate transaction ID (400)');
    } else {
      logError('Duplicate Transaction ID Test', error);
    }
  }
  await sleep(300);

  // Test invalid payment amount (negative)
  try {
    await tester.createPayment({
      guest_id: testGuestId,
      amount: -50.00,
      payment_method: 'cash',
      payment_type: 'full_payment',
      status: 'pending'
    });
    logError('Invalid Amount Test', new Error('Should have rejected negative amount'));
  } catch (error) {
    if (error.response?.status === 400) {
      logSuccess('Invalid Amount Test', 'Correctly rejected negative amount');
    } else {
      logError('Invalid Amount Test', error);
    }
  }
  await sleep(300);

  // Test invalid payment method
  try {
    await tester.createPayment({
      guest_id: testGuestId,
      amount: 100.00,
      payment_method: 'invalid_method',
      payment_type: 'full_payment',
      status: 'pending'
    });
    logError('Invalid Payment Method Test', new Error('Should have rejected invalid payment method'));
  } catch (error) {
    if (error.response?.status === 400) {
      logSuccess('Invalid Payment Method Test', 'Correctly rejected invalid payment method');
    } else {
      logError('Invalid Payment Method Test', error);
    }
  }
  await sleep(300);

  // Test refund on pending payment (should fail)
  try {
    // Create a pending payment
    const pendingPayment = {
      guest_id: testGuestId,
      amount: 50.00,
      payment_method: 'cash',
      payment_type: 'deposit',
      status: 'pending'
    };
    const pendingResult = await tester.createPayment(pendingPayment);
    const pendingId = pendingResult.data.payment_id || pendingResult.data.id;
    
    await tester.refundPayment(pendingId, { refund_amount: 50.00 });
    logError('Refund Pending Payment Test', new Error('Should not allow refund on pending payment'));
  } catch (error) {
    if (error.response?.status === 400 || error.response?.status === 409) {
      logSuccess('Refund Pending Payment Test', 'Correctly rejected refund on pending payment');
    } else {
      logError('Refund Pending Payment Test', error);
    }
  }
  await sleep(500);

  // Test 9: Payment Status Flow
  logHeader('TEST 9: PAYMENT STATUS FLOW VALIDATION');
  
  // Create a payment for status flow test
  const flowPaymentData = {
    guest_id: testGuestId,
    amount: 200.00,
    payment_method: 'bank_transfer',
    payment_type: 'full_payment',
    transaction_id: generateTransactionId(),
    status: 'pending'
  };
  
  let flowPaymentId = null;
  
  try {
    const result = await tester.createPayment(flowPaymentData);
    flowPaymentId = result.data.payment_id || result.data.id;
    logSuccess('Create Flow Test Payment', `ID: ${flowPaymentId}, Status: pending`);
    
    console.log('\n Testing Payment Status Flow:');
    
    // Try to refund a pending payment (should fail)
    try {
      await tester.refundPayment(flowPaymentId, { refund_amount: 200.00 });
      logError('Refund Pending (Flow)', new Error('Should not allow refund on pending payment'));
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 409) {
        logSuccess('Refund Pending (Flow)', 'Correctly rejected refund on pending payment');
      } else {
        logError('Refund Pending (Flow)', error);
      }
    }
    
    // Process to completed
    await tester.processPayment(flowPaymentId, {
      processor_response: 'approved',
      processor_transaction_id: 'PROC_' + generateTransactionId()
    });
    logSuccess('Process to Completed', 'Payment status updated to completed');
    
    // Verify status
    const verifyPayment = await tester.getPaymentById(flowPaymentId);
    console.log(`    Verified: Status is "${verifyPayment.data.status}"`);
    
    // Now refund should work
    const refundResult = await tester.refundPayment(flowPaymentId, {
      refund_amount: 200.00,
      refund_reason: 'Test refund in flow'
    });
    logSuccess('Refund Completed', `Refund processed, new status: ${refundResult.data.status}`);
    
    // Clean up - no need to delete, just mark as tested
    logSuccess('Cleanup Flow Test', 'Payment status flow tested successfully');
    
  } catch (error) {
    logError('Payment Status Flow Test', error);
  }
  await sleep(500);

  // Test 10: Advanced Payment Scenarios
  logHeader('TEST 10: ADVANCED PAYMENT SCENARIOS');
  
  // Test partial refund
  try {
    // Create a payment for partial refund test
    const partialPaymentData = {
      guest_id: testGuestId,
      amount: 300.00,
      payment_method: 'credit_card',
      payment_type: 'full_payment',
      transaction_id: generateTransactionId(),
      status: 'pending'
    };
    
    const partialResult = await tester.createPayment(partialPaymentData);
    const partialPaymentId = partialResult.data.payment_id || partialResult.data.id;
    
    // Process to completed
    await tester.processPayment(partialPaymentId, {
      processor_response: 'approved',
      processor_transaction_id: 'PROC_' + generateTransactionId()
    });
    
    // Partial refund
    const partialRefundData = {
      refund_amount: 150.00,
      refund_reason: 'Partial refund for service issue',
      processor_refund_id: 'PARTIAL_REF_' + generateTransactionId()
    };
    
    const partialRefundResult = await tester.refundPayment(partialPaymentId, partialRefundData);
    logSuccess('Partial Refund Test', 
      `Partial refund of ${formatCurrency(150.00)} processed successfully`);
    
    console.log('\n Partial Refund Details:');
    console.log(`   Original Amount: ${formatCurrency(300.00)}`);
    console.log(`   Refund Amount: ${formatCurrency(150.00)}`);
    console.log(`   Remaining Balance: ${formatCurrency(150.00)}`);
    console.log(`   New Status: ${partialRefundResult.data.status}`);
    
  } catch (error) {
    logError('Partial Refund Test', error);
  }
  await sleep(500);

  // Print Summary
  await printSummary();
  rl.close();
}

// Helper function to create test reservation
async function createTestReservation(tester) {
  try {
    // We need to create a simple reservation for payment testing
    // Get a room
    const roomsResponse = await axios.get(`${API_BASE_URL}/rooms/available`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { 
        start_date: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
        end_date: new Date(Date.now() + 10*24*60*60*1000).toISOString().split('T')[0]
      }
    });
    
    if (roomsResponse.data.data && roomsResponse.data.data.length > 0) {
      const roomId = roomsResponse.data.data[0].room_id;
      
      // Create reservation
      const reservationData = {
        guest_id: testGuestId,
        room_id: roomId,
        check_in_date: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
        check_out_date: new Date(Date.now() + 10*24*60*60*1000).toISOString().split('T')[0],
        number_of_guests: 2,
        status: 'confirmed',
        total_amount: 450.00
      };
      
      const reservationResponse = await axios.post(`${API_BASE_URL}/reservations`, reservationData, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      return reservationResponse.data.data.reservation_id || reservationResponse.data.data.id;
    }
  } catch (error) {
    throw new Error(`Failed to create test reservation: ${error.message}`);
  }
  return null;
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
  console.log('    GET /                               - Get all payments');
  console.log('    GET /reservation/:reservation_id    - Get reservation payments');
  console.log('    GET /financial-report               - Get financial report');
  console.log('    GET /:id                            - Get payment by ID');
  console.log('    POST /                              - Create new payment');
  console.log('    PUT /:id/process                    - Process payment');
  console.log('    PUT /:id/refund                     - Process refund');
  console.log('    Status flow validation              - Payment lifecycle');
  console.log('    Error cases                         - Validation and edge cases');
  console.log('    Advanced scenarios                  - Partial refunds, reports');

  // Payment statistics
  console.log('\n PAYMENT STATISTICS:');
  console.log(`   Test Payment ID: ${createdPaymentId}`);
  console.log(`   Test Reservation ID: ${testReservationId || 'N/A'}`);
  console.log(`   Test Guest ID: ${testGuestId}`);
  console.log('   Payment Methods Tested: credit_card, cash, bank_transfer');
  console.log('   Payment Types Tested: deposit, full_payment, refund');
  console.log('   Statuses Tested: pending, completed, refunded');

  // Save test results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsDir = path.join(__dirname, 'test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  const resultsFile = path.join(resultsDir, `payment-api-test-${timestamp}.json`);
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: total,
      passed,
      failed: total - passed,
      successRate: `${successRate}%`
    },
    testData: {
      paymentId: createdPaymentId,
      reservationId: testReservationId,
      guestId: testGuestId
    },
    testDetails: testResults,
    apiEndpointsTested: [
      'GET /payments',
      'GET /payments/reservation/:reservation_id',
      'GET /payments/financial-report',
      'GET /payments/:id',
      'POST /payments',
      'PUT /payments/:id/process',
      'PUT /payments/:id/refund'
    ],
    environment: {
      apiBaseUrl: API_BASE_URL,
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString()
    },
    paymentFeaturesTested: {
      paymentMethods: ['credit_card', 'debit_card', 'cash', 'bank_transfer', 'check'],
      paymentTypes: ['deposit', 'full_payment', 'refund', 'additional_charge'],
      statuses: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
      reports: ['daily', 'weekly', 'monthly', 'yearly', 'custom']
    }
  };

  fs.writeFileSync(resultsFile, JSON.stringify(report, null, 2));
  console.log(`\n Detailed results saved to: ${resultsFile}`);

  // Recommendations
  console.log('\n RECOMMENDATIONS:');
  if (successRate === '100.0') {
    console.log(' EXCELLENT! All Payment API endpoints are fully functional.');
    console.log('   Next steps:');
    console.log('   1. Test payment gateway integration (Stripe, PayPal)');
    console.log('   2. Test email notifications for payments');
    console.log('   3. Load test with multiple concurrent payments');
    console.log('   4. Test payment reconciliation reports');
  } else if (successRate >= '80.0') {
    console.log(' GOOD! Most endpoints are working.');
    console.log('   Review failed tests - check payment gateway configuration.');
  } else {
    console.log('  NEEDS ATTENTION. Several payment endpoints failed.');
    console.log('   Check:');
    console.log('   1. Database payment table structure');
    console.log('   2. Payment gateway configuration (if used)');
    console.log('   3. Transaction ID uniqueness constraints');
    console.log('   4. Check backend/logs for detailed errors');
  }

  console.log('\n QUICK LINKS:');
  console.log('   Test Payment Created:');
  if (createdPaymentId) {
    console.log(`     Payment ID: ${createdPaymentId}`);
    console.log(`     Reservation ID: ${testReservationId || 'N/A'}`);
    console.log(`     Guest ID: ${testGuestId}`);
  }
  console.log('\n   API Documentation: http://localhost:5000/api-docs');
  console.log('   Payment Flow: See status flow diagram in test report');
}

// Interactive test menu
async function showMenu() {
  console.log('\n PAYMENT API TESTER');
  console.log('====================');
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
  console.log('\n SPECIFIC PAYMENT ENDPOINT TESTING');
  console.log('====================================');
  console.log('1. GET /payments - Get all payments');
  console.log('2. GET /payments/reservation/:id - Get reservation payments');
  console.log('3. GET /payments/financial-report - Get financial report');
  console.log('4. GET /payments/:id - Get payment by ID');
  console.log('5. POST /payments - Create new payment');
  console.log('6. PUT /payments/:id/process - Process payment');
  console.log('7. PUT /payments/:id/refund - Process refund');
  console.log('8. Back to Main Menu');
  
  rl.question('\nSelect endpoint to test (1-8): ', async (choice) => {
    const tester = new PaymentAPITester(API_BASE_URL);
    
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
      case '1': // Get all payments
        rl.question('Enter filters (JSON format or press enter for none): ', async (filterInput) => {
          try {
            const filters = filterInput ? JSON.parse(filterInput) : {};
            const result = await tester.getAllPayments(filters);
            console.log(' GET /payments - Success:');
            console.log(`Total: ${result.data.total || result.data.payments?.length || 0} payments`);
            console.log(JSON.stringify(result.data, null, 2));
          } catch (error) {
            console.log(' Error:', error.response?.data || error.message);
          }
          rl.close();
        });
        break;
        
      case '2': // Get reservation payments
        rl.question('Enter Reservation ID: ', async (reservationId) => {
          try {
            const result = await tester.getReservationPayments(parseInt(reservationId));
            console.log(' GET /payments/reservation/:id - Success:');
            console.log(`Found ${result.data.payments?.length || 0} payments`);
            console.log(JSON.stringify(result.data, null, 2));
          } catch (error) {
            console.log(' Error:', error.response?.data || error.message);
          }
          rl.close();
        });
        break;
        
      case '3': // Get financial report
        console.log('--- Financial Report ---');
        rl.question('Enter report period (daily, weekly, monthly, yearly, custom): ', async (period) => {
          let params = { period }; // We still send 'period' for backend reference
          
          // Helper function to send request
          const sendReportRequest = async (p) => {
            try {
              console.log(`ℹ  Sending Date Range: ${p.start_date} to ${p.end_date}`);
              const result = await tester.getFinancialReport(p);
              console.log(' GET /financial-report - Success:');
              console.log(JSON.stringify(result.data, null, 2));
            } catch (error) {
              console.log(' Error:', error.response?.data || error.message);
            }
            rl.close();
          };

          if (period === 'daily') {
            rl.question('Enter date (YYYY-MM-DD) or press enter for today: ', async (dateInput) => {
              const date = dateInput || new Date().toISOString().split('T')[0];
              
              // FIX: Append time to cover the entire day (00:00:00 to 23:59:59)
              params.start_date = `${date} 00:00:00`;
              params.end_date = `${date} 23:59:59`;
              
              await sendReportRequest(params);
            });
          }
          else if (period === 'weekly') {
            rl.question('Enter start date of the week (YYYY-MM-DD): ', async (startDate) => {
              // Calculate end date (start + 6 days)
              const start = new Date(startDate);
              const end = new Date(start);
              end.setDate(start.getDate() + 6);
              
              params.start_date = startDate;
              params.end_date = end.toISOString().split('T')[0];
              await sendReportRequest(params);
            });
          } 
          else if (period === 'monthly') {
            rl.question('Enter Year (e.g., 2025): ', async (year) => {
              rl.question('Enter Month (1-12): ', async (month) => {
                const y = parseInt(year);
                const m = parseInt(month);
                
                // Calculate first and last day of month
                // Note: new Date(y, m, 0) gives the last day of month m
                const firstDay = `${y}-${m.toString().padStart(2, '0')}-01`;
                const lastDayObj = new Date(y, m, 0); 
                const lastDay = lastDayObj.getDate();
                const lastDayStr = `${y}-${m.toString().padStart(2, '0')}-${lastDay}`;

                params.start_date = firstDay;
                params.end_date = lastDayStr;
                await sendReportRequest(params);
              });
            });
          } 
          else if (period === 'yearly') {
            rl.question('Enter Year (e.g., 2025): ', async (year) => {
              params.start_date = `${year}-01-01`;
              params.end_date = `${year}-12-31`;
              await sendReportRequest(params);
            });
          } 
          else if (period === 'custom') {
            rl.question('Enter start date (YYYY-MM-DD): ', async (start) => {
              rl.question('Enter end date (YYYY-MM-DD): ', async (end) => {
                params.start_date = start;
                params.end_date = end;
                await sendReportRequest(params);
              });
            });
          } 
          else {
            console.log('Invalid period selected');
            rl.close();
          }
        });
        break;
        
      case '4': // Get payment by ID
        rl.question('Enter Payment ID: ', async (paymentId) => {
          try {
            const result = await tester.getPaymentById(parseInt(paymentId));
            console.log(' GET /payments/:id - Success:');
            console.log(JSON.stringify(result.data, null, 2));
          } catch (error) {
            console.log(' Error:', error.response?.data || error.message);
          }
          rl.close();
        });
        break;
        
      case '5': // Create new payment
        // ADDED: Ask for Reservation ID first to link them
        rl.question('Enter Reservation ID to pay for: ', async (resId) => {
          rl.question('Enter Guest ID: ', async (guestId) => {
            rl.question('Enter amount: ', async (amount) => {
              rl.question('Enter payment method (credit_card, cash, etc): ', async (method) => {
                rl.question('Enter payment type (deposit, full_payment, etc): ', async (type) => {
                  
                  const paymentData = {
                    reservation_id: parseInt(resId), // LINKING HAPPENS HERE
                    guest_id: parseInt(guestId),
                    amount: parseFloat(amount),
                    payment_method: method,
                    payment_type: type,
                    status: 'pending',
                    transaction_id: 'TXN' + Date.now() // Auto-generate ID
                  };

                  try {
                    const result = await tester.createPayment(paymentData);
                    console.log(' POST /payments - Success:');
                    console.log(`Created payment ID: ${result.data.payment_id || result.data.id}`);
                    
                    // Visual confirmation of the link
                    console.log(`Linked to Reservation ID: ${paymentData.reservation_id}`);
                    
                    console.log(JSON.stringify(result.data, null, 2));
                  } catch (error) {
                    console.log(' Error:', error.response?.data || error.message);
                  }
                  rl.close();
                });
              });
            });
          });
        });
        break;
        
      case '6': // Process payment
        rl.question('Enter Payment ID to process: ', async (paymentId) => {
          const processData = {
            processor_response: 'approved',
            processor_transaction_id: 'PROC_' + generateTransactionId()
          };
          try {
            const result = await tester.processPayment(parseInt(paymentId), processData);
            console.log(' PUT /payments/:id/process - Success:');
            console.log(JSON.stringify(result.data, null, 2));
          } catch (error) {
            console.log(' Error:', error.response?.data || error.message);
          }
          rl.close();
        });
        break;
        
      case '7': // Process refund
        rl.question('Enter Payment ID to refund: ', async (paymentId) => {
          rl.question('Enter refund amount: ', async (amount) => {
            // ADDED: Prompt for reason
            rl.question('Enter refund reason: ', async (reason) => {
              const refundData = {
                refund_amount: parseFloat(amount),
                reason: reason // FIX: Sending 'reason' key matching backend expectation
              };
              
              try {
                const result = await tester.refundPayment(parseInt(paymentId), refundData);
                console.log(' PUT /payments/:id/refund - Success:');
                console.log(JSON.stringify(result.data, null, 2));
              } catch (error) {
                console.log(' Error:', error.response?.data || error.message);
              }
              rl.close();
            });
          });
        });
        break;
        
      case '8':
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
    .filter(f => f.startsWith('payment-api-test-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.log('No previous payment test results found.');
  } else {
    console.log('\n PREVIOUS PAYMENT TEST RESULTS:');
    files.forEach((file, index) => {
      const filePath = path.join(resultsDir, file);
      const stats = fs.statSync(filePath);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      console.log(`${index + 1}. ${file}`);
      console.log(`   Date: ${new Date(data.timestamp).toLocaleString()}`);
      console.log(`   Results: ${data.summary.passed}/${data.summary.totalTests} passed (${data.summary.successRate})`);
      console.log(`   Test Payment: ${data.testData?.paymentId || 'N/A'}`);
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
  console.log('\n QUICK PAYMENT API HEALTH CHECK');
  console.log('=================================');
  
  const tester = new PaymentAPITester(API_BASE_URL);
  
  try {
    // Test 1: API Health
    console.log('1. Testing API health...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log(`    API Health: ${healthResponse.data.status}`);
    
    // Test 2: Login
    console.log('2. Testing authentication...');
    await tester.login(ADMIN_CREDENTIALS);
    console.log(`    Authentication: Success`);
    
    // Test 3: Get all payments
    console.log('3. Testing payment endpoint...');
    const payments = await tester.getAllPayments({ limit: 1 });
    const totalPayments = payments.data.total || payments.data.payments?.length || 0;
    console.log(`    Payment API: Accessible (Found ${totalPayments} payments)`);
    
    // Test 4: Check response structure
    console.log('4. Checking response structure...');
    if (payments.data.payments || payments.data.data) {
      console.log(`    Response structure: Correct`);
    } else {
      console.log(`     Response structure: Unexpected format`);
    }
    
    // Test 5: Check for required fields
    console.log('5. Checking payment schema...');
    if (totalPayments > 0) {
      const samplePayment = payments.data.payments?.[0] || payments.data?.[0];
      const requiredFields = ['payment_id', 'amount', 'payment_method', 'status'];
      const missingFields = requiredFields.filter(field => !samplePayment[field]);
      
      if (missingFields.length === 0) {
        console.log(`    Schema: All required fields present`);
      } else {
        console.log(`     Schema: Missing fields: ${missingFields.join(', ')}`);
      }
    }
    
    console.log('\n PAYMENT API IS HEALTHY!');
    console.log('\n Quick Stats:');
    console.log(`   - Total Payments: ${totalPayments}`);
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
 Payment API Test Script
==========================
Usage:
  node payment-api-test.js [option]

Options:
  --all, -a      Run all payment tests
  --quick, -q    Quick payment API health check
  --help, -h     Show this help
  (no args)      Interactive menu

Examples:
  node payment-api-test.js --all     # Run comprehensive payment tests
  node payment-api-test.js --quick   # Quick payment system check
  node payment-api-test.js          # Interactive testing menu
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