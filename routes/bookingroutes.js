
const express = require("express");
const router = express.Router();

const {
    createBooking,
    getAllBookings,
    getOneBooking,
    cancelBooking,
    updateBookingStatus
} = require("../controllers/bookingcontroller.js");

const {
    authenticate,
    authorizeRoles
} = require("../middleware/auth.js");

// Create a booking
router.post("/", authenticate, createBooking);

// Get all bookings (users see only their own)
router.get("/", authenticate, getAllBookings);

// Get one booking
router.get("/:id", authenticate, getOneBooking);

// Cancel booking
router.patch("/:id/cancel", authenticate, cancelBooking);

// Update booking status (admin and manager)
router.patch(
    "/:id/status",
    authenticate,
    authorizeRoles("admin", "manager"),
    updateBookingStatus
);

module.exports = router;
