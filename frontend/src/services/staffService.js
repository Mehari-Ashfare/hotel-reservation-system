/**
 * staffService.js - Staff management service
 */
import apiClient from './api';

class StaffService {
  /**
   * Get all staff members (Admin only)
   * UPDATED: Accepts pagination and search params
   */
  static async getAllStaff(page = 1, limit = 10, search = '') {
    try {
      // FIX: Send search query to backend
      const response = await apiClient.get(`/staff?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching staff:', error);
      throw error;
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile() {
    try {
      const response = await apiClient.get('/staff/profile');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create new staff (Admin only)
   */
  static async createStaff(staffData) {
    try {
      const response = await apiClient.post('/staff', staffData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update staff member details
   */
  static async updateStaff(id, staffData) {
    try {
      const response = await apiClient.put(`/staff/${id}`, staffData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get department statistics
   */
  static async getDepartmentStats() {
    try {
      const response = await apiClient.get('/staff/department/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching stats:', error);
      return []; 
    }
  }

  /**
   * Change Password
   */
  static async changePassword(data) {
    try {
      const response = await apiClient.put('/staff/change-password', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export default StaffService;




// /**
//  * staffService.js - Staff management service
//  */
// import apiClient from './api';

// class StaffService {
//   /**
//    * Get all staff members (Admin only)
//    */
//   static async getAllStaff() {
//     try {
//       const response = await apiClient.get('/staff');
//       return response.data;
//     } catch (error) {
//       console.error('Error fetching staff:', error);
//       throw error;
//     }
//   }

//   /**
//    * Get current user profile
//    */
//   static async getProfile() {
//     try {
//       const response = await apiClient.get('/staff/profile');
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   }

//   /**
//    * Create new staff (Admin only)
//    */
//   static async createStaff(staffData) {
//     try {
//       const response = await apiClient.post('/staff', staffData);
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   }

//   /**
//    * Update staff member details
//    */
//   static async updateStaff(id, staffData) {
//     try {
//       const response = await apiClient.put(`/staff/${id}`, staffData);
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   }

//   /**
//    * Get department statistics
//    */
//   static async getDepartmentStats() {
//     try {
//       const response = await apiClient.get('/staff/department/stats');
//       return response.data;
//     } catch (error) {
//       console.error('Error fetching stats:', error);
//       return []; 
//     }
//   }

//   /**
//    * Change Password (The missing function!)
//    */
//   static async changePassword(data) {
//     try {
//       const response = await apiClient.put('/staff/change-password', data);
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   }
// }

// export default StaffService;
