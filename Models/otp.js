const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true }, // Expiry time for OTP
}, {
  timestamps: true,
});

// TTL index for automatic removal of expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Otp', otpSchema);
