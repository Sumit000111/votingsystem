/**
 * Election Settings Model
 * Admin controls which elections (national/state) are active
 */

const mongoose = require('mongoose');

const electionSettingsSchema = new mongoose.Schema(
  {
    // Election name/description
    name: {
      type: String,
      default: '2024 Election',
    },

    // National election enabled?
    nationalElectionEnabled: {
      type: Boolean,
      default: true,
    },

    // State election enabled?
    stateElectionEnabled: {
      type: Boolean,
      default: false,
    },

    // Election status: active, preparation, completed
    status: {
      type: String,
      enum: ['preparation', 'active', 'completed'],
      default: 'active',
    },

    // Start and end times
    startTime: {
      type: Date,
      default: Date.now,
    },

    endTime: {
      type: Date,
      default: null,
    },

    // Admin notes
    description: {
      type: String,
      default: '',
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: 'electionSettings' }
);

module.exports = mongoose.model('ElectionSettings', electionSettingsSchema);
