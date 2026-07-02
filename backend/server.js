const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { testConnection } = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/admin");
const attendanceRoutes = require("./routes/attendance");
const reportRoutes = require("./routes/reportRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🚀 Swahilipot Attendance Backend is running!"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/reports", reportRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  await testConnection();
});
