/**
 * guestService.js - Guest management service
 * * Handles all guest-related API calls including:
 * - CRUD operations for guests
 * - Search and filtering
 * - Pagination
 */

import apiClient from './api';

class GuestService {
  /**
   * Get all guests with pagination
   * @param {Object} params - Pagination and filter parameters
   * @returns {Promise<Object>} Guest list with pagination
   */
  static async getGuests(params = {}) {
    try {
      const response = await apiClient.get('/guests', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching guests:', error);
      throw error;
    }
  }

  /**
   * Get guest by ID
   * @param {number|string} id - Guest ID
   * @returns {Promise<Object>} Guest data
   */
  static async getGuestById(id) {
    try {
      const response = await apiClient.get(`/guests/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching guest ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create new guest
   * @param {Object} guestData - Guest information
   * @returns {Promise<Object>} Created guest
   */
  static async createGuest(guestData) {
    try {
      const response = await apiClient.post('/guests', guestData);
      return response.data;
    } catch (error) {
      console.error('Error creating guest:', error);
      throw error;
    }
  }

  /**
   * Update guest
   * @param {number|string} id - Guest ID
   * @param {Object} guestData - Updated guest data
   * @returns {Promise<Object>} Updated guest
   */
  static async updateGuest(id, guestData) {
    try {
      const response = await apiClient.put(`/guests/${id}`, guestData);
      return response.data;
    } catch (error) {
      console.error(`Error updating guest ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete guest
   * @param {number|string} id - Guest ID
   * @returns {Promise<Object>} Delete response
   */
  static async deleteGuest(id) {
    try {
      const response = await apiClient.delete(`/guests/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting guest ${id}:`, error);
      throw error;
    }
  }

  /**
   * Search guests
   * @param {string} query - Search query
   * @returns {Promise<Array>} Search results
   */
  static async searchGuests(query) {
    try {
      const response = await apiClient.get('/guests/search', { params: { query } });
      return response.data;
    } catch (error) {
      console.error('Error searching guests:', error);
      throw error;
    }
  }

  /**
   * Export guests to CSV
   * @param {Object} filters - Filter criteria
   * @returns {Promise<string>} CSV data
   */
  static async exportGuests(filters = {}) {
    try {
      const response = await apiClient.get('/guests/export', { 
        params: filters,
        responseType: 'blob' 
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting guests:', error);
      throw error;
    }
  }

  /**
   * Get guest statistics
   * @returns {Promise<Object>} Guest statistics
   */
  static async getGuestStats() {
    try {
      // Try to fetch stats, fall back to mock data if API endpoint doesn't exist yet
      try {
        const response = await apiClient.get('/guests/stats');
        return response.data;
      } catch (e) {
        return {
          total: 0,
          online: 0,
          walkIn: 0,
          newThisMonth: 0,
        };
      }
    } catch (error) {
      console.error('Error fetching guest stats:', error);
      return {
        total: 0,
        online: 0,
        walkIn: 0,
        newThisMonth: 0,
      };
    }
  }
}

export default GuestService;
