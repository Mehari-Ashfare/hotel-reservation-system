/**
 * reservationService.js - Handle booking operations
 */
import apiClient from './api';

class ReservationService {
  // 1. GET / - Get all reservations
  static async getAllReservations(params = {}) {
    try {
      const response = await apiClient.get('/reservations', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching reservations:', error);
      throw error;
    }
  }

  // 2. GET /guest/:guest_id - Get guest's reservations
  static async getGuestReservations(guestId) {
    try {
      const response = await apiClient.get(`/reservations/guest/${guestId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 3. GET /:id - Get reservation by ID
  static async getReservationById(id) {
    try {
      const response = await apiClient.get(`/reservations/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 4. GET /calculate-price - Calculate price before booking
  static async calculatePrice(data) {
    try {
      // Expects: { room_id, check_in_date, check_out_date }
      const response = await apiClient.post('/reservations/calculate-price', data); 
      // Note: Changed to POST if sending body data, or GET with query params. 
      // Usually calculation uses POST to send dates easily. 
      // If your backend strictly requires GET, use:
      // const response = await apiClient.get('/reservations/calculate-price', { params: data });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 5. POST / - Create new reservation
  static async createReservation(data) {
    try {
      const response = await apiClient.post('/reservations', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 6. PUT /:id - Update reservation details
  static async updateReservation(id, data) {
    try {
      const response = await apiClient.put(`/reservations/${id}`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 7. PUT /:id/cancel - Cancel reservation
  static async cancelReservation(id, reason) {
    try {
      const response = await apiClient.put(`/reservations/${id}/cancel`, { reason });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 8. PUT /:id/check-in - Check in guest
  static async checkIn(id) {
    try {
      const response = await apiClient.put(`/reservations/${id}/check-in`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 9. PUT /:id/check-out - Check out guest
  static async checkOut(id) {
    try {
      const response = await apiClient.put(`/reservations/${id}/check-out`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export default ReservationService;
