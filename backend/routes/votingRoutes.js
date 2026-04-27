/**
 * Voting Routes
 * Handles candidate listing, voting, and result retrieval
 */

const express = require('express');
const votingController = require('../controllers/votingController');
const { verifyToken, verifyOTP, verifyAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /candidates
 * Get list of all candidates
 * Accessible to authenticated users
 */
router.get('/candidates', verifyToken, votingController.getCandidates);

/**
 * POST /request-otp-for-voting
 * Request OTP before casting vote
 * Generates OTP that user must verify
 * Requires JWT token
 */
router.post('/request-otp-for-voting', verifyToken, votingController.requestOTPForVoting);

/**
 * POST /vote
 * Cast a vote for a candidate
 * Requires OTP verification
 */
router.post('/vote', verifyOTP, votingController.castVote);

/**
 * GET /results
 * Get voting results
 * Accessible to Admins only
 */
router.get('/results', verifyAdmin, votingController.getResults);

/**
 * GET /voting-status
 * Check if current user has voted
 * Requires authentication
 */
router.get('/voting-status', verifyToken, votingController.getVotingStatus);

/**
 * GET /blockchain-info
 * Get blockchain information
 * For transparency and audit purposes
 */
router.get('/blockchain-info', votingController.getBlockchainInfo);
/**
 * GET /audit
 * Perform a Deep Blockchain-to-Database Audit to explicitly mark tampered votes
 * Accessible to Admins only
 */
router.get('/audit', verifyAdmin, votingController.runDeepAudit);

module.exports = router;
