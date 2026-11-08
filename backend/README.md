# Backend Directory

## Purpose
This directory contains the Express.js API server for the Hotel Reservation System.
It handles all business logic, database operations, and API endpoints.

## Dependencies
- Node.js 18+
- PostgreSQL 14+
- See package.json for npm dependencies

## Structure
\\\
backend/
├── src/
│   ├── config/     # Database and environment config
│   ├── controllers/# Request handlers
│   ├── routes/     # API route definitions
│   ├── models/     # Database models
│   ├── middleware/ # Custom middleware
│   └── utils/      # Helper functions
├── app.js          # Express app configuration
└── server.js       # Server entry point
\\\

## Running the Server
\\\ash
npm run dev  # Development with hot reload
npm start    # Production
\\\

## API Documentation
See docs/API_Documentation.md for endpoint details.
