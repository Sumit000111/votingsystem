/**
 * Election Controller
 * Handles election settings and configuration
 */

const ElectionSettings = require('../models/ElectionSettings');
const Party = require('../models/Party');

/**
 * Get election settings
 * GET /elections/settings
 */
const getElectionSettings = async (req, res) => {
  try {
    let settings = await ElectionSettings.findOne({});

    // If no settings exist, create default
    if (!settings) {
      settings = new ElectionSettings({
        nationalElectionEnabled: true,
        stateElectionEnabled: false,
      });
      await settings.save();
    }

    return res.status(200).json({
      success: true,
      settings: {
        nationalElectionEnabled: settings.nationalElectionEnabled,
        stateElectionEnabled: settings.stateElectionEnabled,
        status: settings.status,
        name: settings.name,
      },
    });
  } catch (error) {
    console.error('Get election settings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching election settings.',
      error: error.message,
    });
  }
};

/**
 * Get candidates for election type
 * GET /elections/candidates?type=national or /elections/candidates?type=state
 * State parameter required for state elections
 */
const getCandidatesByElectionType = async (req, res) => {
  try {
    const { type } = req.query;
    const userState = req.query.state || null;
    console.log(`[DEBUG] getCandidatesByElectionType: type=${type}, state=${userState}`);

    let candidates;

    if (type === 'national') {
      // National parties only
      candidates = await Party.find({
        isActive: true,
        partyType: 'national',
      })
        .select('name abbreviation symbol image ideology')
        .lean();
    } else if (type === 'state') {
      // State parties for user's state
      if (!userState) {
        return res.status(400).json({
          success: false,
          message: 'State is required for state election.',
        });
      }

      candidates = await Party.find({
        isActive: true,
        activeStates: userState,
      })
        .select('name abbreviation symbol image ideology')
        .lean();
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid election type. Use "national" or "state".',
      });
    }

    if (candidates.length === 0) {
      return res.status(400).json({
        success: false,
        message: `No candidates available for ${type} election.`,
      });
    }

    const formatted = candidates.map((party) => ({
      id: party._id,
      name: party.name,
      party: party.abbreviation,
      symbol: party.symbol,
      image: party.image,
      ideology: party.ideology,
    }));

    return res.status(200).json({
      success: true,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} candidates retrieved.`,
      candidates: formatted,
    });
  } catch (error) {
    console.error('Get candidates error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching candidates.',
      error: error.message,
    });
  }
};

module.exports = {
  getElectionSettings,
  getCandidatesByElectionType,
};
