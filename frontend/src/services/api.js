/**
 * API Service
 * Purpose: Centralized configuration for all backend API requests.
 * Features: Automatic token injection and error handling.
 */
import axios from 'axios';

// Create Axios instance
const api = axios.create({
  // FIX: Point directly to backend port 5000 to avoid Proxy issues
  baseURL: 'http://localhost:5000/api', 
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Errors (like expired tokens)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If unauthorized (401), clear storage and redirect
    if (error.response?.status === 401) {
      // Safety check: Only redirect if we aren't already on the login page
      if (window.location.pathname !== '/login') {
          console.warn("Session expired. Logging out...");
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
