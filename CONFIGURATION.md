/**
 * Project Configuration Overview
 * 
 * This file provides guidance on all configuration aspects of the project
 */

// ========================================
// ENVIRONMENT VARIABLES (.env)
// ========================================

// MONGODB_URI - Connection string for MongoDB
// Development: mongodb://localhost:27017/voting-system
// Production: mongodb+srv://user:pass@cluster.mongodb.net/voting-system
// Default: mongodb://localhost:27017/voting-system

// JWT_SECRET - Secret key for signing JWT tokens
// Use a long, random string in production
// Can be generated with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
// Default: change_me_in_production

// PORT - Server port number
// Default: 5000
// Can change if port is already in use

// NODE_ENV - Application environment
// Options: development, production, test
// Default: development

// OTP_SECRET - Secret for OTP generation (optional)
// Default: otp_secret_key_12345

// OTP_EXPIRY - OTP expiration time in seconds
// Default: 300 (5 minutes)

// ========================================
// SECURITY SETTINGS
// ========================================

// 1. Password Hashing
//    - Bcrypt rounds: 10 (current)
//    - Change in authController.js line: genSalt(10)
//    - Higher = more secure but slower

// 2. JWT Configuration
//    - Expiry: 24 hours (current)
//    - Change in authController.js: expiresIn: '24h'
//    - Can adjust based on requirements

// 3. OTP Configuration
//    - Length: 6 digits
//    - Validity: 5 minutes (300 seconds)
//    - Resend cooldown: 30 seconds

// ========================================
// DATABASE CONFIGURATION
// ========================================

// Connection Pooling
// Mongoose automatically manages connection pooling
// Default pool size: 10 connections
// Adjust in server.js if needed

// User Schema
// Fields: voterIdHash, username, password, hasVoted, votedFor, otp, otpExpiry
// Indexes: voterIdHash, username

// Vote Schema
// Fields: userId, voterIdHash, candidateSelected, voted At, blockHash
// Stores blockchain reference for each vote

// ========================================
// BLOCKCHAIN CONFIGURATION
// ========================================

// Block Structure
// - index: Sequential block number
// - voterHash: SHA-256(Aadhaar + PAN)
// - candidateSelected: Candidate name
// - timestamp: Vote timestamp
// - previousHash: Link to previous block
// - currentHash: SHA-256 hash of current block

// Genesis Block
// - Created automatically on app startup
// - Index: 0, voterHash: 'genesis', etc.

// Chain Validation
// - Checks previousHash matches
// - Verifies block index sequence
// - Validates hash correctness

// ========================================
// FRONTEND CONFIGURATION
// ========================================

// API Base URL (in frontend/js/api.js)
// Change this if backend runs on different URL/port
// Current: http://localhost:5000/api

// Candidates List
// Currently hardcoded in votingController.js
// To add candidates, modify getCandidates() function

// Auto-refresh Interval
// Results refresh every 10 seconds
// Change interval value in voting.js or results.html

// ========================================
// PRODUCTION CHECKLIST
// ========================================

// SECURITY:
// ☐ Change JWT_SECRET to strong random string
// ☐ Enable HTTPS
// ☐ Set NODE_ENV=production
// ☐ Add rate limiting middleware
// ☐ Enable CORS with specific domains
// ☐ Add request validation
// ☐ Implement logging system
// ☐ Setup error monitoring (Sentry, etc.)

// DATABASE:
// ☐ Use MongoDB Atlas or managed service
// ☐ Enable encryption at rest
// ☐ Setup automated backups
// ☐ Use strong database passwords
// ☐ Enable audit logging

// BLOCKCHAIN:
// ☐ Persist blockchain to database
// ☐ Implement blockchain snapshots
// ☐ Add blockchain validation jobs

// DEPLOYMENT:
// ☐ Use process manager (PM2)
// ☐ Setup CI/CD pipeline
// ☐ Configure load balancer
// ☐ Setup monitoring and alerts
// ☐ Configure auto-scaling

// ========================================
// PERFORMANCE OPTIMIZATION
// ========================================

// 1. Database Indexes
//    - voterIdHash: Used for voter lookup
//    - username: Used for login
//    - blockHash: Used for blockchain verification

// 2. Blockchain Caching
//    - Consider caching chain validation results
//    - Implement blockchain snapshot system
//    - Persist to database for large datasets

// 3. API Response Caching
//    - Cache results page (updates every 10 seconds)
//    - Implement Redis for session caching

// 4. Frontend Optimization
//    - Minify CSS and JavaScript
//    - Enable gzip compression
//    - Implement lazy loading

// ========================================
// TESTING CONFIGURATION
// ========================================

// Demo Credentials
// Aadhaar: 123456789012
// PAN: ABCDE1234F
// Username: voter1
// Password: password123

// OTP Testing
// OTP is logged to console in development
// Format: OTP for user {username}: {otp}

// Browser Console
// Check console for API responses and errors
// Network tab to inspect API calls

// ========================================
// TROUBLESHOOTING
// ========================================

// Common Issues:
// 1. MongoDB connection fails
//    - Check MongoDB is running
//    - Verify MONGODB_URI in .env
//    - Check network connectivity for Atlas

// 2. Jest port already in use
//    - Change PORT in .env
//    - Kill process on port: netstat -ano (Windows)

// 3. CORS errors
//    - Verify frontend URL matches
//    - Check CORS is enabled in server.js

// 4. Token validation fails
//    - Check Authorization header format: "Bearer token"
//    - Verify token hasn't expired
//    - Check JWT_SECRET matches

// ========================================
// LOGGING & MONITORING
// ========================================

// Current Logging
// - Console logs for OTP (development)
// - Error logging in try-catch blocks
// - Request logging middleware

// Recommended Additions
// - Winston or Bunyan for structured logging
// - Morgan for HTTP request logging
// - Sentry for error tracking
// - DataDog or New Relic for APM

// ========================================
// API RATE LIMITING
// ========================================

// Recommended Setup:
// - express-rate-limit package
// - Limit: 100 requests per 15 minutes per IP
// - Different limits for auth endpoints (stricter)

// Example:
// const rateLimit = require("express-rate-limit");
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 100
// });
// app.use(limiter);

// ========================================
// DOCUMENTATION
// ========================================

// See Full Documentation:
// - README.md - Complete documentation
// - QUICK_START.md - Quick start guide
// - API Documentation in README.md

module.exports = {
  // This file is for reference only
};
