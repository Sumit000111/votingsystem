/**
 * Clear every vote from MongoDB and reset voter flags.
 *
 * Use this after restarting the Hardhat node: a fresh chain has no votes, so
 * the database mirror has to be emptied to match (otherwise the audit flags
 * every old record as "transaction not on chain").
 *
 *   npm run reset-votes
 */

const mongoose = require('mongoose');
const config = require('../config');
const User = require('../models/User');
const Vote = require('../models/Vote');
const AuditRun = require('../models/AuditRun');

async function main() {
  await mongoose.connect(config.mongoUri);
  const votes = await Vote.deleteMany({});
  const users = await User.updateMany({}, { $set: { hasVoted: false, votedFor: null, voteLockUntil: null } });
  const audits = await AuditRun.deleteMany({});
  console.log(`Removed ${votes.deletedCount} votes and ${audits.deletedCount} audit runs; reset ${users.modifiedCount} voters.`);
  await mongoose.connection.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
