const { pool } = require("../config/db");

// ─── DEPARTMENT MANAGEMENT ───────────────────────────────────────────────────

async function getDepartments(req, res) {
  try {
    const [departments] = await pool.query(
      "SELECT * FROM departments ORDER BY name ASC"
    );
    return res.json({ success: true, departments });
  } catch (err) {
    console.error("Get departments error:", err);
    return res.status(500).json({ success: false, message: "Server error fetching departments." });
  }
}

async function createDepartment(req, res) {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "Department name is required." });
    }
    const [result] = await pool.query(
      "INSERT INTO departments (name) VALUES (?)", [name]
    );
    return res.status(201).json({
      success: true,
      message: "Department created successfully.",
      departmentId: result.insertId
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "Department name already exists." });
    }
    console.error("Create department error:", err);
    return res.status(500).json({ success: false, message: "Server error creating department." });
  }
}

async function updateDepartment(req, res) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "Department name is required." });
    }
    const [dept] = await pool.query("SELECT id FROM departments WHERE id = ?", [id]);
    if (dept.length === 0) {
      return res.status(404).json({ success: false, message: "Department not found." });
    }
    await pool.query("UPDATE departments SET name = ? WHERE id = ?", [name, id]);
    return res.json({ success: true, message: "Department updated successfully." });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "Department name already exists." });
    }
    console.error("Update department error:", err);
    return res.status(500).json({ success: false, message: "Server error updating department." });
  }
}

async function deleteDepartment(req, res) {
  try {
    const { id } = req.params;
    const [dept] = await pool.query("SELECT id FROM departments WHERE id = ?", [id]);
    if (dept.length === 0) {
      return res.status(404).json({ success: false, message: "Department not found." });
    }
    await pool.query("DELETE FROM departments WHERE id = ?", [id]);
    return res.json({ success: true, message: "Department deleted successfully." });
  } catch (err) {
    console.error("Delete department error:", err);
    return res.status(500).json({ success: false, message: "Server error deleting department." });
  }
}

// ─── USER MANAGEMENT ─────────────────────────────────────────────────────────

async function getPendingUsers(req, res) {
  try {
    const isSuperAdmin = req.user.role === "super_admin";
    const departmentId = req.user.department_id;

    let query = `
      SELECT u.id, u.full_name, u.email, u.phone, u.role, u.status,
             u.email_verified, u.phone_verified, u.created_at,
             d.name AS department
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.status = 'pending'
    `;
    const params = [];

    if (!isSuperAdmin) {
      query += " AND u.department_id = ?";
      params.push(departmentId);
    }

    query += " ORDER BY u.created_at ASC";

    const [users] = await pool.query(query, params);
    return res.json({ success: true, count: users.length, users });
  } catch (err) {
    console.error("Get pending users error:", err);
    return res.status(500).json({ success: false, message: "Server error fetching pending users." });
  }
}

async function approveUser(req, res) {
  try {
    const { id } = req.params;
    const isSuperAdmin = req.user.role === "super_admin";
    const departmentId = req.user.department_id;

    const [users] = await pool.query(
      "SELECT id, status, department_id FROM users WHERE id = ?", [id]
    );
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (!isSuperAdmin && users[0].department_id !== departmentId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only manage users in your department."
      });
    }

    await pool.query("UPDATE users SET status = 'approved' WHERE id = ?", [id]);
    return res.json({ success: true, message: `User ${id} approved successfully.` });
  } catch (err) {
    console.error("Approve user error:", err);
    return res.status(500).json({ success: false, message: "Server error approving user." });
  }
}

async function rejectUser(req, res) {
  try {
    const { id } = req.params;
    const isSuperAdmin = req.user.role === "super_admin";
    const departmentId = req.user.department_id;

    const [users] = await pool.query(
      "SELECT id, status, department_id FROM users WHERE id = ?", [id]
    );
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (!isSuperAdmin && users[0].department_id !== departmentId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only manage users in your department."
      });
    }

    await pool.query("UPDATE users SET status = 'rejected' WHERE id = ?", [id]);
    return res.json({ success: true, message: `User ${id} rejected.` });
  } catch (err) {
    console.error("Reject user error:", err);
    return res.status(500).json({ success: false, message: "Server error rejecting user." });
  }
}

async function updateUserDepartment(req, res) {
  try {
    const { id } = req.params;
    const { department_id } = req.body;

    if (!department_id) {
      return res.status(400).json({ success: false, message: "department_id is required." });
    }

    const [users] = await pool.query("SELECT id FROM users WHERE id = ?", [id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const [dept] = await pool.query("SELECT id FROM departments WHERE id = ?", [department_id]);
    if (dept.length === 0) {
      return res.status(404).json({ success: false, message: "Department not found." });
    }

    await pool.query("UPDATE users SET department_id = ? WHERE id = ?", [department_id, id]);
    return res.json({ success: true, message: "User department updated successfully." });
  } catch (err) {
    console.error("Update user department error:", err);
    return res.status(500).json({ success: false, message: "Server error updating department." });
  }
}

// ─── ATTENDANCE DASHBOARD ─────────────────────────────────────────────────────

async function getAttendanceRecords(req, res) {
  try {
    const isSuperAdmin = req.user.role === "super_admin";
    const departmentId = req.user.department_id;
    const { date, role, user_id } = req.query;

    let query = `
      SELECT a.id, a.user_id, u.full_name, u.email, u.phone,
             d.name AS department, a.role, a.check_in_time, a.check_out_time,
             a.check_in_lat, a.check_in_lng, a.check_out_lat, a.check_out_lng,
             a.status, a.attendance_date
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (!isSuperAdmin) {
      query += " AND u.department_id = ?";
      params.push(departmentId);
    }

    if (date) {
      query += " AND a.attendance_date = ?";
      params.push(date);
    }

    if (role) {
      query += " AND a.role = ?";
      params.push(role);
    }

    if (user_id) {
      query += " AND a.user_id = ?";
      params.push(user_id);
    }

    query += " ORDER BY a.attendance_date DESC, a.check_in_time DESC";

    const [records] = await pool.query(query, params);
    return res.json({ success: true, count: records.length, records });
  } catch (err) {
    console.error("Get attendance records error:", err);
    return res.status(500).json({ success: false, message: "Server error fetching attendance." });
  }
}

module.exports = {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getPendingUsers,
  approveUser,
  rejectUser,
  updateUserDepartment,
  getAttendanceRecords
};