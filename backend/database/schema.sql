/**
 * HOTEL RESERVATION SYSTEM - DATABASE SCHEMA (FIXED FOR POSTGRESQL)
 *
 * This version removes invalid inline `INDEX` declarations inside `CREATE TABLE`
 * (PostgreSQL requires separate `CREATE INDEX` statements) and places all
 * indexes after the corresponding table definitions. The original logic,
 * constraints, enums, triggers, and views are preserved.
 */

/**
 * HOTEL RESERVATION SYSTEM - DATABASE SCHEMA (FIXED FOR POSTGRESQL)
 * EXACT SAME AS YOUR CODE, JUST REMOVED REFERENCES TO NON-EXISTENT guests.email COLUMN
 */

-- ============================================
-- SECTION 1: ENUM TYPE DEFINITIONS
-- ============================================

CREATE TYPE room_status_enum AS ENUM ('available', 'occupied', 'maintenance', 'cleaning');
CREATE TYPE reservation_status_enum AS ENUM ('confirmed', 'checked-in', 'checked-out', 'cancelled', 'no-show');
CREATE TYPE payment_status_enum AS ENUM ('pending', 'completed', 'failed', 'refunded', 'partially_refunded');
CREATE TYPE payment_method_enum AS ENUM ('cash', 'credit_card', 'debit_card', 'bank_transfer', 'online_payment', 'voucher');
CREATE TYPE guest_type_enum AS ENUM ('online', 'walk-in');
CREATE TYPE audit_action_enum AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- ============================================
-- SECTION 2: CORE TABLES
-- ============================================

CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    permissions TEXT[] NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT permissions_not_empty CHECK (array_length(permissions, 1) > 0)
);

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(role_id),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    failed_attempts INT DEFAULT 0,
    last_failed_attempt TIMESTAMP,
    reset_password_token VARCHAR(255),
    reset_password_expires BIGINT
);

CREATE TABLE staff (
    staff_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    sex VARCHAR(10),
    address TEXT,
    position VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    hire_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE guests (
    guest_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(user_id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    sex VARCHAR(10),
    address TEXT,
    id_type VARCHAR(50),
    id_number VARCHAR(100),
    date_of_birth DATE,
    nationality VARCHAR(100),
    guest_type guest_type_enum DEFAULT 'walk-in',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE room_types (
    room_type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL CHECK (base_price >= 0),
    max_occupancy INTEGER NOT NULL CHECK (max_occupancy > 0),
    amenities TEXT[],
    size_sqft INTEGER,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reasonable_base_price CHECK (base_price BETWEEN 0 AND 10000),
    CONSTRAINT reasonable_occupancy CHECK (max_occupancy BETWEEN 1 AND 20)
);

CREATE TABLE rooms (
    room_id SERIAL PRIMARY KEY,
    room_type_id INTEGER NOT NULL REFERENCES room_types(room_type_id) ON DELETE RESTRICT,
    room_number VARCHAR(10) UNIQUE NOT NULL,
    floor INTEGER NOT NULL CHECK (floor >= 0),
    status room_status_enum DEFAULT 'available',
    price_adjustment DECIMAL(10,2) DEFAULT 0.00,
    special_features TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reasonable_adjustment CHECK (price_adjustment BETWEEN -1000 AND 1000)
);

-- ============================================
-- SECTION 3: TRANSACTION TABLES
-- ============================================

CREATE TABLE reservations (
    reservation_id SERIAL PRIMARY KEY,
    guest_id INTEGER NOT NULL REFERENCES guests(guest_id) ON DELETE RESTRICT,
    room_id INTEGER NOT NULL REFERENCES rooms(room_id) ON DELETE RESTRICT,
    created_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    actual_check_in TIMESTAMPTZ,
    actual_check_out TIMESTAMPTZ,
    number_of_guests SMALLINT NOT NULL CHECK (number_of_guests > 0),
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    status reservation_status_enum DEFAULT 'confirmed',
    special_requests TEXT,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_date_range CHECK (check_out_date > check_in_date),
    CONSTRAINT valid_actual_dates CHECK (
        (actual_check_in IS NULL AND actual_check_out IS NULL) OR
        (actual_check_in IS NOT NULL AND actual_check_out IS NULL) OR
        (actual_check_in IS NOT NULL AND actual_check_out IS NOT NULL AND actual_check_out > actual_check_in)
    ),
    CONSTRAINT reasonable_total_amount CHECK (total_amount BETWEEN 0 AND 100000)
);

CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    reservation_id INTEGER NOT NULL REFERENCES reservations(reservation_id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    payment_method payment_method_enum NOT NULL,
    payment_status payment_status_enum DEFAULT 'pending',
    refund_amount DECIMAL(10,2) DEFAULT 0.00 CHECK (refund_amount >= 0),
    refund_reason TEXT,
    transaction_id VARCHAR(100),
    payment_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    processed_by INTEGER REFERENCES staff(staff_id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_refund CHECK (refund_amount <= amount),
    CONSTRAINT completed_payment_has_date CHECK (
        (payment_status = 'completed' AND payment_date IS NOT NULL) OR
        payment_status != 'completed'
    )
);

-- ============================================
-- SECTION 4: AUDIT AND LOGGING TABLES
-- ============================================

CREATE TABLE audit_logs (
    audit_id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER NOT NULL,
    action audit_action_enum NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_audit_data CHECK (
        (action = 'INSERT' AND old_values IS NULL AND new_values IS NOT NULL) OR
        (action = 'UPDATE' AND old_values IS NOT NULL AND new_values IS NOT NULL) OR
        (action = 'DELETE' AND old_values IS NOT NULL AND new_values IS NULL)
    )
);

-- ============================================
-- SECTION 5: TRIGGERS AND FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reservations_updated_at 
    BEFORE UPDATE ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SECTION 6: INDEXES FOR PERFORMANCE
-- ============================================

-- Indexes moved outside CREATE TABLE (PostgreSQL requires this)
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_email ON users(email);

CREATE INDEX idx_staff_name ON staff(first_name, last_name);
CREATE INDEX idx_staff_department ON staff(department);

-- FIXED: Removed email from this index since guests table doesn't have email column
CREATE INDEX idx_guests_name ON guests(first_name, last_name);
CREATE INDEX idx_guests_contact ON guests(phone);  -- CHANGED: removed email
CREATE INDEX idx_guests_type ON guests(guest_type);

CREATE INDEX idx_rooms_number ON rooms(room_number);
CREATE INDEX idx_rooms_status ON rooms(status, is_active);
CREATE INDEX idx_rooms_floor ON rooms(floor);

CREATE INDEX idx_reservations_guest ON reservations(guest_id);
CREATE INDEX idx_reservations_room ON reservations(room_id);
CREATE INDEX idx_reservations_dates ON reservations(check_in_date, check_out_date);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_creator ON reservations(created_by);

CREATE INDEX idx_payments_reservation ON payments(reservation_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_payments_status ON payments(payment_status);
CREATE INDEX idx_payments_transaction ON payments(transaction_id);

CREATE INDEX idx_audit_table ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_time ON audit_logs(timestamp);
CREATE INDEX idx_audit_action ON audit_logs(action);

-- Additional composite/index types preserved from original
-- FIXED: Removed email from search index
CREATE INDEX idx_guests_search ON guests 
    USING gin(to_tsvector('english', first_name || ' ' || last_name || ' ' || phone));  -- CHANGED: removed email

CREATE INDEX idx_rooms_availability ON rooms (room_type_id, status, is_active) 
    WHERE status = 'available' AND is_active = true;

CREATE INDEX idx_reservations_date_range ON reservations 
    (check_in_date, check_out_date, status) 
    WHERE status IN ('confirmed', 'checked-in');

CREATE INDEX idx_payments_financial_report ON payments 
    (payment_date, payment_status, payment_method);

CREATE INDEX idx_audit_date_range ON audit_logs 
    USING brin(timestamp);

-- ============================================
-- SECTION 7: VIEWS FOR REPORTING
-- ============================================

CREATE OR REPLACE VIEW vw_room_availability AS
SELECT 
    r.room_id,
    r.room_number,
    r.floor,
    r.status,
    rt.type_name,
    rt.base_price,
    rt.max_occupancy,
    rt.amenities,
    (rt.base_price + COALESCE(r.price_adjustment, 0)) as current_price
FROM rooms r
JOIN room_types rt ON r.room_type_id = rt.room_type_id
WHERE r.is_active = true;

-- FIXED: Removed guest_email column reference
CREATE OR REPLACE VIEW vw_reservation_details AS
SELECT 
    res.reservation_id,
    res.check_in_date,
    res.check_out_date,
    res.status as reservation_status,
    res.total_amount,
    g.guest_id,
    g.first_name || ' ' || g.last_name as guest_name,
    g.phone as guest_phone,  -- CHANGED: removed g.email as guest_email
    r.room_id,
    r.room_number,
    rt.type_name as room_type,
    u.email as created_by_email,
    res.created_at
FROM reservations res
JOIN guests g ON res.guest_id = g.guest_id
JOIN rooms r ON res.room_id = r.room_id
JOIN room_types rt ON r.room_type_id = rt.room_type_id
JOIN users u ON res.created_by = u.user_id;

CREATE OR REPLACE VIEW vw_daily_occupancy AS
SELECT 
    date::date,
    COUNT(DISTINCT r.room_id) as total_rooms,
    COUNT(DISTINCT CASE 
        WHEN res.status IN ('confirmed', 'checked-in') 
        AND date BETWEEN res.check_in_date AND res.check_out_date - interval '1 day'
        THEN res.room_id 
    END) as occupied_rooms,
    ROUND(
        COUNT(DISTINCT CASE 
            WHEN res.status IN ('confirmed', 'checked-in') 
            AND date BETWEEN res.check_in_date AND res.check_out_date - interval '1 day'
            THEN res.room_id 
        END) * 100.0 / NULLIF(COUNT(DISTINCT r.room_id), 0), 
    2) as occupancy_rate
FROM generate_series(
    CURRENT_DATE - interval '30 days', 
    CURRENT_DATE + interval '30 days', 
    interval '1 day'
) as date
CROSS JOIN rooms r
LEFT JOIN reservations res ON r.room_id = res.room_id
WHERE r.is_active = true
GROUP BY date::date
ORDER BY date::date;

-- ============================================
-- SECTION 8: DATA VALIDATION RULES
-- ============================================

CREATE OR REPLACE FUNCTION check_room_availability()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM reservations r
        WHERE r.room_id = NEW.room_id
        AND r.status IN ('confirmed', 'checked-in')
        AND r.reservation_id != COALESCE(NEW.reservation_id, -1)
        AND (
            (NEW.check_in_date < r.check_out_date AND NEW.check_out_date > r.check_in_date)
        )
    ) THEN
        RAISE EXCEPTION 'Room % is already booked for the selected dates', NEW.room_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_room_availability
    BEFORE INSERT OR UPDATE ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION check_room_availability();

CREATE OR REPLACE FUNCTION validate_guest_count()
RETURNS TRIGGER AS $$
DECLARE
    room_capacity INTEGER;
BEGIN
    SELECT rt.max_occupancy INTO room_capacity
    FROM rooms r
    JOIN room_types rt ON r.room_type_id = rt.room_type_id
    WHERE r.room_id = NEW.room_id;
    
    IF NEW.number_of_guests > room_capacity THEN
        RAISE EXCEPTION 'Room capacity is % guests, but reservation has % guests', 
            room_capacity, NEW.number_of_guests;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_guest_count
    BEFORE INSERT OR UPDATE ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION validate_guest_count();

-- ============================================
-- SECTION 9: INITIAL DATA INSERTION
-- ============================================

INSERT INTO roles (role_name, permissions) VALUES
('admin', ARRAY['*']),
('receptionist', ARRAY['manage_guests', 'manage_reservations', 'process_payments', 'view_reports']),
('guest', ARRAY['view_own_profile', 'make_reservations', 'view_own_reservations']);

INSERT INTO room_types (type_name, description, base_price, max_occupancy, amenities, size_sqft) VALUES
('Standard Room', 'Comfortable room with basic amenities', 100.00, 2, 
 ARRAY['WiFi', 'TV', 'AC', 'Private Bathroom', 'Coffee Maker'], 300),
('Deluxe Room', 'Spacious room with upgraded amenities', 150.00, 3,
 ARRAY['WiFi', 'Smart TV', 'AC', 'Private Bathroom', 'Mini Bar', 'Coffee Maker', 'Work Desk'], 400),
('Suite', 'Luxurious suite with separate living area', 250.00, 4,
 ARRAY['WiFi', 'Smart TV', 'AC', 'Private Bathroom', 'Mini Bar', 'Coffee Maker', 'Work Desk', 'Sofa', 'Kitchenette'], 600),
('Family Room', 'Large room suitable for families', 180.00, 5,
 ARRAY['WiFi', 'TV', 'AC', 'Private Bathroom', 'Coffee Maker', 'Extra Beds', 'Children Amenities'], 500);

-- ============================================
-- SECTION 10: DATABASE COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE roles IS 'Defines system roles and their permissions for access control';
COMMENT ON TABLE users IS 'User accounts for system authentication and authorization';
COMMENT ON TABLE staff IS 'Hotel employee information linked to user accounts';
COMMENT ON TABLE guests IS 'Hotel guest profiles, both online and walk-in registrations';
COMMENT ON TABLE room_types IS 'Room categories with pricing and specifications';
COMMENT ON TABLE rooms IS 'Individual room inventory with current status';
COMMENT ON TABLE reservations IS 'Room bookings with guest and payment information';
COMMENT ON TABLE payments IS 'Financial transactions for reservations';
COMMENT ON TABLE audit_logs IS 'Audit trail for all data changes in the system';

COMMENT ON COLUMN users.password_hash IS 'BCrypt hashed password - NEVER store plain text passwords';
COMMENT ON COLUMN reservations.total_amount IS 'Calculated total for the entire stay';
COMMENT ON COLUMN payments.transaction_id IS 'External payment processor reference ID';
COMMENT ON COLUMN audit_logs.old_values IS 'JSON representation of record before change';
COMMENT ON COLUMN audit_logs.new_values IS 'JSON representation of record after change';

-- ============================================
-- SECTION 11: DATABASE SECURITY (examples - adjust passwords and roles)
-- ============================================

-- CREATE USER report_user WITH PASSWORD 'secure_report_password';
-- GRANT CONNECT ON DATABASE hotel_reservation_db TO report_user;
-- GRANT USAGE ON SCHEMA public TO report_user;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO report_user;

-- CREATE USER app_user WITH PASSWORD 'secure_app_password';
-- GRANT CONNECT ON DATABASE hotel_reservation_db TO app_user;
-- GRANT USAGE ON SCHEMA public TO app_user;
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- ============================================
-- END OF FIXED SCHEMA
-- ============================================











-- -- ============================================
-- -- SECTION 1: ENUM TYPE DEFINITIONS
-- -- ============================================

-- CREATE TYPE room_status_enum AS ENUM ('available', 'occupied', 'maintenance', 'cleaning');
-- CREATE TYPE reservation_status_enum AS ENUM ('confirmed', 'checked-in', 'checked-out', 'cancelled', 'no-show');
-- CREATE TYPE payment_status_enum AS ENUM ('pending', 'completed', 'failed', 'refunded', 'partially_refunded');
-- CREATE TYPE payment_method_enum AS ENUM ('cash', 'credit_card', 'debit_card', 'bank_transfer', 'online_payment', 'voucher');
-- CREATE TYPE guest_type_enum AS ENUM ('online', 'walk-in');
-- CREATE TYPE audit_action_enum AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- -- ============================================
-- -- SECTION 2: CORE TABLES
-- -- ============================================

-- CREATE TABLE roles (
--     role_id SERIAL PRIMARY KEY,
--     role_name VARCHAR(50) UNIQUE NOT NULL,
--     permissions TEXT[] NOT NULL,
--     created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
--     CONSTRAINT permissions_not_empty CHECK (array_length(permissions, 1) > 0)
-- );

-- CREATE TABLE users (
--     user_id SERIAL PRIMARY KEY,
--     role_id INTEGER NOT NULL REFERENCES roles(role_id),
--     email VARCHAR(255) UNIQUE NOT NULL,
--     password_hash VARCHAR(255) NOT NULL,
--     is_active BOOLEAN DEFAULT TRUE,
--     last_login TIMESTAMPTZ,
--     created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
--     failed_attempts INT DEFAULT 0,
--     last_failed_attempt TIMESTAMP,
--     reset_password_token VARCHAR(255),
--     reset_password_expires BIGINT
-- );

-- CREATE TABLE staff (
--     staff_id SERIAL PRIMARY KEY,
--     user_id INTEGER UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
--     first_name VARCHAR(100) NOT NULL,
--     last_name VARCHAR(100) NOT NULL,
--     phone VARCHAR(20) NOT NULL,
--     sex VARCHAR(10),
--     address TEXT,
--     position VARCHAR(100) NOT NULL,
--     department VARCHAR(100),
--     hire_date DATE NOT NULL,
--     is_active BOOLEAN DEFAULT TRUE,
--     created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE TABLE guests (
--     guest_id SERIAL PRIMARY KEY,
--     user_id INTEGER UNIQUE REFERENCES users(user_id) ON DELETE SET NULL,
--     created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
--     first_name VARCHAR(100) NOT NULL,
--     last_name VARCHAR(100) NOT NULL,
--     phone VARCHAR(20) NOT NULL,
--     sex VARCHAR(10),
--     address TEXT,
--     id_type VARCHAR(50),
--     id_number VARCHAR(100),
--     date_of_birth DATE,
--     nationality VARCHAR(100),
--     guest_type guest_type_enum DEFAULT 'walk-in',
--     created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE TABLE room_types (
--     room_type_id SERIAL PRIMARY KEY,
--     type_name VARCHAR(100) UNIQUE NOT NULL,
--     description TEXT,
--     base_price DECIMAL(10,2) NOT NULL CHECK (base_price >= 0),
--     max_occupancy INTEGER NOT NULL CHECK (max_occupancy > 0),
--     amenities TEXT[],
--     size_sqft INTEGER,
--     created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
--     CONSTRAINT reasonable_base_price CHECK (base_price BETWEEN 0 AND 10000),
--     CONSTRAINT reasonable_occupancy CHECK (max_occupancy BETWEEN 1 AND 20)
-- );

-- CREATE TABLE rooms (
--     room_id SERIAL PRIMARY KEY,
--     room_type_id INTEGER NOT NULL REFERENCES room_types(room_type_id) ON DELETE RESTRICT,
--     room_number VARCHAR(10) UNIQUE NOT NULL,
--     floor INTEGER NOT NULL CHECK (floor >= 0),
--     status room_status_enum DEFAULT 'available',
--     price_adjustment DECIMAL(10,2) DEFAULT 0.00,
--     special_features TEXT[],
--     is_active BOOLEAN DEFAULT TRUE,
--     created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
--     CONSTRAINT reasonable_adjustment CHECK (price_adjustment BETWEEN -1000 AND 1000)
-- );

-- -- ============================================
-- -- SECTION 3: TRANSACTION TABLES
-- -- ============================================

-- CREATE TABLE reservations (
--     reservation_id SERIAL PRIMARY KEY,
--     guest_id INTEGER NOT NULL REFERENCES guests(guest_id) ON DELETE RESTRICT,
--     room_id INTEGER NOT NULL REFERENCES rooms(room_id) ON DELETE RESTRICT,
--     created_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
--     check_in_date DATE NOT NULL,
--     check_out_date DATE NOT NULL,
--     actual_check_in TIMESTAMPTZ,
--     actual_check_out TIMESTAMPTZ,
--     number_of_guests SMALLINT NOT NULL CHECK (number_of_guests > 0),
--     total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
--     status reservation_status_enum DEFAULT 'confirmed',
--     special_requests TEXT,
--     cancellation_reason TEXT,
--     created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
--     CONSTRAINT valid_date_range CHECK (check_out_date > check_in_date),
--     CONSTRAINT valid_actual_dates CHECK (
--         (actual_check_in IS NULL AND actual_check_out IS NULL) OR
--         (actual_check_in IS NOT NULL AND actual_check_out IS NULL) OR
--         (actual_check_in IS NOT NULL AND actual_check_out IS NOT NULL AND actual_check_out > actual_check_in)
--     ),
--     CONSTRAINT reasonable_total_amount CHECK (total_amount BETWEEN 0 AND 100000)
-- );

-- CREATE TABLE payments (
--     payment_id SERIAL PRIMARY KEY,
--     reservation_id INTEGER NOT NULL REFERENCES reservations(reservation_id) ON DELETE CASCADE,
--     amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
--     payment_method payment_method_enum NOT NULL,
--     payment_status payment_status_enum DEFAULT 'pending',
--     refund_amount DECIMAL(10,2) DEFAULT 0.00 CHECK (refund_amount >= 0),
--     refund_reason TEXT,
--     transaction_id VARCHAR(100),
--     payment_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
--     processed_by INTEGER REFERENCES staff(staff_id) ON DELETE SET NULL,
--     notes TEXT,
--     created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
--     CONSTRAINT valid_refund CHECK (refund_amount <= amount),
--     CONSTRAINT completed_payment_has_date CHECK (
--         (payment_status = 'completed' AND payment_date IS NOT NULL) OR
--         payment_status != 'completed'
--     )
-- );

-- -- ============================================
-- -- SECTION 4: AUDIT AND LOGGING TABLES
-- -- ============================================

-- CREATE TABLE audit_logs (
--     audit_id SERIAL PRIMARY KEY,
--     table_name VARCHAR(100) NOT NULL,
--     record_id INTEGER NOT NULL,
--     action audit_action_enum NOT NULL,
--     old_values JSONB,
--     new_values JSONB,
--     user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
--     ip_address INET,
--     user_agent TEXT,
--     timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
--     CONSTRAINT valid_audit_data CHECK (
--         (action = 'INSERT' AND old_values IS NULL AND new_values IS NOT NULL) OR
--         (action = 'UPDATE' AND old_values IS NOT NULL AND new_values IS NOT NULL) OR
--         (action = 'DELETE' AND old_values IS NOT NULL AND new_values IS NULL)
--     )
-- );

-- -- ============================================
-- -- SECTION 5: TRIGGERS AND FUNCTIONS
-- -- ============================================

-- CREATE OR REPLACE FUNCTION update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     NEW.updated_at = CURRENT_TIMESTAMP;
--     RETURN NEW;
-- END;
-- $$ language 'plpgsql';

-- CREATE TRIGGER update_reservations_updated_at 
--     BEFORE UPDATE ON reservations
--     FOR EACH ROW
--     EXECUTE FUNCTION update_updated_at_column();

-- -- ============================================
-- -- SECTION 6: INDEXES FOR PERFORMANCE
-- -- ============================================

-- -- Indexes moved outside CREATE TABLE (PostgreSQL requires this)
-- CREATE INDEX idx_users_role_id ON users(role_id);
-- CREATE INDEX idx_users_email ON users(email);

-- CREATE INDEX idx_staff_name ON staff(first_name, last_name);
-- CREATE INDEX idx_staff_department ON staff(department);

-- CREATE INDEX idx_guests_name ON guests(first_name, last_name);
-- CREATE INDEX idx_guests_contact ON guests(phone);
-- CREATE INDEX idx_guests_type ON guests(guest_type);

-- CREATE INDEX idx_rooms_number ON rooms(room_number);
-- CREATE INDEX idx_rooms_status ON rooms(status, is_active);
-- CREATE INDEX idx_rooms_floor ON rooms(floor);

-- CREATE INDEX idx_reservations_guest ON reservations(guest_id);
-- CREATE INDEX idx_reservations_room ON reservations(room_id);
-- CREATE INDEX idx_reservations_dates ON reservations(check_in_date, check_out_date);
-- CREATE INDEX idx_reservations_status ON reservations(status);
-- CREATE INDEX idx_reservations_creator ON reservations(created_by);

-- CREATE INDEX idx_payments_reservation ON payments(reservation_id);
-- CREATE INDEX idx_payments_date ON payments(payment_date);
-- CREATE INDEX idx_payments_status ON payments(payment_status);
-- CREATE INDEX idx_payments_transaction ON payments(transaction_id);

-- CREATE INDEX idx_audit_table ON audit_logs(table_name, record_id);
-- CREATE INDEX idx_audit_user ON audit_logs(user_id);
-- CREATE INDEX idx_audit_time ON audit_logs(timestamp);
-- CREATE INDEX idx_audit_action ON audit_logs(action);

-- -- Additional composite/index types preserved from original
-- CREATE INDEX idx_guests_search ON guests 
--     USING gin(to_tsvector('english', first_name || ' ' || last_name || ' ' || COALESCE(email, '') || ' ' || phone));

-- CREATE INDEX idx_rooms_availability ON rooms (room_type_id, status, is_active) 
--     WHERE status = 'available' AND is_active = true;

-- CREATE INDEX idx_reservations_date_range ON reservations 
--     (check_in_date, check_out_date, status) 
--     WHERE status IN ('confirmed', 'checked-in');

-- CREATE INDEX idx_payments_financial_report ON payments 
--     (payment_date, payment_status, payment_method);

-- CREATE INDEX idx_audit_date_range ON audit_logs 
--     USING brin(timestamp);

-- -- ============================================
-- -- SECTION 7: VIEWS FOR REPORTING
-- -- ============================================

-- CREATE OR REPLACE VIEW vw_room_availability AS
-- SELECT 
--     r.room_id,
--     r.room_number,
--     r.floor,
--     r.status,
--     rt.type_name,
--     rt.base_price,
--     rt.max_occupancy,
--     rt.amenities,
--     (rt.base_price + COALESCE(r.price_adjustment, 0)) as current_price
-- FROM rooms r
-- JOIN room_types rt ON r.room_type_id = rt.room_type_id
-- WHERE r.is_active = true;

-- CREATE OR REPLACE VIEW vw_reservation_details AS
-- SELECT 
--     res.reservation_id,
--     res.check_in_date,
--     res.check_out_date,
--     res.status as reservation_status,
--     res.total_amount,
--     g.guest_id,
--     g.first_name || ' ' || g.last_name as guest_name,
--     g.email as guest_email,
--     g.phone as guest_phone,
--     r.room_id,
--     r.room_number,
--     rt.type_name as room_type,
--     u.email as created_by_email,
--     res.created_at
-- FROM reservations res
-- JOIN guests g ON res.guest_id = g.guest_id
-- JOIN rooms r ON res.room_id = r.room_id
-- JOIN room_types rt ON r.room_type_id = rt.room_type_id
-- JOIN users u ON res.created_by = u.user_id;

-- CREATE OR REPLACE VIEW vw_daily_occupancy AS
-- SELECT 
--     date::date,
--     COUNT(DISTINCT r.room_id) as total_rooms,
--     COUNT(DISTINCT CASE 
--         WHEN res.status IN ('confirmed', 'checked-in') 
--         AND date BETWEEN res.check_in_date AND res.check_out_date - interval '1 day'
--         THEN res.room_id 
--     END) as occupied_rooms,
--     ROUND(
--         COUNT(DISTINCT CASE 
--             WHEN res.status IN ('confirmed', 'checked-in') 
--             AND date BETWEEN res.check_in_date AND res.check_out_date - interval '1 day'
--             THEN res.room_id 
--         END) * 100.0 / NULLIF(COUNT(DISTINCT r.room_id), 0), 
--     2) as occupancy_rate
-- FROM generate_series(
--     CURRENT_DATE - interval '30 days', 
--     CURRENT_DATE + interval '30 days', 
--     interval '1 day'
-- ) as date
-- CROSS JOIN rooms r
-- LEFT JOIN reservations res ON r.room_id = res.room_id
-- WHERE r.is_active = true
-- GROUP BY date::date
-- ORDER BY date::date;

-- -- ============================================
-- -- SECTION 8: DATA VALIDATION RULES
-- -- ============================================

-- CREATE OR REPLACE FUNCTION check_room_availability()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     IF EXISTS (
--         SELECT 1 FROM reservations r
--         WHERE r.room_id = NEW.room_id
--         AND r.status IN ('confirmed', 'checked-in')
--         AND r.reservation_id != COALESCE(NEW.reservation_id, -1)
--         AND (
--             (NEW.check_in_date < r.check_out_date AND NEW.check_out_date > r.check_in_date)
--         )
--     ) THEN
--         RAISE EXCEPTION 'Room % is already booked for the selected dates', NEW.room_id;
--     END IF;
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER enforce_room_availability
--     BEFORE INSERT OR UPDATE ON reservations
--     FOR EACH ROW
--     EXECUTE FUNCTION check_room_availability();

-- CREATE OR REPLACE FUNCTION validate_guest_count()
-- RETURNS TRIGGER AS $$
-- DECLARE
--     room_capacity INTEGER;
-- BEGIN
--     SELECT rt.max_occupancy INTO room_capacity
--     FROM rooms r
--     JOIN room_types rt ON r.room_type_id = rt.room_type_id
--     WHERE r.room_id = NEW.room_id;
    
--     IF NEW.number_of_guests > room_capacity THEN
--         RAISE EXCEPTION 'Room capacity is % guests, but reservation has % guests', 
--             room_capacity, NEW.number_of_guests;
--     END IF;
    
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER enforce_guest_count
--     BEFORE INSERT OR UPDATE ON reservations
--     FOR EACH ROW
--     EXECUTE FUNCTION validate_guest_count();

-- -- ============================================
-- -- SECTION 9: INITIAL DATA INSERTION
-- -- ============================================

-- INSERT INTO roles (role_name, permissions) VALUES
-- ('admin', ARRAY['*']),
-- ('receptionist', ARRAY['manage_guests', 'manage_reservations', 'process_payments', 'view_reports']),
-- ('guest', ARRAY['view_own_profile', 'make_reservations', 'view_own_reservations']);

-- INSERT INTO room_types (type_name, description, base_price, max_occupancy, amenities, size_sqft) VALUES
-- ('Standard Room', 'Comfortable room with basic amenities', 100.00, 2, 
--  ARRAY['WiFi', 'TV', 'AC', 'Private Bathroom', 'Coffee Maker'], 300),
-- ('Deluxe Room', 'Spacious room with upgraded amenities', 150.00, 3,
--  ARRAY['WiFi', 'Smart TV', 'AC', 'Private Bathroom', 'Mini Bar', 'Coffee Maker', 'Work Desk'], 400),
-- ('Suite', 'Luxurious suite with separate living area', 250.00, 4,
--  ARRAY['WiFi', 'Smart TV', 'AC', 'Private Bathroom', 'Mini Bar', 'Coffee Maker', 'Work Desk', 'Sofa', 'Kitchenette'], 600),
-- ('Family Room', 'Large room suitable for families', 180.00, 5,
--  ARRAY['WiFi', 'TV', 'AC', 'Private Bathroom', 'Coffee Maker', 'Extra Beds', 'Children Amenities'], 500);

-- -- ============================================
-- -- SECTION 10: DATABASE COMMENTS FOR DOCUMENTATION
-- -- ============================================

-- COMMENT ON TABLE roles IS 'Defines system roles and their permissions for access control';
-- COMMENT ON TABLE users IS 'User accounts for system authentication and authorization';
-- COMMENT ON TABLE staff IS 'Hotel employee information linked to user accounts';
-- COMMENT ON TABLE guests IS 'Hotel guest profiles, both online and walk-in registrations';
-- COMMENT ON TABLE room_types IS 'Room categories with pricing and specifications';
-- COMMENT ON TABLE rooms IS 'Individual room inventory with current status';
-- COMMENT ON TABLE reservations IS 'Room bookings with guest and payment information';
-- COMMENT ON TABLE payments IS 'Financial transactions for reservations';
-- COMMENT ON TABLE audit_logs IS 'Audit trail for all data changes in the system';

-- COMMENT ON COLUMN users.password_hash IS 'BCrypt hashed password - NEVER store plain text passwords';
-- COMMENT ON COLUMN reservations.total_amount IS 'Calculated total for the entire stay';
-- COMMENT ON COLUMN payments.transaction_id IS 'External payment processor reference ID';
-- COMMENT ON COLUMN audit_logs.old_values IS 'JSON representation of record before change';
-- COMMENT ON COLUMN audit_logs.new_values IS 'JSON representation of record after change';

-- -- ============================================
-- -- SECTION 11: DATABASE SECURITY (examples - adjust passwords and roles)
-- -- ============================================

-- -- CREATE USER report_user WITH PASSWORD 'secure_report_password';
-- -- GRANT CONNECT ON DATABASE hotel_reservation_db TO report_user;
-- -- GRANT USAGE ON SCHEMA public TO report_user;
-- -- GRANT SELECT ON ALL TABLES IN SCHEMA public TO report_user;

-- -- CREATE USER app_user WITH PASSWORD 'secure_app_password';
-- -- GRANT CONNECT ON DATABASE hotel_reservation_db TO app_user;
-- -- GRANT USAGE ON SCHEMA public TO app_user;
-- -- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;
-- -- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- -- ============================================
-- -- END OF FIXED SCHEMA
-- -- ============================================
