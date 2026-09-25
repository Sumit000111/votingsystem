/**
 * Political party / candidate. `chainId` is keccak256(name) — the id the
 * candidate is registered under in the Voting contract.
 */

const mongoose = require('mongoose');
const { ethers } = require('ethers');

const partySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    abbreviation: { type: String, required: true, unique: true, uppercase: true, trim: true },
    symbol: { type: String, default: '✓' },
    image: { type: String, default: '' },
    // Brand colour used for charts and generated badges.
    color: { type: String, default: '#FF9933' },
    ideology: { type: String, default: '' },
    partyType: { type: String, enum: ['national', 'state', 'regional'], default: 'national' },
    activeStates: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    chainId: { type: String, index: true },
  },
  { collection: 'parties', timestamps: true }
);

partySchema.pre('validate', function setChainId() {
  if (this.name && (this.isModified('name') || !this.chainId)) {
    this.chainId = ethers.id(this.name);
  }
});

module.exports = mongoose.model('Party', partySchema);
