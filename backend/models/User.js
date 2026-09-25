/**
 * Voter account. Raw Aadhaar / Voter ID numbers are never stored: voters are
 * identified by the SHA-256 hash of Aadhaar + Voter ID (`voterIdHash`).
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    voterIdHash: { type: String, required: true, unique: true, trim: true },

    // Display name only, e.g. "Voter 3fa2c1b0". Never the Aadhaar number.
    username: { type: String, required: true, trim: true },

    // Last four digits for display ("XXXX XXXX 1234").
    maskedAadhaar: { type: String, default: null },

    phoneNumber: { type: String, required: true, trim: true },
    state: { type: String, default: null },

    hasVoted: { type: Boolean, default: false },
    votedFor: { type: String, default: null },
    // Short-lived lock that stops two concurrent ballots from the same voter.
    voteLockUntil: { type: Date, default: null },

    otpHash: { type: String, default: null },
    otpExpiry: { type: Date, default: null },
    otpAttempts: { type: Number, default: 0 },
    otpSentAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ state: 1, hasVoted: 1 });

module.exports = mongoose.model('User', userSchema, 'users');
