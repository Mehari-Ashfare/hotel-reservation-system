/**
 * Guest.js - Guest model for guest management
 * * Handles guest data operations including creation,
 * updates, and retrieval of guest information.
 * * Dependencies:
 * - database pool from config/database.js
 */

import pool from '../config/database.js';

class Guest {
  /**
   * Create new guest
   * FIX: Removed 'email' column from INSERT
   */
  static async create(guestData) {
    try {
      const {
        user_id,
        created_by,
        first_name,
        last_name,
        // email, <-- Removed
        phone,
        address,
        id_type,
        id_number,
        date_of_birth,
        nationality,
        sex,
        guest_type = 'walk-in'
      } = guestData;

      const query = `
        INSERT INTO guests (
          user_id, created_by, first_name, last_name, phone,
          address, id_type, id_number, date_of_birth, nationality, guest_type, sex
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const values = [
        user_id || null,
        created_by || null,
        first_name,
        last_name,
        // email || null, <-- Removed
        phone,
        address || null,
        id_type || null,
        id_number || null,
        date_of_birth || null,
        nationality || null,
        guest_type,
        sex || null
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Duplicate guest data');
      }
      throw new Error('Database error creating guest: ' + error.message);
    }
  }

  /**
   * Find guest by ID
   * FIX: Joins with users table to still provide email
   */
  static async findById(guestId) {
    try {
      const query = `
        SELECT g.*, u.email as user_email
        FROM guests g
        LEFT JOIN users u ON g.user_id = u.user_id
        WHERE g.guest_id = $1
      `;
      const result = await pool.query(query, [guestId]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error('Database error finding guest: ' + error.message);
    }
  }

  /**
   * Find guest by user ID
   * FIX: Joins with users table to still provide email
   */
  static async findByUserId(userId) {
    try {
      const query = `
        SELECT g.*, u.email as user_email
        FROM guests g
        LEFT JOIN users u ON g.user_id = u.user_id
        WHERE g.user_id = $1
      `;
      const result = await pool.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error('Database error finding guest: ' + error.message);
    }
  }

  /**
   * Update guest information
   */
  static async update(guestId, updateData) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      // Build dynamic query based on provided fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined && key !== 'email') { // Exclude email from updates
          fields.push(`${key} = $${paramCount}`);
          values.push(updateData[key]);
          paramCount++;
        }
      });

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(guestId);

      const query = `
        UPDATE guests 
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE guest_id = $${paramCount}
        RETURNING *
      `;

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error('Database error updating guest: ' + error.message);
    }
  }

  /**
   * Get all guests with pagination
   * FIX: Joins with users table to get email
   */
  static async getAll(page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;

      const countQuery = 'SELECT COUNT(*) FROM guests';
      const dataQuery = `
        SELECT g.*, u.email as user_email
        FROM guests g
        LEFT JOIN users u ON g.user_id = u.user_id
        ORDER BY g.guest_id DESC
        LIMIT $1 OFFSET $2
      `;

      const [countResult, dataResult] = await Promise.all([
        pool.query(countQuery),
        pool.query(dataQuery, [limit, offset])
      ]);

      const total = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / limit);

      return {
        guests: dataResult.rows,
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
      throw new Error('Database error getting guests: ' + error.message);
    }
  }

  /**
   * Search guests by name, email, or phone
   * FIX: Searches email in joined users table
   */
  static async search(searchTerm) {
    try {
      const query = `
        SELECT g.*, u.email as user_email
        FROM guests g
        LEFT JOIN users u ON g.user_id = u.user_id
        WHERE g.first_name ILIKE $1 
          OR g.last_name ILIKE $1 
          OR u.email ILIKE $1 
          OR g.phone ILIKE $1
        ORDER BY g.guest_id DESC
        LIMIT 50
      `;
      const result = await pool.query(query, [`%${searchTerm}%`]);
      return result.rows;
    } catch (error) {
      throw new Error('Database error searching guests: ' + error.message);
    }
  }
  
  /**
   * Delete guest
   */
  static async delete(id) {
    try {
      const query = 'DELETE FROM guests WHERE guest_id = $1 RETURNING *';
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw new Error('Database error deleting guest: ' + error.message);
    }
  }
}

export default Guest;






// /**
//  * Guest.js - Guest model for guest management
//  * * Handles guest data operations including creation,
//  * updates, and retrieval of guest information.
//  * * Dependencies:
//  * - database pool from config/database.js
//  */

// import pool from '../config/database.js';

// class Guest {
//   /**
//    * Create new guest
//    * @param {Object} guestData - Guest information
//    * @returns {Promise<Object>} Created guest
//    */
//   static async create(guestData) {
//     try {
//       const {
//         user_id,
//         created_by,
//         first_name,
//         last_name,
//         email,
//         phone,
//         address,
//         id_type,
//         id_number,
//         date_of_birth,
//         nationality,
//         guest_type = 'walk-in'
//       } = guestData;

//       const query = `
//         INSERT INTO guests (
//           user_id, created_by, first_name, last_name, email, phone,
//           address, id_type, id_number, date_of_birth, nationality, guest_type
//         )
//         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
//         RETURNING *
//       `;

//       const values = [
//         user_id || null,
//         created_by || null,
//         first_name,
//         last_name,
//         email || null,
//         phone,
//         address || null,
//         id_type || null,
//         id_number || null,
//         date_of_birth || null,
//         nationality || null,
//         guest_type
//       ];

//       const result = await pool.query(query, values);
//       return result.rows[0];
//     } catch (error) {
//       if (error.code === '23505') { // Unique constraint violation
//         throw new Error('Duplicate guest data');
//       }
//       throw new Error('Database error creating guest: ' + error.message);
//     }
//   }

//   /**
//    * Find guest by ID
//    * @param {number} guestId - Guest ID
//    * @returns {Promise<Object|null>} Guest object or null
//    */
//   static async findById(guestId) {
//     try {
//       const query = `
//         SELECT g.*, u.email as user_email
//         FROM guests g
//         LEFT JOIN users u ON g.user_id = u.user_id
//         WHERE g.guest_id = $1
//       `;
//       const result = await pool.query(query, [guestId]);
//       return result.rows[0] || null;
//     } catch (error) {
//       throw new Error('Database error finding guest: ' + error.message);
//     }
//   }

//   /**
//    * Find guest by user ID
//    * @param {number} userId - User ID
//    * @returns {Promise<Object|null>} Guest object or null
//    */
//   static async findByUserId(userId) {
//     try {
//       const query = `
//         SELECT g.*, u.email as user_email
//         FROM guests g
//         LEFT JOIN users u ON g.user_id = u.user_id
//         WHERE g.user_id = $1
//       `;
//       const result = await pool.query(query, [userId]);
//       return result.rows[0] || null;
//     } catch (error) {
//       throw new Error('Database error finding guest: ' + error.message);
//     }
//   }

//   /**
//    * Update guest information
//    * @param {number} guestId - Guest ID
//    * @param {Object} updateData - Fields to update
//    * @returns {Promise<Object>} Updated guest
//    */
//   static async update(guestId, updateData) {
//     try {
//       const fields = [];
//       const values = [];
//       let paramCount = 1;

//       // Build dynamic query based on provided fields
//       Object.keys(updateData).forEach(key => {
//         if (updateData[key] !== undefined) {
//           fields.push(`${key} = $${paramCount}`);
//           values.push(updateData[key]);
//           paramCount++;
//         }
//       });

//       if (fields.length === 0) {
//         throw new Error('No fields to update');
//       }

//       values.push(guestId);

//       const query = `
//         UPDATE guests 
//         SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
//         WHERE guest_id = $${paramCount}
//         RETURNING *
//       `;

//       const result = await pool.query(query, values);
//       return result.rows[0];
//     } catch (error) {
//       throw new Error('Database error updating guest: ' + error.message);
//     }
//   }

//   /**
//    * Get all guests with pagination
//    * @param {number} page - Page number
//    * @param {number} limit - Items per page
//    * @returns {Promise<Object>} Paginated guests
//    */
//   static async getAll(page = 1, limit = 20) {
//     try {
//       const offset = (page - 1) * limit;

//       const countQuery = 'SELECT COUNT(*) FROM guests';
//       const dataQuery = `
//         SELECT g.*, u.email as user_email
//         FROM guests g
//         LEFT JOIN users u ON g.user_id = u.user_id
//         ORDER BY g.guest_id DESC
//         LIMIT $1 OFFSET $2
//       `;

//       const [countResult, dataResult] = await Promise.all([
//         pool.query(countQuery),
//         pool.query(dataQuery, [limit, offset])
//       ]);

//       const total = parseInt(countResult.rows[0].count);
//       const totalPages = Math.ceil(total / limit);

//       return {
//         guests: dataResult.rows,
//         pagination: {
//           page,
//           limit,
//           total,
//           totalPages,
//           hasNext: page < totalPages,
//           hasPrev: page > 1
//         }
//       };
//     } catch (error) {
//       throw new Error('Database error getting guests: ' + error.message);
//     }
//   }

//   /**
//    * Search guests by name, email, or phone
//    * @param {string} searchTerm - Search term
//    * @returns {Promise<Array>} Search results
//    */
//   static async search(searchTerm) {
//     try {
//       const query = `
//         SELECT g.*, u.email as user_email
//         FROM guests g
//         LEFT JOIN users u ON g.user_id = u.user_id
//         WHERE g.first_name ILIKE $1 
//           OR g.last_name ILIKE $1 
//           OR g.email ILIKE $1 
//           OR g.phone ILIKE $1
//         ORDER BY g.guest_id DESC
//         LIMIT 50
//       `;
//       const result = await pool.query(query, [`%${searchTerm}%`]);
//       return result.rows;
//     } catch (error) {
//       throw new Error('Database error searching guests: ' + error.message);
//     }
//   }
//   /**
//    * Delete guest
//    * @param {number} id - Guest ID
//    * @returns {Promise<Object>} Deleted guest
//    */
//   static async delete(id) {
//     try {
//       const query = 'DELETE FROM guests WHERE guest_id = $1 RETURNING *';
//       const result = await pool.query(query, [id]);
//       return result.rows[0];
//     } catch (error) {
//       throw new Error('Database error deleting guest: ' + error.message);
//     }
//   }
// }

// export default Guest;