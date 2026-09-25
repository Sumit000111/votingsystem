const express = require('express');
const election = require('../controllers/electionController');
const { requireVoter } = require('../middleware/auth');

const router = express.Router();

router.get('/settings', election.getElectionSettings);
router.get('/stats', election.getPublicStats);
router.get('/candidates', requireVoter, election.getCandidates);
router.get('/results', election.getPublicResults);

module.exports = router;
