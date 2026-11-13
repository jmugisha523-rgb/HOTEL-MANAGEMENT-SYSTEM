            
const db = require("../db/connection.js");

function handleError(res, error, action) {
    console.error(`${action}:`, error);

    if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
            message: "Department already exists"
        });
    }

    return res.status(500).json({
        message: "An internal server error occurred"
    });
}

// 1. Add department
async function addDepartment(req, res) {
    const { department_name, description } = req.body || {};

    if (
        typeof department_name !== "string" ||
        !department_name.trim() ||
        (description !== undefined && typeof description !== "string")
    ) {
        return res.status(400).json({
            message: "Department name and valid description are required"
        });
    }

    try {
        const [result] = await db.query(
            "INSERT INTO department (department_name, description) VALUES (?, ?)",
            [
                department_name.trim(),
                description ? description.trim() : ""
            ]
        );

        return res.status(201).json({
            message: "Department added successfully",
            id: result.insertId
        });

    } catch (error) {
        return handleError(res, error, "Add department error");
    }
}

// 2. Get all departments
async function getAllDepartments(req, res) {
    try {
        const [departments] = await db.query(
            "SELECT * FROM department"
        );

        return res.status(200).json(departments);

    } catch (error) {
        return handleError(res, error, "Get all departments error");
    }
}

// 3. Get one department
async function getOneDepartment(req, res) {
    try {
        const [departments] = await db.query(
            "SELECT * FROM department WHERE id = ?",
            [req.params.id]
        );

        if (departments.length === 0) {
            return res.status(404).json({
                message: "Department not found"
            });
        }

        return res.status(200).json(departments[0]);

    } catch (error) {
        return handleError(res, error, "Get one department error");
    }
}

// 4. Update department
async function updateDepartment(req, res) {
    const { department_name, description } = req.body || {};

    if (
        typeof department_name !== "string" ||
        !department_name.trim() ||
        (description !== undefined && typeof description !== "string")
    ) {
        return res.status(400).json({
            message: "Provide a valid department name and description"
        });
    }

    try {
        const [result] = await db.query(
            "UPDATE department SET department_name = ?, description = ? WHERE id = ?",
            [
                department_name.trim(),
                description ? description.trim() : "",
                req.params.id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Department not found"
            });
        }

        return res.status(200).json({
            message: "Department updated successfully"
        });

    } catch (error) {
        return handleError(res, error, "Update department error");
    }
}

// 5. Delete department
async function deleteDepartment(req, res) {
    try {
        const [result] = await db.query(
            "DELETE FROM department WHERE id = ?",
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Department not found"
            });
        }

        return res.status(200).json({
            message: "Department deleted successfully"
        });

    } catch (error) {
        return handleError(res, error, "Delete department error");
    }
}

module.exports = {
    addDepartment,
    getAllDepartments,
    getOneDepartment,
    updateDepartment,
    deleteDepartment
};
