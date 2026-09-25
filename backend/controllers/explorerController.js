/**
 * Blockchain explorer endpoints for the admin dashboard.
 */

const explorer = require('../services/explorer');

async function overview(req, res) {
  res.json({ success: true, ...(await explorer.getOverview()) });
}

async function blocks(req, res) {
  res.json({ success: true, ...(await explorer.listBlocks({ before: req.query.before, limit: req.query.limit })) });
}

async function block(req, res) {
  res.json({ success: true, block: await explorer.getBlock(req.params.id) });
}

async function transaction(req, res) {
  res.json({ success: true, transaction: await explorer.getTransaction(req.params.hash) });
}

async function events(req, res) {
  res.json({ success: true, ...(await explorer.listEvents({ limit: req.query.limit, name: req.query.name })) });
}

async function integrity(req, res) {
  res.json({ success: true, integrity: await explorer.verifyIntegrity({ limit: req.query.limit }) });
}

/** GET /api/admin/chain/stream — Server-Sent Events, one message per new block. */
function stream(req, res) {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write('retry: 3000\n\n');
  res.write(`event: ready\ndata: ${JSON.stringify({ at: Date.now() })}\n\n`);

  const unsubscribe = explorer.subscribe(res);
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 15_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
}

module.exports = { overview, blocks, block, transaction, events, integrity, stream };
