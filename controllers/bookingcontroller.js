
const db = require("../db/connection.js");

// Check whether a date is valid
function isValidDate(date) {
    if (typeof date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return false;
    }

    const parsed = new Date(date + "T00:00:00Z");

    return !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === date;
}

// 1. Create a booking
async function createBooking(req, res) {
    const {
        room_id,
        customer_name,
        customer_phone,
        check_in,
        check_out,
        guests
    } = req.body || {};

    if (
        !Number.isInteger(Number(room_id)) || Number(room_id) <= 0 ||
        typeof customer_name !== "string" || !customer_name.trim() ||
        typeof customer_phone !== "string" || !customer_phone.trim() ||
        !isValidDate(check_in) ||
        !isValidDate(check_out) ||
        check_out <= check_in ||
        !Number.isInteger(Number(guests)) || Number(guests) <= 0
    ) {
        return res.status(400).json({
            message: "Provide valid room, customer details, dates and number of guests"
        });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Lock the room while checking availability
        const [rooms] = await connection.query(
            "SELECT * FROM rooms WHERE room_id = ? FOR UPDATE",
            [Number(room_id)]
        );

        if (rooms.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                message: "Room not found"
            });
        }

        const room = rooms[0];

        if (room.status !== "Available") {
            await connection.rollback();

            return res.status(400).json({
                message: "This room is under maintenance or unavailable"
            });
        }

        if (Number(guests) > room.capacity) {
            await connection.rollback();

            return res.status(400).json({
                message: "Number of guests exceeds room capacity"
            });
        }

        // Check overlapping bookings
        const [existingBookings] = await connection.query(
            `SELECT booking_id FROM bookings
             WHERE room_id = ?
             AND booking_status IN ('Pending', 'Confirmed', 'CheckedIn')
             AND check_in < ?
             AND check_out > ?`,
            [Number(room_id), check_out, check_in]
        );

        if (existingBookings.length > 0) {
            await connection.rollback();

            return res.status(409).json({
                message: "This room is already booked for the selected dates"
            });
        }

        // Calculate number of nights
        const start = new Date(check_in + "T00:00:00Z");
        const end = new Date(check_out + "T00:00:00Z");

        const nights = Math.round(
            (end - start) / (1000 * 60 * 60 * 24)
        );

        const total_amount = nights * Number(room.price_per_night);

        // Save booking
        const [result] = await connection.query(
            `INSERT INTO bookings
            (
                room_id,
                user_id,
                customer_name,
                customer_phone,
                check_in,
                check_out,
                guests,
                total_amount
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                Number(room_id),
                req.user.id,
                customer_name.trim(),
                customer_phone.trim(),
                check_in,
                check_out,
                Number(guests),
                total_amount
            ]
        );

        await connection.commit();

        return res.status(201).json({
            message: "Booking created successfully",
            booking_id: result.insertId,
            nights: nights,
            price_per_night: Number(room.price_per_night),
            total_amount: total_amount,
            booking_status: "Pending"
        });

    } catch (error) {
        await connection.rollback();

        console.error("Create booking error:", error);

        return res.status(500).json({
            message: "An internal server error occurred"
        });

    } finally {
        connection.release();
    }
}

// 2. Get all bookings
async function getAllBookings(req, res) {
    try {
        let query = `
            SELECT
                b.*,
                r.room_number,
                r.room_type
            FROM bookings b
            JOIN rooms r ON b.room_id = r.room_id
        `;

        let values = [];

        // Regular users can only see their own bookings
        if (!["admin", "manager"].includes(req.user.role)) {
            query += " WHERE b.user_id = ?";
            values.push(req.user.id);
        }

        query += " ORDER BY b.created_at DESC";

        const [bookings] = await db.query(query, values);

        return res.status(200).json(bookings);

    } catch (error) {
        console.error("Get bookings error:", error);

        return res.status(500).json({
            message: "An internal server error occurred"
        });
    }
}

// 3. Get one booking
async function getOneBooking(req, res) {
    try {
        const [bookings] = await db.query(
            `SELECT b.*, r.room_number, r.room_type
             FROM bookings b
             JOIN rooms r ON b.room_id = r.room_id
             WHERE b.booking_id = ?`,
            [req.params.id]
        );

        if (bookings.length === 0) {
            return res.status(404).json({
                message: "Booking not found"
            });
        }

        const booking = bookings[0];

        if (
            !["admin", "manager"].includes(req.user.role) &&
            Number(booking.user_id) !== Number(req.user.id)
        ) {
            return res.status(403).json({
                message: "You cannot access this booking"
            });
        }

        return res.status(200).json(booking);

    } catch (error) {
        console.error("Get one booking error:", error);

        return res.status(500).json({
            message: "An internal server error occurred"
        });
    }
}

// 4. Cancel a booking
async function cancelBooking(req, res) {
    try {
        const [bookings] = await db.query(
            "SELECT * FROM bookings WHERE booking_id = ?",
            [req.params.id]
        );

        if (bookings.length === 0) {
            return res.status(404).json({
                message: "Booking not found"
            });
        }

        const booking = bookings[0];

        if (
            !["admin", "manager"].includes(req.user.role) &&
            Number(booking.user_id) !== Number(req.user.id)
        ) {
            return res.status(403).json({
                message: "You cannot cancel another user's booking"
            });
        }

        if (booking.booking_status === "Cancelled") {
            return res.status(400).json({
                message: "This booking is already cancelled"
            });
        }

        if (
            ["CheckedIn", "CheckedOut"].includes(booking.booking_status)
        ) {
            return res.status(400).json({
                message: "This booking can no longer be cancelled"
            });
        }

        await db.query(
            "UPDATE bookings SET booking_status = 'Cancelled' WHERE booking_id = ?",
            [req.params.id]
        );

        return res.status(200).json({
            message: "Booking cancelled successfully"
        });

    } catch (error) {
        console.error("Cancel booking error:", error);

        return res.status(500).json({
            message: "An internal server error occurred"
        });
    }
}

// 5. Update booking status (admin and manager)
async function updateBookingStatus(req, res) {
    const { booking_status } = req.body || {};

    const allowedStatuses = [
        "Pending",
        "Confirmed",
        "Cancelled",
        "CheckedIn",
        "CheckedOut"
    ];

    if (!allowedStatuses.includes(booking_status)) {
        return res.status(400).json({
            message: "Invalid booking status"
        });
    }

    try {
        const [result] = await db.query(
            "UPDATE bookings SET booking_status = ? WHERE booking_id = ?",
            [booking_status, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Booking not found"
            });
        }

        return res.status(200).json({
            message: "Booking status updated successfully"
        });

    } catch (error) {
        console.error("Update booking status error:", error);

        return res.status(500).json({
            message: "An internal server error occurred"
        });
    }
}

module.exports = {
    createBooking,
    getAllBookings,
    getOneBooking,
    cancelBooking,
    updateBookingStatus
};
