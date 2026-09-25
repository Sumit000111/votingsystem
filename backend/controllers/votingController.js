/**
 * Casting and verifying ballots. The blockchain is written first: a vote only
 * counts once its transaction is mined, and the database mirror is written
 * with the resulting transaction hash and block.
 */

const { ethers } = require('ethers');
const User = require('../models/User');
const Vote = require('../models/Vote');
const Party = require('../models/Party');
const ElectionSettings = require('../models/ElectionSettings');
const HttpError = require('../utils/httpError');
const chain = require('../services/chain');
const { voterKey } = require('../utils/crypto');
const { ballotQuery, formatParty, publicSettings } = require('./electionController');

const VOTE_LOCK_MS = 2 * 60 * 1000;

function receiptFor(vote) {
  if (!vote) return null;
  return {
    txHash: vote.txHash,
    blockNumber: vote.blockNumber,
    blockHash: vote.blockHash,
    votedAt: vote.votedAt,
    electionType: vote.electionType,
  };
}

/** GET /api/voting/status */
async function getVotingStatus(req, res) {
  const user = await User.findById(req.userId);
  if (!user) throw new HttpError(404, 'Voter not found.');

  const [settings, vote] = await Promise.all([
    ElectionSettings.current(),
    user.hasVoted ? Vote.findOne({ voterIdHash: user.voterIdHash }).lean() : null,
  ]);

  const party = vote?.party ? await Party.findById(vote.party).lean() : null;

  res.json({
    success: true,
    hasVoted: user.hasVoted,
    votedFor: user.votedFor,
    candidate: party ? formatParty(party) : null,
    receipt: receiptFor(vote),
    election: publicSettings(settings),
    user: { username: user.username, state: user.state, maskedAadhaar: user.maskedAadhaar },
  });
}

/** POST /api/voting/vote { partyId, electionType } */
async function castVote(req, res) {
  const { partyId, electionType = 'national' } = req.body;
  if (!partyId) throw new HttpError(400, 'Please choose a candidate.');
  if (!['national', 'state'].includes(electionType)) throw new HttpError(400, 'Invalid election type.');

  const [user, settings] = await Promise.all([User.findById(req.userId), ElectionSettings.current()]);
  if (!user) throw new HttpError(404, 'Voter not found.');
  if (user.hasVoted) throw new HttpError(409, 'You have already voted. Each voter can vote only once.');
  if (settings.status !== 'active') {
    throw new HttpError(409, settings.status === 'completed' ? 'The election has closed.' : 'Voting has not started yet.');
  }
  const enabled = electionType === 'national' ? settings.nationalElectionEnabled : settings.stateElectionEnabled;
  if (!enabled) throw new HttpError(400, `The ${electionType} election is not open.`);

  const party = await Party.findOne({ _id: partyId, ...ballotQuery(electionType, user.state) }).catch(() => null);
  if (!party) throw new HttpError(400, 'This candidate is not on your ballot.');

  // Lock the voter so a double-click or a second tab cannot submit twice.
  const now = new Date();
  const locked = await User.findOneAndUpdate(
    { _id: user._id, hasVoted: false, $or: [{ voteLockUntil: null }, { voteLockUntil: { $lt: now } }] },
    { $set: { voteLockUntil: new Date(now.getTime() + VOTE_LOCK_MS) } },
    { new: true }
  );
  if (!locked) throw new HttpError(409, 'Your vote is already being processed.');

  const key = voterKey(user.voterIdHash);
  let receipt;
  try {
    // Make sure the candidate exists and is active on-chain before voting.
    await chain.syncCandidate(party);
    receipt = await chain.castVote(key, party.chainId);
  } catch (err) {
    await User.updateOne({ _id: user._id }, { $set: { voteLockUntil: null } });
    throw err;
  }

  // The ballot is final once mined; mark the voter before mirroring it.
  await User.updateOne(
    { _id: user._id },
    { $set: { hasVoted: true, votedFor: party.name, voteLockUntil: null } }
  );
  await Vote.create({
    userId: user._id,
    voterIdHash: user.voterIdHash,
    voterKey: key,
    candidateSelected: party.name,
    party: party._id,
    partyAbbreviation: party.abbreviation,
    electionType,
    state: user.state,
    txHash: receipt.txHash,
    blockNumber: receipt.blockNumber,
    blockHash: receipt.blockHash,
    gasUsed: receipt.gasUsed,
    votedAt: receipt.timestamp ? new Date(receipt.timestamp) : now,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || null,
  });

  res.status(201).json({
    success: true,
    message: 'Your vote has been recorded on the blockchain.',
    candidate: formatParty(party),
    receipt: { ...receipt, electionType },
  });
}

/**
 * GET /api/voting/receipt/:txHash — public proof of inclusion. Confirms the
 * transaction is a ballot mined into this chain without revealing the choice.
 */
async function verifyReceipt(req, res) {
  const { txHash } = req.params;
  if (!ethers.isHexString(txHash, 32)) throw new HttpError(400, 'That does not look like a transaction hash.');

  const c = await chain.requireDeployed();
  const provider = chain.getProvider();
  let receipt;
  let latest;
  try {
    [receipt, latest] = await Promise.all([provider.getTransactionReceipt(txHash), provider.getBlockNumber()]);
  } catch (err) {
    throw chain.toChainError(err);
  }
  if (!receipt) throw new HttpError(404, 'No transaction with this hash exists on the voting chain.');

  const iface = chain.getInterface();
  const voteTopic = iface.getEvent('VoteCast').topicHash;
  const voteLog = receipt.logs.find(
    (log) => log.address.toLowerCase() === c.address.toLowerCase() && log.topics[0] === voteTopic
  );
  if (!voteLog) throw new HttpError(404, 'This transaction is not a ballot for this election.');

  const parsed = iface.parseLog(voteLog);
  const block = await provider.getBlock(receipt.blockNumber);

  res.json({
    success: true,
    verified: receipt.status === 1,
    txHash,
    blockNumber: receipt.blockNumber,
    blockHash: receipt.blockHash,
    timestamp: block ? block.timestamp : null,
    confirmations: latest - receipt.blockNumber + 1,
    ballotNumber: Number(parsed.args.totalVotes),
    contractAddress: c.address,
  });
}

module.exports = { getVotingStatus, castVote, verifyReceipt };
