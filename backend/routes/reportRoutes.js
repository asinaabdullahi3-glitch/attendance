const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");
const { exportCSV, exportPDF } = require("../controllers/reportController");

router.get("/export/csv", verifyToken, requireAdmin, exportCSV);
router.get("/export/pdf", verifyToken, requireAdmin, exportPDF);

module.exports = router;
