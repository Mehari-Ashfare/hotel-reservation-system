/**
 * staff-api-test.js - Staff API Testing Script
 * 
 * Interactive script to test specific Staff API endpoints with role-based access.
 * 
 * Endpoints:
 * 1. GET    /profile              - Get staff profile (receptionist only)
 * 2. GET    /                     - Get all staff (admin only)
 * 3. POST   /                     - Create new staff (admin only)
 * 4. GET    /:id                  - Get staff by ID (admin or self)
 * 5. PUT    /:id                  - Update staff (admin or self)
 * 6. GET    /department/stats     - Get department statistics (admin only)
 * 
 * Usage: node staff-api-test.js
 */

import axios from 'axios';
import readline from 'readline';

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const ADMIN_CREDENTIALS = {
  email: 'mehariashfare1221@gmail.com',
  password: 'Abc123!!'
};
const RECEPTIONIST_CREDENTIALS = {
  email: 'kaluu@gmail.com',
  password: 'Kaluu123!'
};

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Utility functions
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const logSuccess = (message) => console.log(` ${message}`);
const logError = (message) => console.log(` ${message}`);
const logInfo = (message) => console.log(`  ${message}`);
const logWarning = (message) => console.log(`  ${message}`);
const logHeader = (title) => {
  console.log('\n' + '='.repeat(60));
  console.log(` ${title}`);
  console.log('='.repeat(60));
};

// Store authentication tokens
let adminToken = '';
let receptionistToken = '';
let currentStaffId = null;

// API Test Functions
class StaffAPITester {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.axiosInstance = axios.create({
      baseURL: `${baseURL}/staff`,
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
      return { 
        token: response.data.data.token, 
        user: response.data.data.user,
        guest: response.data.data.guest
      };
    } catch (error) {
      throw new Error(`Login failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // 1. GET /profile - Get staff profile (receptionist only)
  async getStaffProfile() {
    try {
      const response = await this.axiosInstance.get('/profile');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 2. GET / - Get all staff members (admin only)
  async getAllStaff(filters = {}) {
    try {
      const response = await this.axiosInstance.get('/', { params: filters });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 3. POST / - Create new staff member (admin only)
  async createStaff(staffData) {
    try {
      const response = await this.axiosInstance.post('/', staffData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 4. GET /:id - Get staff by ID (admin or self)
  async getStaffById(staffId) {
    try {
      const response = await this.axiosInstance.get(`/${staffId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 5. PUT /:id - Update staff information (admin or self)
  async updateStaff(staffId, updateData) {
    try {
      const response = await this.axiosInstance.put(`/${staffId}`, updateData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 6. GET /department/stats - Get department statistics (admin only)
  async getDepartmentStats() {
    try {
      const response = await this.axiosInstance.get('/department/stats');
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

// Login Functions
async function loginAsAdmin() {
  const tester = new StaffAPITester(API_BASE_URL);
  try {
    const result = await tester.login(ADMIN_CREDENTIALS);
    adminToken = result.token;
    logSuccess('Logged in as Admin');
    return tester;
  } catch (error) {
    logError(`Admin login failed: ${error.message}`);
    return null;
  }
}

async function loginAsReceptionist() {
  const tester = new StaffAPITester(API_BASE_URL);
  try {
    const result = await tester.login(RECEPTIONIST_CREDENTIALS);
    receptionistToken = result.token;
    currentStaffId = result.user?.staff_id || result.user?.id;
    logSuccess('Logged in as Receptionist');
    logInfo(`Staff ID: ${currentStaffId || 'Not found'}`);
    return tester;
  } catch (error) {
    logError(`Receptionist login failed: ${error.message}`);
    return null;
  }
}

// Individual Test Functions
async function testGetProfile() {
  logHeader('TEST: GET /staff/profile');
  console.log(' This endpoint is for receptionist users only\n');
  
  console.log('Select user role:');
  console.log('1.  Admin');
  console.log('2.  Receptionist');
  
  rl.question('Select role (1-2): ', async (choice) => {
    let tester;
    
    if (choice === '1') {
      tester = await loginAsAdmin();
    } else if (choice === '2') {
      tester = await loginAsReceptionist();
    } else {
      console.log('Invalid choice');
      rl.close();
      return;
    }
    
    if (!tester) {
      rl.close();
      return;
    }
    
    try {
      console.log('\n Sending GET /staff/profile request...');
      const result = await tester.getStaffProfile();
      
      console.log(' Success!');
      console.log('\n Profile Details:');
      const profile = result.data;
      
      console.table({
        'Staff ID': profile.staff_id,
        'Name': `${profile.first_name} ${profile.last_name}`,
        'Position': profile.position,
        'Department': profile.department,
        'Email': profile.email,
        'Phone': profile.phone,
        'Address': profile.address,
        'Hire Date': profile.hire_date,
        'Status': profile.is_active ? 'Active' : 'Inactive'
      });
      
    } catch (error) {
      console.log(' Error:', error.response?.data?.message || error.message);
      if (error.response?.status === 403) {
        console.log('\n  Note: This endpoint requires a staff profile.');
        console.log('   Admin users may not have staff profiles.');
      }
    }
    
    rl.close();
  });
}

async function testGetAllStaff() {
  logHeader('TEST: GET /staff');
  console.log(' This endpoint is for admin users only\n');
  
  const tester = await loginAsAdmin();
  if (!tester) {
    rl.close();
    return;
  }
  
  console.log('Available filters:');
  console.log('  department: Front Desk, Housekeeping, Management, Kitchen');
  console.log('  position: Receptionist, Manager, Housekeeper, Chef');
  console.log('  is_active: true or false');
  console.log('  page, limit: Pagination (e.g., page=1, limit=10)');
  
  rl.question('\nEnter filters as JSON (or press Enter for none): ', async (filterInput) => {
    try {
      const filters = filterInput ? JSON.parse(filterInput) : {};
      console.log('\n Sending GET /staff request...');
      const result = await tester.getAllStaff(filters);
      
      console.log(' Success!');
      console.log('\n Response Summary:');
      
      if (result.data?.staff) {
        const staff = result.data.staff;
        const total = result.data.total || staff.length;
        const page = result.data.page || 1;
        const limit = result.data.limit || 10;
        
        console.log(`Total staff: ${total}`);
        console.log(`Page: ${page}, Limit: ${limit}`);
        console.log(`Showing: ${staff.length} staff members\n`);
        
        staff.forEach((s, index) => {
          console.log(`${index + 1}. ${s.first_name} ${s.last_name}`);
          console.log(`   Position: ${s.position}, Department: ${s.department}`);
          console.log(`   Email: ${s.email}, Phone: ${s.phone}`);
          console.log(`   Status: ${s.is_active ? 'Active' : 'Inactive'}`);
          console.log(`   Staff ID: ${s.staff_id}`);
          console.log('');
        });
      } else if (Array.isArray(result.data)) {
        console.log(`Found ${result.data.length} staff members\n`);
        result.data.forEach((s, index) => {
          console.log(`${index + 1}. ${s.first_name} ${s.last_name} (${s.position})`);
        });
      }
      
    } catch (error) {
      console.log(' Error:', error.response?.data?.message || error.message);
    }
    
    rl.close();
  });
}

async function testCreateStaff() {
  logHeader('TEST: POST /staff');
  console.log(' This endpoint is for admin users only\n');
  
  const tester = await loginAsAdmin();
  if (!tester) {
    rl.close();
    return;
  }
  
  console.log('First, we need to create a user account for the new staff member.');
  console.log('Then we will create the staff record.\n');
  
  rl.question('Enter email for new staff member: ', async (email) => {
    rl.question('Enter password for new user: ', async (password) => {
      try {
        console.log('\n Creating user account...');
        
        // Create user first
        const userResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
          email,
          password,
          role_name: 'receptionist'
        });
        
        const userId = userResponse.data.data.user.id;
        console.log(` User created with ID: ${userId}`);
        
        // Now create staff record
        console.log('\n Creating staff record...');
        
        const staffData = {
          user_id: userId,
          first_name: 'New',
          last_name: 'Staff',
          phone: '+1234567890',
          email: email,
          address: '123 New Street',
          position: 'Receptionist',
          department: 'Front Desk',
          hire_date: new Date().toISOString().split('T')[0]
        };
        
        const result = await tester.createStaff(staffData);
        
        console.log(' Staff member created successfully!');
        console.log('\n New Staff Details:');
        const staff = result.data;
        
        console.table({
          'Staff ID': staff.staff_id,
          'User ID': staff.user_id,
          'Name': `${staff.first_name} ${staff.last_name}`,
          'Position': staff.position,
          'Department': staff.department,
          'Email': staff.email,
          'Phone': staff.phone,
          'Hire Date': staff.hire_date,
          'Status': staff.is_active ? 'Active' : 'Inactive'
        });
        
        console.log('\n Staff member has been added to the database.');
        
      } catch (error) {
        console.log(' Error:', error.response?.data?.message || error.message);
        if (error.response?.status === 409) {
          console.log('\n  User already exists. Try a different email.');
        }
      }
      
      rl.close();
    });
  });
}

async function testGetStaffById() {
  logHeader('TEST: GET /staff/:id');
  console.log(' Admin or  Self-access endpoint\n');
  
  console.log('Select user role:');
  console.log('1.  Admin (can view any staff)');
  console.log('2.  Receptionist (can only view own profile)');
  
  rl.question('Select role (1-2): ', async (roleChoice) => {
    let tester;
    
    if (roleChoice === '1') {
      tester = await loginAsAdmin();
    } else if (roleChoice === '2') {
      tester = await loginAsReceptionist();
    } else {
      console.log('Invalid choice');
      rl.close();
      return;
    }
    
    if (!tester) {
      rl.close();
      return;
    }
    
    if (roleChoice === '2' && currentStaffId) {
      console.log(`\n  Note: As receptionist, you can only view staff ID: ${currentStaffId}`);
      console.log('   Entering a different ID will result in 403 error.\n');
    }
    
    rl.question('Enter Staff ID to view: ', async (staffId) => {
      try {
        console.log(`\n Fetching staff ID: ${staffId}...`);
        const result = await tester.getStaffById(staffId);
        
        console.log(' Success!');
        console.log('\n Staff Details:');
        const staff = result.data;
        
        console.table({
          'Staff ID': staff.staff_id,
          'Name': `${staff.first_name} ${staff.last_name}`,
          'Position': staff.position,
          'Department': staff.department,
          'Email': staff.email,
          'Phone': staff.phone,
          'Address': staff.address,
          'Hire Date': staff.hire_date,
          'Status': staff.is_active ? 'Active' : 'Inactive',
          'User ID': staff.user_id
        });
        
        if (staff.created_at) {
          console.log(`Created: ${new Date(staff.created_at).toLocaleString()}`);
        }
        
      } catch (error) {
        console.log(' Error:', error.response?.data?.message || error.message);
        if (error.response?.status === 403) {
          console.log('\n  Access Denied:');
          console.log('   - Receptionists can only view their own profile');
          console.log('   - Check if the Staff ID belongs to you');
          console.log('   - Only admins can view all staff profiles');
        }
      }
      
      rl.close();
    });
  });
}

async function testUpdateStaff() {
  logHeader('TEST: PUT /staff/:id');
  console.log(' Admin or  Self-access endpoint\n');
  
  console.log('Select user role:');
  console.log('1.  Admin (can update any staff)');
  console.log('2.  Receptionist (can only update own profile)');
  
  rl.question('Select role (1-2): ', async (roleChoice) => {
    let tester;
    
    if (roleChoice === '1') {
      tester = await loginAsAdmin();
    } else if (roleChoice === '2') {
      tester = await loginAsReceptionist();
    } else {
      console.log('Invalid choice');
      rl.close();
      return;
    }
    
    if (!tester) {
      rl.close();
      return;
    }
    
    if (roleChoice === '2' && currentStaffId) {
      console.log(`\n  Note: As receptionist, you can only update staff ID: ${currentStaffId}`);
      console.log('   And only these fields: phone, email, address');
      console.log('   Other fields will be ignored.\n');
    }
    
    rl.question('Enter Staff ID to update: ', async (staffId) => {
      if (roleChoice === '1') {
        // Admin can update any field
        console.log('\nAvailable fields for admin:');
        console.log('  phone, email, address, position, department, is_active');
        
        console.log('\nExample update data:');
        console.log('{"phone": "+1987654321", "address": "New Address", "position": "Senior Receptionist"}');
        
        rl.question('\nEnter update data as JSON: ', async (updateInput) => {
          try {
            const updateData = JSON.parse(updateInput);
            console.log('\n Sending update request...');
            const result = await tester.updateStaff(staffId, updateData);
            
            console.log(' Staff updated successfully!');
            console.log('\n Updated Staff:');
            const staff = result.data;
            
            console.log(`Name: ${staff.first_name} ${staff.last_name}`);
            console.log(`Updated fields: ${Object.keys(updateData).join(', ')}`);
            console.log('\nCurrent values:');
            Object.keys(updateData).forEach(field => {
              console.log(`  ${field}: ${staff[field]}`);
            });
            
          } catch (error) {
            console.log(' Error:', error.response?.data?.message || error.message);
          }
          
          rl.close();
        });
      } else {
        // Receptionist can only update contact info
        const updateData = {
          phone: '+15551234567',
          email: `updated.${Date.now()}@test.com`,
          address: 'My Updated Address'
        };
        
        console.log(`\n Updating receptionist profile (ID: ${staffId})...`);
        console.log('Update data:', updateData);
        
        try {
          const result = await tester.updateStaff(staffId, updateData);
          
          console.log(' Profile updated successfully!');
          console.log('\n Updated Profile:');
          const staff = result.data;
          
          console.table({
            'Phone': staff.phone,
            'Email': staff.email,
            'Address': staff.address,
            'Position': staff.position,
            'Department': staff.department
          });
          
        } catch (error) {
          console.log(' Error:', error.response?.data?.message || error.message);
          if (error.response?.status === 403) {
            console.log('\n  Access Denied: Receptionists can only update their own profile');
          }
        }
        
        rl.close();
      }
    });
  });
}

async function testGetDepartmentStats() {
  logHeader('TEST: GET /staff/department/stats');
  console.log(' This endpoint is for admin users only\n');
  
  const tester = await loginAsAdmin();
  if (!tester) {
    rl.close();
    return;
  }
  
  try {
    console.log(' Fetching department statistics...');
    const result = await tester.getDepartmentStats();
    
    console.log(' Success!');
    console.log('\n Department Statistics:');
    
    const stats = result.data;
    
    if (Array.isArray(stats)) {
      stats.forEach(dept => {
        console.log(`\n ${dept.department || dept.name}:`);
        console.log(`   Total Staff: ${dept.count || dept.total}`);
        console.log(`   Active: ${dept.active_count || dept.active || 'N/A'}`);
        console.log(`   Inactive: ${dept.inactive_count || dept.inactive || 'N/A'}`);
        
        if (dept.positions) {
          console.log('   Positions:');
          Object.entries(dept.positions).forEach(([pos, count]) => {
            console.log(`     - ${pos}: ${count}`);
          });
        }
      });
    } else if (typeof stats === 'object') {
      Object.entries(stats).forEach(([dept, data]) => {
        console.log(`\n ${dept}:`);
        console.log(`   Total: ${data.count || data.total || 'N/A'}`);
        if (data.positions) {
          console.log('   Positions:');
          Object.entries(data.positions).forEach(([pos, count]) => {
            console.log(`     - ${pos}: ${count}`);
          });
        }
      });
    } else {
      console.log('Unexpected response format:', stats);
    }
    
    console.log('\n This data helps with HR planning and resource allocation.');
    
  } catch (error) {
    console.log(' Error:', error.response?.data?.message || error.message);
  }
  
  rl.close();
}

// Quick Health Check
async function quickHealthCheck() {
  logHeader('QUICK HEALTH CHECK');
  
  console.log('Running health checks...\n');
  
  try {
    // Check 1: API Health
    console.log('1. Checking API health...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    if (healthResponse.data.status === 'ok') {
      console.log('    API is healthy');
    } else {
      console.log('    API health check failed');
    }
    
    // Check 2: Admin Login
    console.log('2. Testing admin login...');
    const adminResponse = await axios.post(`${API_BASE_URL}/auth/login`, ADMIN_CREDENTIALS);
    adminToken = adminResponse.data.data.token;
    console.log('    Admin login successful');
    
    // Check 3: Admin endpoints
    console.log('3. Testing admin endpoints...');
    const staffResponse = await axios.get(`${API_BASE_URL}/staff`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`    GET /staff working (${staffResponse.data.data?.staff?.length || 0} staff)`);
    
    // Check 4: Receptionist Login
    console.log('4. Testing receptionist login...');
    try {
      const receptionistResponse = await axios.post(`${API_BASE_URL}/auth/login`, RECEPTIONIST_CREDENTIALS);
      console.log('    Receptionist login successful');
      
      // Check 5: Receptionist profile
      console.log('5. Testing receptionist profile...');
      const profileResponse = await axios.get(`${API_BASE_URL}/staff/profile`, {
        headers: { Authorization: `Bearer ${receptionistResponse.data.data.token}` }
      });
      console.log(`    Receptionist profile accessible: ${profileResponse.data.data.first_name}`);
      
    } catch (error) {
      console.log('     Receptionist login failed (create receptionist user first)');
    }
    
    console.log('\n STAFF API IS OPERATIONAL!');
    
  } catch (error) {
    console.log('\n Health check failed:', error.message);
    console.log('\n Troubleshooting:');
    console.log('   1. Ensure server is running: npm run dev');
    console.log('   2. Check database connection');
    console.log('   3. Verify admin credentials in database');
  }
  
  rl.close();
}

// Main Menu
function showMainMenu() {
  logHeader('STAFF API TESTER');
  console.log('Test specific Staff API endpoints:\n');
  console.log('1. GET    /profile               Receptionist only');
  console.log('2. GET    /                      Admin only');
  console.log('3. POST   /                      Admin only');
  console.log('4. GET    /:id                   Admin or  Self');
  console.log('5. PUT    /:id                   Admin or  Self');
  console.log('6. GET    /department/stats      Admin only');
  console.log('7. Quick Health Check');
  console.log('8. Exit');
  
  rl.question('\nSelect endpoint to test (1-8): ', async (choice) => {
    switch (choice) {
      case '1':
        await testGetProfile();
        break;
      case '2':
        await testGetAllStaff();
        break;
      case '3':
        await testCreateStaff();
        break;
      case '4':
        await testGetStaffById();
        break;
      case '5':
        await testUpdateStaff();
        break;
      case '6':
        await testGetDepartmentStats();
        break;
      case '7':
        await quickHealthCheck();
        break;
      case '8':
        console.log('Goodbye!');
        rl.close();
        break;
      default:
        console.log('Invalid choice. Please try again.');
        showMainMenu();
    }
  });
}

// Handle command line arguments
if (process.argv.length > 2) {
  const command = process.argv[2];
  
  if (command === '--menu' || command === '-m') {
    showMainMenu();
  } else if (command === '--quick' || command === '-q') {
    quickHealthCheck();
  } else if (command === '--help' || command === '-h') {
    console.log(`
 Staff API Test Script
=======================
Usage:
  node staff-api-test.js [option]

Options:
  --menu, -m      Show interactive menu (default)
  --quick, -q     Quick health check
  --help, -h      Show this help

Examples:
  node staff-api-test.js           # Interactive menu
  node staff-api-test.js --menu    # Interactive menu
  node staff-api-test.js --quick   # Quick health check

Endpoints:
  1. GET /profile           - Receptionist profile
  2. GET /staff             - All staff (Admin only)
  3. POST /staff            - Create staff (Admin only)
  4. GET /staff/:id         - Get specific staff
  5. PUT /staff/:id         - Update staff
  6. GET /department/stats  - Department statistics (Admin only)
    `);
    process.exit(0);
  }
} else {
  // No arguments, show main menu
  showMainMenu();
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('\n Unhandled rejection:', error.message);
  if (error.response) {
    console.error('   Response:', error.response.data);
  }
  rl.close();
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('\n Uncaught exception:', error.message);
  rl.close();
  process.exit(1);
});