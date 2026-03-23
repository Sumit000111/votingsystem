/**
 * Voting System - Main Server
 * Blockchain-Based Secure Voting System
 * Built with Express.js and MongoDB
 */

require('dotenv').config(); // Load environment variables

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Import routes
const authRoutes = require('./routes/authRoutes');
const votingRoutes = require('./routes/votingRoutes');
const electionRoutes = require('./routes/electionRoutes');

// Initialize Express app
const app = express();

// =========================
// Middleware Configuration
// =========================

// Enable CORS for frontend communication
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// =========================
// Request Logging Middleware
// =========================
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// =========================
// Database Connection
// =========================

const connectDB = async () => {
  try {
    const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/voting-system';
    
    await mongoose.connect(mongodbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✓ Connected to MongoDB successfully');
  } catch (error) {
    console.error('⚠ MongoDB connection warning:', error.message);
    console.log('⚠ Running in DEMO MODE - Database features unavailable');
    console.log('   To enable database, set MONGODB_URI in .env or install MongoDB locally');
  }
};

// Connect to database
connectDB();

// =========================
// API Routes
// =========================

/**
 * Auth routes: /register, /login, /verify-otp, /resend-otp
 */
app.use('/api/auth', authRoutes);

/**
 * Election routes: /elections/settings, /elections/candidates
 */
app.use('/api/elections', electionRoutes);

/**
 * Voting routes: /candidates, /vote, /results, /voting-status, /blockchain-info
 */
app.use('/api/voting', votingRoutes);

// =========================
// Frontend Routes (Serve HTML Pages)
// =========================

/**
 * Serve login/registration page
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

/**
 * Serve OTP verification page
 */
app.get('/otp.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/otp.html'));
});

/**
 * Serve voting dashboard page
 */
app.get('/voting.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/voting.html'));
});

/**
 * Serve results page
 */
app.get('/results.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/results.html'));
});

// =========================
// Error Handling
// =========================

/**
 * 404 Not Found handler
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found.',
    path: req.path,
  });
});

/**
 * Global error handler
 */
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error.',
  });
});

// =========================
// Start Server
// =========================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
========================================
  Voting System Server Started
========================================
  URL: http://localhost:${PORT}
  Environment: ${process.env.NODE_ENV || 'development'}
  MongoDB: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/voting-system'}
========================================
  `);
});

// =========================
// Graceful Shutdown
// =========================

process.on('SIGINT', () => {
  console.log('\n\n✓ Server shutting down...');
  mongoose.connection.close();
  process.exit(0);
});

module.exports = app;
