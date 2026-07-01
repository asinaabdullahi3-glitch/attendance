const { pool } = require("../config/db");
const { isWithinGeofence, getDistanceMeters } = require("../utils/geofence");

function getTodayDate() {
  const now = new Date();
  return now.toISOString().split("T")[0]; // YYYY-MM-DD
}

// CHECK IN
async function checkIn(req, res) {
  try {
    const { latitude, longitude } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required."
      });
    }

    if (!isWithinGeofence(latitude, longitude)) {
      const distance = Math.round(getDistanceMeters(latitude, longitude, -4.0633114, 39.6798947));
      return res.status(403).json({
        success: false,
        message: `You are outside the Swahilipot Hub geofence (approx. ${distance}m away). Check-in denied.`
      });
    }

    const today = getTodayDate();

    const [existing] = await pool.query(
      "SELECT id, status FROM attendance WHERE user_id = ? AND attendance_date = ?",
      [userId, today]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "You have already checked in today."
      });
    }

    await pool.query(
      `INSERT INTO attendance
        (user_id, role, check_in_time, check_in_lat, check_in_lng, status, attendance_date)
       VALUES (?, ?, NOW(), ?, ?, 'checked_in', ?)`,
      [userId, userRole, latitude, longitude, today]
    );

    return res.status(201).json({
      success: true,
      message: "Checked in successfully."
    });

  } catch (err) {
    console.error("Check-in error:", err);
    return res.status(500).json({ success: false, message: "Server error during check-in." });
  }
}

// CHECK OUT
async function checkOut(req, res) {
  try {
    const { latitude, longitude } = req.body;
    const userId = req.user.id;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required."
      });
    }

    if (!isWithinGeofence(latitude, longitude)) {
      const distance = Math.round(getDistanceMeters(latitude, longitude, -4.0633114, 39.6798947));
      return res.status(403).json({
        success: false,
        message: `You are outside the Swahilipot Hub geofence (approx. ${distance}m away). Check-out denied.`
      });
    }

    const today = getTodayDate();

    const [existing] = await pool.query(
      "SELECT id, status FROM attendance WHERE user_id = ? AND attendance_date = ?",
      [userId, today]
    );

    if (existing.length === 0) {
      return res.status(400).json({
        success: false,
        message: "You have not checked in today. Cannot check out."
      });
    }

    const record = existing[0];

    if (record.status === "checked_out") {
      return res.status(409).json({
        success: false,
        message: "You have already checked out today."
      });
    }

    await pool.query(
      `UPDATE attendance
       SET check_out_time = NOW(), check_out_lat = ?, check_out_lng = ?, status = 'checked_out'
       WHERE id = ?`,
      [latitude, longitude, record.id]
    );

    return res.json({
      success: true,
      message: "Checked out successfully."
    });

  } catch (err) {
    console.error("Check-out error:", err);
    return res.status(500).json({ success: false, message: "Server error during check-out." });
  }
}

// GET own attendance history
async function getMyAttendance(req, res) {
  try {
    const userId = req.user.id;

    const [records] = await pool.query(
      "SELECT * FROM attendance WHERE user_id = ? ORDER BY attendance_date DESC",
      [userId]
    );

    return res.json({ success: true, count: records.length, records });

  } catch (err) {
    console.error("Get attendance error:", err);
    return res.status(500).json({ success: false, message: "Server error fetching attendance." });
  }
}

module.exports = { checkIn, checkOut, getMyAttendance };