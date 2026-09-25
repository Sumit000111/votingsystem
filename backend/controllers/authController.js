/**
 * Passwordless authentication for voters (Aadhaar + Voter ID + mobile, then
 * SMS OTP) and administrators (whitelisted mobile, then SMS OTP).
 */

const config = require('../config');
const User = require('../models/User');
const Admin = require('../models/Admin');
const HttpError = require('../utils/httpError');
const { sendOtp } = require('../services/sms');
const { signVoterToken, signAdminToken } = require('../middleware/auth');
const { voterIdHash, generateOtp, hashOtp, otpMatches, maskPhone } = require('../utils/crypto');
const { INDIAN_STATES } = require('../utils/states');

const AADHAAR_REGEX = /^[0-9]{12}$/;
const MOBILE_REGEX = /^[6-9][0-9]{9}$/;
const VOTER_ID_REGEX = /^[A-Z0-9]{3,12}$/;

/** Issue a fresh OTP on an account document (voter or admin) and deliver it. */
async function issueOtp(account) {
  if (account.otpSentAt && Date.now() - account.otpSentAt.getTime() < config.otp.resendCooldownSeconds * 1000) {
    const wait = Math.ceil(config.otp.resendCooldownSeconds - (Date.now() - account.otpSentAt.getTime()) / 1000);
    throw new HttpError(429, `Please wait ${wait}s before requesting another OTP.`);
  }

  const otp = generateOtp();
  try {
    await sendOtp(account.phoneNumber, otp);
  } catch (err) {
    console.error('[auth] SMS delivery failed:', err.message);
    throw new HttpError(502, 'Could not send the OTP SMS. Please try again shortly.');
  }

  account.otpHash = hashOtp(otp);
  account.otpExpiry = new Date(Date.now() + config.otp.ttlMinutes * 60 * 1000);
  account.otpAttempts = 0;
  account.otpSentAt = new Date();
  await account.save();

  return config.otp.exposeInResponse ? { devOtp: otp } : {};
}

/** Check an OTP against an account document; throws on failure. */
async function consumeOtp(account, otp) {
  if (!account.otpHash || !account.otpExpiry) {
    throw new HttpError(400, 'No OTP pending. Please request a new one.');
  }
  if (account.otpExpiry < new Date()) {
    throw new HttpError(400, 'OTP has expired. Please request a new one.');
  }
  if (account.otpAttempts >= config.otp.maxAttempts) {
    throw new HttpError(429, 'Too many incorrect attempts. Please request a new OTP.');
  }
  if (!otpMatches(String(otp).trim(), account.otpHash)) {
    account.otpAttempts += 1;
    await account.save();
    const left = config.otp.maxAttempts - account.otpAttempts;
    throw new HttpError(400, left > 0 ? `Incorrect OTP. ${left} attempt(s) left.` : 'Too many incorrect attempts. Please request a new OTP.');
  }
  account.otpHash = null;
  account.otpExpiry = null;
  account.otpAttempts = 0;
  account.otpSentAt = null;
  account.lastLoginAt = new Date();
  await account.save();
}

// ---------------------------------------------------------------------------
// Voters
// ---------------------------------------------------------------------------

/** POST /api/auth/authenticate — register or sign in, then send an OTP. */
async function authenticate(req, res) {
  const aadhaar = String(req.body.aadhaar || '').replace(/\s+/g, '');
  const voterNumber = String(req.body.voterNumber || '').trim().toUpperCase();
  const phoneNumber = String(req.body.phoneNumber || '').trim();
  const state = String(req.body.state || '').trim();

  if (!AADHAAR_REGEX.test(aadhaar)) throw new HttpError(400, 'Aadhaar number must be exactly 12 digits.');
  if (!VOTER_ID_REGEX.test(voterNumber)) throw new HttpError(400, 'Voter ID must be 3–12 letters or digits.');
  if (!MOBILE_REGEX.test(phoneNumber)) throw new HttpError(400, 'Enter a valid 10-digit Indian mobile number.');
  if (!INDIAN_STATES.includes(state)) throw new HttpError(400, 'Please select a valid state.');

  const idHash = voterIdHash(aadhaar, voterNumber);
  let user = await User.findOne({ voterIdHash: idHash });
  const isNew = !user;

  if (!user) {
    user = new User({
      voterIdHash: idHash,
      username: `Voter ${idHash.slice(0, 8)}`,
      maskedAadhaar: `XXXX XXXX ${aadhaar.slice(-4)}`,
      phoneNumber,
      state,
    });
  } else if (user.phoneNumber !== phoneNumber) {
    // The mobile number is bound at registration so someone who knows a
    // voter's Aadhaar + Voter ID cannot redirect the OTP to their own phone.
    throw new HttpError(403, 'This mobile number does not match the one registered for this voter.');
  } else if (user.hasVoted && user.state !== state) {
    // The state decides the ballot; it cannot change after voting.
    throw new HttpError(400, `This voter is registered in ${user.state}.`);
  } else {
    user.state = state;
  }

  const dev = await issueOtp(user);

  res.status(isNew ? 201 : 200).json({
    success: true,
    message: `OTP sent to ${maskPhone(phoneNumber)}.`,
    userId: user._id,
    maskedPhone: maskPhone(phoneNumber),
    isNewVoter: isNew,
    ...dev,
  });
}

/** POST /api/auth/verify-otp */
async function verifyOTP(req, res) {
  const { userId, otp } = req.body;
  if (!userId || !otp) throw new HttpError(400, 'User ID and OTP are required.');

  const user = await User.findById(userId).catch(() => null);
  if (!user) throw new HttpError(404, 'Voter not found. Please start again.');

  await consumeOtp(user, otp);

  res.json({
    success: true,
    message: 'Verified. You may now vote.',
    token: signVoterToken(user),
    user: publicUser(user),
  });
}

/** POST /api/auth/resend-otp */
async function resendOTP(req, res) {
  const user = await User.findById(req.body.userId).catch(() => null);
  if (!user) throw new HttpError(404, 'Voter not found. Please start again.');
  const dev = await issueOtp(user);
  res.json({ success: true, message: `New OTP sent to ${maskPhone(user.phoneNumber)}.`, ...dev });
}

/** GET /api/auth/me */
async function me(req, res) {
  const user = await User.findById(req.userId);
  if (!user) throw new HttpError(404, 'Voter not found.');
  res.json({ success: true, user: publicUser(user) });
}

function publicUser(user) {
  return {
    id: user._id,
    username: user.username,
    maskedAadhaar: user.maskedAadhaar,
    maskedPhone: maskPhone(user.phoneNumber),
    state: user.state,
    hasVoted: user.hasVoted,
  };
}

// ---------------------------------------------------------------------------
// Admins
// ---------------------------------------------------------------------------

/** POST /api/auth/admin-login */
async function adminLogin(req, res) {
  const phoneNumber = String(req.body.phoneNumber || '').trim();
  if (!phoneNumber) throw new HttpError(400, 'Mobile number is required.');
  if (!config.adminPhones.includes(phoneNumber)) throw new HttpError(403, 'This number is not authorised for admin access.');

  let admin = await Admin.findOne({ phoneNumber });
  if (!admin) admin = new Admin({ phoneNumber });

  const dev = await issueOtp(admin);
  res.json({
    success: true,
    message: `Admin OTP sent to ${maskPhone(phoneNumber)}.`,
    adminId: admin._id,
    maskedPhone: maskPhone(phoneNumber),
    ...dev,
  });
}

/** POST /api/auth/admin-verify-otp */
async function adminVerifyOTP(req, res) {
  const { adminId, otp } = req.body;
  if (!adminId || !otp) throw new HttpError(400, 'Admin ID and OTP are required.');

  const admin = await Admin.findById(adminId).catch(() => null);
  if (!admin || !config.adminPhones.includes(admin.phoneNumber)) {
    throw new HttpError(403, 'This number is not authorised for admin access.');
  }

  await consumeOtp(admin, otp);
  res.json({
    success: true,
    message: 'Admin authentication successful.',
    token: signAdminToken(admin),
    admin: { id: admin._id, maskedPhone: maskPhone(admin.phoneNumber) },
  });
}

module.exports = { authenticate, verifyOTP, resendOTP, me, adminLogin, adminVerifyOTP };
