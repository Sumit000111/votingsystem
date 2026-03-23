/**
 * Election Routes
 * Endpoints for election settings and candidate retrieval
 */

const express = require('express');
const electionController = require('../controllers/electionController');
const auth = require('../middleware/auth');

const router = express.Router();

// Get election settings (public - no auth needed)
router.get('/settings', electionController.getElectionSettings);

// Get candidates for election type (requires auth)
router.get('/candidates', auth.verifyToken, electionController.getCandidatesByElectionType);

module.exports = router;
