/**
 * Authentication Controller
 * Handles user registration, login, and OTP verification
 */

const crypto = require('crypto');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Regex patterns for validation
const AADHAAR_REGEX = /^[0-9]{12}$/; // Exactly 12 digits
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/; // Standard PAN format

/**
 * Generate SHA-256 hash from Aadhaar and PAN
 * This creates a unique voter ID without storing raw Aadhaar/PAN
 */
const generateVoterIdHash = (aadhaar, pan) => {
  const combinedData = aadhaar + pan;
  return crypto.createHash('sha256').update(combinedData).digest('hex');
};

/**
 * Generate a 6-digit OTP
 * For demo purposes, returns fixed OTP: 111111
 */
const generateOTP = () => {
  return '111111'; // Demo OTP
};

/**
 * Register a new user
 * POST /register
 */
const register = async (req, res) => {
  try {
    const { aadhaar, pan, username, password, confirmPassword } = req.body;

    // Validate required fields
    if (!aadhaar || !pan || !username || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required.',
      });
    }

    // Validate Aadhaar format (12 digits)
    if (!AADHAAR_REGEX.test(aadhaar)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Aadhaar number. Must be exactly 12 digits.',
      });
    }

    // Validate PAN format
    if (!PAN_REGEX.test(pan.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid PAN format. Example: ABCDE1234F (5 letters, 4 digits, 1 letter)',
      });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.',
      });
    }

    // Check password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    // Generate hashed voter ID from Aadhaar + PAN
    const voterIdHash = generateVoterIdHash(aadhaar, pan);

    // Check if voter already exists
    let existingUser = await User.findOne({ voterIdHash });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Voter already registered with these credentials.',
      });
    }

    // Check if username already exists
    existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username already taken. Please choose another.',
      });
    }

    // Hash the password using bcrypt
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);

    // Create new user
    const newUser = new User({
      voterIdHash,
      username,
      password: hashedPassword,
    });

    // Save user to database
    await newUser.save();

    // Generate JWT token (without OTP verification initially)
    const token = jwt.sign(
      {
        userId: newUser._id,
        voterIdHash: newUser.voterIdHash,
        isOtpVerified: false,
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Generate OTP and save it
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // OTP valid for 5 minutes

    newUser.otp = otp;
    newUser.otpExpiry = otpExpiry;
    await newUser.save();

    // In production, send OTP via SMS or email
    // For demo purposes, we'll just log it
    console.log(`OTP for user ${username}: ${otp}`);

    return res.status(201).json({
      success: true,
      message:
        'User registered successfully. OTP has been sent. Please verify.',
      token,
      userId: newUser._id,
      username: newUser.username,
      // In production, never send OTP in response; send via SMS/email instead
      // This is only for demo purposes
      otp: otp,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error during registration.',
      error: error.message,
    });
  }
};

/**
 * Login with Aadhaar and PAN
 * POST /login
 * Auto-creates user on first login, saves state, no OTP here
 */
const login = async (req, res) => {
  try {
    const { aadhaar, pan, state } = req.body;

    // Validate required fields
    if (!aadhaar || !pan || !state) {
      return res.status(400).json({
        success: false,
        message: 'Aadhaar, PAN, and State are required.',
      });
    }

    // Validate Aadhaar format
    if (!AADHAAR_REGEX.test(aadhaar)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Aadhaar number. Must be exactly 12 digits.',
      });
    }

    // Validate PAN format
    if (!PAN_REGEX.test(pan.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid PAN format. Example: ABCDE1234F',
      });
    }

    // Generate voter ID hash
    const voterIdHash = generateVoterIdHash(aadhaar, pan);

    // Find user by voter ID hash
    let user = await User.findOne({ voterIdHash });

    // If user doesn't exist, create new user
    if (!user) {
      user = new User({
        voterIdHash,
        username: `voter_${voterIdHash.substring(0, 8)}`, // Auto-generated username
        password: '', // No password needed
        state, // Save selected state
      });
      await user.save();
    } else {
      // Update state if user already exists
      user.state = state;
      await user.save();
    }

    // Check if already voted
    if (user.hasVoted) {
      return res.status(403).json({
        success: false,
        message: 'You have already voted. One vote per user is allowed.',
      });
    }

    // Generate JWT token - OTP will be asked during vote casting
    const token = jwt.sign(
      {
        userId: user._id,
        voterIdHash: user.voterIdHash,
        isOtpVerified: false,
        state: user.state,
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log(`User logged in: ${user.username} from ${state}`);

    return res.status(200).json({
      success: true,
      message: 'Login successful. Select your election type.',
      token,
      userId: user._id,
      username: user.username,
      state: user.state,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error during login.',
      error: error.message,
    });
  }
};

/**
 * Verify OTP
 * POST /verify-otp
 */
const verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        message: 'User ID and OTP are required.',
      });
    }

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Check if OTP matches
    if (user.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP.',
      });
    }

    // Check if OTP has expired
    if (new Date() > user.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
      });
    }

    // Mark OTP as verified
    user.isOtpVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    // Generate new JWT token with OTP verified flag
    const token = jwt.sign(
      {
        userId: user._id,
        voterIdHash: user.voterIdHash,
        isOtpVerified: true,
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully. You can now vote.',
      token,
      userId: user._id,
      username: user.username,
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error during OTP verification.',
      error: error.message,
    });
  }
};

/**
 * Resend OTP
 * POST /resend-otp
 */
const resendOTP = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required.',
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    console.log(`New OTP for user ${user.username}: ${otp}`);

    return res.status(200).json({
      success: true,
      message: 'New OTP sent successfully.',
      otp: otp, // For demo only
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error during OTP resend.',
      error: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  verifyOTP,
  resendOTP,
};
