# Database

This directory contains the PostgreSQL schema and development data scripts for the hotel reservation application.

## Files

- `schema.sql` creates the enum types, tables, constraints, indexes, views, and triggers.
- `seed.js` inserts development sample data.
- `clean.js` empties the sample tables and resets their identity counters.

## Create and configure a database

Create a PostgreSQL database and login role if you do not already have them. For example, in a PostgreSQL administrator session:

```sql
CREATE ROLE hotel_app WITH LOGIN PASSWORD 'choose-a-strong-password';
CREATE DATABASE hotel_reservation OWNER hotel_app;
```

Put the database connection values in `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hotel_reservation
DB_USER=hotel_app
DB_PASSWORD=your-database-password
```

Apply the schema from the repository root:

```bash
psql -U hotel_app -d hotel_reservation -f backend/database/schema.sql
```

The schema uses `CREATE TYPE` and `CREATE TABLE` statements for a new database. Do not apply it repeatedly to a database that already has these objects.

## Seed development data

From the `backend` directory:

```bash
node database/seed.js
```

The seeder runs in a transaction and **truncates its listed tables with `CASCADE`, then resets their identity counters**. A successful run replaces existing data in those tables. Use it only when that is intended, such as on a disposable development database.

The seed creates sample users, including `admin@hotel.com` with password `Admin123!`. Treat this as local development access only; change credentials before any shared or deployed use.

## Clear sample tables

From the `backend` directory:

```bash
node database/clean.js
```

This also truncates tables and resets identities. It does not recreate the sample data.
