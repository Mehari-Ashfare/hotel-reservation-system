/**
 * Room.js - Room model
 * * Handles individual room operations including availability,
 * pricing adjustments, and room management.
 * * Dependencies:
 * - database pool from config/database.js
 */

import pool from '../config/database.js';

class Room {
  /**
   * Create new room
   * @param {Object} roomData - Room information
   * @returns {Promise<Object>} Created room
   */
  static async create(roomData) {
    try {
      const {
        room_type_id,
        room_number,
        floor,
        status = 'available',
        price_adjustment = 0,
        special_features = [],
        is_active = true
      } = roomData;

      const query = `
        INSERT INTO rooms (
          room_type_id, room_number, floor, status,
          price_adjustment, special_features, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const values = [
        room_type_id,
        room_number,
        floor,
        status,
        price_adjustment,
        special_features,
        is_active
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Room number already exists');
      }
      throw new Error(`Database error creating room: ${error.message}`);
    }
  }

  /**
   * Find room by ID
   * @param {number} roomId - Room ID
   * @returns {Promise<Object|null>} Room object or null
   */
  static async findById(roomId) {
    try {
      const query = `
        SELECT r.*, rt.type_name, rt.base_price, rt.max_occupancy
        FROM rooms r
        JOIN room_types rt ON r.room_type_id = rt.room_type_id
        WHERE r.room_id = $1
      `;
      const result = await pool.query(query, [roomId]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Database error finding room: ${error.message}`);
    }
  }

  /**
   * Find room by room number
   * @param {string} roomNumber - Room number
   * @returns {Promise<Object|null>} Room object or null
   */
  static async findByRoomNumber(roomNumber) {
    try {
      const query = `
        SELECT r.*, rt.type_name, rt.base_price, rt.max_occupancy
        FROM rooms r
        JOIN room_types rt ON r.room_type_id = rt.room_type_id
        WHERE r.room_number = $1
      `;
      const result = await pool.query(query, [roomNumber]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Database error finding room: ${error.message}`);
    }
  }

  /**
   * Get all rooms with filters
   */
  static async getAll(filters = {}, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      const whereConditions = [];
      const values = [];
      let paramCount = 1;

      // Build filter conditions
      if (filters.room_type_id) {
        whereConditions.push(`r.room_type_id = $${paramCount}`);
        values.push(filters.room_type_id);
        paramCount++;
      }

      if (filters.status) {
        whereConditions.push(`r.status = $${paramCount}`);
        values.push(filters.status);
        paramCount++;
      }

      if (filters.floor) {
        whereConditions.push(`r.floor = $${paramCount}`);
        values.push(filters.floor);
        paramCount++;
      }

      if (filters.is_active !== undefined) {
        whereConditions.push(`r.is_active = $${paramCount}`);
        values.push(filters.is_active);
        paramCount++;
      }

      // Build WHERE clause
      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';

      // Count query
      const countQuery = `
        SELECT COUNT(*) 
        FROM rooms r
        ${whereClause}
      `;

      // Data query
      const dataQuery = `
        SELECT r.*, rt.type_name, rt.base_price, rt.max_occupancy
        FROM rooms r
        JOIN room_types rt ON r.room_type_id = rt.room_type_id
        ${whereClause}
        ORDER BY r.floor, r.room_number
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;

      // Add pagination parameters
      values.push(limit, offset);

      const [countResult, dataResult] = await Promise.all([
        pool.query(countQuery, values.slice(0, whereConditions.length)),
        pool.query(dataQuery, values)
      ]);

      const total = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / limit);

      return {
        rooms: dataResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Database error getting rooms: ${error.message}`);
    }
  }

  /**
   * Update room information
   */
  static async update(roomId, updateData) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          fields.push(`${key} = $${paramCount}`);
          values.push(updateData[key]);
          paramCount++;
        }
      });

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(roomId);

      const query = `
        UPDATE rooms 
        SET ${fields.join(', ')}
        WHERE room_id = $${paramCount}
        RETURNING *
      `;

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Room number already exists');
      }
      throw new Error(`Database error updating room: ${error.message}`);
    }
  }

  /**
   * Get available rooms for a date range
   */
  static async getAvailableRooms(startDate, endDate, roomTypeId = null) {
    try {
      let query = `
        SELECT 
          r.*,
          rt.type_name,
          rt.base_price,
          rt.max_occupancy,
          (rt.base_price + COALESCE(r.price_adjustment, 0)) as current_price
        FROM rooms r
        JOIN room_types rt ON r.room_type_id = rt.room_type_id
        WHERE r.is_active = true 
          AND r.status = 'available'
          AND r.room_id NOT IN (
            SELECT res.room_id
            FROM reservations res
            WHERE res.status IN ('confirmed', 'checked-in')
              AND ($1::date < res.check_out_date AND $2::date > res.check_in_date)
          )
      `;

      const values = [startDate, endDate];

      if (roomTypeId) {
        query += ` AND r.room_type_id = $3`;
        values.push(roomTypeId);
      }

      query += ` ORDER BY r.floor, r.room_number`;

      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error getting available rooms: ${error.message}`);
    }
  }

  /**
   * Get room occupancy rate
   */
  static async getOccupancyRate(startDate, endDate) {
    try {
      const query = `
        SELECT 
          date::date,
          COUNT(DISTINCT r.room_id) as total_rooms,
          COUNT(DISTINCT CASE 
            WHEN res.status IN ('confirmed', 'checked-in') 
            AND date BETWEEN res.check_in_date AND res.check_out_date - interval '1 day'
            THEN res.room_id 
          END) as occupied_rooms,
          ROUND(
            COUNT(DISTINCT CASE 
              WHEN res.status IN ('confirmed', 'checked-in') 
              AND date BETWEEN res.check_in_date AND res.check_out_date - interval '1 day'
              THEN res.room_id 
            END) * 100.0 / NULLIF(COUNT(DISTINCT r.room_id), 0), 
          2) as occupancy_rate
        FROM generate_series($1::date, $2::date, interval '1 day') as date
        CROSS JOIN rooms r
        LEFT JOIN reservations res ON r.room_id = res.room_id
        WHERE r.is_active = true
        GROUP BY date::date
        ORDER BY date::date
      `;

      const result = await pool.query(query, [startDate, endDate]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error getting occupancy rate: ${error.message}`);
    }
  }
}

export default Room;
