/**
 * National Voting System — API server.
 * Connects to MongoDB and the Ethereum node, reconciles the Voting contract
 * with the database, and serves the REST API (plus the built React app).
 */

const fs = require('fs');
const mongoose = require('mongoose');
const config = require('./config');
const app = require('./app');
const chain = require('./services/chain');

async function connectDatabase() {
  for (;;) {
    try {
      await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
      console.log(`✓ MongoDB connected (${mongoose.connection.name})`);
      return;
    } catch (err) {
      console.error(`✗ MongoDB connection failed: ${err.message} — retrying in 5s`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

async function syncChain(reason) {
  try {
    const { actions, note } = await chain.syncWithDatabase();
    if (actions.length) actions.forEach((a) => console.log(`✓ [chain] ${a}`));
    else console.log(`✓ [chain] Contract in sync with database${note ? ` (${note})` : ''}`);
  } catch (err) {
    console.warn(`⚠ [chain] Sync skipped (${reason}): ${err.message}`);
  }
}

async function main() {
  config.warnings.forEach((w) => console.warn(`⚠ ${w}`));

  const server = app.listen(config.port, () => {
    console.log(`✓ API listening on http://localhost:${config.port}`);
  });

  await connectDatabase();

  const status = await chain.getStatus();
  if (!status.connected) {
    console.warn(`⚠ [chain] ${status.error}`);
  } else if (!status.contract?.deployed) {
    console.warn(`⚠ [chain] ${status.contract?.reason}`);
  } else {
    console.log(`✓ [chain] Voting contract ${status.contract.address} on chain ${status.chainId} (phase: ${status.contract.phase})`);
    await syncChain('startup');
  }

  // A redeploy (npm run deploy) rewrites deployment.json — re-sync automatically.
  chain.onDeploymentChange((ctx) => {
    console.log(`↻ [chain] New deployment detected at ${ctx.address}`);
    syncChain('redeploy');
  });
  fs.watchFile(config.chain.deploymentFile, { interval: 2000 }, () => chain.getContext());

  const shutdown = async () => {
    console.log('\nShutting down…');
    server.close();
    await mongoose.connection.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
