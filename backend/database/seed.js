

// /**
//  * database/seed.js
//  * Comprehensive database seeder that populates ALL tables:
//  * roles, users, staff, guests, room_types, rooms, reservations, payments, audit_logs
//  *
//  * Usage: (from backend folder)
//  *   node database/seed.js
//  */

// import pg from 'pg';
// import bcrypt from 'bcryptjs';
// import dotenv from 'dotenv';
// import path from 'path';
// import { fileURLToPath } from 'url';

// dotenv.config(); // loads backend/.env when run from backend folder

// const { Pool } = pg;
// const pool = new Pool({
//   host: process.env.DB_HOST || 'localhost',
//   port: parseInt(process.env.DB_PORT ?? '5432', 10),
//   database: process.env.DB_NAME || 'hotel_reservation',
//   user: process.env.DB_USER || 'hotel_app',
//   password: process.env.DB_PASSWORD || '111214192123Ma',
// });

// async function seedDatabase() {
//   const client = await pool.connect();

//   try {
//     console.log(' Starting comprehensive database seeding...');
//     await client.query('BEGIN');

//     // 0. TRUNCATE & RESET
//     console.log(' Truncating tables and resetting identities...');
//     await client.query(`
//       TRUNCATE TABLE
//         payments, reservations, audit_logs, guests, rooms, room_types, staff, users, roles
//       RESTART IDENTITY CASCADE;
//     `);

//     // 1. ROLES (permissions is TEXT[] NOT NULL in your schema)
//     console.log(' Inserting roles...');
//     const insertRolesQ = `
//       INSERT INTO roles (role_name, permissions, created_at)
//       VALUES ($1, $2::text[], NOW()),
//              ($3, $4::text[], NOW()),
//              ($5, $6::text[], NOW())
//       RETURNING role_id, role_name;
//     `;
//     const rolesRes = await client.query(insertRolesQ, [
//       'admin', ['*'],
//       'receptionist', ['guests:read','guests:create','reservations:read','reservations:create','payments:process','rooms:read'],
//       'guest', ['reservations:create','reservations:read','profile:read']
//     ]);
//     const roleMap = {};
//     rolesRes.rows.forEach(r => { roleMap[r.role_name] = r.role_id; });

//     // 2. USERS
//     console.log(' Inserting users (admin, receptionist, guests)...');
//     const salt = await bcrypt.genSalt(10);
//     const adminHash = await bcrypt.hash('Admin123!', salt);
//     const recepHash = await bcrypt.hash('Recep123!', salt);
//     const guest1Hash = await bcrypt.hash('Guest123!', salt);
//     const guest2Hash = await bcrypt.hash('Guest2123!', salt);

//     const insertUsersQ = `
//       INSERT INTO users (role_id, email, password_hash, is_active, created_at)
//       VALUES
//         ($1, $2, $3, true, NOW()),
//         ($4, $5, $6, true, NOW()),
//         ($7, $8, $9, true, NOW()),
//         ($10, $11, $12, true, NOW())
//       RETURNING user_id, email;
//     `;
//     const usersRes = await client.query(insertUsersQ, [
//       roleMap.admin, 'admin@hotel.com', adminHash,
//       roleMap.receptionist, 'receptionist@hotel.com', recepHash,
//       roleMap.guest, 'guest1@example.com', guest1Hash,
//       roleMap.guest, 'guest2@example.com', guest2Hash
//     ]);
//     const userMap = {};
//     usersRes.rows.forEach(u => { userMap[u.email] = u.user_id; });

//     // 3. STAFF (link to user accounts)
//     console.log(' Inserting staff records...');
//     const insertStaffQ = `
//       INSERT INTO staff (user_id, first_name, last_name, phone, address, position, department, hire_date, is_active, created_at)
//       VALUES
//         ($1, 'Alice', 'Admin', '+251900000001', '1 Admin St', 'General Manager', 'Management', '2020-01-01', true, NOW()),
//         ($2, 'Ben', 'Reception', '+251900000002', 'receptionist@hotel.com', '2 Reception St', 'Receptionist', 'Front Desk', '2021-06-15', true, NOW())
//       RETURNING staff_id;
//     `;
//     const staffRes = await client.query(insertStaffQ, [ userMap['admin@hotel.com'], userMap['receptionist@hotel.com'] ]);
//     const staffIds = staffRes.rows.map(r => r.staff_id);
//     const mainAdminStaffId = staffIds[0];
//     const mainRecepStaffId = staffIds[1];

//     // 4. ROOM_TYPES
//     console.log(' Inserting room types...');
//     const insertRoomTypesQ = `
//       INSERT INTO room_types (type_name, description, base_price, max_occupancy, amenities, size_sqft, created_at)
//       VALUES
//         ($1, $2, $3, $4, $5::text[], $6, NOW()),
//         ($7, $8, $9, $10, $11::text[], $12, NOW()),
//         ($13, $14, $15, $16, $17::text[], $18, NOW()),
//         ($19, $20, $21, $22, $23::text[], $24, NOW())
//       RETURNING room_type_id, type_name;
//     `;
//     const rt = await client.query(insertRoomTypesQ, [
//       'Standard Room', 'Comfortable room with basic amenities', 100.00, 2, ['WiFi','TV','AC','Private Bathroom','Coffee Maker'], 300,
//       'Deluxe Room', 'Spacious room with upgraded amenities', 150.00, 3, ['WiFi','Smart TV','AC','Mini Bar','Work Desk'], 400,
//       'Suite', 'Luxurious suite with separate living area', 250.00, 4, ['WiFi','Smart TV','AC','Mini Bar','Sofa','Kitchenette'], 600,
//       'Family Room', 'Large room suitable for families', 180.00, 5, ['WiFi','TV','AC','Extra Beds','Children Amenities'], 500
//     ]);
//     const roomTypeMap = {};
//     rt.rows.forEach(r => { roomTypeMap[r.type_name] = r.room_type_id; });

//     // 5. ROOMS
//     console.log(' Inserting rooms...');
//     // create a small set of rooms across floors, referencing room_type_id
//     const roomsToInsert = [
//       { number: '101', type: 'Standard Room', floor: 1 },
//       { number: '102', type: 'Standard Room', floor: 1 },
//       { number: '201', type: 'Deluxe Room', floor: 2 },
//       { number: '202', type: 'Deluxe Room', floor: 2 },
//       { number: '301', type: 'Suite', floor: 3 },
//       { number: '302', type: 'Suite', floor: 3 },
//       { number: '401', type: 'Family Room', floor: 4 },
//       { number: '402', type: 'Family Room', floor: 4 }
//     ];
//     for (const r of roomsToInsert) {
//       await client.query(`
//         INSERT INTO rooms (room_type_id, room_number, floor, status, price_adjustment, special_features, is_active, created_at)
//         VALUES ($1, $2, $3, $4, $5, $6::text[], true, NOW())
//       `, [
//         roomTypeMap[r.type],
//         r.number,
//         r.floor,
//         'available',
//         0.00,
//         [] // no special features
//       ]);
//     }
//     const roomsRes = await client.query('SELECT room_id, room_number FROM rooms ORDER BY room_id');
//     const roomIds = roomsRes.rows.map(r => r.room_id);

//     // 6. GUESTS
//     console.log(' Inserting guests...');
//     // Link guest profiles to the guest user accounts created earlier
//     const insertGuestsQ = `
//       INSERT INTO guests (user_id, created_by, first_name, last_name, phone, address, id_type, id_number, date_of_birth, nationality, guest_type, created_at)
//       VALUES
//         ($1, $2, 'Michael', 'Brown', '5550101234', '789 Guest St', 'Passport', 'P12345678', '1990-05-15', 'USA', 'online', NOW()),
//         ($4, $2, 'Emily', 'Davis', '5550105678', '101 Guest St', 'Driver License', 'DL87654321', '1985-08-22', 'UK', 'walk-in', NOW()),
//         (NULL, $2, 'Robert', 'Wilson', '5550109012', '202 Guest St', 'Passport', 'P87654321', '1978-11-30', 'Canada', 'walk-in', NOW()),
//         (NULL, $2, 'Lisa', 'Anderson', '5550103456', '303 Guest St', 'ID Card', 'IC11223344', '1995-02-14', 'Australia', 'walk-in', NOW())
//       RETURNING guest_id, first_name;
//     `;
//     const guestsRes = await client.query(insertGuestsQ, [
//       userMap['guest1@example.com'],
//       mainAdminStaffId,
//       'guest1@example.com',
//       userMap['guest2@example.com'],
//       'guest2@example.com'
//     ]);
//     const guestIds = guestsRes.rows.map(g => g.guest_id);

//     // 7. RESERVATIONS
//     console.log(' Inserting reservations...');
//     // create 4 reservations using different statuses
//     // pick roomIds[0]..roomIds[3] and guestIds[0]..guestIds[3]
//     const today = new Date();
//     const fmt = (d) => d.toISOString().slice(0,10);

//     // Confirmed reservation (future)
//     await client.query(`
//       INSERT INTO reservations (guest_id, room_id, created_by, check_in_date, check_out_date, number_of_guests, total_amount, status, special_requests, created_at, updated_at)
//       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
//     `, [
//       guestIds[0], roomIds[0], userMap['receptionist@hotel.com'],
//       fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7)),
//       fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10)),
//       2, 300.00, 'confirmed', 'Late arrival'
//     ]);

//     // Checked-in (current)
//     await client.query(`
//       INSERT INTO reservations (guest_id, room_id, created_by, check_in_date, check_out_date, actual_check_in, number_of_guests, total_amount, status, special_requests, created_at, updated_at)
//       VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9, NOW(), NOW())
//     `, [
//       guestIds[1], roomIds[1], userMap['receptionist@hotel.com'],
//       fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)),
//       fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2)),
//       2, 400.00, 'checked-in', 'Allergic to feathers'
//     ]);

//     // Checked-out (past)
//     await client.query(`
//       INSERT INTO reservations (guest_id, room_id, created_by, check_in_date, check_out_date, actual_check_in, actual_check_out, number_of_guests, total_amount, status, created_at, updated_at)
//       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
//     `, [
//       guestIds[2], roomIds[2], userMap['receptionist@hotel.com'],
//       fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10)),
//       fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7)),
//       fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10)),
//       fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7)),
//       1, 250.00, 'checked-out'
//     ]);

//     // Cancelled (future)
//     await client.query(`
//       INSERT INTO reservations (guest_id, room_id, created_by, check_in_date, check_out_date, number_of_guests, total_amount, status, cancellation_reason, created_at, updated_at)
//       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
//     `, [
//       guestIds[3], roomIds[6], userMap['receptionist@hotel.com'],
//       fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30)),
//       fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 35)),
//       4, 800.00, 'cancelled', 'Personal reasons'
//     ]);

//     // Fetch reservations to create payments for applicable ones
//     const reservationsRes = await client.query(`SELECT reservation_id, status, total_amount FROM reservations`);
//     const reservationsRows = reservationsRes.rows;

//     // 8. PAYMENTS
//     console.log(' Inserting payments for non-cancelled reservations...');
//     for (const r of reservationsRows) {
//       if (r.status === 'cancelled') continue;
//       // one payment per reservation, mark as completed
//       await client.query(`
//         INSERT INTO payments (reservation_id, amount, payment_method, payment_status, refund_amount, transaction_id, payment_date, processed_by, notes, created_at)
//         VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, NOW())
//       `, [
//         r.reservation_id,
//         r.total_amount,
//         'credit_card',
//         'completed',
//         0.00,
//         `TXN-${Math.floor(Math.random()*900000)+100000}`,
//         mainRecepStaffId,
//         'Auto seeded payment'
//       ]);
//     }

//     // 9. AUDIT LOGS
//     console.log(' Inserting sample audit logs...');
//     // Example: log creating a guest record
//     const someGuest = guestIds[0];
//     await client.query(`
//       INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, user_id, ip_address, user_agent, timestamp)
//       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8, NOW())
//     `, [
//       'guests',
//       someGuest,
//       'INSERT',
//       null,
//       JSON.stringify({ guest_id: someGuest, first_name: 'Michael', last_name: 'Brown' }),
//       userMap['admin@hotel.com'],
//       '127.0.0.1',
//       'seed-script/1.0'
//     ]);

//     // commit
//     await client.query('COMMIT');

//     // Summary
//     const counts = await client.query(`
//       SELECT
//         (SELECT COUNT(*) FROM roles)::int as roles,
//         (SELECT COUNT(*) FROM users)::int as users,
//         (SELECT COUNT(*) FROM staff)::int as staff,
//         (SELECT COUNT(*) FROM guests)::int as guests,
//         (SELECT COUNT(*) FROM room_types)::int as room_types,
//         (SELECT COUNT(*) FROM rooms)::int as rooms,
//         (SELECT COUNT(*) FROM reservations)::int as reservations,
//         (SELECT COUNT(*) FROM payments)::int as payments,
//         (SELECT COUNT(*) FROM audit_logs)::int as audit_logs
//     `);

//     const s = counts.rows[0];
//     console.log('\n Seeding completed successfully:');
//     console.log(`Roles: ${s.roles}, Users: ${s.users}, Staff: ${s.staff}, Guests: ${s.guests}`);
//     console.log(`Room types: ${s.room_types}, Rooms: ${s.rooms}`);
//     console.log(`Reservations: ${s.reservations}, Payments: ${s.payments}, Audit logs: ${s.audit_logs}`);

//     process.exit(0);
//   } catch (err) {
//     await client.query('ROLLBACK').catch(() => {});
//     console.error(' Seeding failed:', err);
//     process.exit(1);
//   } finally {
//     client.release();
//     await pool.end();
//   }
// }

// seedDatabase();

/**
 * database/seed.js
 * Seeds roles, users, staff, guests, room_types, rooms,
 * reservations, payments, and audit_logs.
 *
 * Run from the backend folder:
 *   node database/seed.js
 */

import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'hotel_reservation',
  user: process.env.DB_USER || 'hotel_app',
  password: process.env.DB_PASSWORD || '111214192123Ma',
});

async function seedDatabase() {
  const client = await pool.connect();

  try {
    console.log(' Starting comprehensive database seeding...');
    await client.query('BEGIN');

    // Clear and reset the sample data tables.
    console.log(' Truncating tables and resetting identities...');
    await client.query(`
      TRUNCATE TABLE
        payments, reservations, audit_logs, guests, rooms,
        room_types, staff, users, roles
      RESTART IDENTITY CASCADE;
    `);

    // 1. ROLES
    console.log(' Inserting roles...');
    const rolesRes = await client.query(`
      INSERT INTO roles (role_name, permissions, created_at)
      VALUES
        ($1, $2::text[], NOW()),
        ($3, $4::text[], NOW()),
        ($5, $6::text[], NOW())
      RETURNING role_id, role_name;
    `, [
      'admin', ['*'],
      'receptionist', [
        'guests:read',
        'guests:create',
        'reservations:read',
        'reservations:create',
        'payments:process',
        'rooms:read',
      ],
      'guest', [
        'reservations:create',
        'reservations:read',
        'profile:read',
      ],
    ]);

    const roleMap = {};
    rolesRes.rows.forEach((role) => {
      roleMap[role.role_name] = role.role_id;
    });

    // 2. USERS
    console.log(' Inserting users (admin, receptionist, guests)...');

    const salt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash('Admin123!', salt);
    const receptionistHash = await bcrypt.hash('Recep123!', salt);
    const guest1Hash = await bcrypt.hash('Guest123!', salt);
    const guest2Hash = await bcrypt.hash('Guest2123!', salt);

    const usersRes = await client.query(`
      INSERT INTO users (role_id, email, password_hash, is_active, created_at)
      VALUES
        ($1, $2, $3, true, NOW()),
        ($4, $5, $6, true, NOW()),
        ($7, $8, $9, true, NOW()),
        ($10, $11, $12, true, NOW())
      RETURNING user_id, email;
    `, [
      roleMap.admin, 'admin@hotel.com', adminHash,
      roleMap.receptionist, 'receptionist@hotel.com', receptionistHash,
      roleMap.guest, 'guest1@example.com', guest1Hash,
      roleMap.guest, 'guest2@example.com', guest2Hash,
    ]);

    const userMap = {};
    usersRes.rows.forEach((user) => {
      userMap[user.email] = user.user_id;
    });

    // 3. STAFF
    // Email addresses are on the linked users records, not in the staff table.
    console.log(' Inserting staff records...');
    const staffRes = await client.query(`
      INSERT INTO staff (
        user_id, first_name, last_name, phone, address,
        position, department, hire_date, is_active, created_at
      )
      VALUES
        ($1, 'Alice', 'Admin', '+251900000001', '1 Admin St',
         'General Manager', 'Management', '2020-01-01', true, NOW()),
        ($2, 'Ben', 'Reception', '+251900000002', '2 Reception St',
         'Receptionist', 'Front Desk', '2021-06-15', true, NOW())
      RETURNING staff_id;
    `, [
      userMap['admin@hotel.com'],
      userMap['receptionist@hotel.com'],
    ]);

    const staffIds = staffRes.rows.map((row) => row.staff_id);
    const mainRecepStaffId = staffIds[1];

    // 4. ROOM TYPES
    console.log(' Inserting room types...');
    const roomTypesRes = await client.query(`
      INSERT INTO room_types (
        type_name, description, base_price, max_occupancy,
        amenities, size_sqft, created_at
      )
      VALUES
        ($1, $2, $3, $4, $5::text[], $6, NOW()),
        ($7, $8, $9, $10, $11::text[], $12, NOW()),
        ($13, $14, $15, $16, $17::text[], $18, NOW()),
        ($19, $20, $21, $22, $23::text[], $24, NOW())
      RETURNING room_type_id, type_name;
    `, [
      'Standard Room',
      'Comfortable room with basic amenities',
      100.00,
      2,
      ['WiFi', 'TV', 'AC', 'Private Bathroom', 'Coffee Maker'],
      300,

      'Deluxe Room',
      'Spacious room with upgraded amenities',
      150.00,
      3,
      ['WiFi', 'Smart TV', 'AC', 'Mini Bar', 'Work Desk'],
      400,

      'Suite',
      'Luxurious suite with separate living area',
      250.00,
      4,
      ['WiFi', 'Smart TV', 'AC', 'Mini Bar', 'Sofa', 'Kitchenette'],
      600,

      'Family Room',
      'Large room suitable for families',
      180.00,
      5,
      ['WiFi', 'TV', 'AC', 'Extra Beds', 'Children Amenities'],
      500,
    ]);

    const roomTypeMap = {};
    roomTypesRes.rows.forEach((roomType) => {
      roomTypeMap[roomType.type_name] = roomType.room_type_id;
    });

    // 5. ROOMS
    console.log(' Inserting rooms...');
    const roomsToInsert = [
      { number: '101', type: 'Standard Room', floor: 1 },
      { number: '102', type: 'Standard Room', floor: 1 },
      { number: '201', type: 'Deluxe Room', floor: 2 },
      { number: '202', type: 'Deluxe Room', floor: 2 },
      { number: '301', type: 'Suite', floor: 3 },
      { number: '302', type: 'Suite', floor: 3 },
      { number: '401', type: 'Family Room', floor: 4 },
      { number: '402', type: 'Family Room', floor: 4 },
    ];

    for (const room of roomsToInsert) {
      await client.query(`
        INSERT INTO rooms (
          room_type_id, room_number, floor, status,
          price_adjustment, special_features, is_active, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6::text[], true, NOW());
      `, [
        roomTypeMap[room.type],
        room.number,
        room.floor,
        'available',
        0.00,
        [],
      ]);
    }

    const roomsRes = await client.query(
      'SELECT room_id, room_number FROM rooms ORDER BY room_id'
    );
    const roomIds = roomsRes.rows.map((room) => room.room_id);

    // 6. GUESTS
    // created_by references users.user_id, so use the admin user ID.
    console.log(' Inserting guests...');
    const guestsRes = await client.query(`
      INSERT INTO guests (
        user_id, created_by, first_name, last_name, phone, address,
        id_type, id_number, date_of_birth, nationality, guest_type, created_at
      )
      VALUES
        ($1, $2, 'Michael', 'Brown', '5550101234', '789 Guest St',
         'Passport', 'P12345678', '1990-05-15', 'USA', 'online', NOW()),
        ($3, $2, 'Emily', 'Davis', '5550105678', '101 Guest St',
         'Driver License', 'DL87654321', '1985-08-22', 'UK', 'walk-in', NOW()),
        (NULL, $2, 'Robert', 'Wilson', '5550109012', '202 Guest St',
         'Passport', 'P87654321', '1978-11-30', 'Canada', 'walk-in', NOW()),
        (NULL, $2, 'Lisa', 'Anderson', '5550103456', '303 Guest St',
         'ID Card', 'IC11223344', '1995-02-14', 'Australia', 'walk-in', NOW())
      RETURNING guest_id, first_name;
    `, [
      userMap['guest1@example.com'], // $1
      userMap['admin@hotel.com'],    // $2
      userMap['guest2@example.com'], // $3
    ]);

    const guestIds = guestsRes.rows.map((guest) => guest.guest_id);

    // 7. RESERVATIONS
    console.log(' Inserting reservations...');
    const today = new Date();
    const formatDate = (date) => date.toISOString().slice(0, 10);

    // Confirmed reservation (future)
    await client.query(`
      INSERT INTO reservations (
        guest_id, room_id, created_by, check_in_date, check_out_date,
        number_of_guests, total_amount, status, special_requests,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW());
    `, [
      guestIds[0],
      roomIds[0],
      userMap['receptionist@hotel.com'],
      formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7)),
      formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10)),
      2,
      300.00,
      'confirmed',
      'Late arrival',
    ]);

    // Checked-in reservation
    await client.query(`
      INSERT INTO reservations (
        guest_id, room_id, created_by, check_in_date, check_out_date,
        actual_check_in, number_of_guests, total_amount, status,
        special_requests, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9, NOW(), NOW());
    `, [
      guestIds[1],
      roomIds[1],
      userMap['receptionist@hotel.com'],
      formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)),
      formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2)),
      2,
      400.00,
      'checked-in',
      'Allergic to feathers',
    ]);

    // Checked-out reservation
    await client.query(`
      INSERT INTO reservations (
        guest_id, room_id, created_by, check_in_date, check_out_date,
        actual_check_in, actual_check_out, number_of_guests,
        total_amount, status, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW());
    `, [
      guestIds[2],
      roomIds[2],
      userMap['receptionist@hotel.com'],
      formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10)),
      formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7)),
      formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10)),
      formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7)),
      1,
      250.00,
      'checked-out',
    ]);

    // Cancelled reservation (future)
    await client.query(`
      INSERT INTO reservations (
        guest_id, room_id, created_by, check_in_date, check_out_date,
        number_of_guests, total_amount, status, cancellation_reason,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW());
    `, [
      guestIds[3],
      roomIds[6],
      userMap['receptionist@hotel.com'],
      formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30)),
      formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 35)),
      4,
      800.00,
      'cancelled',
      'Personal reasons',
    ]);

    // 8. PAYMENTS
    console.log(' Inserting payments for non-cancelled reservations...');
    const reservationsRes = await client.query(
      'SELECT reservation_id, status, total_amount FROM reservations'
    );

    for (const reservation of reservationsRes.rows) {
      if (reservation.status === 'cancelled') continue;

      await client.query(`
        INSERT INTO payments (
          reservation_id, amount, payment_method, payment_status,
          refund_amount, transaction_id, payment_date, processed_by,
          notes, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, NOW());
      `, [
        reservation.reservation_id,
        reservation.total_amount,
        'credit_card',
        'completed',
        0.00,
        `TXN-${Math.floor(Math.random() * 900000) + 100000}`,
        staffIds[1],
        'Auto seeded payment',
      ]);
    }

    // 9. AUDIT LOGS
    console.log(' Inserting sample audit logs...');
    const someGuest = guestIds[0];

    await client.query(`
      INSERT INTO audit_logs (
        table_name, record_id, action, old_values, new_values,
        user_id, ip_address, user_agent, timestamp
      )
      VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8, NOW());
    `, [
      'guests',
      someGuest,
      'INSERT',
      null,
      JSON.stringify({
        guest_id: someGuest,
        first_name: 'Michael',
        last_name: 'Brown',
      }),
      userMap['admin@hotel.com'],
      '127.0.0.1',
      'seed-script/1.0',
    ]);

    await client.query('COMMIT');

    // Summary
    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM roles)::int AS roles,
        (SELECT COUNT(*) FROM users)::int AS users,
        (SELECT COUNT(*) FROM staff)::int AS staff,
        (SELECT COUNT(*) FROM guests)::int AS guests,
        (SELECT COUNT(*) FROM room_types)::int AS room_types,
        (SELECT COUNT(*) FROM rooms)::int AS rooms,
        (SELECT COUNT(*) FROM reservations)::int AS reservations,
        (SELECT COUNT(*) FROM payments)::int AS payments,
        (SELECT COUNT(*) FROM audit_logs)::int AS audit_logs;
    `);

    const summary = counts.rows[0];
    console.log('\n Seeding completed successfully:');
    console.log(`Roles: ${summary.roles}, Users: ${summary.users}, Staff: ${summary.staff}, Guests: ${summary.guests}`);
    console.log(`Room types: ${summary.room_types}, Rooms: ${summary.rooms}`);
    console.log(`Reservations: ${summary.reservations}, Payments: ${summary.payments}, Audit logs: ${summary.audit_logs}`);
    console.log('Sample admin login: admin@hotel.com / Admin123!');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(' Seeding failed:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase();
