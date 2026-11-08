# Hotel Reservation System API Documentation

## Base URL
`http://localhost:5000/api`

## Authentication
All endpoints (except auth endpoints) require JWT token in the Authorization header:
`Authorization: Bearer <your_jwt_token>`

## API Endpoints Organized by Module

### 1. Authentication Module (`/api/auth`)
- `POST /login` - User login
- `POST /register` - User registration
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile
- `POST /change-password` - Change password

### 2. Guest Management Module (`/api/guests`)
- `POST /` - Create new guest
- `GET /` - Get all guests with pagination
- `GET /:id` - Get guest by ID
- `GET /user/:userId` - Find guest by user ID
- `PUT /:id` - Update guest information
- `GET /search` - Search guests by name, email, or phone
- `DELETE /:id` - Delete guest

### 3. Room Management Module (`/api/rooms`)
- `POST /` - Create new room
- `GET /` - Get all rooms with filters
- `GET /:id` - Get room by ID
- `PUT /:id` - Update room information
- `GET /available` - Get available rooms for date range
- `GET /types` - Get all room types
- `POST /types` - Create room type
- `GET /types/search` - Find room type by name
- `PUT /types/:id` - Update room type
- `DELETE /types/:id` - Delete room type
- `GET /types/availability` - Get room types with availability info
- `GET /occupancy` - Get room occupancy rate
- `GET /search/room-number` - Find room by room number

### 4. Reservation Management Module (`/api/reservations`)
- `POST /` - Create new reservation
- `GET /` - Get all reservations with filters
- `GET /:id` - Get reservation by ID
- `PUT /:id` - Update reservation
- `PUT /:id/cancel` - Cancel reservation
- `PUT /:id/check-in` - Check in guest
- `PUT /:id/check-out` - Check out guest
- `GET /guest/:guest_id` - Get guest's reservations
- `POST /calculate-price` - Calculate reservation price

### 5. Payment Management Module (`/api/payments`)
- `POST /` - Create new payment
- `GET /` - Get all payments with filters
- `GET /:id` - Get payment by ID
- `PUT /:id/process` - Process payment (mark as completed)
- `GET /financial-report` - Get financial report
- `PUT /:id` - Update payment
- `PUT /:id/refund` - Process refund
- `GET /reservation/:reservation_id/summary` - Get payments summary for a reservation

### 6. Report Management Module (`/api/reports`)
- `GET /daily` - Get daily report
- `GET /weekly` - Get weekly report
- `GET /monthly` - Get monthly report
- `GET /custom` - Get custom report

### 7. Audit Log Management Module (`/api/audit-logs`)
- `POST /` - Create audit log entry
- `GET /` - Get audit logs with filters
- `GET /:id` - Get audit log by ID
- `GET /record/:table_name/:record_id` - Get audit trail for specific record
- `GET /recent/:limit?` - Get recent activity

### 8. Role Management Module (`/api/roles`)
- `GET /:id` - Find role by ID
- `GET /name/:roleName` - Find role by name
- `GET /` - Get all roles
- `POST /check-permission` - Check if user has permission
- `GET /:id/permissions` - Get role permissions

## Sample Requests

### Create a Guest
```bash
curl -X POST http://localhost:5000/api/guests \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Mehari",
    "last_name": "Ashfare",
    "email": "mehari@gmail.com",
    "phone": "+251901298714",
    "address": "Mekelle-MIT",
    "id_type": "student-ID",
    "id_number": "MIT/UR188418/16",
    "date_of_birth": "2000-02-12",
    "nationality": "Ethiopian",
    "guest_type": "online"
  }'