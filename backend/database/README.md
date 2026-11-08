# Database Directory

## Purpose
Contains database schema, migrations, and seeding scripts for the PostgreSQL database.

## Files
- \schema.sql\: Complete database schema with tables, views, and triggers
- \seed.js\: Script to populate database with sample data

## Setup Instructions
1. Install PostgreSQL 14+
2. Create a database:
   \\\sql
   CREATE DATABASE hotel_reservation;
   \\\
3. Run the schema:
   \\\ash
   psql -U postgres -d hotel_reservation -f schema.sql
   \\\
4. (Optional) Seed with sample data:
   \\\ash
   node seed.js
   \\\

## Schema Overview
The database includes:
- Users & authentication tables
- Guest information
- Room inventory and types
- Reservation system
- Payment processing
- Audit logging
- Reporting views
