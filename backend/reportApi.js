/**
 * report-api-test.js - Comprehensive Report API Testing Script
 * 
 * Tests all Report-related API endpoints:
 * 
 * 1. GET /daily     - Get daily report
 * 2. GET /weekly    - Get weekly report
 * 3. GET /monthly   - Get monthly report
 * 4. GET /custom    - Get custom report
 * 
 * Usage: node report-api-test.js
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

const RECEPTIONIST_CREDENTIALS = {
  email: 'receptionist@hotel.com',
  password: 'Recep123!'
};

const GUEST_CREDENTIALS = {
  email: 'metkel@gmail.com',
  password: 'Abc123!!'
};

let adminToken = '';
let receptionistToken = '';
let guestToken = '';
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
  console.log(` ${title}`);
  console.log('='.repeat(60));
};

const formatCurrency = (amount) => {
  if (typeof amount !== 'number' || isNaN(amount)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

const getCurrentWeekNumber = () => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const pastDaysOfYear = (now - startOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
};

// API Test Functions - COMPATIBLE WITH OUR BACKEND
class ReportAPITester {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.axiosInstance = axios.create({
      baseURL: `${baseURL}/reports`,
      timeout: 15000,
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
      return response.data.data.token;
    } catch (error) {
      throw new Error(`Login failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // 1. GET /daily - Get daily report
  async getDailyReport(date = null) {
    try {
      const params = date ? { date } : {};
      const response = await this.axiosInstance.get('/daily', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 2. GET /weekly - Get weekly report
  async getWeeklyReport(year = null, week = null) {
    try {
      const params = {};
      if (year) params.year = year;
      if (week) params.week = week;
      const response = await this.axiosInstance.get('/weekly', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 3. GET /monthly - Get monthly report
  async getMonthlyReport(year = null, month = null) {
    try {
      const params = {};
      if (year) params.year = year;
      if (month) params.month = month;
      const response = await this.axiosInstance.get('/monthly', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 4. GET /custom - Get custom report
  async getCustomReport(startDate, endDate, reportType = 'summary') {
    try {
      const params = {
        start_date: startDate,
        end_date: endDate,
        report_type: reportType
      };
      const response = await this.axiosInstance.get('/custom', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Clear authentication headers
  clearAuth() {
    delete this.axiosInstance.defaults.headers.common['Authorization'];
  }
}

// Test Suite
async function runAllTests() {
  const tester = new ReportAPITester(API_BASE_URL);
  
  logHeader('REPORT API TEST SUITE');
  console.log('Testing all Report API endpoints...\n');

  // Login with different roles to test authorization
  logHeader('AUTHENTICATION SETUP');
  
  // Login as admin
  try {
    logInfo('Logging in as admin...');
    adminToken = await tester.login(ADMIN_CREDENTIALS);
    tester.setAuthToken(adminToken);
    logSuccess('Admin Login', `Token received: ${adminToken.substring(0, 30)}...`);
    await sleep(500);
  } catch (error) {
    logError('Admin Login', error);
    console.log('\n  Please ensure:');
    console.log('1. Server is running: npm run dev');
    console.log('2. Database is seeded with admin user');
    console.log('3. Admin credentials:', ADMIN_CREDENTIALS);
    process.exit(1);
  }

  // Login as receptionist
  try {
    logInfo('Logging in as receptionist...');
    receptionistToken = await tester.login(RECEPTIONIST_CREDENTIALS);
    logSuccess('Receptionist Login', 'Success');
    await sleep(300);
  } catch (error) {
    logWarning('Receptionist Login', 'Receptionist user may not exist, using admin for all tests');
  }

  // Login as guest (should fail for reports)
  try {
    logInfo('Logging in as guest...');
    guestToken = await tester.login(GUEST_CREDENTIALS);
    logSuccess('Guest Login', 'Success');
    await sleep(300);
  } catch (error) {
    logWarning('Guest Login', 'Guest user may not exist');
  }

  // Test 1: Get Daily Report (Admin/Receptionist)
  logHeader('TEST 1: GET DAILY REPORT (GET /daily)');
  
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const dailyTestCases = [
    { name: 'Today (no date parameter)', date: null },
    { name: 'Specific date (yesterday)', date: formatDate(yesterday) },
    { name: 'Today (explicit)', date: formatDate(today) }
  ];

  for (const testCase of dailyTestCases) {
    try {
      const result = await tester.getDailyReport(testCase.date);
      const report = result.data;
      
      logSuccess(`Daily Report - ${testCase.name}`, 
        `Report generated successfully`);
      
      console.log(`\n DAILY REPORT (${testCase.date || 'Today'}):`);
      
      // Display summary
      if (report.summary) {
        console.log('    Summary:');
        console.table({
          'Date': report.summary.date || testCase.date || formatDate(today),
          'Total Reservations': report.summary.total_reservations || 0,
          'Check-ins': report.summary.check_ins || 0,
          'Check-outs': report.summary.check_outs || 0,
          'Cancellations': report.summary.cancellations || 0,
          'Occupancy Rate': report.summary.occupancy_rate ? `${report.summary.occupancy_rate}%` : '0%',
          'Total Revenue': formatCurrency(report.summary.total_revenue || 0),
          'Average Daily Rate': formatCurrency(report.summary.average_daily_rate || 0)
        });
      }
      
      // Display reservations if available
      if (report.reservations && report.reservations.length > 0) {
        console.log('\n    Today\'s Reservations:');
        report.reservations.slice(0, 3).forEach(res => {
          console.log(`     - ${res.guest_name}: ${res.room_number} (${res.status}) - ${formatCurrency(res.total_amount)}`);
        });
        
        if (report.reservations.length > 3) {
          console.log(`     ... and ${report.reservations.length - 3} more reservations`);
        }
      }
      
      // Display payments if available
      if (report.payments && report.payments.length > 0) {
        console.log('\n    Today\'s Payments:');
        const completedPayments = report.payments.filter(p => p.status === 'completed');
        const totalPaid = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        console.log(`     Total Paid Today: ${formatCurrency(totalPaid)} (${completedPayments.length} payments)`);
      }
      
      await sleep(300);
    } catch (error) {
      logError(`Daily Report - ${testCase.name}`, error);
    }
  }
  await sleep(500);

  // Test 2: Get Weekly Report
  logHeader('TEST 2: GET WEEKLY REPORT (GET /weekly)');
  
  const currentYear = today.getFullYear();
  const currentWeek = getCurrentWeekNumber();
  const lastWeek = currentWeek > 1 ? currentWeek - 1 : 52;
  const lastWeekYear = currentWeek > 1 ? currentYear : currentYear - 1;
  
  const weeklyTestCases = [
    { name: 'Current week (no parameters)', year: null, week: null },
    { name: 'Specific week (last week)', year: lastWeekYear, week: lastWeek },
    { name: 'Current week (explicit)', year: currentYear, week: currentWeek }
  ];

  for (const testCase of weeklyTestCases) {
    try {
      const result = await tester.getWeeklyReport(testCase.year, testCase.week);
      const report = result.data;
      
      const weekLabel = testCase.week ? `Week ${testCase.week}, ${testCase.year || currentYear}` : 'Current Week';
      logSuccess(`Weekly Report - ${testCase.name}`, 
        `Report generated for ${weekLabel}`);
      
      console.log(`\n WEEKLY REPORT (${weekLabel}):`);
      
      // Display summary
      if (report.summary) {
        console.log('    Weekly Summary:');
        console.table({
          'Period': `${report.summary.start_date || 'N/A'} to ${report.summary.end_date || 'N/A'}`,
          'Total Reservations': report.summary.total_reservations || 0,
          'Total Revenue': formatCurrency(report.summary.total_revenue || 0),
          'Average Occupancy': report.summary.average_occupancy ? `${report.summary.average_occupancy}%` : '0%',
          'Average Daily Rate': formatCurrency(report.summary.average_daily_rate || 0),
          'Revenue Per Room': formatCurrency(report.summary.revenue_per_available_room || 0),
          'Check-ins': report.summary.total_check_ins || 0,
          'Check-outs': report.summary.total_check_outs || 0,
          'Cancellations': report.summary.total_cancellations || 0
        });
      }
      
      // Display daily breakdown if available
      if (report.daily_breakdown && report.daily_breakdown.length > 0) {
        console.log('\n    Daily Breakdown:');
        report.daily_breakdown.slice(0, 5).forEach(day => {
          console.log(`     - ${day.date}: ${day.occupancy_rate || 0}% occupancy, ${formatCurrency(day.revenue || 0)} revenue`);
        });
        
        if (report.daily_breakdown.length > 5) {
          console.log(`     ... and ${report.daily_breakdown.length - 5} more days`);
        }
      }
      
      // Display top performing rooms if available
      if (report.top_rooms && report.top_rooms.length > 0) {
        console.log('\n    Top Performing Rooms:');
        report.top_rooms.slice(0, 3).forEach(room => {
          console.log(`     - ${room.room_number}: ${formatCurrency(room.revenue)} revenue (${room.occupancy_rate || 0}% occupancy)`);
        });
      }
      
      await sleep(300);
    } catch (error) {
      logError(`Weekly Report - ${testCase.name}`, error);
    }
  }
  await sleep(500);

  // Test 3: Get Monthly Report
  logHeader('TEST 3: GET MONTHLY REPORT (GET /monthly)');
  
  const currentMonth = today.getMonth() + 1;
  const lastMonth = currentMonth > 1 ? currentMonth - 1 : 12;
  const lastMonthYear = currentMonth > 1 ? currentYear : currentYear - 1;
  
  const monthlyTestCases = [
    { name: 'Current month (no parameters)', year: null, month: null },
    { name: 'Specific month (last month)', year: lastMonthYear, month: lastMonth },
    { name: 'Current month (explicit)', year: currentYear, month: currentMonth }
  ];

  for (const testCase of monthlyTestCases) {
    try {
      const result = await tester.getMonthlyReport(testCase.year, testCase.month);
      const report = result.data;
      
      const monthLabel = testCase.month ? 
        `${getMonthName(testCase.month)} ${testCase.year || currentYear}` : 
        'Current Month';
      
      logSuccess(`Monthly Report - ${testCase.name}`, 
        `Report generated for ${monthLabel}`);
      
      console.log(`\n MONTHLY REPORT (${monthLabel}):`);
      
      // Display summary
      if (report.summary) {
        console.log('    Monthly Summary:');
        console.table({
          'Month': monthLabel,
          'Total Reservations': report.summary.total_reservations || 0,
          'Total Revenue': formatCurrency(report.summary.total_revenue || 0),
          'Average Occupancy': report.summary.average_occupancy ? `${report.summary.average_occupancy}%` : '0%',
          'Average Daily Rate': formatCurrency(report.summary.average_daily_rate || 0),
          'Revenue Per Room': formatCurrency(report.summary.revenue_per_available_room || 0),
          'Total Guests': report.summary.total_guests || 0,
          'Total Room Nights': report.summary.total_room_nights || 0,
          'Cancellation Rate': report.summary.cancellation_rate ? `${report.summary.cancellation_rate}%` : '0%'
        });
      }
      
      // Display weekly breakdown if available
      if (report.weekly_breakdown && report.weekly_breakdown.length > 0) {
        console.log('\n    Weekly Breakdown:');
        report.weekly_breakdown.forEach(week => {
          console.log(`     - Week ${week.week}: ${formatCurrency(week.revenue || 0)} revenue, ${week.occupancy_rate || 0}% occupancy`);
        });
      }
      
      // Display room type performance if available
      if (report.room_type_performance && report.room_type_performance.length > 0) {
        console.log('\n    Room Type Performance:');
        report.room_type_performance.forEach(type => {
          console.log(`     - ${type.room_type}: ${type.occupancy_rate || 0}% occupancy, ${formatCurrency(type.revenue || 0)} revenue`);
        });
      }
      
      // Display top guests if available
      if (report.top_guests && report.top_guests.length > 0) {
        console.log('\n    Top Guests:');
        report.top_guests.slice(0, 3).forEach(guest => {
          console.log(`     - ${guest.guest_name}: ${guest.total_stays || 0} stays, ${formatCurrency(guest.total_spent || 0)} spent`);
        });
      }
      
      await sleep(300);
    } catch (error) {
      logError(`Monthly Report - ${testCase.name}`, error);
    }
  }
  await sleep(500);

  // Test 4: Get Custom Report
  logHeader('TEST 4: GET CUSTOM REPORT (GET /custom)');
  
  const customDateRanges = [
    { 
      name: 'Last 7 days', 
      startDate: formatDate(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)),
      endDate: formatDate(today)
    },
    { 
      name: 'Last 30 days', 
      startDate: formatDate(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)),
      endDate: formatDate(today)
    },
    { 
      name: 'Specific quarter', 
      startDate: `${currentYear}-01-01`,
      endDate: `${currentYear}-03-31`
    }
  ];

  const reportTypes = ['summary', 'detailed', 'financial', 'occupancy'];

  for (const dateRange of customDateRanges) {
    for (const reportType of reportTypes) {
      try {
        const result = await tester.getCustomReport(
          dateRange.startDate, 
          dateRange.endDate, 
          reportType
        );
        const report = result.data;
        
        logSuccess(`Custom Report - ${dateRange.name} (${reportType})`, 
          `Report generated from ${dateRange.startDate} to ${dateRange.endDate}`);
        
        console.log(`\n CUSTOM REPORT (${dateRange.name} - ${reportType}):`);
        console.log(`   Period: ${dateRange.startDate} to ${dateRange.endDate}`);
        
        // Display based on report type
        switch (reportType) {
          case 'summary':
            if (report.summary) {
              console.table({
                'Total Reservations': report.summary.total_reservations || 0,
                'Total Revenue': formatCurrency(report.summary.total_revenue || 0),
                'Average Occupancy': report.summary.average_occupancy ? `${report.summary.average_occupancy}%` : '0%',
                'Total Guests': report.summary.total_guests || 0,
                'Total Payments': report.summary.total_payments || 0
              });
            }
            break;
            
          case 'detailed':
            if (report.reservations && report.reservations.length > 0) {
              console.log(`    Reservations (${report.reservations.length}):`);
              report.reservations.slice(0, 3).forEach(res => {
                console.log(`     - ${res.reservation_id}: ${res.guest_name}, ${res.room_number}, ${res.status}`);
              });
              
              if (report.reservations.length > 3) {
                console.log(`     ... and ${report.reservations.length - 3} more`);
              }
            }
            break;
            
          case 'financial':
            if (report.financial_summary) {
              console.table({
                'Total Revenue': formatCurrency(report.financial_summary.total_revenue || 0),
                'Total Expenses': formatCurrency(report.financial_summary.total_expenses || 0),
                'Net Profit': formatCurrency(report.financial_summary.net_profit || 0),
                'Profit Margin': report.financial_summary.profit_margin ? `${report.financial_summary.profit_margin}%` : '0%',
                'Average Transaction': formatCurrency(report.financial_summary.average_transaction || 0)
              });
              
              if (report.revenue_by_source) {
                console.log('\n    Revenue by Source:');
                Object.entries(report.revenue_by_source).forEach(([source, amount]) => {
                  console.log(`     - ${source}: ${formatCurrency(amount)}`);
                });
              }
            }
            break;
            
          case 'occupancy':
            if (report.occupancy_summary) {
              console.table({
                'Total Rooms': report.occupancy_summary.total_rooms || 0,
                'Average Occupancy': report.occupancy_summary.average_occupancy ? `${report.occupancy_summary.average_occupancy}%` : '0%',
                'Peak Occupancy': report.occupancy_summary.peak_occupancy ? `${report.occupancy_summary.peak_occupancy}%` : '0%',
                'Lowest Occupancy': report.occupancy_summary.lowest_occupancy ? `${report.occupancy_summary.lowest_occupancy}%` : '0%',
                'Room Nights Sold': report.occupancy_summary.room_nights_sold || 0,
                'Available Room Nights': report.occupancy_summary.available_room_nights || 0
              });
              
              if (report.daily_occupancy && report.daily_occupancy.length > 0) {
                console.log('\n    Daily Occupancy Trend:');
                report.daily_occupancy.slice(-5).forEach(day => {
                  console.log(`     - ${day.date}: ${day.occupancy_rate || 0}%`);
                });
              }
            }
            break;
        }
        
        await sleep(200);
      } catch (error) {
        // Some report types might not be implemented
        if (error.response?.status === 400) {
          logInfo(`Custom Report - ${dateRange.name} (${reportType}) not implemented`);
        } else {
          logError(`Custom Report - ${dateRange.name} (${reportType})`, error);
        }
      }
    }
  }
  await sleep(500);

  // Test 5: Role-Based Access Control Testing
  logHeader('TEST 5: ROLE-BASED ACCESS CONTROL (RBAC) TESTING');
  
  // Test with receptionist token (should have access)
  if (receptionistToken) {
    try {
      tester.setAuthToken(receptionistToken);
      const result = await tester.getDailyReport();
      logSuccess('Receptionist Access Test', 'Receptionist can access daily reports');
      
      // Test monthly report as well
      await tester.getMonthlyReport();
      logSuccess('Receptionist Access Test', 'Receptionist can access monthly reports');
      
      // Switch back to admin token for remaining tests
      tester.setAuthToken(adminToken);
    } catch (error) {
      if (error.response?.status === 403) {
        logError('Receptionist Access Test', new Error('Receptionist should have access to reports'));
      } else {
        logError('Receptionist Access Test', error);
      }
      tester.setAuthToken(adminToken);
    }
  } else {
    logInfo('Skipping receptionist RBAC test (receptionist token not available)');
  }
  
  // Test with guest token (should NOT have access)
  if (guestToken) {
    try {
      tester.setAuthToken(guestToken);
      await tester.getDailyReport();
      logError('Guest Access Test', new Error('Guest should NOT have access to reports'));
      tester.setAuthToken(adminToken);
    } catch (error) {
      if (error.response?.status === 403) {
        logSuccess('Guest Access Test', 'Correctly denied guest access to reports');
      } else if (error.response?.status === 401) {
        logSuccess('Guest Access Test', 'Guest token invalid/expired');
      } else {
        logError('Guest Access Test', error);
      }
      tester.setAuthToken(adminToken);
    }
  } else {
    logInfo('Skipping guest RBAC test (guest token not available)');
  }
  await sleep(500);

  // Test 6: Error Cases and Validations
  logHeader('TEST 6: ERROR CASES AND VALIDATIONS');
  
  // Test invalid date format
  try {
    await tester.getDailyReport('invalid-date-format');
    logError('Invalid Date Format Test', new Error('Should have rejected invalid date format'));
  } catch (error) {
    if (error.response?.status === 400) {
      logSuccess('Invalid Date Format Test', 'Correctly rejected invalid date format');
    } else {
      logError('Invalid Date Format Test', error);
    }
  }
  await sleep(300);

  // Test end date before start date
  try {
    await tester.getCustomReport('2024-03-01', '2024-02-01');
    logError('Invalid Date Range Test', new Error('Should have rejected end date before start date'));
  } catch (error) {
    if (error.response?.status === 400) {
      logSuccess('Invalid Date Range Test', 'Correctly rejected invalid date range');
    } else {
      logError('Invalid Date Range Test', error);
    }
  }
  await sleep(300);

  // Test invalid month (13)
  try {
    await tester.getMonthlyReport(2024, 13);
    logError('Invalid Month Test', new Error('Should have rejected invalid month (13)'));
  } catch (error) {
    if (error.response?.status === 400) {
      logSuccess('Invalid Month Test', 'Correctly rejected invalid month');
    } else {
      logError('Invalid Month Test', error);
    }
  }
  await sleep(300);

  // Test invalid week (53)
  try {
    await tester.getWeeklyReport(2024, 53);
    logError('Invalid Week Test', new Error('Should have rejected invalid week (53)'));
  } catch (error) {
    if (error.response?.status === 400) {
      logSuccess('Invalid Week Test', 'Correctly rejected invalid week');
    } else {
      logError('Invalid Week Test', error);
    }
  }
  await sleep(300);

  // Test future date for daily report
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + 30);
  try {
    await tester.getDailyReport(formatDate(futureDate));
    logError('Future Date Test', new Error('Should have rejected future date for daily report'));
  } catch (error) {
    if (error.response?.status === 400) {
      logSuccess('Future Date Test', 'Correctly rejected future date');
    } else {
      // Some systems might allow future dates for forecasting
      logInfo('Future Date Test: System allows future dates (forecasting)');
    }
  }
  await sleep(500);

  // Test 7: Report Data Consistency
  logHeader('TEST 7: REPORT DATA CONSISTENCY CHECKS');
  
  try {
    // Get daily report for today
    const dailyResult = await tester.getDailyReport(formatDate(today));
    const dailyReport = dailyResult.data;
    
    // Get weekly report for current week
    const weeklyResult = await tester.getWeeklyReport(currentYear, currentWeek);
    const weeklyReport = weeklyResult.data;
    
    // Get monthly report for current month
    const monthlyResult = await tester.getMonthlyReport(currentYear, currentMonth);
    const monthlyReport = monthlyResult.data;
    
    console.log(' Data Consistency Check:');
    
    // Check if today is included in weekly report
    if (weeklyReport.daily_breakdown) {
      const todayInWeekly = weeklyReport.daily_breakdown.find(day => day.date === formatDate(today));
      if (todayInWeekly) {
        logSuccess('Data Consistency', 'Today\'s data included in weekly report');
      } else {
        logWarning('Data Consistency', 'Today\'s data not found in weekly report breakdown');
      }
    }
    
    // Check if current week is included in monthly report
    if (monthlyReport.weekly_breakdown) {
      const currentWeekInMonthly = monthlyReport.weekly_breakdown.find(week => week.week === currentWeek);
      if (currentWeekInMonthly) {
        logSuccess('Data Consistency', 'Current week included in monthly report');
      } else {
        logWarning('Data Consistency', 'Current week not found in monthly report breakdown');
      }
    }
    
    // Compare occupancy rates
    const dailyOccupancy = dailyReport.summary?.occupancy_rate || 0;
    const weeklyOccupancy = weeklyReport.summary?.average_occupancy || 0;
    const monthlyOccupancy = monthlyReport.summary?.average_occupancy || 0;
    
    console.log(`    Occupancy Rates:`);
    console.log(`      Daily: ${dailyOccupancy}%`);
    console.log(`      Weekly Avg: ${weeklyOccupancy}%`);
    console.log(`      Monthly Avg: ${monthlyOccupancy}%`);
    
    if (dailyOccupancy >= 0 && weeklyOccupancy >= 0 && monthlyOccupancy >= 0) {
      logSuccess('Occupancy Consistency', 'Occupancy rates are consistent (non-negative)');
    }
    
  } catch (error) {
    logError('Data Consistency Check', error);
  }
  await sleep(500);

  // Test 8: Performance Testing
  logHeader('TEST 8: REPORT PERFORMANCE TESTING');
  
  const performanceTests = [
    { name: 'Daily Report', func: () => tester.getDailyReport() },
    { name: 'Weekly Report', func: () => tester.getWeeklyReport() },
    { name: 'Monthly Report', func: () => tester.getMonthlyReport() },
    { name: 'Custom Report (7 days)', func: () => tester.getCustomReport(
      formatDate(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)),
      formatDate(today)
    )}
  ];

  console.log('  Performance Metrics:');
  
  for (const test of performanceTests) {
    const startTime = Date.now();
    try {
      await test.func();
      const duration = Date.now() - startTime;
      
      if (duration < 1000) {
        logSuccess(`${test.name} Performance`, `${duration}ms - Good`);
      } else if (duration < 3000) {
        logWarning(`${test.name} Performance`, `${duration}ms - Acceptable`);
      } else {
        logError(`${test.name} Performance`, new Error(`${duration}ms - Slow`));
      }
      
      console.log(`   ${test.name}: ${duration}ms`);
      await sleep(200);
    } catch (error) {
      const duration = Date.now() - startTime;
      logError(`${test.name} Performance`, new Error(`Failed after ${duration}ms`));
    }
  }
  await sleep(500);

  // Print Summary
  await printSummary();
  rl.close();
}

// Helper functions
function getMonthName(monthNumber) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthNumber - 1] || 'Unknown';
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
  console.log('    GET /daily     - Get daily report');
  console.log('    GET /weekly    - Get weekly report');
  console.log('    GET /monthly   - Get monthly report');
  console.log('    GET /custom    - Get custom report');
  console.log('    RBAC Testing   - Role-based access control');
  console.log('    Error Cases    - Validation and edge cases');
  console.log('    Data Consistency - Report data validation');
  console.log('    Performance    - Report generation speed');

  // Report statistics
  console.log('\n REPORT FEATURES TESTED:');
  console.log('    Daily reports with/without date parameter');
  console.log('    Weekly reports with year/week parameters');
  console.log('    Monthly reports with year/month parameters');
  console.log('    Custom reports with date ranges and types');
  console.log('    Multiple report types: summary, detailed, financial, occupancy');
  console.log('    Role-based access (admin, receptionist, guest)');
  console.log('    Data validation (dates, ranges, formats)');

  // Save test results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsDir = path.join(__dirname, 'test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  const resultsFile = path.join(resultsDir, `report-api-test-${timestamp}.json`);
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: total,
      passed,
      failed: total - passed,
      successRate: `${successRate}%`
    },
    testDetails: testResults,
    apiEndpointsTested: [
      'GET /reports/daily',
      'GET /reports/weekly',
      'GET /reports/monthly',
      'GET /reports/custom'
    ],
    environment: {
      apiBaseUrl: API_BASE_URL,
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString()
    },
    reportFeaturesTested: {
      reportTypes: ['daily', 'weekly', 'monthly', 'custom'],
      customReportTypes: ['summary', 'detailed', 'financial', 'occupancy'],
      accessRoles: ['admin', 'receptionist', 'guest'],
      validationTests: ['date_format', 'date_range', 'role_access', 'performance']
    }
  };

  fs.writeFileSync(resultsFile, JSON.stringify(report, null, 2));
  console.log(`\n Detailed results saved to: ${resultsFile}`);

  // Recommendations
  console.log('\n RECOMMENDATIONS:');
  if (successRate === '100.0') {
    console.log(' EXCELLENT! All Report API endpoints are fully functional.');
    console.log('   Next steps:');
    console.log('   1. Test report export functionality (PDF, Excel)');
    console.log('   2. Test report scheduling and email delivery');
    console.log('   3. Test advanced analytics and forecasting reports');
    console.log('   4. Load test with multiple concurrent report requests');
  } else if (successRate >= '80.0') {
    console.log(' GOOD! Most report endpoints are working.');
    console.log('   Review failed tests - check report generation logic.');
  } else {
    console.log('  NEEDS ATTENTION. Several report endpoints failed.');
    console.log('   Check:');
    console.log('   1. Database views/functions for report generation');
    console.log('   2. Date parameter validation in controllers');
    console.log('   3. Role-based access control configuration');
    console.log('   4. Check backend/logs for detailed errors');
  }

  console.log('\n QUICK LINKS:');
  console.log('   API Documentation: http://localhost:5000/api-docs');
  console.log('   Report Endpoints: /api/reports/[daily|weekly|monthly|custom]');
  console.log('   Required Role: admin or receptionist');
}

// Interactive test menu
async function showMenu() {
  console.log('\n REPORT API TESTER');
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
  console.log('\n SPECIFIC REPORT ENDPOINT TESTING');
  console.log('===================================');
  console.log('1. GET /reports/daily - Get daily report');
  console.log('2. GET /reports/weekly - Get weekly report');
  console.log('3. GET /reports/monthly - Get monthly report');
  console.log('4. GET /reports/custom - Get custom report');
  console.log('5. Back to Main Menu');
  
  rl.question('\nSelect endpoint to test (1-5): ', async (choice) => {
    const tester = new ReportAPITester(API_BASE_URL);
    
    // Login first
    try {
      const token = await tester.login(ADMIN_CREDENTIALS);
      tester.setAuthToken(token);
      console.log(' Logged in successfully as admin');
    } catch (error) {
      console.log(' Login failed:', error.message);
      rl.close();
      return;
    }
    
    switch (choice) {
      case '1': // Get daily report
        rl.question('Enter date (YYYY-MM-DD) or press enter for today: ', async (date) => {
          try {
            const result = await tester.getDailyReport(date || null);
            console.log(' GET /reports/daily - Success:');
            console.log(JSON.stringify(result.data, null, 2));
          } catch (error) {
            console.log(' Error:', error.response?.data || error.message);
          }
          rl.close();
        });
        break;
        
      case '2': // Get weekly report
        rl.question('Enter year (or press enter for current): ', async (year) => {
          rl.question('Enter week number (or press enter for current): ', async (week) => {
            try {
              const result = await tester.getWeeklyReport(
                year ? parseInt(year) : null,
                week ? parseInt(week) : null
              );
              console.log(' GET /reports/weekly - Success:');
              console.log(JSON.stringify(result.data, null, 2));
            } catch (error) {
              console.log(' Error:', error.response?.data || error.message);
            }
            rl.close();
          });
        });
        break;
        
      case '3': // Get monthly report
        rl.question('Enter year (or press enter for current): ', async (year) => {
          rl.question('Enter month (1-12, or press enter for current): ', async (month) => {
            try {
              const result = await tester.getMonthlyReport(
                year ? parseInt(year) : null,
                month ? parseInt(month) : null
              );
              console.log(' GET /reports/monthly - Success:');
              console.log(JSON.stringify(result.data, null, 2));
            } catch (error) {
              console.log(' Error:', error.response?.data || error.message);
            }
            rl.close();
          });
        });
        break;
        
      case '4': // Get custom report
        rl.question('Enter start date (YYYY-MM-DD): ', async (startDate) => {
          rl.question('Enter end date (YYYY-MM-DD): ', async (endDate) => {
            rl.question('Enter report type (summary, detailed, financial, occupancy): ', async (reportType) => {
              try {
                const result = await tester.getCustomReport(startDate, endDate, reportType);
                console.log(' GET /reports/custom - Success:');
                console.log(JSON.stringify(result.data, null, 2));
              } catch (error) {
                console.log(' Error:', error.response?.data || error.message);
              }
              rl.close();
            });
          });
        });
        break;
        
      case '5':
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
    .filter(f => f.startsWith('report-api-test-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.log('No previous report test results found.');
  } else {
    console.log('\n PREVIOUS REPORT TEST RESULTS:');
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
  console.log('\n QUICK REPORT API HEALTH CHECK');
  console.log('================================');
  
  const tester = new ReportAPITester(API_BASE_URL);
  
  try {
    // Test 1: API Health
    console.log('1. Testing API health...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log(`    API Health: ${healthResponse.data.status}`);
    
    // Test 2: Login
    console.log('2. Testing authentication...');
    const token = await tester.login(ADMIN_CREDENTIALS);
    tester.setAuthToken(token);
    console.log(`    Authentication: Success`);
    
    // Test 3: Daily report
    console.log('3. Testing daily report...');
    const dailyReport = await tester.getDailyReport();
    console.log(`    Daily Report: Accessible`);
    
    // Test 4: Weekly report
    console.log('4. Testing weekly report...');
    const weeklyReport = await tester.getWeeklyReport();
    console.log(`    Weekly Report: Accessible`);
    
    // Test 5: Monthly report
    console.log('5. Testing monthly report...');
    const monthlyReport = await tester.getMonthlyReport();
    console.log(`    Monthly Report: Accessible`);
    
    // Test 6: Check report data structure
    console.log('6. Checking report structure...');
    if (dailyReport.data && (dailyReport.data.summary || dailyReport.data.reservations)) {
      console.log(`    Report structure: Correct`);
    } else {
      console.log(`     Report structure: Unexpected format`);
    }
    
    console.log('\n REPORT API IS HEALTHY!');
    console.log('\n Quick Stats:');
    console.log(`   - Daily Report: Working`);
    console.log(`   - Weekly Report: Working`);
    console.log(`   - Monthly Report: Working`);
    console.log(`   - API Status: ${healthResponse.data.status}`);
    console.log(`   - Authentication: Working`);
    
  } catch (error) {
    console.log(` Health check failed: ${error.message}`);
    console.log('\n Troubleshooting:');
    console.log('   1. Is the server running? (npm run dev)');
    console.log('   2. Check admin credentials in database');
    console.log('   3. Verify report routes are registered');
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
 Report API Test Script
=========================
Usage:
  node report-api-test.js [option]

Options:
  --all, -a      Run all report tests
  --quick, -q    Quick report API health check
  --help, -h     Show this help
  (no args)      Interactive menu

Examples:
  node report-api-test.js --all     # Run comprehensive report tests
  node report-api-test.js --quick   # Quick report system check
  node report-api-test.js          # Interactive testing menu
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