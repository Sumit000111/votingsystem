/**
 * Authentication Routes
 * Handles unified passwordless authentication and OTP verification
 */

const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

/**
 * POST /authenticate
 * Unified login/register with Aadhaar, Voter Number, Mobile, and State. Returns OTP challenge.
 */
router.post('/authenticate', authController.authenticate);

/**
 * POST /verify-otp
 * Verify OTP sent to user
 */
router.post('/verify-otp', authController.verifyOTP);

/**
 * POST /resend-otp
 * Request a new OTP
 */
router.post('/resend-otp', authController.resendOTP);

/**
 * POST /admin-login
 * Request Admin OTP for phone 9467125975
 */
router.post('/admin-login', authController.adminLogin);

/**
 * POST /admin-verify-otp
 * Verify Admin OTP
 */
router.post('/admin-verify-otp', authController.adminVerifyOTP);

const { verifyToken } = require('../middleware/auth');

/**
 * POST /register-biometric
 * WebAuthn Passkeys: Bind mapped authentication hardware to native profile.
 */
router.post('/register-biometric', verifyToken, authController.registerBiometric);

/**
 * POST /verify-biometric-login
 * WebAuthn Passkeys: Authenticate mapped hardware exclusively
 */
router.post('/verify-biometric-login', authController.verifyBiometricLogin);

module.exports = router;
