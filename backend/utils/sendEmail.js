const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendVerificationEmail(toEmail, token) {
  const verifyLink = `${process.env.CLIENT_BASE_URL}/api/auth/verify-email?token=${token}`;

  await transporter.sendMail({
    from: `"Swahilipot Attendance" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Verify your email",
    html: `
      <p>Welcome to Swahilipot Attendance!</p>
      <p>Click the link below to verify your email address:</p>
      <a href="${verifyLink}">${verifyLink}</a>
      <p>If you did not register, ignore this email.</p>
    `
  });
}

module.exports = { sendVerificationEmail };