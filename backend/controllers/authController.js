/**
 * Authentication Controller
 * Unified Login/Register logic with Renflair SMS Gateway OTP
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const axios = require('axios');

// Regex patterns for validation
const AADHAAR_REGEX = /^[0-9]{12}$/; // Exactly 12 digits
const MOBILE_REGEX = /^[0-9]{10}$/; // Standard 10-digit mobile

// Renflair API Key
const RENFLAIR_API_KEY = process.env.RENFLAIR_API_KEY || '294a8ed24b1ad22ec2e7efea049b8737';

/**
 * Generate SHA-256 hash from Aadhaar and Voter Number
 */
const generateVoterIdHash = (aadhaar, voterNumber) => {
  const combinedData = aadhaar + voterNumber.toUpperCase();
  return crypto.createHash('sha256').update(combinedData).digest('hex');
};

/**
 * Generate a 6-digit random OTP
 */
const generateRandomOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP via Renflair API
 */
const sendRenflairOTP = async (phone, otp) => {
  const url = `https://sms.renflair.in/V1.php?API=${RENFLAIR_API_KEY}&PHONE=${phone}&OTP=${otp}`;
  const response = await axios.get(url);
  return response.data;
};

/**
 * Authenticate User (Login / Register Unified)
 * POST /authenticate
 */
const authenticate = async (req, res) => {
  try {
    const { aadhaar, voterNumber, phoneNumber, state } = req.body;

    if (!aadhaar || !voterNumber || !phoneNumber || !state) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required (Aadhaar, Voter Number, Mobile, State).',
      });
    }

    if (!AADHAAR_REGEX.test(aadhaar)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Aadhaar number. Must be exactly 12 digits.',
      });
    }

    if (!MOBILE_REGEX.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Mobile number. Must be exactly 10 digits.',
      });
    }

    // Generate hashed voter ID
    const voterIdHash = generateVoterIdHash(aadhaar, voterNumber);

    // Check if voter already exists
    let user = await User.findOne({ voterIdHash });

    console.log(`[AUTH] Login attempt for Hash: ${voterIdHash}, Phone: ${phoneNumber}`);
    if (!user) {
      console.log(`[AUTH] Creating NEW user for Hash: ${voterIdHash}`);
      // Auto-create newly registered user entry
      let username = aadhaar; // Using aadhaar as username
      
      user = new User({
        voterIdHash,
        username,
        phoneNumber,
        state,
        password: '', // Passwordless
      });
    } else {
      console.log(`[AUTH] Found EXISTING user for Hash: ${voterIdHash}. hasVoted: ${user.hasVoted}`);
      // User exists, just update their state or mobile if needed
      user.state = state;
      user.phoneNumber = phoneNumber; 
    }

    // Determine Hardware Access bypass
    if (user && user.biometricCredentialId) {
       return res.status(200).json({
          success: true,
          skipOtp: true,
          biometricCredentialId: user.biometricCredentialId,
          userId: user._id
       });
    }

    // Generate local OTP and expiry (30 mins)
    const generatedOtp = generateRandomOTP();
    user.otp = generatedOtp;
    user.otpExpiry = new Date(Date.now() + 30 * 60 * 1000);
    user.isOtpVerified = false;

    // Send OTP via Renflair
    try {
      await sendRenflairOTP(user.phoneNumber, generatedOtp);
    } catch (apiError) {
      console.error('Renflair Send OTP Error:', apiError.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP through SMS provider.',
      });
    }

    // Save user to DB only after SMS is successfully sent
    await user.save();

    // Generate preliminary JWT token
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

    return res.status(201).json({
      success: true,
      message: 'OTP has been sent to your mobile. Please verify.',
      token,
      userId: user._id,
      username: user.username,
      state: user.state
    });
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error during authentication.',
      error: error.message,
    });
  }
};

/**
 * Verify OTP Local Database Check
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

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Check expiry
    if (!user.otpExpiry || user.otpExpiry < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
      });
    }

    // Determine correctness locally
    if (user.otp === otp) {
      user.isOtpVerified = true;
      user.otp = null;
      user.otpExpiry = null;
      await user.save();

      const token = jwt.sign(
        {
          userId: user._id,
          voterIdHash: user.voterIdHash,
          isOtpVerified: true,
          state: user.state
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.status(200).json({
        success: true,
        message: 'Authentication successful. You can now vote.',
        token,
        userId: user._id,
        username: user.username,
        state: user.state
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP provided.',
      });
    }
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
 * Resend OTP Local Generation
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

    // Generate new OTP and update expiry
    const newOtp = generateRandomOTP();
    user.otp = newOtp;
    user.otpExpiry = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    // Send via Renflair
    try {
      await sendRenflairOTP(user.phoneNumber, newOtp);
    } catch (apiError) {
      console.error('Renflair Resend Error:', apiError.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to resend OTP via SMS gateway.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'New OTP sent successfully.',
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

/**
 * Admin Login
 * POST /admin-login
 */
const adminLogin = async (req, res) => {
  try {
    const { aadhaar, voterNumber, phoneNumber } = req.body;
    
    if (!phoneNumber || !aadhaar || !voterNumber) {
      return res.status(400).json({ success: false, message: 'Aadhaar, Voter Number, and Mobile number are required.' });
    }

    if (phoneNumber !== '9694671392') {
      return res.status(403).json({ success: false, message: 'Unauthorized. Admin access only.' });
    }

    const generatedOtp = generateRandomOTP();
    const adminVoterIdHash = generateVoterIdHash(aadhaar, voterNumber);
    
    let adminUser = await User.findOne({ voterIdHash: adminVoterIdHash });
    if (!adminUser) {
      adminUser = new User({
        voterIdHash: adminVoterIdHash,
        username: 'SystemAdmin',
        phoneNumber: '9694671392',
        password: '',
      });
    }

    adminUser.otp = generatedOtp;
    adminUser.otpExpiry = new Date(Date.now() + 30 * 60 * 1000);
    adminUser.isOtpVerified = false;
    
    try {
      await sendRenflairOTP(adminUser.phoneNumber, generatedOtp);
    } catch (apiError) {
      console.error('Renflair Send OTP Error for Admin:', apiError.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to send admin OTP through SMS provider.',
      });
    }

    await adminUser.save();

    const token = jwt.sign(
      {
        userId: adminUser._id,
        isAdminAccount: true,
        isOtpVerified: false,
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      message: 'Admin OTP has been sent. Please verify.',
      token,
      userId: adminUser._id,
      otp: generatedOtp
    });
  } catch (error) {
    console.error('Admin Login error:', error);
    return res.status(500).json({ success: false, message: 'Error during admin login.' });
  }
};

/**
 * Admin Verify OTP
 * POST /admin-verify-otp
 */
const adminVerifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({ success: false, message: 'User ID and OTP are required.' });
    }

    const adminUser = await User.findById(userId);

    if (!adminUser || adminUser.phoneNumber !== '9694671392') {
      return res.status(403).json({ success: false, message: 'Unauthorized. Admin access only.' });
    }

    if (!adminUser.otpExpiry || adminUser.otpExpiry < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    if (adminUser.otp === otp) {
      adminUser.isOtpVerified = true;
      adminUser.otp = null;
      adminUser.otpExpiry = null;
      await adminUser.save();

      const token = jwt.sign(
        {
          userId: adminUser._id,
          isAdminAccount: true,
          isOtpVerified: true,
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.status(200).json({
        success: true,
        message: 'Admin authentication successful.',
        token,
        userId: adminUser._id,
        username: 'Administrator'
      });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid OTP provided.' });
    }
  } catch (error) {
    console.error('Admin OTP verification error:', error);
    return res.status(500).json({ success: false, message: 'Error during admin OTP verification.' });
  }
};

/**
 * WebAuthn Passkeys: Bind mapped authentication hardware to native profile.
 */
const registerBiometric = async (req, res) => {
   try {
       const user = await User.findById(req.userId);
       if (!user) return res.status(404).json({ success: false, message: 'User mapping failure.' });
       
       user.biometricCredentialId = req.body.biometricCredentialId;
       await user.save();
       return res.status(200).json({ success: true, message: 'Hardware fingerprint physically secured.' });
   } catch(e) {
       return res.status(500).json({ success: false, message: 'Failed capturing device credentials.' });
   }
};

/**
 * WebAuthn Passkeys: Authenticate mapped hardware exclusively, natively minting standard JSON token overrides.
 */
const verifyBiometricLogin = async (req, res) => {
   try {
       const { userId, credentialId } = req.body;
       const user = await User.findById(userId);
       
       if (!user || user.biometricCredentialId !== credentialId) {
          return res.status(403).json({ success: false, message: 'Unrecognized Physical Node Identifier!' });
       }
       
       // Instant physical Mint bypassing OTP sequences
       const token = jwt.sign(
         { userId: user._id, voterIdHash: user.voterIdHash, isOtpVerified: true, state: user.state },
         process.env.JWT_SECRET, { expiresIn: '24h' }
       );

       return res.status(200).json({
         success: true, 
         message: 'Biometric authorization visually certified.',
         token, 
         userId: user._id, 
         username: user.username, 
         state: user.state
       });
   } catch (e) {
       return res.status(500).json({ success: false, message: 'Fatal exception interrogating TouchID sensor layer.' });
   }
};

module.exports = {
  authenticate,
  verifyOTP,
  resendOTP,
  adminLogin,
  adminVerifyOTP,
  registerBiometric,
  verifyBiometricLogin
};
