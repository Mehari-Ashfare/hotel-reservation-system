/**
 * roomController.js - Room controller
 * * Handles all room-related operations including CRUD operations,
 * availability checking, and room management.
 * * Dependencies:
 * - Room model for database operations
 * - RoomType model for room type operations
 */

import pool from '../config/database.js';
import Room from '../models/Room.js';
import RoomType from '../models/RoomType.js';
import AuditLogger from '../utils/auditLogger.js';

class RoomController {
  /**
   * Create new room
   */
  static async createRoom(req, res) {
    try {
      const roomData = req.body;
      const room = await Room.create(roomData);

      await AuditLogger.log({
        table_name: 'rooms',
        record_id: room.room_id,
        action: 'INSERT',
        new_values: {
          room_id: room.room_id,
          room_number: room.room_number || roomData.room_number,
          room_type_id: room.room_type_id || roomData.room_type_id,
          floor: room.floor || roomData.floor,
          status: room.status || roomData.status || 'available',
          is_active: room.is_active !== undefined ? room.is_active : true
        },
        user_id: req.user?.id || null,
        ip_address: AuditLogger.getClientIp(req),
        user_agent: req.get('user-agent')
      });

      res.status(201).json({
        success: true,
        message: 'Room created successfully',
        data: room
      });
    } catch (error) {
      console.error('Create room error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create room'
      });
    }
  }

  /**
   * Get all rooms with filters
   */
  static async getAllRooms(req, res) {
    try {
      const { 
        page = 1, 
        limit = 100, 
        room_type_id,
        status,
        floor,
        is_active 
      } = req.query;

      const filters = {};
      if (room_type_id) filters.room_type_id = room_type_id;
      if (status) filters.status = status;
      if (floor) filters.floor = floor;
      if (is_active !== undefined) filters.is_active = is_active === 'true';

      const result = await Room.getAll(filters, parseInt(page), parseInt(limit));

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Get rooms error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get rooms'
      });
    }
  }

  /**
   * Get room by ID
   */
  static async getRoomById(req, res) {
    try {
      const { id } = req.params;
      
      // FIX: Strictly pulls price and capacity from Room Type
      const query = `
        SELECT 
            r.*, 
            rt.type_name, 
            rt.max_occupancy as capacity, 
            rt.description,
            rt.base_price as price_per_night 
        FROM rooms r
        LEFT JOIN room_types rt ON r.room_type_id = rt.room_type_id
        WHERE r.room_id = $1
      `;
      
      const result = await pool.query(query, [id]);
      const room = result.rows[0];

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      res.json({
        success: true,
        data: room
      });
    } catch (error) {
      console.error('Get room error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get room'
      });
    }
  }

  /**
   * Update room information
   */
  static async updateRoom(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const oldRoom = await Room.findById(id);
      if (!oldRoom) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      delete updateData.room_id;
      delete updateData.created_at;

      const room = await Room.update(id, updateData);

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      await AuditLogger.log({
        table_name: 'rooms',
        record_id: parseInt(id),
        action: 'UPDATE',
        old_values: oldRoom,
        new_values: room || { ...oldRoom, ...updateData },
        user_id: req.user?.id || null,
        ip_address: AuditLogger.getClientIp(req),
        user_agent: req.get('user-agent')
      });

      res.json({
        success: true,
        message: 'Room updated successfully',
        data: room
      });
    } catch (error) {
      console.error('Update room error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update room'
      });
    }
  }

  /**
   * Get available rooms
   */
  static async getAvailableRooms(req, res) {
    try {
      const { start_date, end_date } = req.query;

      // FIX: Removed 'pending' because it's not in your DB enum.
      // Now checking strictly for 'confirmed' and 'checked-in'.
      const query = `
        SELECT r.*, rt.type_name, rt.max_occupancy as capacity,
        rt.base_price as price_per_night
        FROM rooms r
        LEFT JOIN room_types rt ON r.room_type_id = rt.room_type_id
        WHERE r.status = 'available'
        AND r.room_id NOT IN (
          SELECT room_id FROM reservations 
          WHERE status IN ('confirmed', 'checked-in')
          AND (
             (check_in_date <= $1 AND check_out_date >= $1) OR
             (check_in_date <= $2 AND check_out_date >= $2) OR
             (check_in_date >= $1 AND check_out_date <= $2)
          )
        )
      `;
      
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0];
      
      const values = [start_date || today, end_date || tomorrow];
      
      const result = await pool.query(query, values);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Get available rooms error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get available rooms'
      });
    }
  }

  /**
   * Get room types
   */
  static async getRoomTypes(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await RoomType.getAll(parseInt(page), parseInt(limit));

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Get room types error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get room types'
      });
    }
  }

  /**
   * Create room type
   */
  static async createRoomType(req, res) {
    try {
      const roomTypeData = req.body;
      const roomType = await RoomType.create(roomTypeData);

      await AuditLogger.log({
        table_name: 'room_types',
        record_id: roomType.room_type_id,
        action: 'INSERT',
        new_values: {
          room_type_id: roomType.room_type_id,
          type_name: roomType.type_name || roomTypeData.type_name,
          description: roomType.description || roomTypeData.description,
          base_price: roomType.base_price || roomTypeData.base_price,
          max_occupancy: roomType.max_occupancy || roomTypeData.max_occupancy,
          amenities: roomType.amenities || roomTypeData.amenities
        },
        user_id: req.user?.id || null,
        ip_address: AuditLogger.getClientIp(req),
        user_agent: req.get('user-agent')
      });

      res.status(201).json({
        success: true,
        message: 'Room type created successfully',
        data: roomType
      });
    } catch (error) {
      console.error('Create room type error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create room type'
      });
    }
  }

  /**
   * Get room occupancy rate
   */
  static async getOccupancyRate(req, res) {
    try {
      const { start_date, end_date } = req.query;

      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        });
      }

      const occupancy = await Room.getOccupancyRate(start_date, end_date);

      res.json({
        success: true,
        data: occupancy
      });
    } catch (error) {
      console.error('Get occupancy rate error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get occupancy rate'
      });
    }
  }
}

export default RoomController;