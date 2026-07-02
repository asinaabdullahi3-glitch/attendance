const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const { checkIn, checkOut, getMyAttendance } = require("../controllers/attendanceController");

router.post("/check-in", verifyToken, checkIn);
router.post("/check-out", verifyToken, checkOut);
router.get("/my-history", verifyToken, getMyAttendance);

module.exports = router;