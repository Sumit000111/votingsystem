/**
 * Database ↔ blockchain audit. Every MongoDB vote record must correspond to a
 * VoteCast event with the same transaction hash, candidate and voter key; any
 * vote on-chain must have a database record; and per-candidate tallies must
 * agree. Records that fail are flagged `isDisqualified`.
 */

const { ethers } = require('ethers');
const chain = require('./chain');
const { voterKey: deriveVoterKey } = require('../utils/crypto');
const Vote = require('../models/Vote');
const User = require('../models/User');
const AuditRun = require('../models/AuditRun');

const REASONS = {
  NO_TX_HASH: 'Vote exists only in the database — it was never written to the blockchain.',
  TX_NOT_ON_CHAIN: 'The recorded transaction hash does not exist on this chain.',
  CANDIDATE_MISMATCH: 'Database candidate differs from the candidate recorded on-chain.',
  VOTER_MISMATCH: 'Database voter differs from the voter key recorded on-chain.',
  USER_MISSING: 'Vote record belongs to a voter profile that no longer exists.',
  PROFILE_MISMATCH: "Voter profile does not agree with the vote record (hasVoted / votedFor).",
  MISSING_IN_DB: 'Vote exists on-chain but its database record is missing (deleted?).',
  ORPHAN_VOTER_FLAG: 'Voter is marked as having voted but has no vote record.',
};

async function runAudit() {
  const started = Date.now();
  const c = await chain.requireDeployed();
  const provider = chain.getProvider();
  const iface = chain.getInterface();

  const logs = await provider.getLogs({
    address: c.address,
    fromBlock: c.deployment.deployBlock || 0,
    toBlock: 'latest',
    topics: [iface.getEvent('VoteCast').topicHash],
  });

  const chainVotes = new Map();
  for (const log of logs) {
    const parsed = iface.parseLog(log);
    chainVotes.set(log.transactionHash.toLowerCase(), {
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
      voterKey: parsed.args.voterKey,
      candidateId: parsed.args.candidateId,
      candidateName: parsed.args.candidateName,
    });
  }

  const [votes, votedUsers, candidates] = await Promise.all([
    Vote.find({}),
    User.find({ hasVoted: true }).select('_id voterIdHash votedFor hasVoted').lean(),
    chain.getOnChainCandidates(),
  ]);
  const usersByHash = new Map(votedUsers.map((u) => [u.voterIdHash, u]));
  const missingUserHashes = votes.map((v) => v.voterIdHash).filter((h) => !usersByHash.has(h));
  if (missingUserHashes.length) {
    const others = await User.find({ voterIdHash: { $in: missingUserHashes } })
      .select('_id voterIdHash votedFor hasVoted')
      .lean();
    for (const u of others) usersByHash.set(u.voterIdHash, u);
  }

  const issues = [];
  const matchedTx = new Set();
  const dbTally = new Map();
  const now = new Date();
  const bulk = [];

  for (const vote of votes) {
    let code = null;
    const onChain = vote.txHash ? chainVotes.get(vote.txHash.toLowerCase()) : null;

    if (!vote.txHash) code = 'NO_TX_HASH';
    else if (!onChain) code = 'TX_NOT_ON_CHAIN';
    else {
      matchedTx.add(vote.txHash.toLowerCase());
      const expectedKey = vote.voterKey || deriveVoterKey(vote.voterIdHash);
      const user = usersByHash.get(vote.voterIdHash);
      if (ethers.id(vote.candidateSelected) !== onChain.candidateId) code = 'CANDIDATE_MISMATCH';
      else if (expectedKey !== onChain.voterKey) code = 'VOTER_MISMATCH';
      else if (!user) code = 'USER_MISSING';
      else if (!user.hasVoted || user.votedFor !== vote.candidateSelected) code = 'PROFILE_MISMATCH';
    }

    if (code) {
      issues.push({
        code,
        reason: REASONS[code],
        voteId: vote._id,
        txHash: vote.txHash || null,
        candidateInDb: vote.candidateSelected,
        candidateOnChain: onChain ? onChain.candidateName : null,
        blockNumber: onChain ? onChain.blockNumber : null,
      });
    } else {
      dbTally.set(vote.candidateSelected, (dbTally.get(vote.candidateSelected) || 0) + 1);
    }

    const flagged = Boolean(code);
    if (vote.isDisqualified !== flagged || vote.auditReason !== (code || null) || !vote.auditedAt) {
      bulk.push({
        updateOne: {
          filter: { _id: vote._id },
          update: { $set: { isDisqualified: flagged, auditReason: code, auditedAt: now } },
        },
      });
    }
  }
  if (bulk.length) await Vote.bulkWrite(bulk);

  for (const [key, onChain] of chainVotes) {
    if (!matchedTx.has(key)) {
      issues.push({
        code: 'MISSING_IN_DB',
        reason: REASONS.MISSING_IN_DB,
        txHash: onChain.txHash,
        candidateInDb: null,
        candidateOnChain: onChain.candidateName,
        blockNumber: onChain.blockNumber,
      });
    }
  }

  const votedHashes = new Set(votes.map((v) => v.voterIdHash));
  for (const user of votedUsers) {
    if (!votedHashes.has(user.voterIdHash)) {
      issues.push({
        code: 'ORPHAN_VOTER_FLAG',
        reason: REASONS.ORPHAN_VOTER_FLAG,
        userId: user._id,
        candidateInDb: user.votedFor,
        candidateOnChain: null,
      });
    }
  }

  const tallies = candidates
    .map((cand) => {
      const db = dbTally.get(cand.name) || 0;
      return { candidate: cand.name, party: cand.party, chain: cand.voteCount, db, delta: db - cand.voteCount };
    })
    .filter((t) => t.chain || t.db)
    .sort((a, b) => b.chain - a.chain);

  const flaggedVotes = issues.filter((i) => i.voteId).length;
  const summary = {
    dbVotes: votes.length,
    chainVotes: chainVotes.size,
    verifiedVotes: votes.length - flaggedVotes,
    flaggedVotes,
    missingInDb: issues.filter((i) => i.code === 'MISSING_IN_DB').length,
    orphanVoterFlags: issues.filter((i) => i.code === 'ORPHAN_VOTER_FLAG').length,
    talliesMatch: tallies.every((t) => t.delta === 0),
    clean: issues.length === 0,
  };

  const run = await AuditRun.create({
    summary,
    issues: issues.slice(0, 1000),
    tallies,
    durationMs: Date.now() - started,
  });
  return run.toObject();
}

async function latestAudit() {
  return AuditRun.findOne({}).sort({ createdAt: -1 }).lean();
}

async function auditHistory(limit = 10) {
  return AuditRun.find({}).sort({ createdAt: -1 }).limit(limit).select('summary durationMs createdAt').lean();
}

module.exports = { runAudit, latestAudit, auditHistory, REASONS };
