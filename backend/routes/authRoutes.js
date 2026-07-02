const express = require("express");
const router = express.Router();
const { register, verifyEmail, verifyOTP, resendOTP, login } = require("../controllers/authController");

router.post("/register", register);
router.get("/verify-email", verifyEmail);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.post("/login", login);

module.exports = router;