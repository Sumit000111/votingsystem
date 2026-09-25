/**
 * Express application (no listening / DB connection — see server.js), so it
 * can be exercised directly by the tests.
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

const config = require('./config');
const chain = require('./services/chain');
const authRoutes = require('./routes/authRoutes');
const electionRoutes = require('./routes/electionRoutes');
const votingRoutes = require('./routes/votingRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.set('trust proxy', 'loopback');
app.use(helmet({ contentSecurityPolicy: config.isProd ? undefined : false }));
app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',') }));
app.use(express.json({ limit: '100kb' }));

if (!config.isTest) {
  app.use('/api', (req, res, next) => {
    const started = Date.now();
    res.on('finish', () => {
      if (!req.originalUrl.startsWith('/api/admin/chain/stream')) {
        console.log(`${req.method} ${req.originalUrl.split('?')[0]} → ${res.statusCode} (${Date.now() - started}ms)`);
      }
    });
    next();
  });
}

app.get('/api/health', async (req, res) => {
  const status = await chain.getStatus();
  const db = mongoose.connection.readyState === 1;
  res.status(db && status.connected ? 200 : 503).json({
    success: db && status.connected,
    database: db ? 'connected' : 'disconnected',
    blockchain: status,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/voting', votingRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `No API route for ${req.method} ${req.originalUrl}` });
});

// Serve the built React app in production (npm run build).
if (fs.existsSync(path.join(config.frontendDist, 'index.html'))) {
  app.use(express.static(config.frontendDist, { index: false, maxAge: '1h' }));
  app.get('/{*splat}', (req, res) => res.sendFile(path.join(config.frontendDist, 'index.html')));
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Malformed JSON body.' });
  }
  if (err.code === 11000) {
    return res.status(409).json({ success: false, message: 'A record with these details already exists.' });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: err.message });
  }
  const status = err.status || 500;
  if (status >= 500) console.error('[error]', err);
  return res.status(status).json({
    success: false,
    message: status >= 500 && !err.status ? 'Internal server error.' : err.message,
    ...(err.code && typeof err.code === 'string' ? { code: err.code } : {}),
  });
});

module.exports = app;
