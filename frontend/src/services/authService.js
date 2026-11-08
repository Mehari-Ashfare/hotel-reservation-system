import apiClient from './api';

class AuthService {
  /**
   * Login user
   * POST /api/auth/login
   */
  static async login(email, password) {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Register new user
   * POST /api/auth/register
   */
  static async register(userData) {
    try {
      const response = await apiClient.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get current user info
   * GET /api/auth/me
   */
  static async getCurrentUser() {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Refresh Token
   * POST /api/auth/refresh
   */
  static async refreshToken() {
    try {
      const response = await apiClient.post('/auth/refresh');
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Change Password (Authenticated)
   * POST /api/auth/change-password
   */
  static async changePassword(currentPassword, newPassword, confirmPassword) {
    try {
      const response = await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Logout user
   * POST /api/auth/logout
   */
  static async logout() {
    try {
      // 1. Tell server to invalidate token
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error("Logout error", error);
    } finally {
      // 2. Always remove local token
      localStorage.removeItem('token');
      // 3. Force page reload to clear state cleanly
      window.location.href = '/login';
    }
  }

  // --- NEW PROFILE METHODS ---

  /**
   * Get full profile
   * GET /api/auth/profile
   */
  static async getProfile() {
    try {
      const response = await apiClient.get('/auth/profile');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update profile
   * PUT /api/auth/profile
   */
  static async updateProfile(data) {
    try {
      const response = await apiClient.put('/auth/profile', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // --- FORGOT PASSWORD METHODS (ADDED) ---

  /**
   * Forgot Password - Request Link
   */
  static async forgotPassword(email) {
    try {
      const response = await apiClient.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reset Password - Set new password
   */
  static async resetPassword(token, newPassword, confirmPassword) {
    try {
      const response = await apiClient.post('/auth/reset-password', {
        token,
        newPassword,
        confirmPassword
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export default AuthService;








// import apiClient from './api';

// class AuthService {
//   /**
//    * Login user
//    * POST /api/auth/login
//    */
//   static async login(email, password) {
//     try {
//       const response = await apiClient.post('/auth/login', { email, password });
//       if (response.data.token) {
//         localStorage.setItem('token', response.data.token);
//       }
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   }

//   /**
//    * Register new user
//    * POST /api/auth/register
//    */
//   static async register(userData) {
//     try {
//       const response = await apiClient.post('/auth/register', userData);
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   }

//   /**
//    * Get current user info
//    * GET /api/auth/me
//    */
//   static async getCurrentUser() {
//     try {
//       const response = await apiClient.get('/auth/me');
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   }

//   /**
//    * Refresh Token
//    * POST /api/auth/refresh
//    */
//   static async refreshToken() {
//     try {
//       const response = await apiClient.post('/auth/refresh');
//       if (response.data.token) {
//         localStorage.setItem('token', response.data.token);
//       }
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   }

//   /**
//    * Change Password (Authenticated)
//    * POST /api/auth/change-password
//    */
//   static async changePassword(currentPassword, newPassword, confirmPassword) {
//     try {
//       const response = await apiClient.post('/auth/change-password', {
//         currentPassword,
//         newPassword,
//         confirmPassword
//       });
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   }

//   /**
//    * Logout user
//    * POST /api/auth/logout
//    */
//   static async logout() {
//     try {
//       // 1. Tell server to invalidate token
//       await apiClient.post('/auth/logout');
//     } catch (error) {
//       console.error("Logout error", error);
//     } finally {
//       // 2. Always remove local token
//       localStorage.removeItem('token');
//       // 3. Force page reload to clear state cleanly
//       window.location.href = '/login';
//     }
//   }

//   // --- NEW PROFILE METHODS ---

//   /**
//    * Get full profile
//    * GET /api/auth/profile
//    */
//   static async getProfile() {
//     try {
//       const response = await apiClient.get('/auth/profile');
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   }

//   /**
//    * Update profile
//    * PUT /api/auth/profile
//    */
//   static async updateProfile(data) {
//     try {
//       const response = await apiClient.put('/auth/profile', data);
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   }

//   // --- FORGOT PASSWORD METHODS (ADDED) ---

//   /**
//    * Forgot Password - Request Link
//    */
//   static async forgotPassword(email) {
//     try {
//       const response = await apiClient.post('/auth/forgot-password', { email });
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   }

//   /**
//    * Reset Password - Set new password
//    */
//   static async resetPassword(token, newPassword, confirmPassword) {
//     try {
//       const response = await apiClient.post('/auth/reset-password', {
//         token,
//         newPassword,
//         confirmPassword
//       });
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   }
// }

// export default AuthService;