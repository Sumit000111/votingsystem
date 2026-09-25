const express = require('express');
const voting = require('../controllers/votingController');
const { requireVoter } = require('../middleware/auth');

const router = express.Router();

router.get('/status', requireVoter, voting.getVotingStatus);
router.post('/vote', requireVoter, voting.castVote);
router.get('/receipt/:txHash', voting.verifyReceipt);

module.exports = router;
