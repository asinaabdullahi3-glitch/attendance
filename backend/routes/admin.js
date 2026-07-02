const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const { requireAdmin, requireSuperAdmin } = require("../middleware/admin");
const {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getPendingUsers,
  approveUser,
  rejectUser,
  updateUserDepartment,
  getAttendanceRecords
} = require("../controllers/adminController");

// Department routes — super admin only
router.get("/departments", verifyToken, requireAdmin, getDepartments);
router.post("/departments", verifyToken, requireSuperAdmin, createDepartment);
router.put("/departments/:id", verifyToken, requireSuperAdmin, updateDepartment);
router.delete("/departments/:id", verifyToken, requireSuperAdmin, deleteDepartment);

// User management
router.get("/pending-users", verifyToken, requireAdmin, getPendingUsers);
router.put("/approve/:id", verifyToken, requireAdmin, approveUser);
router.put("/reject/:id", verifyToken, requireAdmin, rejectUser);
router.put("/users/:id/department", verifyToken, requireSuperAdmin, updateUserDepartment);

// Attendance dashboard
router.get("/attendance", verifyToken, requireAdmin, getAttendanceRecords);

module.exports = router;