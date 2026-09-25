/**
 * Off-chain mirror of a ballot. The Ethereum transaction (`txHash`) is the
 * source of truth; this record exists for fast queries and is continuously
 * cross-checked against the chain by the audit.
 */

const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // One ballot per voter.
    voterIdHash: { type: String, required: true, unique: true },
    // Anonymous key recorded on-chain (HMAC of voterIdHash).
    voterKey: { type: String, default: null },

    candidateSelected: { type: String, required: true, trim: true },
    party: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', default: null },
    partyAbbreviation: { type: String, default: null },
    electionType: { type: String, enum: ['national', 'state'], default: 'national' },
    state: { type: String, default: null },

    txHash: { type: String, unique: true, sparse: true },
    blockNumber: { type: Number, default: null },
    blockHash: { type: String, default: null },
    gasUsed: { type: String, default: null },

    votedAt: { type: Date, default: Date.now },

    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },

    // Set by the audit when this record does not match the blockchain.
    isDisqualified: { type: Boolean, default: false },
    auditReason: { type: String, default: null },
    auditedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

voteSchema.index({ votedAt: 1 });

module.exports = mongoose.model('Vote', voteSchema, 'votes');
