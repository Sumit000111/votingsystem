/**
 * User Model
 * Stores user information and voting status
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    // Hashed voter ID (SHA-256 hash of Aadhaar + PAN)
    // This is the unique identifier instead of storing raw Aadhaar/PAN
    voterIdHash: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Username chosen by the user during registration
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
    },

    // Phone number for MSG91 OTP
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },

    // Password hashed using bcrypt
    // Raw passwords are NEVER stored
    // Optional: Not required for Aadhaar+PAN based login
    password: {
      type: String,
      default: '',
    },

    // Flag to check if user has already voted
    // Ensures each user can vote only once
    hasVoted: {
      type: Boolean,
      default: false,
    },

    // Name of the candidate user voted for (if hasVoted is true)
    votedFor: {
      type: String,
      default: null,
    },

    // User's state selection (for state-specific voting)
    state: {
      type: String,
      default: null,
    },

    // OTP related fields
    otp: {
      type: String,
      default: null,
    },

    // OTP expiration time
    otpExpiry: {
      type: Date,
      default: null,
    },

    // Whether user has verified OTP
    isOtpVerified: {
      type: Boolean,
      default: false,
    },

    // WebAuthn Passkeys Biometric Credential ID
    biometricCredentialId: {
      type: String,
      default: null,
    },

    // Account creation timestamp
    createdAt: {
      type: Date,
      default: Date.now,
    },

    // Last updated timestamp
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Index on voterIdHash for faster lookups
userSchema.index({ voterIdHash: 1 });
userSchema.index({ username: 1 });

module.exports = mongoose.model('User', userSchema, 'users');
