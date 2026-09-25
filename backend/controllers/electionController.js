/**
 * Public election information: settings, the voter's ballot and declared results.
 */

const ElectionSettings = require('../models/ElectionSettings');
const Party = require('../models/Party');
const User = require('../models/User');
const HttpError = require('../utils/httpError');
const chain = require('../services/chain');

function publicSettings(settings) {
  return {
    name: settings.name,
    status: settings.status,
    nationalElectionEnabled: settings.nationalElectionEnabled,
    stateElectionEnabled: settings.stateElectionEnabled,
    description: settings.description,
  };
}

function formatParty(party) {
  return {
    id: party._id,
    name: party.name,
    abbreviation: party.abbreviation,
    symbol: party.symbol,
    image: party.image,
    color: party.color,
    ideology: party.ideology,
    partyType: party.partyType,
  };
}

/** Parties on the ballot for an election type, for a voter's state. */
function ballotQuery(type, state) {
  if (type === 'national') return { isActive: true, partyType: 'national' };
  if (type === 'state') return { isActive: true, activeStates: state };
  throw new HttpError(400, 'Election type must be "national" or "state".');
}

/** GET /api/elections/settings */
async function getElectionSettings(req, res) {
  const settings = await ElectionSettings.current();
  res.json({ success: true, settings: publicSettings(settings) });
}

/** GET /api/elections/candidates?type=national|state (voter) */
async function getCandidates(req, res) {
  const type = req.query.type || 'national';
  const user = await User.findById(req.userId).select('state');
  if (!user) throw new HttpError(404, 'Voter not found.');

  const settings = await ElectionSettings.current();
  const enabled = type === 'national' ? settings.nationalElectionEnabled : settings.stateElectionEnabled;
  if (!enabled) throw new HttpError(400, `The ${type} election is not open.`);

  const parties = await Party.find(ballotQuery(type, user.state)).sort({ partyType: 1, name: 1 }).lean();
  res.json({ success: true, type, state: user.state, candidates: parties.map(formatParty) });
}

/** GET /api/elections/results — public once the election is completed. */
async function getPublicResults(req, res) {
  const settings = await ElectionSettings.current();
  if (settings.status !== 'completed') {
    throw new HttpError(403, 'Results will be published once the election is closed.');
  }
  const [onChain, parties] = await Promise.all([chain.getOnChainCandidates(), Party.find({}).lean()]);
  const byChainId = new Map(parties.map((p) => [p.chainId, p]));
  const total = onChain.reduce((sum, c) => sum + c.voteCount, 0);

  const results = onChain
    .map((c) => {
      const party = byChainId.get(c.id);
      return {
        ...(party ? formatParty(party) : { name: c.name, abbreviation: c.party }),
        votes: c.voteCount,
        share: total ? c.voteCount / total : 0,
      };
    })
    .sort((a, b) => b.votes - a.votes);

  const status = await chain.getStatus();
  res.json({
    success: true,
    election: publicSettings(settings),
    totalVotes: total,
    results,
    contractAddress: status.contract?.address || null,
    source: 'blockchain',
  });
}

/** GET /api/elections/stats — public live counters for the landing page. */
async function getPublicStats(req, res) {
  const [settings, parties, voters] = await Promise.all([
    ElectionSettings.current(),
    Party.find({ isActive: true }).select('name abbreviation symbol image color partyType').lean(),
    User.estimatedDocumentCount(),
  ]);
  const status = await chain.getStatus();
  res.json({
    success: true,
    election: publicSettings(settings),
    ballots: status.contract?.totalVotes ?? null,
    blockNumber: status.blockNumber ?? null,
    chainOnline: Boolean(status.connected && status.contract?.deployed),
    registeredVoters: voters,
    parties: parties.map(formatParty),
  });
}

module.exports = { getPublicStats, getElectionSettings, getCandidates, getPublicResults, ballotQuery, formatParty, publicSettings };
