/**
 * Authentication Routes
 * Handles user registration, login, and OTP verification
 */

const express = require('express');
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /register
 * Register a new user with Aadhaar, PAN, username, and password
 */
router.post('/register', authController.register);

/**
 * POST /login
 * Login with Aadhaar, PAN, username, and password
 */
router.post('/login', authController.login);

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

module.exports = router;
