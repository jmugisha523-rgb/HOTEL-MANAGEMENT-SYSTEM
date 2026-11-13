const express = require("express");

const router = express.Router();

const {
    registerUser,
    loginUser,
    getoneuser,
    getAllUsers,
    updateUser,
    deleteUser
} = require("../Usercontroller");
const {
    authenticate,
    authorizeRoles,
    authorizeDepartment,
    authorizeOwnerOrAdmin,
    createCustomAuthorization
} = require("../middleware/auth");

const customAccess = createCustomAuthorization({
    allowedRoles: ["admin", "manager"],
    startHour: Number(process.env.WORKING_HOURS_START ?? 9),
    endHour: Number(process.env.WORKING_HOURS_END ?? 17),
    timeZone: process.env.AUTH_TIME_ZONE || "UTC",
    allowedIps: (process.env.AUTH_ALLOWED_IPS || "")
        .split(",")
        .map((ip) => ip.trim())
        .filter(Boolean)
});

router.post("/register", registerUser);
router.post("/adduser", registerUser);
router.post("/admin/register", authenticate, authorizeRoles("admin"), registerUser);
router.post("/login", loginUser);

router.get("/getoneuser/:id", authenticate, authorizeOwnerOrAdmin(), getoneuser);

router.get("/getallusers", authenticate, authorizeRoles("admin", "manager"), getAllUsers);

router.put("/user/:id", authenticate, authorizeRoles("admin"), updateUser);

router.delete("/user/:id", authenticate, authorizeRoles("admin"), deleteUser);

router.get(
    "/department/:department/resources",
    authenticate,
    authorizeDepartment(),
    (req, res) => res.status(200).json({
        message: "Department access granted",
        department: req.user.department
    })
);

router.get("/custom-access", authenticate, customAccess, (req, res) => {
    res.status(200).json({ message: "Custom authorization rules passed" });
});
    

module.exports = router;