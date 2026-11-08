# Hotel Reservation System

A full-stack hotel reservation application with a React/Vite frontend, an Express API, and a PostgreSQL database. The application supports guest accounts, hotel staff, rooms, reservations, payments, reports, and audit history.

## Requirements

- Node.js 18 or later and npm
- PostgreSQL 14 or later
- Git

## Project layout

```text
backend/                 Express API and database scripts
  database/schema.sql    PostgreSQL schema
  database/seed.js       Development sample-data seeder
  src/                   Routes, controllers, models, middleware, utilities
  app.js                 Express app and API mounting
  server.js              API startup
frontend/                React application built with Vite
docs/                    API reference
```

## Quick start

Run the frontend and backend in separate terminals.

### 1. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Create a PostgreSQL role and database

If you already have a PostgreSQL role and database for this project, keep using them and skip this step. Otherwise, open a PostgreSQL shell as its administrator:

```bash
sudo -u postgres psql
```

Then create a login role and database (replace the example password with your own):

```sql
CREATE ROLE hotel_app WITH LOGIN PASSWORD 'choose-a-strong-password';
CREATE DATABASE hotel_reservation OWNER hotel_app;
\q
```

### 3. Configure the backend

Create `backend/.env` and set the values for your local PostgreSQL setup:

```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hotel_reservation
DB_USER=hotel_app
DB_PASSWORD=your-database-password
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
```

Generate a random JWT secret with `openssl rand -hex 32`. Keep `.env` private and do not commit it. To enable Gmail password-reset emails, also configure `EMAIL_USER` and `EMAIL_PASS` in this file. See [Backend setup](backend/README.md).

### 4. Create the schema

From the repository root, run this once against a new, empty database:

```bash
psql -U hotel_app -d hotel_reservation -f backend/database/schema.sql
```

Enter the database role's password when prompted. The schema creates the tables, types, views, and other database objects.

### 5. Add development sample data (optional)

```bash
cd backend
node database/seed.js
```

The seeder **truncates and recreates its sample tables**. Use it only with a development database whose existing contents can be discarded. It creates a sample admin account: `admin@hotel.com` / `Admin123!`. Change or remove sample credentials before using the application beyond local development.

### 6. Start the backend

In the `backend` directory:

```bash
npm run dev
```

The API listens on `http://localhost:5000` by default. Check `http://localhost:5000/api/health` for its health response and `http://localhost:5000/api-docs` for Swagger UI.

### 7. Start the frontend

In a second terminal, from the `frontend` directory:

```bash
npm run dev
```

Vite serves the frontend at `http://localhost:5173`. The Axios base URL is currently set to `http://localhost:5000/api` in `frontend/src/services/api.js`.

## Useful commands

| Directory | Command | Purpose |
| --- | --- | --- |
| `backend` | `npm run dev` | Start API with Nodemon |
| `backend` | `npm start` | Start API without Nodemon |
| `backend` | `node database/seed.js` | Clear and seed development tables |
| `frontend` | `npm run dev` | Start Vite development server |
| `frontend` | `npm run build` | Build frontend for deployment |
| `frontend` | `npm run preview` | Preview the production build locally |

## API overview

The API base URL is `http://localhost:5000/api`. Main route groups are `/auth`, `/guests`, `/rooms`, `/reservations`, `/payments`, `/reports`, `/staff`, `/audit`, and `/dashboard`. Most application endpoints require a bearer token; role restrictions also apply. See [API documentation](docs/API_DOCUMENTATION.md) or open Swagger UI while the backend is running.

## Troubleshooting

- **Database connection fails:** Confirm PostgreSQL is running and that `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` in `backend/.env` match a role with access to the database.
- **Frontend cannot reach the API:** Start the backend and check the URL in `frontend/src/services/api.js`.
- **Password reset email is not sent:** Configure the mailer variables `EMAIL_USER` and `EMAIL_PASS`; check the backend terminal for SMTP errors. The reset link currently targets local Vite at port 5173.
- **Seed command errors:** Apply `backend/database/schema.sql` to a clean database first. Seeding is destructive to the listed sample tables.

## Documentation

- [Backend setup and configuration](backend/README.md)
- [Frontend setup](frontend/README.md)
- [Database setup and sample data](backend/database/README.md)
- [API reference](docs/API_DOCUMENTATION.md)
