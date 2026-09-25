/**
 * Election administrator. Admins sign in with an OTP sent to a phone number
 * listed in ADMIN_PHONES; they are kept apart from voters so they never skew
 * turnout statistics.
 */

const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    phoneNumber: { type: String, required: true, unique: true, trim: true },
    otpHash: { type: String, default: null },
    otpExpiry: { type: Date, default: null },
    otpAttempts: { type: Number, default: 0 },
    otpSentAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admin', adminSchema, 'admins');
