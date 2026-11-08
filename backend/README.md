# Backend

The backend is an Express.js API backed by PostgreSQL. `server.js` checks the database connection and starts the HTTP server; `app.js` configures middleware and mounts routes.

## Requirements

- Node.js 18 or later
- PostgreSQL 14 or later

## Install and configure

From this directory:

```bash
npm install
```

Create `.env` in this directory. At minimum, configure:

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

Use `openssl rand -hex 32` to generate a JWT secret. Do not commit `.env` or place real credentials in source files. To enable forgot-password email, the current mailer also needs `EMAIL_USER` and `EMAIL_PASS` for a Gmail account configured for app-password authentication.

## Start the API

```bash
npm run dev
```

For a normal Node.js start:

```bash
npm start
```

The default port is `5000`. Useful local URLs:

- Health check: `http://localhost:5000/api/health`
- Swagger UI: `http://localhost:5000/api-docs`
- OpenAPI JSON: `http://localhost:5000/api-docs.json`

## Database setup

From the repository root, apply the schema to a new, empty database:

```bash
psql -U hotel_app -d hotel_reservation -f backend/database/schema.sql
```

Optional development seed (run from this directory):

```bash
node database/seed.js
```

**The seed script truncates its sample tables before inserting data.** Do not run it against data you need to keep.

## Route groups

Routes are mounted under `/api`: `/auth`, `/guests`, `/rooms`, `/reservations`, `/payments`, `/reports`, `/staff`, `/audit`, and `/dashboard`. Authentication and role requirements vary by route. See the [API reference](../docs/API_DOCUMENTATION.md) or Swagger UI for details.

## Main source directories

```text
src/config/       Database, environment, and Swagger configuration
src/controllers/  Request handling and application logic
src/middleware/   Authentication, validation, security, and other middleware
src/models/       Database-facing models
src/routes/       API route definitions
src/utils/        Logging, email, and shared helpers
database/         PostgreSQL schema and database scripts
```
