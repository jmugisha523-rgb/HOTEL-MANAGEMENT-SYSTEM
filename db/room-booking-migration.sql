
-- =================================
-- HOTEL MANAGEMENT SYSTEM
-- ROOMS TABLE
-- =================================

CREATE TABLE rooms (
    room_id INT AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(20) NOT NULL UNIQUE,
    room_type VARCHAR(50) NOT NULL,
    price_per_night DECIMAL(10,2) NOT NULL,
    capacity INT NOT NULL,
    status ENUM('Available', 'Maintenance')
        DEFAULT 'Available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =================================
-- BOOKINGS TABLE
-- =================================

CREATE TABLE bookings (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    user_id INT NOT NULL,

    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,

    check_in DATE NOT NULL,
    check_out DATE NOT NULL,

    guests INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,

    booking_status ENUM(
        'Pending',
        'Confirmed',
        'Cancelled',
        'CheckedIn',
        'CheckedOut'
    ) DEFAULT 'Pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (room_id)
        REFERENCES rooms(room_id),

    FOREIGN KEY (user_id)
        REFERENCES `user`(id)
);
