/**
 * Singleton document with the election configuration. `status` is mirrored
 * on-chain as the contract phase: preparation → Registration,
 * active → Voting, completed → Ended (irreversible).
 */

const mongoose = require('mongoose');

const electionSettingsSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'General Election 2026' },
    nationalElectionEnabled: { type: Boolean, default: true },
    stateElectionEnabled: { type: Boolean, default: false },
    status: { type: String, enum: ['preparation', 'active', 'completed'], default: 'active' },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date, default: null },
    description: { type: String, default: '' },
  },
  { collection: 'electionSettings', timestamps: true }
);

electionSettingsSchema.statics.current = async function current() {
  let settings = await this.findOne({});
  if (!settings) settings = await this.create({});
  return settings;
};

module.exports = mongoose.model('ElectionSettings', electionSettingsSchema);
