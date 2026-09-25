const express = require('express');
const admin = require('../controllers/adminController');
const explorer = require('../controllers/explorerController');
const { requireAdmin, requireAdminStream } = require('../middleware/auth');

const router = express.Router();

// The live block stream authenticates via ?token= (EventSource has no headers).
router.get('/chain/stream', requireAdminStream, explorer.stream);

router.use(requireAdmin);

router.get('/stats', admin.getStats);
router.get('/results', admin.getResults);
router.get('/voters', admin.listVoters);

router.get('/election', admin.getElection);
router.put('/election', admin.updateElection);

router.get('/parties', admin.listParties);
router.post('/parties', admin.createParty);
router.patch('/parties/:id', admin.updateParty);

router.get('/audit', admin.getAudit);
router.post('/audit', admin.runAudit);

// Blockchain explorer
router.post('/chain/sync', admin.syncChain);
router.get('/chain/overview', explorer.overview);
router.get('/chain/blocks', explorer.blocks);
router.get('/chain/blocks/:id', explorer.block);
router.get('/chain/tx/:hash', explorer.transaction);
router.get('/chain/events', explorer.events);
router.get('/chain/integrity', explorer.integrity);

module.exports = router;
