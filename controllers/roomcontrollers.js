
const db = require("../db/connection.js");

// 1. Add a new room
async function addRoom(req, res) {
    const { room_number, room_type, price_per_night, capacity } = req.body || {};

    if (
        typeof room_number !== "string" || !room_number.trim() ||
        typeof room_type !== "string" || !room_type.trim() ||
        !Number.isFinite(Number(price_per_night)) ||
        Number(price_per_night) <= 0 ||
        !Number.isInteger(Number(capacity)) ||
        Number(capacity) <= 0
    ) {
        return res.status(400).json({
            message: "Provide valid room number, room type, price and capacity"
        });
    }

    try {
        const [result] = await db.query(
            `INSERT INTO rooms
            (room_number, room_type, price_per_night, capacity)
            VALUES (?, ?, ?, ?)`,
            [
                room_number.trim(),
                room_type.trim(),
                Number(price_per_night),
                Number(capacity)
            ]
        );

        return res.status(201).json({
            message: "Room added successfully",
            room_id: result.insertId
        });

    } catch (error) {
        console.error("Add room error:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "This room number already exists"
            });
        }

        return res.status(500).json({
            message: "An internal server error occurred"
        });
    }
}

// 2. Get all rooms
async function getAllRooms(req, res) {
    try {
        const [rooms] = await db.query(
            "SELECT * FROM rooms ORDER BY room_number ASC"
        );

        return res.status(200).json(rooms);

    } catch (error) {
        console.error("Get rooms error:", error);

        return res.status(500).json({
            message: "An internal server error occurred"
        });
    }
}

// 3. Get one room
async function getOneRoom(req, res) {
    try {
        const [rooms] = await db.query(
            "SELECT * FROM rooms WHERE room_id = ?",
            [req.params.id]
        );

        if (rooms.length === 0) {
            return res.status(404).json({
                message: "Room not found"
            });
        }

        return res.status(200).json(rooms[0]);

    } catch (error) {
        console.error("Get one room error:", error);

        return res.status(500).json({
            message: "An internal server error occurred"
        });
    }
}

// 4. Update a room
async function updateRoom(req, res) {
    const { room_number, room_type, price_per_night, capacity, status } =
        req.body || {};

    const allowedStatuses = ["Available", "Maintenance"];

    if (
        (room_number !== undefined &&
            (typeof room_number !== "string" || !room_number.trim())) ||
        (room_type !== undefined &&
            (typeof room_type !== "string" || !room_type.trim())) ||
        (price_per_night !== undefined &&
            (!Number.isFinite(Number(price_per_night)) ||
                Number(price_per_night) <= 0)) ||
        (capacity !== undefined &&
            (!Number.isInteger(Number(capacity)) || Number(capacity) <= 0)) ||
        (status !== undefined && !allowedStatuses.includes(status))
    ) {
        return res.status(400).json({
            message: "Invalid room information"
        });
    }

    const fields = [];
    const values = [];

    if (room_number !== undefined) {
        fields.push("room_number = ?");
        values.push(room_number.trim());
    }

    if (room_type !== undefined) {
        fields.push("room_type = ?");
        values.push(room_type.trim());
    }

    if (price_per_night !== undefined) {
        fields.push("price_per_night = ?");
        values.push(Number(price_per_night));
    }

    if (capacity !== undefined) {
        fields.push("capacity = ?");
        values.push(Number(capacity));
    }

    if (status !== undefined) {
        fields.push("status = ?");
        values.push(status);
    }

    if (fields.length === 0) {
        return res.status(400).json({
            message: "Provide at least one field to update"
        });
    }

    try {
        values.push(req.params.id);

        const [result] = await db.query(
            `UPDATE rooms SET ${fields.join(", ")} WHERE room_id = ?`,
            values
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Room not found"
            });
        }

        return res.status(200).json({
            message: "Room updated successfully"
        });

    } catch (error) {
        console.error("Update room error:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "This room number already exists"
            });
        }

        return res.status(500).json({
            message: "An internal server error occurred"
        });
    }
}

// 5. Delete a room
async function deleteRoom(req, res) {
    try {
        const [result] = await db.query(
            "DELETE FROM rooms WHERE room_id = ?",
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Room not found"
            });
        }

        return res.status(200).json({
            message: "Room deleted successfully"
        });

    } catch (error) {
        console.error("Delete room error:", error);

        if (error.code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(409).json({
                message: "This room has booking records and cannot be deleted"
            });
        }

        return res.status(500).json({
            message: "An internal server error occurred"
        });
    }
}

module.exports = {
    addRoom,
    getAllRooms,
    getOneRoom,
    updateRoom,
    deleteRoom
};
