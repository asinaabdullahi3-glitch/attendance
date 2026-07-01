const africastalking = require("africastalking")({
  apiKey: process.env.AT_API_KEY,
  username: process.env.AT_USERNAME
});

const sms = africastalking.SMS;

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
}

async function sendOTPSms(phoneNumber, otpCode) {
  const message = `Your Swahilipot Attendance verification code is ${otpCode}. It expires in 10 minutes.`;

  await sms.send({
    to: [phoneNumber],
    message
  });
}

module.exports = { generateOTP, sendOTPSms };