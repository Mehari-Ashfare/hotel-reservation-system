/**
 * clean.js - Wipes the entire database
 * Usage: node database/clean.js
 */
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup Env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'hotel_reservation',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const cleanDatabase = async () => {
  console.log('  Cleaning Database...');
  try {
    await pool.query(`
      TRUNCATE TABLE 
        audit_logs, payments, reservations, guests, 
        rooms, room_types, staff, users, roles 
      RESTART IDENTITY CASCADE;
    `);
    console.log(' All tables truncated and IDs reset.');
    process.exit(0);
  } catch (err) {
    console.error(' Error cleaning database:', err);
    process.exit(1);
  }
};

cleanDatabase();