/**
 * Hashing helpers shared by the auth and voting flows.
 */

const crypto = require('crypto');
const config = require('../config');

/** SHA-256(Aadhaar + Voter ID) — the voter's permanent, non-reversible id. */
function voterIdHash(aadhaar, voterNumber) {
  return crypto.createHash('sha256').update(aadhaar + voterNumber.toUpperCase()).digest('hex');
}

/**
 * Anonymous on-chain voter key. HMAC with a server-side secret so the chain
 * cannot be correlated with voter hashes, while still letting the contract
 * enforce one vote per voter.
 */
function voterKey(idHash) {
  return '0x' + crypto.createHmac('sha256', config.voterKeySecret).update(idHash).digest('hex');
}

function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashOtp(otp) {
  return crypto.createHmac('sha256', config.jwtSecret).update(String(otp)).digest('hex');
}

function otpMatches(otp, expectedHash) {
  if (!expectedHash) return false;
  const a = Buffer.from(hashOtp(otp), 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function maskPhone(phone) {
  return phone ? `******${String(phone).slice(-4)}` : '';
}

module.exports = { voterIdHash, voterKey, generateOtp, hashOtp, otpMatches, maskPhone };
