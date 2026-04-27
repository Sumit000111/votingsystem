/**
 * Authentication Middleware
 * Verifies JWT tokens and OTP verification status
 */

const jwt = require('jsonwebtoken');

/**
 * Middleware to verify JWT token
 * Checks if the request has a valid JWT token
 */
const verifyToken = (req, res, next) => {
  try {
    // Extract token from Authorization header
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Authorization required.',
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.voterIdHash = decoded.voterIdHash;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
      error: error.message,
    });
  }
};

/**
 * Middleware to verify OTP verification status
 * Ensures user has verified OTP before accessing voting
 */
const verifyOTP = (req, res, next) => {
  try {
    // Extract token from Authorization header
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided.',
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if OTP is verified in token
    if (!decoded.isOtpVerified) {
      return res.status(403).json({
        success: false,
        message: 'OTP not verified. Please verify OTP first.',
      });
    }

    req.userId = decoded.userId;
    req.voterIdHash = decoded.voterIdHash;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token.',
    });
  }
};

/**
 * Middleware to verify Admin JWT token
 */
const verifyAdmin = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided.' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.isAdminAccount || !decoded.isOtpVerified) {
      return res.status(403).json({ success: false, message: 'Admin access required.' });
    }
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid admin token.' });
  }
};

module.exports = {
  verifyToken,
  verifyOTP,
  verifyAdmin,
};
