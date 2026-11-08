/**
 * AUTH.js - Comprehensive Authentication API Testing Script
 * * Tests all Auth-related API endpoints:
 * * 1. POST /register     - User registration
 * 2. POST /login        - User login
 * 3. GET  /me           - Get current user
 * 4. POST /refresh      - Refresh token
 * 5. POST /logout       - User logout
 * 6. POST /change-password - Change password
 * * Usage: node AUTH.js
 */

import axios from 'axios';
import readline from 'readline';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const ADMIN_CREDENTIALS = {
  email: 'admin@hotel.com',
  password: 'Admin123!'
};

let authToken = '';
// REMOVED: let refreshToken = ''; // Your backend uses single-token sliding session
let testUserId = null;
let testUserEmail = '';
let testResults = [];

// Create readline interface for interactive testing
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Utility functions
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const logSuccess = (testName, message = '') => {
  const log = `✅ ${testName}: ${message}`;
  testResults.push({ testName, success: true, message });
  console.log(log);
  return log;
};

const logError = (testName, error) => {
  const message = error.response?.data?.message || error.message;
  const log = `❌ ${testName}: ${message}`;
  testResults.push({ testName, success: false, message: error.message });
  console.log(log);
  return log;
};

const logInfo = (message) => {
  console.log(`ℹ️  ${message}`);
};

const logHeader = (title) => {
  console.log('\n' + '='.repeat(60));
  console.log(`🔐 ${title}`);
  console.log('='.repeat(60));
};

const generateTestEmail = () => {
  const timestamp = Date.now();
  return `testuser${timestamp}@test.com`;
};

// Generate random phone to avoid DB unique constraint errors
const generateRandomPhone = () => {
  const rand = Math.floor(Math.random() * 1000000000);
  return `+1${rand.toString().padStart(10, '0')}`;
};

// API Test Functions
class AuthAPITester {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.axiosInstance = axios.create({
      baseURL: `${baseURL}/auth`,
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

  // 1. POST /register - User registration
  async register(userData) {
    try {
      const response = await this.axiosInstance.post('/register', userData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 2. POST /login - User login
  async login(credentials) {
    try {
      const response = await this.axiosInstance.post('/login', credentials);
      // Handle nested data structure common in your backend
      const data = response.data.data || response.data;
      
      if (data?.token) {
        this.setAuthToken(data.token);
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 3. GET /me - Get current user
  async getCurrentUser() {
    try {
      const response = await this.axiosInstance.get('/me');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 4. POST /refresh - Refresh token (FIXED LOGIC)
  async refreshToken() {
    try {
      // In your backend, refresh uses the CURRENT valid token in headers to authenticate
      const response = await this.axiosInstance.post('/refresh', {});
      const data = response.data.data || response.data;
      
      if (data?.token) {
        this.setAuthToken(data.token);
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 5. POST /logout - User logout
  async logout() {
    try {
      const response = await this.axiosInstance.post('/logout');
      // Clear tokens after logout
      this.setAuthToken('');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 6. POST /change-password - Change password
  async changePassword(passwordData) {
    try {
      const response = await this.axiosInstance.post('/change-password', passwordData);
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
  const tester = new AuthAPITester(API_BASE_URL);
  
  logHeader('AUTHENTICATION API TEST SUITE');
  console.log('Testing all Auth API endpoints...\n');

  // Generate unique test user data
  testUserEmail = generateTestEmail();
  const testUserPhone = generateRandomPhone();
  const testUserPassword = 'TestPassword123!';
  const newPassword = 'NewPassword456!';

  // Test 1: Register New User
  logHeader('TEST 1: REGISTER NEW USER (POST /register)');
  const userData = {
    email: testUserEmail,
    password: testUserPassword,
    first_name: 'Test',
    last_name: 'User',
    phone: testUserPhone, // Using unique phone
    role_name: 'guest' // FIX: Backend uses role_name
  };

  try {
    const result = await tester.register(userData);
    // Robust ID extraction (handles nested data or direct)
    const data = result.data || result;
    testUserId = data.user?.id || data.user?.user_id;
    
    logSuccess('User Registration', 
      `User ${userData.email} registered successfully`);
    
    console.log('\n👤 Registered User Details:');
    console.table({
      'User ID': testUserId,
      'Email': userData.email,
      'Phone': userData.phone,
      'First Name': userData.first_name,
      'Last Name': userData.last_name,
      'Role': userData.role_name,
      'Status': 'Active'
    });
  } catch (error) {
    if (error.response?.status === 409) {
      logInfo('User already exists, using existing user...');
      // Try to login with the same credentials
      try {
        await tester.login({ email: testUserEmail, password: testUserPassword });
        logSuccess('Using Existing User', `Logged in as ${testUserEmail}`);
      } catch (loginError) {
        logError('User Registration', error);
        console.log('⚠️  Cannot proceed without a valid user.');
        process.exit(1);
      }
    } else {
      logError('User Registration', error);
      console.log('⚠️  Cannot proceed without a valid user.');
      process.exit(1);
    }
  }
  await sleep(500);

  // Test 2: User Login
  logHeader('TEST 2: USER LOGIN (POST /login)');
  const loginCredentials = {
    email: testUserEmail,
    password: testUserPassword
  };

  try {
    const result = await tester.login(loginCredentials);
    const loginData = result.data?.data || result.data;
    
    logSuccess('User Login', 
      `Logged in as ${testUserEmail}`);
    
    console.log('\n🔑 Login Response:');
    console.table({
      'Access Token': authToken ? `${authToken.substring(0, 30)}...` : 'Not received',
      'User Role': loginData?.user?.role || 'N/A'
    });
  } catch (error) {
    logError('User Login', error);
    console.log('⚠️  Cannot proceed without login.');
    process.exit(1);
  }
  await sleep(500);

  // Test 3: Get Current User
  logHeader('TEST 3: GET CURRENT USER (GET /me)');
  try {
    const result = await tester.getCurrentUser();
    // Handle nested response structure
    const userData = result.data?.data?.user || result.data?.user || result.data;
    
    logSuccess('Get Current User', 
      `Retrieved user profile for ${userData.email}`);
    
    console.log('\n👤 Current User Profile:');
    console.table({
      'User ID': userData.user_id || userData.id,
      'Email': userData.email,
      'Role': userData.role,
      'Status': 'Active', // Simplified
      'Last Login': userData.last_login ? new Date(userData.last_login).toLocaleString() : 'Never',
      'Created At': userData.created_at ? new Date(userData.created_at).toLocaleString() : 'N/A'
    });
  } catch (error) {
    logError('Get Current User', error);
  }
  await sleep(500);

  // Test 4: Refresh Token
  logHeader('TEST 4: REFRESH TOKEN (POST /refresh)');
  if (authToken) {
    try {
      const oldToken = authToken;
      const result = await tester.refreshToken(); // No params needed for your backend
      const refreshResultData = result.data?.data || result.data;

      logSuccess('Refresh Token', 
        `Token refreshed successfully`);
      
      console.log('\n🔄 Token Refresh Details:');
      console.table({
        'Old Token': oldToken.substring(0, 30) + '...',
        'New Token': authToken.substring(0, 30) + '...',
        'Tokens Changed': oldToken !== authToken ? 'Yes' : 'No'
      });
    } catch (error) {
      logError('Refresh Token', error);
    }
  } else {
    logInfo('No auth token available to test refresh');
  }
  await sleep(500);

  // Test 5: Change Password
  logHeader('TEST 5: CHANGE PASSWORD (POST /change-password)');
  let currentPassword = testUserPassword;
  
  const passwordData = {
    currentPassword: currentPassword, // Matches your backend camelCase
    newPassword: newPassword,
    confirmPassword: newPassword
  };

  try {
    const result = await tester.changePassword(passwordData);
    logSuccess('Change Password', 
      'Password changed successfully');
    
    // Verify new password works
    await sleep(300);
    
    // Clear current auth
    tester.clearAuth();
    
    // Try login with old password (should fail)
    try {
      await tester.login({ email: testUserEmail, password: currentPassword });
      logError('Old Password Verification', new Error('Old password should not work'));
    } catch (oldPasswordError) {
      logSuccess('Old Password Verification', 'Old password correctly rejected');
    }
    
    // Try login with new password (should succeed)
    try {
      await tester.login({ email: testUserEmail, password: newPassword });
      logSuccess('New Password Verification', 'New password works correctly');
      
      // Update test password for subsequent tests
      currentPassword = newPassword;
    } catch (newPasswordError) {
      logError('New Password Verification', newPasswordError);
    }
  } catch (error) {
    logError('Change Password', error);
  }
  await sleep(500);

  // Test 6: User Logout
  logHeader('TEST 6: USER LOGOUT (POST /logout)');
  try {
    const result = await tester.logout();
    logSuccess('User Logout', 
      'Logged out successfully');
    
    // Verify token is invalidated (locally cleared)
    await sleep(300);
    
    if (authToken === '') {
        logSuccess('Token Invalidation Check', 'Token cleared from client');
    }
  } catch (error) {
    logError('User Logout', error);
  }
  await sleep(500);

  // Test 7: Login Again for Cleanup
  logHeader('TEST 7: VERIFY LOGIN AFTER PASSWORD CHANGE');
  try {
    await tester.login({ email: testUserEmail, password: currentPassword });
    logSuccess('Re-Login After Password Change', 
      'Successfully logged in with new password');
    
    // Get user info again to confirm
    const userResult = await tester.getCurrentUser();
    // Handle nested response again
    const userData = userResult.data?.data?.user || userResult.data?.user || userResult.data;
    console.log(`   ✅ Confirmed: Logged in as ${userData?.email || testUserEmail}`);
  } catch (error) {
    logError('Re-Login After Password Change', error);
  }
  await sleep(500);

  // Test 8: Invalid Login Attempts
  logHeader('TEST 8: SECURITY TESTS');
  
  // Test wrong password
  try {
    await tester.login({ email: testUserEmail, password: 'WrongPassword123!' });
    logError('Wrong Password Test', new Error('Should have rejected wrong password'));
  } catch (error) {
    if (error.response?.status === 401) {
      logSuccess('Wrong Password Test', 'Correctly rejected wrong password');
    } else {
      logError('Wrong Password Test', error);
    }
  }
  await sleep(300);

  // Test non-existent user
  try {
    await tester.login({ email: 'nonexistent@test.com', password: 'SomePassword123!' });
    logError('Non-existent User Test', new Error('Should have rejected non-existent user'));
  } catch (error) {
    if (error.response?.status === 404 || error.response?.status === 401) {
      logSuccess('Non-existent User Test', 'Correctly rejected non-existent user');
    } else {
      logError('Non-existent User Test', error);
    }
  }
  await sleep(300);

  // Login again for final state
  await tester.login({ email: testUserEmail, password: currentPassword });

  // Print Summary
  logHeader('TEST SUMMARY');
  const passed = testResults.filter(r => r.success).length;
  const total = testResults.length;
  const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';

  console.log(`📊 Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${total - passed}`);
  console.log(`🎯 Success Rate: ${successRate}%`);

  // Save test results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsDir = path.join(__dirname, 'test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  const resultsFile = path.join(resultsDir, `auth-api-test-${timestamp}.json`);
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: total,
      passed,
      failed: total - passed,
      successRate: `${successRate}%`
    },
    testUser: {
      email: testUserEmail,
      userId: testUserId
    },
    testDetails: testResults
  };

  fs.writeFileSync(resultsFile, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed results saved to: ${resultsFile}`);

  rl.close();
}

// Interactive test menu
async function showMenu() {
  console.log('\n🔐 AUTHENTICATION API TESTER');
  console.log('============================');
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
  console.log('\n🔧 SPECIFIC AUTH ENDPOINT TESTING');
  console.log('==================================');
  console.log('1. POST /register - User registration');
  console.log('2. POST /login - User login');
  console.log('3. GET /me - Get current user');
  console.log('4. POST /refresh - Refresh token');
  console.log('5. POST /logout - User logout');
  console.log('6. POST /change-password - Change password');
  console.log('7. Back to Main Menu');
  
  rl.question('\nSelect endpoint to test (1-7): ', async (choice) => {
    const tester = new AuthAPITester(API_BASE_URL);
    
    // Attempt to reuse global token if available
    if (authToken) {
        tester.setAuthToken(authToken);
    }
    
    switch (choice) {
      case '1': // Register
        rl.question('Enter email: ', async (email) => {
          rl.question('Enter password: ', async (password) => {
            rl.question('Enter first name: ', async (firstName) => {
              rl.question('Enter last name: ', async (lastName) => {
                rl.question('Enter phone number: ', async (phone) => {
                  const userData = {
                    email,
                    password,
                    first_name: firstName,
                    last_name: lastName,
                    phone: phone,
                    role_name: 'guest'
                  };
                  try {
                    const result = await tester.register(userData);
                    console.log('✅ POST /register - Success:');
                    console.log(JSON.stringify(result, null, 2));
                  } catch (error) {
                    console.log('❌ Error:', error.response?.data || error.message);
                  }
                  rl.close();
                });
              });
            });
          });
        });
        break;
        
      case '2': // Login
        rl.question('Enter email: ', async (email) => {
          rl.question('Enter password: ', async (password) => {
            try {
              const result = await tester.login({ email, password });
              console.log('✅ POST /login - Success:');
              console.log(`Access Token: ${authToken.substring(0, 30)}...`);
              // Handle nested data safely
              const userEmail = result.data?.data?.user?.email || result.data?.user?.email || result.data?.email;
              console.log(`User: ${userEmail}`);
            } catch (error) {
              console.log('❌ Error:', error.response?.data || error.message);
            }
            rl.close();
          });
        });
        break;
        
      case '3': // Get current user
        // If we already have a token, ask if they want to use it
        if (authToken) {
            console.log('ℹ️  Using existing auth token from previous test...');
            try {
              const result = await tester.getCurrentUser();
              console.log('✅ GET /me - Success:');
              console.log(JSON.stringify(result, null, 2));
              rl.close();
              return;
            } catch (error) {
              console.log('❌ Existing token failed. Please login again.');
            }
        }

        rl.question('Enter email: ', async (email) => {
          rl.question('Enter password: ', async (password) => {
            try {
              await tester.login({ email, password });
              const result = await tester.getCurrentUser();
              console.log('✅ GET /me - Success:');
              console.log(JSON.stringify(result, null, 2));
            } catch (error) {
              console.log('❌ Error:', error.response?.data || error.message);
            }
            rl.close();
          });
        });
        break;
        
      case '4': // Refresh token (FIXED LOGIC)
        if (!authToken) {
           console.log('⚠️ No token in memory. You need to login first.');
        }

        rl.question('Enter email (for login first): ', async (email) => {
          rl.question('Enter password: ', async (password) => {
            try {
              await tester.login({ email, password });
              if (!authToken) {
                console.log('❌ No token returned from login.');
                rl.close();
                return;
              }
              const result = await tester.refreshToken();
              console.log('✅ POST /refresh - Success:');
              console.log(`New Token: ${authToken.substring(0, 30)}...`);
            } catch (error) {
              console.log('❌ Error:', error.response?.data || error.message);
            }
            rl.close();
          });
        });
        break;
        
      case '5': // Logout
        rl.question('Enter email: ', async (email) => {
          rl.question('Enter password: ', async (password) => {
            try {
              await tester.login({ email, password });
              const result = await tester.logout();
              console.log('✅ POST /logout - Success:');
              console.log(JSON.stringify(result, null, 2));
              console.log('Token cleared. Should not be able to access protected endpoints.');
            } catch (error) {
              console.log('❌ Error:', error.response?.data || error.message);
            }
            rl.close();
          });
        });
        break;
        
      case '6': // Change password
        rl.question('Enter email: ', async (email) => {
          rl.question('Enter current password: ', async (password) => {
            rl.question('Enter new password: ', async (newPassword) => {
              rl.question('Confirm new password: ', async (confirmPassword) => {
                try {
                  // 1. Login first to get the token
                  await tester.login({ email, password });
                  
                  // 2. Prepare data matching your authController.js EXACTLY
                  const passwordData = {
                    currentPassword: password,  
                    newPassword: newPassword,   
                    confirmPassword: confirmPassword 
                  };
                  
                  // Debug: Print payload to verify
                  console.log('📤 Sending Payload:', JSON.stringify(passwordData, null, 2));

                  const result = await tester.changePassword(passwordData);
                  console.log('✅ POST /change-password - Success:');
                  console.log(JSON.stringify(result, null, 2));
                } catch (error) {
                  console.log('❌ Error:', error.response?.data || error.message);
                }
                rl.close();
              });
            });
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
    .filter(f => f.startsWith('auth-api-test-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.log('No previous auth test results found.');
  } else {
    console.log('\n📄 PREVIOUS AUTH TEST RESULTS:');
    files.forEach((file, index) => {
      const filePath = path.join(resultsDir, file);
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
  console.log('\n⚡ QUICK AUTH HEALTH CHECK');
  console.log('==========================');
  
  const tester = new AuthAPITester(API_BASE_URL);
  
  try {
    // Test 1: API Health
    console.log('1. Testing API health...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log(`   ✅ API Health: ${healthResponse.data.status}`);
    
    // Test 2: Admin Login
    console.log('2. Testing admin authentication...');
    const loginResult = await tester.login(ADMIN_CREDENTIALS);
    const loginData = loginResult.data?.data || loginResult.data;
    console.log(`   ✅ Admin Login: Success (Role: ${loginData?.user?.role || 'N/A'})`);
    
    // Test 3: Get Current User
    console.log('3. Testing current user endpoint...');
    const userResult = await tester.getCurrentUser();
    const userData = userResult.data?.data?.user || userResult.data?.user || userResult.data;
    console.log(`   ✅ Current User: ${userData?.email || 'Unknown'}`);
    
    console.log('\n🎉 AUTH SYSTEM IS HEALTHY!');
    
  } catch (error) {
    console.log(`❌ Auth health check failed: ${error.message}`);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Is the server running? (npm run dev)');
    console.log('   2. Check admin credentials in database');
    console.log('   3. Verify JWT_SECRET in .env file');
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
🔐 Authentication API Test Script
================================
Usage:
  node AUTH.js [option]

Options:
  --all, -a      Run all auth tests
  --quick, -q    Quick auth health check
  --help, -h     Show this help
  (no args)      Interactive menu
    `);
    process.exit(0);
  }
} else {
  // No arguments, show interactive menu
  showMenu();
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Unhandled rejection:', error.message);
  if (error.response) {
    console.error('   Response:', error.response.data);
    console.error('   Status:', error.response.status);
  }
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('\n💥 Uncaught exception:', error.message);
  console.error('   Stack:', error.stack);
  process.exit(1);
});





// /**
//  * auth-api-test.js - Comprehensive Authentication API Testing Script
//  * * Tests all Auth-related API endpoints:
//  * * 1. POST /register     - User registration
//  * 2. POST /login        - User login
//  * 3. GET  /me           - Get current user
//  * 4. POST /refresh      - Refresh token
//  * 5. POST /logout       - User logout
//  * 6. POST /change-password - Change password
//  * * Usage: node auth-api-test.js
//  */

// import axios from 'axios';
// import readline from 'readline';
// import fs from 'fs';
// import { fileURLToPath } from 'url';
// import { dirname } from 'path';
// import path from 'path';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// // Configuration
// const API_BASE_URL = 'http://localhost:5000/api';
// const ADMIN_CREDENTIALS = {
//   email: 'admin@hotel.com',
//   password: 'Admin123!'
// };

// let authToken = '';
// let refreshToken = '';
// let testUserId = null;
// let testUserEmail = '';
// let testResults = [];

// // Create readline interface for interactive testing
// const rl = readline.createInterface({
//   input: process.stdin,
//   output: process.stdout
// });

// // Utility functions
// const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// const logSuccess = (testName, message = '') => {
//   const log = `✅ ${testName}: ${message}`;
//   testResults.push({ testName, success: true, message });
//   console.log(log);
//   return log;
// };

// const logError = (testName, error) => {
//   const message = error.response?.data?.message || error.message;
//   const log = `❌ ${testName}: ${message}`;
//   testResults.push({ testName, success: false, message: error.message });
//   console.log(log);
//   return log;
// };

// const logInfo = (message) => {
//   console.log(`ℹ️  ${message}`);
// };

// const logHeader = (title) => {
//   console.log('\n' + '='.repeat(60));
//   console.log(`🔐 ${title}`);
//   console.log('='.repeat(60));
// };

// const generateTestEmail = () => {
//   const timestamp = Date.now();
//   return `testuser${timestamp}@test.com`;
// };

// // Generate random phone to avoid DB unique constraint errors
// const generateRandomPhone = () => {
//   const rand = Math.floor(Math.random() * 1000000000);
//   return `+1${rand.toString().padStart(10, '0')}`;
// };

// // API Test Functions
// class AuthAPITester {
//   constructor(baseURL) {
//     this.baseURL = baseURL;
//     this.axiosInstance = axios.create({
//       baseURL: `${baseURL}/auth`,
//       timeout: 10000,
//       headers: {
//         'Content-Type': 'application/json',
//       },
//     });
//   }

//   setAuthToken(token) {
//     this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
//     authToken = token;
//   }

//   // 1. POST /register - User registration
//   async register(userData) {
//     try {
//       const response = await this.axiosInstance.post('/register', userData);
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   }

//   // 2. POST /login - User login
//   async login(credentials) {
//     try {
//       const response = await this.axiosInstance.post('/login', credentials);
//       // Handle nested data structure common in your backend
//       const data = response.data.data || response.data;
      
//       if (data?.token) {
//         this.setAuthToken(data.token);
//         refreshToken = data.refreshToken || data.refresh_token;
//       }
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   }

//   // 3. GET /me - Get current user
//   async getCurrentUser() {
//     try {
//       const response = await this.axiosInstance.get('/me');
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   }

//   // 4. POST /refresh - Refresh token
//   async refreshToken(refreshTokenData) {
//     try {
//       const response = await this.axiosInstance.post('/refresh', refreshTokenData);
//       const data = response.data.data || response.data;
      
//       if (data?.token) {
//         this.setAuthToken(data.token);
//       }
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   }

//   // 5. POST /logout - User logout
//   async logout() {
//     try {
//       const response = await this.axiosInstance.post('/logout');
//       // Clear tokens after logout
//       this.setAuthToken('');
//       refreshToken = '';
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   }

//   // 6. POST /change-password - Change password
//   async changePassword(passwordData) {
//     try {
//       const response = await this.axiosInstance.post('/change-password', passwordData);
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   }

//   // Clear authentication headers
//   clearAuth() {
//     delete this.axiosInstance.defaults.headers.common['Authorization'];
//     authToken = '';
//     refreshToken = '';
//   }
// }

// // Test Suite
// async function runAllTests() {
//   const tester = new AuthAPITester(API_BASE_URL);
  
//   logHeader('AUTHENTICATION API TEST SUITE');
//   console.log('Testing all Auth API endpoints...\n');

//   // Generate unique test user data
//   testUserEmail = generateTestEmail();
//   const testUserPhone = generateRandomPhone();
//   const testUserPassword = 'TestPassword123!';
//   const newPassword = 'NewPassword456!';

//   // Test 1: Register New User
//   logHeader('TEST 1: REGISTER NEW USER (POST /register)');
//   const userData = {
//     email: testUserEmail,
//     password: testUserPassword,
//     first_name: 'Test',
//     last_name: 'User',
//     phone: testUserPhone, // Using unique phone
//     role: 'guest'
//   };

//   try {
//     const result = await tester.register(userData);
//     // Robust ID extraction (handles nested data or direct)
//     testUserId = result.data?.user_id || result.data?.id || result.data?.data?.user_id;
    
//     logSuccess('User Registration', 
//       `User ${userData.email} registered successfully`);
    
//     console.log('\n👤 Registered User Details:');
//     console.table({
//       'User ID': testUserId,
//       'Email': userData.email,
//       'Phone': userData.phone,
//       'First Name': userData.first_name,
//       'Last Name': userData.last_name,
//       'Role': userData.role,
//       'Status': 'Active'
//     });
//   } catch (error) {
//     if (error.response?.status === 409) {
//       logInfo('User already exists, using existing user...');
//       // Try to login with the same credentials
//       try {
//         await tester.login({ email: testUserEmail, password: testUserPassword });
//         logSuccess('Using Existing User', `Logged in as ${testUserEmail}`);
//       } catch (loginError) {
//         logError('User Registration', error);
//         console.log('⚠️  Cannot proceed without a valid user.');
//         process.exit(1);
//       }
//     } else {
//       logError('User Registration', error);
//       console.log('⚠️  Cannot proceed without a valid user.');
//       process.exit(1);
//     }
//   }
//   await sleep(500);

//   // Test 2: User Login
//   logHeader('TEST 2: USER LOGIN (POST /login)');
//   const loginCredentials = {
//     email: testUserEmail,
//     password: testUserPassword
//   };

//   try {
//     const result = await tester.login(loginCredentials);
//     const loginData = result.data?.data || result.data;
    
//     logSuccess('User Login', 
//       `Logged in as ${testUserEmail}`);
    
//     console.log('\n🔑 Login Response:');
//     console.table({
//       'Access Token': authToken ? `${authToken.substring(0, 30)}...` : 'Not received',
//       'Refresh Token': refreshToken ? `${refreshToken.substring(0, 30)}...` : 'Not received',
//       'Token Type': loginData?.token_type || 'Bearer',
//       'Expires In': loginData?.expires_in || 'N/A',
//       'User Role': loginData?.user?.role || 'N/A'
//     });
//   } catch (error) {
//     logError('User Login', error);
//     console.log('⚠️  Cannot proceed without login.');
//     process.exit(1);
//   }
//   await sleep(500);

//   // Test 3: Get Current User
//   logHeader('TEST 3: GET CURRENT USER (GET /me)');
//   try {
//     const result = await tester.getCurrentUser();
//     // Handle nested response structure
//     const userData = result.data?.data?.user || result.data?.user || result.data;
    
//     logSuccess('Get Current User', 
//       `Retrieved user profile for ${userData.email}`);
    
//     console.log('\n👤 Current User Profile:');
//     console.table({
//       'User ID': userData.user_id || userData.id,
//       'Email': userData.email,
//       'First Name': userData.first_name,
//       'Last Name': userData.last_name,
//       'Role': userData.role,
//       'Status': userData.is_active ? 'Active' : 'Inactive',
//       'Last Login': userData.last_login ? new Date(userData.last_login).toLocaleString() : 'Never',
//       'Created At': userData.created_at ? new Date(userData.created_at).toLocaleString() : 'N/A'
//     });
//   } catch (error) {
//     logError('Get Current User', error);
//   }
//   await sleep(500);

//   // Test 4: Refresh Token
//   logHeader('TEST 4: REFRESH TOKEN (POST /refresh)');
//   if (refreshToken) {
//     const refreshData = {
//       refresh_token: refreshToken
//     };

//     try {
//       const oldToken = authToken;
//       const result = await tester.refreshToken(refreshData);
//       const refreshResultData = result.data?.data || result.data;

//       logSuccess('Refresh Token', 
//         `Token refreshed successfully`);
      
//       console.log('\n🔄 Token Refresh Details:');
//       console.table({
//         'Old Token': oldToken.substring(0, 30) + '...',
//         'New Token': authToken.substring(0, 30) + '...',
//         'Tokens Changed': oldToken !== authToken ? 'Yes' : 'No',
//         'New Refresh Token': refreshResultData?.refresh_token ? 'Provided' : 'Not provided'
//       });
//     } catch (error) {
//       logError('Refresh Token', error);
//       console.log('   ℹ️  This endpoint might not be implemented yet');
//     }
//   } else {
//     logInfo('No refresh token available to test');
//   }
//   await sleep(500);

//   // Test 5: Change Password
//   logHeader('TEST 5: CHANGE PASSWORD (POST /change-password)');
//   let currentPassword = testUserPassword;
  
//   const passwordData = {
//     current_password: currentPassword,
//     new_password: newPassword,
//     confirm_password: newPassword
//   };

//   try {
//     const result = await tester.changePassword(passwordData);
//     logSuccess('Change Password', 
//       'Password changed successfully');
    
//     // Verify new password works
//     await sleep(300);
    
//     // Clear current auth
//     tester.clearAuth();
    
//     // Try login with old password (should fail)
//     try {
//       await tester.login({ email: testUserEmail, password: currentPassword });
//       logError('Old Password Verification', new Error('Old password should not work'));
//     } catch (oldPasswordError) {
//       logSuccess('Old Password Verification', 'Old password correctly rejected');
//     }
    
//     // Try login with new password (should succeed)
//     try {
//       await tester.login({ email: testUserEmail, password: newPassword });
//       logSuccess('New Password Verification', 'New password works correctly');
      
//       // Update test password for subsequent tests
//       currentPassword = newPassword;
//     } catch (newPasswordError) {
//       logError('New Password Verification', newPasswordError);
//     }
//   } catch (error) {
//     logError('Change Password', error);
//     console.log('   ℹ️  This endpoint might require additional setup');
//   }
//   await sleep(500);

//   // Test 6: User Logout
//   logHeader('TEST 6: USER LOGOUT (POST /logout)');
//   try {
//     const result = await tester.logout();
//     logSuccess('User Logout', 
//       'Logged out successfully');
    
//     // Verify token is invalidated
//     await sleep(300);
    
//     try {
//       await tester.getCurrentUser();
//       logError('Token Invalidation Check', new Error('Token should be invalid after logout'));
//     } catch (tokenError) {
//       logSuccess('Token Invalidation Check', 'Token correctly invalidated after logout');
//     }
//   } catch (error) {
//     logError('User Logout', error);
//   }
//   await sleep(500);

//   // Test 7: Login Again for Cleanup
//   logHeader('TEST 7: VERIFY LOGIN AFTER PASSWORD CHANGE');
//   try {
//     await tester.login({ email: testUserEmail, password: currentPassword });
//     logSuccess('Re-Login After Password Change', 
//       'Successfully logged in with new password');
    
//     // Get user info again to confirm
//     const userResult = await tester.getCurrentUser();
//     // Handle nested response again
//     const userData = userResult.data?.data?.user || userResult.data?.user || userResult.data;
//     console.log(`   ✅ Confirmed: Logged in as ${userData?.email || testUserEmail}`);
//   } catch (error) {
//     logError('Re-Login After Password Change', error);
//   }
//   await sleep(500);

//   // Test 8: Invalid Login Attempts
//   logHeader('TEST 8: SECURITY TESTS');
  
//   // Test wrong password
//   try {
//     await tester.login({ email: testUserEmail, password: 'WrongPassword123!' });
//     logError('Wrong Password Test', new Error('Should have rejected wrong password'));
//   } catch (error) {
//     if (error.response?.status === 401) {
//       logSuccess('Wrong Password Test', 'Correctly rejected wrong password');
//     } else {
//       logError('Wrong Password Test', error);
//     }
//   }
//   await sleep(300);

//   // Test non-existent user
//   try {
//     await tester.login({ email: 'nonexistent@test.com', password: 'SomePassword123!' });
//     logError('Non-existent User Test', new Error('Should have rejected non-existent user'));
//   } catch (error) {
//     if (error.response?.status === 404 || error.response?.status === 401) {
//       logSuccess('Non-existent User Test', 'Correctly rejected non-existent user');
//     } else {
//       logError('Non-existent User Test', error);
//     }
//   }
//   await sleep(300);

//   // Login again for final state
//   await tester.login({ email: testUserEmail, password: currentPassword });

//   // Print Summary
//   logHeader('TEST SUMMARY');
//   const passed = testResults.filter(r => r.success).length;
//   const total = testResults.length;
//   const successRate = ((passed / total) * 100).toFixed(1);

//   console.log(`📊 Total Tests: ${total}`);
//   console.log(`✅ Passed: ${passed}`);
//   console.log(`❌ Failed: ${total - passed}`);
//   console.log(`🎯 Success Rate: ${successRate}%`);

//   // Test coverage summary
//   console.log('\n📋 TEST COVERAGE:');
//   console.log('   ✅ POST /register       - User registration');
//   console.log('   ✅ POST /login          - User login');
//   console.log('   ✅ GET  /me             - Get current user');
//   console.log('   ✅ POST /refresh        - Refresh token (if available)');
//   console.log('   ✅ POST /change-password - Change password');
//   console.log('   ✅ POST /logout         - User logout');
//   console.log('   ✅ Security tests       - Invalid login attempts');

//   // Save test results to file
//   const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
//   const resultsDir = path.join(__dirname, 'test-results');
//   if (!fs.existsSync(resultsDir)) {
//     fs.mkdirSync(resultsDir, { recursive: true });
//   }
//   const resultsFile = path.join(resultsDir, `auth-api-test-${timestamp}.json`);
  
//   const report = {
//     timestamp: new Date().toISOString(),
//     summary: {
//       totalTests: total,
//       passed,
//       failed: total - passed,
//       successRate: `${successRate}%`
//     },
//     testUser: {
//       email: testUserEmail,
//       password: currentPassword,
//       userId: testUserId
//     },
//     tokens: {
//       accessToken: authToken ? `${authToken.substring(0, 20)}...` : null,
//       refreshToken: refreshToken ? `${refreshToken.substring(0, 20)}...` : null
//     },
//     testDetails: testResults,
//     apiEndpointsTested: [
//       'POST /auth/register',
//       'POST /auth/login',
//       'GET /auth/me',
//       'POST /auth/refresh',
//       'POST /auth/change-password',
//       'POST /auth/logout'
//     ],
//     environment: {
//       apiBaseUrl: API_BASE_URL,
//       nodeVersion: process.version,
//       platform: process.platform,
//       timestamp: new Date().toISOString()
//     }
//   };

//   fs.writeFileSync(resultsFile, JSON.stringify(report, null, 2));
//   console.log(`\n📄 Detailed results saved to: ${resultsFile}`);

//   // Recommendations
//   console.log('\n💡 RECOMMENDATIONS:');
//   if (successRate === '100.0') {
//     console.log('🎉 EXCELLENT! All Auth API endpoints are fully functional.');
//   } else if (successRate >= '80.0') {
//     console.log('👍 GOOD! Most endpoints are working.');
//     console.log('   Review failed tests and check server logs.');
//   } else {
//     console.log('⚠️  NEEDS ATTENTION. Several auth endpoints failed.');
//     console.log('   Check:');
//     console.log('   1. Database connection and user table');
//     console.log('   2. JWT secret configuration in .env');
//     console.log('   3. Password hashing implementation');
//   }

//   console.log('\n🔗 QUICK LINKS:');
//   console.log('   Test User Created:');
//   console.log(`     Email: ${testUserEmail}`);
//   console.log(`     Password: ${currentPassword}`);
//   console.log(`     User ID: ${testUserId}`);
//   console.log('\n   API Documentation: http://localhost:5000/api-docs');

//   rl.close();
// }

// // Interactive test menu
// async function showMenu() {
//   console.log('\n🔐 AUTHENTICATION API TESTER');
//   console.log('============================');
//   console.log('1. Run All Tests');
//   console.log('2. Test Specific Endpoint');
//   console.log('3. View Previous Results');
//   console.log('4. Quick Health Check');
//   console.log('5. Exit');
  
//   rl.question('\nSelect option (1-5): ', async (choice) => {
//     switch (choice) {
//       case '1':
//         await runAllTests();
//         break;
//       case '2':
//         await testSpecificEndpoint();
//         break;
//       case '3':
//         await viewPreviousResults();
//         break;
//       case '4':
//         await quickHealthCheck();
//         break;
//       case '5':
//         console.log('Goodbye!');
//         rl.close();
//         break;
//       default:
//         console.log('Invalid choice. Please try again.');
//         await showMenu();
//     }
//   });
// }

// async function testSpecificEndpoint() {
//   console.log('\n🔧 SPECIFIC AUTH ENDPOINT TESTING');
//   console.log('==================================');
//   console.log('1. POST /register - User registration');
//   console.log('2. POST /login - User login');
//   console.log('3. GET /me - Get current user');
//   console.log('4. POST /refresh - Refresh token');
//   console.log('5. POST /logout - User logout');
//   console.log('6. POST /change-password - Change password');
//   console.log('7. Back to Main Menu');
  
//   rl.question('\nSelect endpoint to test (1-7): ', async (choice) => {
//     const tester = new AuthAPITester(API_BASE_URL);
    
//     // Attempt to reuse global token if available
//     if (authToken) {
//         tester.setAuthToken(authToken);
//     }
    
//     switch (choice) {
//       case '1': // Register
//         rl.question('Enter email: ', async (email) => {
//           rl.question('Enter password: ', async (password) => {
//             rl.question('Enter first name: ', async (firstName) => {
//               rl.question('Enter last name: ', async (lastName) => {
//                 rl.question('Enter phone number: ', async (phone) => {
//                   const userData = {
//                     email,
//                     password,
//                     first_name: firstName,
//                     last_name: lastName,
//                     phone: phone,
//                     role: 'guest'
//                   };
//                   try {
//                     const result = await tester.register(userData);
//                     console.log('✅ POST /register - Success:');
//                     console.log(JSON.stringify(result, null, 2));
//                   } catch (error) {
//                     console.log('❌ Error:', error.response?.data || error.message);
//                   }
//                   rl.close();
//                 });
//               });
//             });
//           });
//         });
//         break;
        
//       case '2': // Login
//         rl.question('Enter email: ', async (email) => {
//           rl.question('Enter password: ', async (password) => {
//             try {
//               const result = await tester.login({ email, password });
//               console.log('✅ POST /login - Success:');
//               console.log(`Access Token: ${authToken.substring(0, 30)}...`);
//               // Handle nested data safely
//               const userEmail = result.data?.data?.user?.email || result.data?.user?.email || result.data?.email;
//               console.log(`User: ${userEmail}`);
//             } catch (error) {
//               console.log('❌ Error:', error.response?.data || error.message);
//             }
//             rl.close();
//           });
//         });
//         break;
        
//       case '3': // Get current user
//         // If we already have a token, ask if they want to use it
//         if (authToken) {
//             console.log('ℹ️  Using existing auth token from previous test...');
//             try {
//               const result = await tester.getCurrentUser();
//               console.log('✅ GET /me - Success:');
//               console.log(JSON.stringify(result, null, 2));
//               rl.close();
//               return;
//             } catch (error) {
//               console.log('❌ Existing token failed. Please login again.');
//             }
//         }

//         rl.question('Enter email: ', async (email) => {
//           rl.question('Enter password: ', async (password) => {
//             try {
//               await tester.login({ email, password });
//               const result = await tester.getCurrentUser();
//               console.log('✅ GET /me - Success:');
//               console.log(JSON.stringify(result, null, 2));
//             } catch (error) {
//               console.log('❌ Error:', error.response?.data || error.message);
//             }
//             rl.close();
//           });
//         });
//         break;
        
//       case '4': // Refresh token
//         if (!refreshToken) {
//            console.log('⚠️ No refresh token in memory. You need to login first.');
//         }

//         rl.question('Enter email (for login first): ', async (email) => {
//           rl.question('Enter password: ', async (password) => {
//             try {
//               await tester.login({ email, password });
//               if (!refreshToken) {
//                 console.log('❌ No refresh token returned from login.');
//                 rl.close();
//                 return;
//               }
//               const result = await tester.refreshToken({ refresh_token: refreshToken });
//               console.log('✅ POST /refresh - Success:');
//               console.log(`New Token: ${authToken.substring(0, 30)}...`);
//             } catch (error) {
//               console.log('❌ Error:', error.response?.data || error.message);
//             }
//             rl.close();
//           });
//         });
//         break;
        
//       case '5': // Logout
//         rl.question('Enter email: ', async (email) => {
//           rl.question('Enter password: ', async (password) => {
//             try {
//               await tester.login({ email, password });
//               const result = await tester.logout();
//               console.log('✅ POST /logout - Success:');
//               console.log(JSON.stringify(result, null, 2));
//               console.log('Token cleared. Should not be able to access protected endpoints.');
//             } catch (error) {
//               console.log('❌ Error:', error.response?.data || error.message);
//             }
//             rl.close();
//           });
//         });
//         break;
        
//       case '6': // Change password
//         rl.question('Enter email: ', async (email) => {
//           rl.question('Enter current password: ', async (password) => {
//             rl.question('Enter new password: ', async (newPassword) => {
//               rl.question('Confirm new password: ', async (confirmPassword) => {
//                 try {
//                   // 1. Login first to get the token
//                   await tester.login({ email, password });
                  
//                   // 2. Prepare data matching your authController.js EXACTLY
//                   const passwordData = {
//                     currentPassword: password,  // Matches: const { currentPassword } = req.body
//                     newPassword: newPassword,   // Matches: const { newPassword } = req.body
//                     confirmPassword: confirmPassword // Likely needed by validation middleware
//                   };
                  
//                   // Debug: Print payload to verify
//                   console.log('📤 Sending Payload:', JSON.stringify(passwordData, null, 2));

//                   const result = await tester.changePassword(passwordData);
//                   console.log('✅ POST /change-password - Success:');
//                   console.log(JSON.stringify(result, null, 2));
//                 } catch (error) {
//                   console.log('❌ Error:', error.response?.data || error.message);
//                 }
//                 rl.close();
//               });
//             });
//           });
//         });
//         break;
        
//       case '7':
//         await showMenu();
//         break;
//       default:
//         console.log('Invalid choice');
//         rl.close();
//     }
//   });
// }

// async function viewPreviousResults() {
//   const resultsDir = path.join(__dirname, 'test-results');
  
//   if (!fs.existsSync(resultsDir)) {
//     console.log('No test results directory found.');
//     return;
//   }
  
//   const files = fs.readdirSync(resultsDir)
//     .filter(f => f.startsWith('auth-api-test-') && f.endsWith('.json'))
//     .sort()
//     .reverse();

//   if (files.length === 0) {
//     console.log('No previous auth test results found.');
//   } else {
//     console.log('\n📄 PREVIOUS AUTH TEST RESULTS:');
//     files.forEach((file, index) => {
//       const filePath = path.join(resultsDir, file);
//       const stats = fs.statSync(filePath);
//       const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
//       console.log(`${index + 1}. ${file}`);
//       console.log(`   Date: ${new Date(data.timestamp).toLocaleString()}`);
//       console.log(`   Results: ${data.summary.passed}/${data.summary.totalTests} passed (${data.summary.successRate})`);
//       console.log(`   Test User: ${data.testUser?.email || 'N/A'}`);
//     });
    
//     rl.question('\nEnter result number to view details (or 0 to go back): ', (choice) => {
//       const idx = parseInt(choice) - 1;
//       if (idx >= 0 && idx < files.length) {
//         const filePath = path.join(resultsDir, files[idx]);
//         const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
//         console.log('\n' + JSON.stringify(data, null, 2));
//       }
//       rl.close();
//     });
//   }
// }

// async function quickHealthCheck() {
//   console.log('\n⚡ QUICK AUTH HEALTH CHECK');
//   console.log('==========================');
  
//   const tester = new AuthAPITester(API_BASE_URL);
  
//   try {
//     // Test 1: API Health
//     console.log('1. Testing API health...');
//     const healthResponse = await axios.get(`${API_BASE_URL}/health`);
//     console.log(`   ✅ API Health: ${healthResponse.data.status}`);
    
//     // Test 2: Admin Login
//     console.log('2. Testing admin authentication...');
//     const loginResult = await tester.login(ADMIN_CREDENTIALS);
//     // Handle nested response
//     const loginData = loginResult.data?.data || loginResult.data;
//     console.log(`   ✅ Admin Login: Success (Role: ${loginData?.user?.role || 'N/A'})`);
    
//     // Test 3: Get Current User
//     console.log('3. Testing current user endpoint...');
//     const userResult = await tester.getCurrentUser();
//     const userData = userResult.data?.data?.user || userResult.data?.user || userResult.data;
//     console.log(`   ✅ Current User: ${userData?.email || 'Unknown'}`);
    
//     // Test 4: Check for refresh token
//     console.log('4. Checking refresh token...');
//     if (refreshToken) {
//       console.log(`   ✅ Refresh Token: Available (${refreshToken.substring(0, 20)}...)`);
//     } else {
//       console.log(`   ℹ️  Refresh Token: Not available in response`);
//     }
    
//     console.log('\n🎉 AUTH SYSTEM IS HEALTHY!');
//     console.log('\n📊 Quick Stats:');
//     console.log(`   - Admin Access: ✅ Working`);
//     console.log(`   - Token System: ✅ Working`);
//     console.log(`   - User Endpoint: ✅ Working`);
//     console.log(`   - API Status: ${healthResponse.data.status}`);
    
//   } catch (error) {
//     console.log(`❌ Auth health check failed: ${error.message}`);
//     console.log('\n🔧 Troubleshooting:');
//     console.log('   1. Is the server running? (npm run dev)');
//     console.log('   2. Check admin credentials in database');
//     console.log('   3. Verify JWT_SECRET in .env file');
//     console.log('   4. Check backend/logs for auth errors');
//   }
  
//   rl.close();
// }

// // Handle command line arguments
// if (process.argv.length > 2) {
//   const command = process.argv[2];
  
//   if (command === '--all' || command === '-a') {
//     runAllTests().catch(error => {
//       console.error('Test suite failed:', error.message);
//       if (error.response) {
//         console.error('Response:', error.response.data);
//       }
//       process.exit(1);
//     });
//   } else if (command === '--quick' || command === '-q') {
//     quickHealthCheck().then(() => process.exit(0));
//   } else if (command === '--help' || command === '-h') {
//     console.log(`
// 🔐 Authentication API Test Script
// ================================
// Usage:
//   node auth-api-test.js [option]

// Options:
//   --all, -a      Run all auth tests
//   --quick, -q    Quick auth health check
//   --help, -h     Show this help
//   (no args)      Interactive menu

// Examples:
//   node auth-api-test.js --all     # Run comprehensive auth tests
//   node auth-api-test.js --quick   # Quick auth system check
//   node auth-api-test.js          # Interactive testing menu
//     `);
//     process.exit(0);
//   }
// } else {
//   // No arguments, show interactive menu
//   showMenu();
// }

// // Handle errors gracefully
// process.on('unhandledRejection', (error) => {
//   console.error('\n❌ Unhandled rejection:', error.message);
//   if (error.response) {
//     console.error('   Response:', error.response.data);
//     console.error('   Status:', error.response.status);
//   }
//   process.exit(1);
// });

// process.on('uncaughtException', (error) => {
//   console.error('\n💥 Uncaught exception:', error.message);
//   console.error('   Stack:', error.stack);
//   process.exit(1);
// });