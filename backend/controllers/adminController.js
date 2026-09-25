/**
 * Admin dashboard: statistics, results, election control, party management
 * and the database ↔ blockchain audit.
 */

const User = require('../models/User');
const Vote = require('../models/Vote');
const Party = require('../models/Party');
const ElectionSettings = require('../models/ElectionSettings');
const HttpError = require('../utils/httpError');
const chain = require('../services/chain');
const audit = require('../services/audit');
const { maskPhone } = require('../utils/crypto');
const { INDIAN_STATES } = require('../utils/states');
const { formatParty } = require('./electionController');

function timelineUnit(first, last) {
  if (!first || !last) return 'hour';
  const span = last.getTime() - first.getTime();
  if (span <= 3 * 60 * 60 * 1000) return 'minute';
  if (span <= 4 * 24 * 60 * 60 * 1000) return 'hour';
  return 'day';
}

/** GET /api/admin/stats */
async function getStats(req, res) {
  const [registered, voted, dbVotes, flagged, byState, recent, settings, status, first, last] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ hasVoted: true }),
    Vote.countDocuments({}),
    Vote.countDocuments({ isDisqualified: true }),
    User.aggregate([
      { $match: { state: { $ne: null } } },
      { $group: { _id: '$state', registered: { $sum: 1 }, voted: { $sum: { $cond: ['$hasVoted', 1, 0] } } } },
      { $sort: { registered: -1, _id: 1 } },
    ]),
    Vote.find({})
      .sort({ votedAt: -1 })
      .limit(8)
      .select('candidateSelected partyAbbreviation state electionType txHash blockNumber votedAt isDisqualified')
      .lean(),
    ElectionSettings.current(),
    chain.getStatus(),
    Vote.findOne({}).sort({ votedAt: 1 }).select('votedAt').lean(),
    Vote.findOne({}).sort({ votedAt: -1 }).select('votedAt').lean(),
  ]);

  const unit = timelineUnit(first?.votedAt, last?.votedAt);
  const timeline = await Vote.aggregate([
    { $group: { _id: { $dateTrunc: { date: '$votedAt', unit } }, votes: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    success: true,
    voters: { registered, voted, turnout: registered ? voted / registered : 0 },
    votes: { database: dbVotes, chain: status.contract?.totalVotes ?? null, flagged },
    byState: byState.map((s) => ({ state: s._id, registered: s.registered, voted: s.voted })),
    timeline: { unit, points: timeline.map((t) => ({ t: t._id, votes: t.votes })) },
    recentVotes: recent,
    election: settings,
    chain: status,
  });
}

/** GET /api/admin/results — tallies straight from the contract, with DB comparison. */
async function getResults(req, res) {
  const [onChain, parties, dbCounts, status] = await Promise.all([
    chain.getOnChainCandidates(),
    Party.find({}).lean(),
    Vote.aggregate([{ $match: { isDisqualified: { $ne: true } } }, { $group: { _id: '$candidateSelected', votes: { $sum: 1 } } }]),
    chain.getStatus(),
  ]);

  const byChainId = new Map(parties.map((p) => [p.chainId, p]));
  const dbByName = new Map(dbCounts.map((d) => [d._id, d.votes]));
  const totalChain = onChain.reduce((sum, c) => sum + c.voteCount, 0);

  const results = onChain
    .map((c) => {
      const party = byChainId.get(c.id);
      return {
        chainId: c.id,
        ...(party ? formatParty(party) : { name: c.name, abbreviation: c.party, color: '#94a3b8' }),
        activeOnChain: c.active,
        chainVotes: c.voteCount,
        dbVotes: dbByName.get(c.name) || 0,
        share: totalChain ? c.voteCount / totalChain : 0,
      };
    })
    .sort((a, b) => b.chainVotes - a.chainVotes || a.name.localeCompare(b.name));

  res.json({
    success: true,
    totalVotes: totalChain,
    totalDbVotes: [...dbByName.values()].reduce((a, b) => a + b, 0),
    phase: status.contract?.phase || null,
    contractAddress: status.contract?.address || null,
    results,
  });
}

/** GET /api/admin/election */
async function getElection(req, res) {
  const [settings, status] = await Promise.all([ElectionSettings.current(), chain.getStatus()]);
  res.json({ success: true, settings, chain: status });
}

/** PUT /api/admin/election */
async function updateElection(req, res) {
  const settings = await ElectionSettings.current();
  const { name, description, status, nationalElectionEnabled, stateElectionEnabled } = req.body;

  let receipt = null;
  if (status !== undefined && status !== settings.status) {
    if (!['preparation', 'active', 'completed'].includes(status)) throw new HttpError(400, 'Invalid status.');
    // Chain first: if the phase change is rejected on-chain, nothing changes.
    receipt = await chain.setPhaseForStatus(status);
    settings.status = status;
    if (status === 'active' && !settings.startTime) settings.startTime = new Date();
    if (status === 'completed') settings.endTime = new Date();
  }
  if (typeof name === 'string' && name.trim()) settings.name = name.trim();
  if (typeof description === 'string') settings.description = description.trim();
  if (typeof nationalElectionEnabled === 'boolean') settings.nationalElectionEnabled = nationalElectionEnabled;
  if (typeof stateElectionEnabled === 'boolean') settings.stateElectionEnabled = stateElectionEnabled;
  if (!settings.nationalElectionEnabled && !settings.stateElectionEnabled) {
    throw new HttpError(400, 'At least one of the national or state elections must be enabled.');
  }

  await settings.save();
  res.json({ success: true, settings, receipt });
}

/** GET /api/admin/parties */
async function listParties(req, res) {
  const [parties, onChain] = await Promise.all([
    Party.find({}).sort({ partyType: 1, name: 1 }).lean(),
    chain.getOnChainCandidates().catch(() => null),
  ]);
  const chainById = new Map((onChain || []).map((c) => [c.id, c]));
  res.json({
    success: true,
    chainAvailable: onChain !== null,
    parties: parties.map((p) => {
      const c = chainById.get(p.chainId);
      return {
        ...formatParty(p),
        isActive: p.isActive,
        activeStates: p.activeStates,
        chainId: p.chainId,
        onChain: c ? { registered: true, active: c.active, votes: c.voteCount } : { registered: false },
      };
    }),
  });
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function applyPartyFields(party, body) {
  const { symbol, image, color, ideology, activeStates } = body;
  if (typeof symbol === 'string') party.symbol = symbol.trim().slice(0, 8) || '✓';
  if (typeof image === 'string') party.image = image.trim();
  if (typeof color === 'string') {
    if (!HEX_COLOR.test(color)) throw new HttpError(400, 'Colour must be a hex value like #FF9933.');
    party.color = color;
  }
  if (typeof ideology === 'string') party.ideology = ideology.trim();
  if (Array.isArray(activeStates)) {
    const invalid = activeStates.filter((s) => !INDIAN_STATES.includes(s));
    if (invalid.length) throw new HttpError(400, `Unknown state(s): ${invalid.join(', ')}`);
    party.activeStates = activeStates;
  }
}

/** POST /api/admin/parties — create a party and register it on-chain. */
async function createParty(req, res) {
  const name = String(req.body.name || '').trim();
  const abbreviation = String(req.body.abbreviation || '').trim().toUpperCase();
  const partyType = req.body.partyType || 'national';
  if (name.length < 3) throw new HttpError(400, 'Party name must be at least 3 characters.');
  if (!/^[A-Z0-9()\-.]{2,12}$/.test(abbreviation)) throw new HttpError(400, 'Abbreviation must be 2–12 characters.');
  if (!['national', 'state', 'regional'].includes(partyType)) throw new HttpError(400, 'Invalid party type.');

  const exists = await Party.findOne({ $or: [{ name }, { abbreviation }] });
  if (exists) throw new HttpError(409, 'A party with that name or abbreviation already exists.');

  const party = new Party({ name, abbreviation, partyType, isActive: true });
  applyPartyFields(party, req.body);
  await party.validate();

  // Register on-chain first so the database never lists an unvotable party.
  const receipt = await chain.syncCandidate(party);
  await party.save();
  res.status(201).json({ success: true, party: formatParty(party), receipt });
}

/** PATCH /api/admin/parties/:id */
async function updateParty(req, res) {
  const party = await Party.findById(req.params.id).catch(() => null);
  if (!party) throw new HttpError(404, 'Party not found.');
  if (req.body.name !== undefined && req.body.name !== party.name) {
    throw new HttpError(400, 'Party names are fixed once registered on the blockchain.');
  }

  applyPartyFields(party, req.body);
  let receipt = null;
  if (typeof req.body.isActive === 'boolean' && req.body.isActive !== party.isActive) {
    party.isActive = req.body.isActive;
    receipt = await chain.syncCandidate(party);
  }
  await party.save();
  res.json({ success: true, party: { ...formatParty(party), isActive: party.isActive, activeStates: party.activeStates }, receipt });
}

/** POST /api/admin/chain/sync */
async function syncChain(req, res) {
  const result = await chain.syncWithDatabase();
  res.json({ success: true, ...result });
}

/** POST /api/admin/audit */
async function runAudit(req, res) {
  const run = await audit.runAudit();
  res.json({ success: true, audit: run });
}

/** GET /api/admin/audit */
async function getAudit(req, res) {
  const [latest, history] = await Promise.all([audit.latestAudit(), audit.auditHistory(10)]);
  res.json({ success: true, audit: latest, history });
}

/** GET /api/admin/voters?page=1&search=&state= */
async function listVoters(req, res) {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const pageSize = 25;
  const filter = {};
  if (req.query.state) filter.state = String(req.query.state);
  if (req.query.voted === 'true') filter.hasVoted = true;
  if (req.query.voted === 'false') filter.hasVoted = false;

  const [total, voters] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .select('username maskedAadhaar phoneNumber state hasVoted createdAt lastLoginAt')
      .lean(),
  ]);

  res.json({
    success: true,
    page,
    pageSize,
    total,
    voters: voters.map((v) => ({
      id: v._id,
      username: v.username,
      maskedAadhaar: v.maskedAadhaar,
      maskedPhone: maskPhone(v.phoneNumber),
      state: v.state,
      hasVoted: v.hasVoted,
      createdAt: v.createdAt,
      lastLoginAt: v.lastLoginAt,
    })),
  });
}

module.exports = {
  getStats,
  getResults,
  getElection,
  updateElection,
  listParties,
  createParty,
  updateParty,
  syncChain,
  runAudit,
  getAudit,
  listVoters,
};
