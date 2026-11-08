/**
 * roomService.js - Room management service
 */
import apiClient from './api';

class RoomService {
  /**
   * Get all rooms with optional filtering
   */
  static async getAllRooms(params = {}) {
    try {
      const response = await apiClient.get('/rooms', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching rooms:', error);
      throw error;
    }
  }

  /**
   * Get all room types
   */
  static async getRoomTypes() {
    try {
      const response = await apiClient.get('/rooms/types');
      return response.data;
    } catch (error) {
      console.error('Error fetching room types:', error);
      return []; 
    }
  }

  /**
   * Create a new room type (THIS WAS MISSING)
   */
  static async createRoomType(data) {
    try {
      const response = await apiClient.post('/rooms/types', data);
      return response.data;
    } catch (error) {
      console.error('Error creating room type:', error);
      throw error;
    }
  }

  static async getRoomById(id) {
    try {
      const response = await apiClient.get(`/rooms/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  static async createRoom(roomData) {
    try {
      const response = await apiClient.post('/rooms', roomData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  static async updateRoom(id, roomData) {
    try {
      const response = await apiClient.put(`/rooms/${id}`, roomData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  static async deleteRoom(id) {
    try {
      const response = await apiClient.delete(`/rooms/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export default RoomService;
