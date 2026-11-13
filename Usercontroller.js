const db = require("./db/connection.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const allowedRoles = ["admin", "user", "manager"];
const jwtIssuer = "hotel-management-system";

function handleError(res, error, action) {
    console.error(`${action}:`, error);

    if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ message: "Username already exists" });
    }

    return res.status(500).json({ message: "An internal server error occurred" });
}

function isValidPassword(password) {
    return typeof password === "string" &&
        password.length >= 8 &&
        Buffer.byteLength(password, "utf8") <= 72;
}

async function registerUser(req, res) {
    const body = req.body || {};
    const names = body.names;
    const username = body.username;
    const email = body.email === undefined ? null : body.email;
    const password = body.password;
    const role = body.role === undefined ? "user" : body.role;
    const department = body.department;

    if (
        typeof username !== "string" || !username.trim() ||
        !isValidPassword(password) ||
        !allowedRoles.includes(role) ||
        typeof department !== "string" || !department.trim() ||
        (names !== undefined && (typeof names !== "string" || !names.trim())) ||
        (email !== null && (typeof email !== "string" || !email.trim()))
    ) {
        return res.status(400).json({
            message: "Provide a username, a password of 8-72 bytes, a valid role, and a department"
        });
    }

    if (role !== "user" && (!req.user || req.user.role !== "admin")) {
        return res.status(403).json({
            message: "Only an administrator can register admin or manager accounts"
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 12);
        const [result] = await db.query(
            "INSERT INTO `user` (names, username, email, password, role, department) VALUES (?, ?, ?, ?, ?, ?)",
            [
                names ? names.trim() : username.trim(),
                username.trim(),
                email === null ? "" : email.trim(),
                hashedPassword,
                role,
                department.trim()
            ]
        );

        return res.status(201).json({
            message: "User registered successfully",
            id: result.insertId
        });
    } catch (error) {
        return handleError(res, error, "Register user error");
    }
}

async function loginUser(req, res) {
    const body = req.body || {};
    const username = body.username;
    const password = body.password;

    if (typeof username !== "string" || typeof password !== "string") {
        return res.status(400).json({ message: "Username and password are required" });
    }

    try {
        const [users] = await db.query(
            "SELECT id, username, password, role, department, is_active FROM `user` WHERE username = ? LIMIT 1",
            [username.trim()]
        );
        const user = users[0];

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: "Invalid username or password" });
        }

        if (!user.is_active) {
            return res.status(403).json({ message: "This account is inactive" });
        }

        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is not configured");
            return res.status(500).json({ message: "Authentication is not configured" });
        }

        const token = jwt.sign(
            {
                id: user.id,
                role: user.role,
                department: user.department
            },
            process.env.JWT_SECRET,
            {
                algorithm: "HS256",
                expiresIn: "1h",
                issuer: jwtIssuer,
                audience: jwtIssuer
            }
        );

        return res.status(200).json({ message: "Login successful", token });
    } catch (error) {
        return handleError(res, error, "Login error");
    }
}

async function getoneuser(req, res) {
    try {
        const [users] = await db.query(
            "SELECT id, names, username, email, role, department, is_active FROM `user` WHERE id = ?",
            [req.params.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json(users[0]);
    } catch (error) {
        return handleError(res, error, "Get user error");
    }
}

async function getAllUsers(req, res) {
    try {
        const [users] = await db.query(
            "SELECT id, names, username, email, role, department, is_active FROM `user`"
        );

        return res.status(200).json(users);
    } catch (error) {
        return handleError(res, error, "Get all users error");
    }
}

async function updateUser(req, res) {
    const body = req.body || {};
    const newPassword = body.password;

    try {
        const [users] = await db.query(
            "SELECT names, username, email FROM `user` WHERE id = ?",
            [req.params.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const currentUser = users[0];
        const names = body.names === undefined ? currentUser.names : body.names;
        const username = body.username === undefined ? currentUser.username : body.username;
        const email = body.email === undefined ? currentUser.email : body.email;

        if (
            typeof names !== "string" || !names.trim() ||
            typeof username !== "string" || !username.trim() ||
            (email !== null && typeof email !== "string") ||
            (newPassword !== undefined && !isValidPassword(newPassword))
        ) {
            return res.status(400).json({ message: "Invalid user details" });
        }

        let hashedPassword = null;
        if (newPassword !== undefined) {
            hashedPassword = await bcrypt.hash(newPassword, 12);
        }

        await db.query(
            "UPDATE `user` SET names = ?, username = ?, email = ?, password = COALESCE(?, password) WHERE id = ?",
            [
                names.trim(),
                username.trim(),
                email === null ? "" : email.trim(),
                hashedPassword,
                req.params.id
            ]
        );

        return res.status(200).json({ message: "User updated successfully" });
    } catch (error) {
        return handleError(res, error, "Update user error");
    }
}

async function deleteUser(req, res) {
    try {
        const [result] = await db.query(
            "DELETE FROM `user` WHERE id = ?",
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        return handleError(res, error, "Delete user error");
    }
}

module.exports = {
    registerUser,
    loginUser,
    getoneuser,
    getAllUsers,
    updateUser,
    deleteUser
};
