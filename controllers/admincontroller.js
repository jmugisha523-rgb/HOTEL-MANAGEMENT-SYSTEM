
const db = require("../db/connection.js");

function handleError(res, error, action) {
    console.error(`${action}:`, error);

    if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
            message: "Username already exists"
        });
    }

    return res.status(500).json({
        message: "An internal server error occurred"
    });
}

// 1. Get all users
async function getAllUsers(req, res) {
    try {
        const [users] = await db.query(
            "SELECT id, names, username, email, role, department, is_active FROM `user`"
        );

        return res.status(200).json({
            message: "Users retrieved successfully",
            users: users
        });

    } catch (error) {
        return handleError(res, error, "Get all users error");
    }
}

// 2. Get one user
async function getOneUser(req, res) {
    try {
        const [users] = await db.query(
            "SELECT id, names, username, email, role, department, is_active FROM `user` WHERE id = ?",
            [req.params.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        return res.status(200).json(users[0]);

    } catch (error) {
        return handleError(res, error, "Get one user error");
    }
}

// 3. Update user role and department
async function updateUserRole(req, res) {
    const { role, department } = req.body || {};

    const allowedRoles = ["admin", "user", "manager"];

    if (
        !allowedRoles.includes(role) ||
        typeof department !== "string" ||
        !department.trim()
    ) {
        return res.status(400).json({
            message: "Provide a valid role and department"
        });
    }

    try {
        const [result] = await db.query(
            "UPDATE `user` SET role = ?, department = ? WHERE id = ?",
            [role, department.trim(), req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        return res.status(200).json({
            message: "User role updated successfully"
        });

    } catch (error) {
        return handleError(res, error, "Update user role error");
    }
}

// 4. Activate or deactivate user account
async function updateUserStatus(req, res) {
    const { is_active } = req.body || {};

    if (typeof is_active !== "boolean") {
        return res.status(400).json({
            message: "is_active must be true or false"
        });
    }

    try {
        const [result] = await db.query(
            "UPDATE `user` SET is_active = ? WHERE id = ?",
            [is_active, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        return res.status(200).json({
            message: is_active
                ? "User account activated successfully"
                : "User account deactivated successfully"
        });

    } catch (error) {
        return handleError(res, error, "Update user status error");
    }
}

// 5. Delete user
async function deleteUser(req, res) {
    try {
        const [result] = await db.query(
            "DELETE FROM `user` WHERE id = ?",
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        return res.status(200).json({
            message: "User deleted successfully"
        });

    } catch (error) {
        return handleError(res, error, "Delete user error");
    }
}

module.exports = {
    getAllUsers,
    getOneUser,
    updateUserRole,
    updateUserStatus,
    deleteUser
};
