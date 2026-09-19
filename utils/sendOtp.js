const OTP = require('../Models/otp'); // OTP model
const crypto = require('crypto'); // To generate random OTP
const nodemailer = require('nodemailer'); // Email sending library


// Utility function to send OTP
async function sendOtp(email) {
  try {

    let otp;
    const expiresAt = new Date(); // Set OTP expiry time (e.g., 10 minutes)
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Check if an OTP already exists for the email
    const existingOtp = await OTP.findOne({ email });

    if (existingOtp) {
      otp = existingOtp.otp;
      existingOtp.expiresAt = expiresAt;
      await existingOtp.save(); // Save the updated document
    }
    else {
      otp = crypto.randomInt(100000, 999999).toString(); // Generate random OTP (6 digits)
      await OTP.create({ email, otp, expiresAt });  // Save OTP in the database
    }

    // Send OTP to user's email
    const transporter = nodemailer.createTransport({
      service: 'gmail', // Use your email service
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP for Registration',
      text: `Your OTP is ${otp}. It will expire in 10 minutes.Verify your account now.`,
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (mailErr) {
      // Local dev only: SMTP may be unconfigured, so surface the OTP in the server console instead.
      if (process.env.DEV === 'local') {
        console.warn(`[DEV] Email send failed (${mailErr.code}). OTP for ${email}: ${otp}`);
        return { message: 'OTP generated (dev mode, see server console)' };
      }
      throw mailErr;
    }
    return { message: 'OTP sent successfully' };
  } catch (err) {
    console.error('Error in OTP generation or sending:', err);
    throw new Error('Failed to send OTP');
  }
}

module.exports = sendOtp;
