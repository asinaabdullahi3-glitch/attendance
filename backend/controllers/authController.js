const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");
const { sendVerificationEmail } = require("../utils/sendEmail");
const { generateOTP, sendOTPSms } = require("../utils/sendOTP");

// REGISTER
async function register(req, res) {
  try {
    const { full_name, email, phone, password, department_id, role } = req.body;

    if (!full_name || !email || !phone || !password || !department_id) {
      return res.status(400).json({
        success: false,
        message: "All fields (full_name, email, phone, password, department_id) are required."
      });
    }

    // Validate department exists
    const [dept] = await pool.query("SELECT id FROM departments WHERE id = ?", [department_id]);
    if (dept.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid department selected." });
    }

    // Only allow staff/volunteer/attache on self-registration
    const allowedRoles = ["staff", "volunteer", "attache"];
    const userRole = allowedRoles.includes(role) ? role : "staff";

    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ? OR phone = ?",
      [email, phone]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email or phone number already registered."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const emailToken = crypto.randomBytes(32).toString("hex");
    const otpCode = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const [result] = await pool.query(
      `INSERT INTO users
        (full_name, email, phone, password, role, department_id, email_verification_token, otp_code, otp_expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [full_name, email, phone, hashedPassword, userRole, department_id, emailToken, otpCode, otpExpiresAt]
    );

    try {
      await sendVerificationEmail(email, emailToken);
    } catch (err) {
      console.error("Failed to send verification email:", err.message);
    }

    try {
      await sendOTPSms(phone, otpCode);
    } catch (err) {
      console.error("Failed to send OTP SMS:", err.message);
    }

    return res.status(201).json({
      success: true,
      message: "Registration successful. Please verify your email and phone number to activate your account.",
      userId: result.insertId
    });

  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error during registration."
    });
  }
}

// VERIFY EMAIL
async function verifyEmail(req, res) {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ success: false, message: "Verification token is required." });
    }

    const [users] = await pool.query(
      "SELECT id FROM users WHERE email_verification_token = ?",
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid or expired verification token." });
    }

    await pool.query(
      "UPDATE users SET email_verified = TRUE, email_verification_token = NULL WHERE id = ?",
      [users[0].id]
    );

    return res.json({ success: true, message: "Email verified successfully." });

  } catch (err) {
    console.error("Email verification error:", err);
    return res.status(500).json({ success: false, message: "Server error during email verification." });
  }
}

// VERIFY OTP
async function verifyOTP(req, res) {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: "Phone and OTP are required." });
    }

    const [users] = await pool.query(
      "SELECT id, otp_code, otp_expires_at FROM users WHERE phone = ?",
      [phone]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const user = users[0];

    if (!user.otp_code || user.otp_code !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP." });
    }

    if (new Date() > new Date(user.otp_expires_at)) {
      return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
    }

    await pool.query(
      "UPDATE users SET phone_verified = TRUE, otp_code = NULL, otp_expires_at = NULL WHERE id = ?",
      [user.id]
    );

    return res.json({ success: true, message: "Phone number verified successfully." });

  } catch (err) {
    console.error("OTP verification error:", err);
    return res.status(500).json({ success: false, message: "Server error during OTP verification." });
  }
}

// RESEND OTP
async function resendOTP(req, res) {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone number is required." });
    }

    const [users] = await pool.query("SELECT id FROM users WHERE phone = ?", [phone]);

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const otpCode = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      "UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE id = ?",
      [otpCode, otpExpiresAt, users[0].id]
    );

    await sendOTPSms(phone, otpCode);

    return res.json({ success: true, message: "OTP resent successfully." });

  } catch (err) {
    console.error("Resend OTP error:", err);
    return res.status(500).json({ success: false, message: "Server error during OTP resend." });
  }
}

// LOGIN
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    const user = users[0];

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    if (!user.email_verified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email address before logging in."
      });
    }

    if (!user.phone_verified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your phone number before logging in."
      });
    }

    if (user.status === "pending") {
      return res.status(403).json({
        success: false,
        message: "Your account is awaiting admin approval."
      });
    }

    if (user.status === "rejected") {
      return res.status(403).json({
        success: false,
        message: "Your account registration was rejected. Please contact the admin."
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        email: user.email,
        department_id: user.department_id
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        department_id: user.department_id
      }
    });

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, message: "Server error during login." });
  }
}

module.exports = { register, verifyEmail, verifyOTP, resendOTP, login };