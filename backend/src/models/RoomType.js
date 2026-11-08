/**
 * RoomType.js - Room Type model
 * * Handles room category data operations including pricing,
 * amenities, and capacity management.
 * * Dependencies:
 * - database pool from config/database.js
 */

import pool from '../config/database.js';

class RoomType {
  /**
   * Create new room type
   * @param {Object} roomTypeData - Room type information
   * @returns {Promise<Object>} Created room type
   */
  static async create(roomTypeData) {
    try {
      const {
        type_name,
        description,
        base_price,
        max_occupancy,
        amenities = [],
        size_sqft
      } = roomTypeData;

      const query = `
        INSERT INTO room_types (
          type_name, description, base_price, max_occupancy, 
          amenities, size_sqft
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const values = [
        type_name,
        description || null,
        base_price,
        max_occupancy,
        amenities,
        size_sqft || null
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Room type name already exists');
      }
      throw new Error(`Database error creating room type: ${error.message}`);
    }
  }

  /**
   * Find room type by ID
   * @param {number} roomTypeId - Room Type ID
   * @returns {Promise<Object|null>} Room type object or null
   */
  static async findById(roomTypeId) {
    try {
      const result = await pool.query(
        'SELECT * FROM room_types WHERE room_type_id = $1',
        [roomTypeId]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Database error finding room type: ${error.message}`);
    }
  }

  /**
   * Find room type by name
   * @param {string} typeName - Room type name
   * @returns {Promise<Object|null>} Room type object or null
   */
  static async findByName(typeName) {
    try {
      const result = await pool.query(
        'SELECT * FROM room_types WHERE type_name = $1',
        [typeName]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Database error finding room type: ${error.message}`);
    }
  }

  /**
   * Get all room types
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Paginated room types
   */
  static async getAll(page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;

      const countQuery = 'SELECT COUNT(*) FROM room_types';
      const dataQuery = `
        SELECT * FROM room_types
        ORDER BY room_type_id DESC
        LIMIT $1 OFFSET $2
      `;

      const [countResult, dataResult] = await Promise.all([
        pool.query(countQuery),
        pool.query(dataQuery, [limit, offset])
      ]);

      const total = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / limit);

      return {
        roomTypes: dataResult.rows,
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
      throw new Error(`Database error getting room types: ${error.message}`);
    }
  }

  /**
   * Update room type
   * @param {number} roomTypeId - Room Type ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object>} Updated room type
   */
  static async update(roomTypeId, updateData) {
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

      values.push(roomTypeId);

      const query = `
        UPDATE room_types 
        SET ${fields.join(', ')}
        WHERE room_type_id = $${paramCount}
        RETURNING *
      `;

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Room type name already exists');
      }
      throw new Error(`Database error updating room type: ${error.message}`);
    }
  }

  /**
   * Delete room type
   */
  static async delete(roomTypeId) {
    try {
      // Check if any rooms use this type
      const checkQuery = 'SELECT COUNT(*) FROM rooms WHERE room_type_id = $1';
      const checkResult = await pool.query(checkQuery, [roomTypeId]);
      const roomCount = parseInt(checkResult.rows[0].count);

      if (roomCount > 0) {
        throw new Error(`Cannot delete room type: ${roomCount} rooms are using it`);
      }

      const result = await pool.query(
        'DELETE FROM room_types WHERE room_type_id = $1 RETURNING *',
        [roomTypeId]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error(`Database error deleting room type: ${error.message}`);
    }
  }

  /**
   * Get room types with availability info
   */
  static async getAvailableTypes(startDate, endDate) {
    try {
      const query = `
        SELECT 
          rt.*,
          COUNT(r.room_id) as total_rooms,
          COUNT(r.room_id) - COALESCE((
            SELECT COUNT(DISTINCT res.room_id)
            FROM reservations res
            JOIN rooms r2 ON res.room_id = r2.room_id
            WHERE r2.room_type_id = rt.room_type_id
              AND res.status IN ('confirmed', 'checked-in')
              AND (
                ($1::date < res.check_out_date AND $2::date > res.check_in_date)
              )
          ), 0) as available_rooms
        FROM room_types rt
        LEFT JOIN rooms r ON rt.room_type_id = r.room_type_id
        WHERE r.is_active = true AND r.status = 'available'
        GROUP BY rt.room_type_id
        HAVING COUNT(r.room_id) > 0
        ORDER BY rt.type_name
      `;

      const result = await pool.query(query, [startDate, endDate]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error getting available types: ${error.message}`);
    }
  }
}

export default RoomType;
