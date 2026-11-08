# API Reference

This reference describes the routes mounted by the current Express application. For request and response schemas, use Swagger UI while the backend is running at `http://localhost:5000/api-docs`.

## Base URL

```text
http://localhost:5000/api
```

The frontend currently sends requests to this local URL. Change `frontend/src/services/api.js` if the API is hosted elsewhere.

## Authentication

Login with `POST /auth/login` to receive a JWT. For protected routes, send it as:

```http
Authorization: Bearer <token>
```

Routes marked public below do not require a token. Other routes require authentication, and some also check the user's role. The route implementation is the authority for exact permissions.

## Routes

### Authentication — `/auth`

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Register an account |
| POST | `/auth/login` | Public | Log in and receive a token |
| POST | `/auth/forgot-password` | Public | Request a password-reset email |
| POST | `/auth/reset-password` | Public | Set a password using a reset token |
| GET | `/auth/me` | Authenticated | Get the current user |
| POST | `/auth/refresh` | Authenticated | Refresh the token |
| POST | `/auth/logout` | Authenticated | Log out |
| POST | `/auth/change-password` | Authenticated | Change the current user's password |
| GET | `/auth/profile` | Authenticated | Get the current user's profile |
| PUT | `/auth/profile` | Authenticated | Update the current user's profile |

### Guests — `/guests`

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/guests` | List guests |
| GET | `/guests/search` | Search guests |
| GET | `/guests/:id` | Get a guest by ID |
| POST | `/guests` | Create a guest |
| PUT | `/guests/:id` | Update a guest |
| DELETE | `/guests/:id` | Delete a guest |

### Rooms — `/rooms`

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/rooms` | List rooms |
| GET | `/rooms/available` | Find available rooms |
| GET | `/rooms/types` | List room types |
| GET | `/rooms/occupancy` | Get occupancy information |
| GET | `/rooms/:id` | Get a room by ID |
| POST | `/rooms` | Create a room (admin) |
| POST | `/rooms/types` | Create a room type (admin) |
| PUT | `/rooms/:id` | Update a room |

### Reservations — `/reservations`

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/reservations` | List reservations |
| GET | `/reservations/guest/:guest_id` | List a guest's reservations |
| GET | `/reservations/:id` | Get a reservation |
| POST | `/reservations` | Create a reservation |
| POST | `/reservations/calculate-price` | Calculate a reservation price |
| PUT | `/reservations/:id` | Update a reservation |
| PUT | `/reservations/:id/cancel` | Cancel a reservation |
| PUT | `/reservations/:id/check-in` | Check in a guest |
| PUT | `/reservations/:id/check-out` | Check out a guest |

### Payments — `/payments`

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/payments` | List payments |
| GET | `/payments/reservation/:reservation_id` | Get payments for a reservation |
| GET | `/payments/financial-report` | Get a financial report |
| GET | `/payments/:id` | Get a payment |
| POST | `/payments` | Create a payment |
| PUT | `/payments/:id/process` | Process a payment |
| PUT | `/payments/:id/refund` | Refund a payment |

### Reports — `/reports`

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/reports/daily` | Daily report |
| GET | `/reports/weekly` | Weekly report |
| GET | `/reports/monthly` | Monthly report |
| GET | `/reports/custom` | Report for a requested period |

### Staff — `/staff`

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/staff/profile` | Get the authenticated staff member's profile |
| PUT | `/staff/change-password` | Change staff password |
| GET | `/staff/department/stats` | Get department statistics (admin) |
| GET | `/staff` | List staff (admin) |
| GET | `/staff/:id` | Get staff by ID |
| POST | `/staff` | Create staff (admin) |
| PUT | `/staff/:id` | Update staff |

### Audit — `/audit`

All audit routes require an authenticated admin.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/audit` | List audit records; accepts pagination and filter query parameters |
| GET | `/audit/recent` | Get recent activity |
| GET | `/audit/record/:table/:id` | Get the audit trail for a record |

### Dashboard — `/dashboard`

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/dashboard/summary` | Get dashboard summary |
| GET | `/dashboard/revenue-chart` | Get revenue chart data |

### System endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Check API and database health |
| GET | `/metrics` | Get process and system metrics |
| GET | `/system/info` | Get service information |
| GET | `/system/staff-status` | Get staff-system status |

## Example: log in

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@hotel.com","password":"Admin123!"}'
```

The credentials above are created by the development seed script. Do not use them in a deployed environment.

## Example: request a protected endpoint

Replace `<token>` with the token returned by login:

```bash
curl http://localhost:5000/api/auth/me \
  -H 'Authorization: Bearer <token>'
```
