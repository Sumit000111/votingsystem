/**
 * Vote Model
 * Stores voting records linked to Ethereum blockchain transactions
 */

const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema(
  {
    // Reference to the User who cast the vote
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Hashed voter ID (for blockchain record)
    voterIdHash: {
      type: String,
      required: true,
    },

    // Name of the candidate voted for
    candidateSelected: {
      type: String,
      required: true,
      trim: true,
    },

    // Timestamp when the vote was cast
    votedAt: {
      type: Date,
      default: Date.now,
    },

    // Ethereum transaction hash for this vote
    // Optional: only set if blockchain transaction succeeds
    txHash: {
      type: String,
      sparse: true,
      unique: true,
    },

    // IP address of the voter (for audit purposes)
    ipAddress: {
      type: String,
      default: null,
    },

    // Browser/User agent info (for audit purposes)
    userAgent: {
      type: String,
      default: null,
    },

    // Permanent flag for tampered votes detected during audit
    isDisqualified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster lookups
voteSchema.index({ userId: 1 });
voteSchema.index({ voterIdHash: 1 });
voteSchema.index({ txHash: 1 });

module.exports = mongoose.model('Vote', voteSchema, 'votes');
