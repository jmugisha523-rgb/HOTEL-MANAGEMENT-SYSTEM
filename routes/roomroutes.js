
const express = require("express");
const router = express.Router();

const {
    addRoom,
    getAllRooms,
    getOneRoom,
    updateRoom,
    deleteRoom
} = require("../controllers/roomcontrollers.js");

const {
    authenticate,
    authorizeRoles
} = require("../middleware/auth.js");

// Display all rooms
router.get("/", authenticate, getAllRooms);

// Display one room
router.get("/:id", authenticate, getOneRoom);

// Add room (admin and manager)
router.post(
    "/",
    authenticate,
    authorizeRoles("admin", "manager"),
    addRoom
);

// Update room
router.put(
    "/:id",
    authenticate,
    authorizeRoles("admin", "manager"),
    updateRoom
);

// Delete room
router.delete(
    "/:id",
    authenticate,
    authorizeRoles("admin"),
    deleteRoom
);

module.exports = router;
