const jwt = require("jsonwebtoken");
const db = require("../db/connection.js");

const jwtIssuer = "hotel-management-system";

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error("JWT_SECRET is not configured");
    }

    return secret;
}

async function authenticate(req, res, next) {
    const authorization = req.get("Authorization");

    if (!authorization) {
        return res.status(401).json({ message: "Authentication token is required" });
    }

    const match = authorization.match(/^Bearer\s+(\S+)$/i);
    if (!match) {
        return res.status(403).json({ message: "Invalid authentication token" });
    }

    try {
        const payload = jwt.verify(match[1], getJwtSecret(), {
            algorithms: ["HS256"],
            issuer: jwtIssuer,
            audience: jwtIssuer
        });

        if (
            !payload || typeof payload !== "object" ||
            !Number.isInteger(Number(payload.id)) ||
            !["admin", "user", "manager"].includes(payload.role) ||
            typeof payload.department !== "string"
        ) {
            return res.status(403).json({ message: "Invalid authentication token" });
        }

        const [users] = await db.query(
            "SELECT id, username, role, department, is_active FROM `user` WHERE id = ? LIMIT 1",
            [payload.id]
        );
        const user = users[0];

        if (!user) {
            return res.status(403).json({ message: "User account is no longer available" });
        }

        if (!user.is_active) {
            return res.status(403).json({ message: "This account is inactive" });
        }

        req.user = {
            id: user.id,
            username: user.username,
            role: user.role,
            department: user.department
        };

        return next();
    } catch (err) {
        if (err.message === "JWT_SECRET is not configured") {
            console.error(err.message);
            return res.status(500).json({ message: "Authentication is not configured" });
        }

        if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError" ||
            err.name === "NotBeforeError") {
            return res.status(403).json({ message: "Invalid or expired authentication token" });
        }

        console.error("Authentication error:", err);
        return res.status(500).json({ message: "An internal server error occurred" });
    }
}

function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Authentication is required" });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: "Your role is not allowed to access this resource" });
        }

        return next();
    };
}

function authorizeDepartment(parameterName = "department") {
    return (req, res, next) => {
        const requestedDepartment = req.params[parameterName];

        if (
            !req.user ||
            typeof requestedDepartment !== "string" ||
            requestedDepartment.toLowerCase() !== req.user.department.toLowerCase()
        ) {
            return res.status(403).json({ message: "You cannot access another department's resources" });
        }

        return next();
    };
}

function authorizeOwnerOrAdmin(parameterName = "id") {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Authentication is required" });
        }

        if (req.user.role !== "admin" && String(req.user.id) !== req.params[parameterName]) {
            return res.status(403).json({ message: "You can only access your own account" });
        }

        return next();
    };
}

function createCustomAuthorization({
    allowedRoles = [],
    department,
    startHour = 9,
    endHour = 17,
    timeZone = "UTC",
    allowedIps = []
} = {}) {
    if (
        !Number.isInteger(startHour) || startHour < 0 || startHour > 23 ||
        !Number.isInteger(endHour) || endHour < 0 || endHour > 23 ||
        startHour === endHour
    ) {
        throw new Error("Working-hour boundaries must be different integer hours from 0 to 23");
    }

    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Authentication is required" });
        }

        if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: "Your role is not allowed to access this resource" });
        }

        if (department && req.user.department.toLowerCase() !== department.toLowerCase()) {
            return res.status(403).json({ message: "This resource is restricted to another department" });
        }

        if (!allowedIps.length) {
            return res.status(503).json({ message: "The custom authorization IP allow-list is not configured" });
        }

        if (!allowedIps.includes(req.ip)) {
            return res.status(403).json({ message: "Access is not permitted from this IP address" });
        }

        let currentHour;
        try {
            const hourPart = new Intl.DateTimeFormat("en-US", {
                timeZone,
                hour: "numeric",
                hourCycle: "h23"
            }).formatToParts(new Date()).find((part) => part.type === "hour");
            currentHour = Number(hourPart.value);
        } catch (err) {
            console.error("Custom authorization time-zone error:", err);
            return res.status(500).json({ message: "Custom authorization time zone is invalid" });
        }

        const withinWorkingHours = startHour < endHour
            ? currentHour >= startHour && currentHour < endHour
            : currentHour >= startHour || currentHour < endHour;

        if (!withinWorkingHours) {
            return res.status(403).json({ message: "Access is only permitted during working hours" });
        }

        return next();
    };
}

module.exports = {
    authenticate,
    authorizeRoles,
    authorizeDepartment,
    authorizeOwnerOrAdmin,
    createCustomAuthorization
};
