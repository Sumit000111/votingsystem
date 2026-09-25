const express = require('express');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const auth = require('../controllers/authController');
const { requireVoter } = require('../middleware/auth');

const router = express.Router();

const otpLimiter = rateLimit({
  windowMs: config.rateLimit.authWindowMs,
  limit: config.rateLimit.authMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again later.' },
});

// Voters: Aadhaar + Voter ID + mobile → OTP → token
router.post('/authenticate', otpLimiter, auth.authenticate);
router.post('/verify-otp', otpLimiter, auth.verifyOTP);
router.post('/resend-otp', otpLimiter, auth.resendOTP);
router.get('/me', requireVoter, auth.me);

// Admins: whitelisted mobile → OTP → token
router.post('/admin-login', otpLimiter, auth.adminLogin);
router.post('/admin-verify-otp', otpLimiter, auth.adminVerifyOTP);

module.exports = router;
