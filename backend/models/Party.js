/**
 * Party Model
 * Stores political party information for voting system
 */

const mongoose = require('mongoose');

const partySchema = new mongoose.Schema(
  {
    // Party name
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Party abbreviation
    abbreviation: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },

    // Party symbol (emoji or unicode)
    symbol: {
      type: String,
      default: '✓',
    },

    // Party logo/image URL
    image: {
      type: String,
      default: '',
    },

    // Ideology/Political description
    ideology: {
      type: String,
      default: '',
    },

    // Party type: national, state, or regional
    partyType: {
      type: String,
      enum: ['national', 'state', 'regional'],
      default: 'national',
    },

    // States where party is active (for state parties)
    activeStates: {
      type: [String],
      default: [],
    },

    // Vote count in current election
    voteCount: {
      type: Number,
      default: 0,
    },

    // Is party active/participating in voting
    isActive: {
      type: Boolean,
      default: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: 'parties' }
);

module.exports = mongoose.model('Party', partySchema);
