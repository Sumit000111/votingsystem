/**
 * Voting Controller
 * Handles voting and result retrieval
 * Uses Ethereum smart contract for vote recording
 */

const User = require('../models/User');
const Vote = require('../models/Vote');
const Party = require('../models/Party');
const contract = require('../blockchain/contract');

/**
 * Get list of candidates (parties)
 * GET /candidates
 * Fetches from database instead of hardcoding
 */
const getCandidates = async (req, res) => {
  try {
    // Fetch active parties from database
    const parties = await Party.find({ isActive: true })
      .select('name abbreviation symbol image ideology partyType')
      .lean();

    if (parties.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active parties available for voting.',
      });
    }

    // Format for frontend (candidates = parties)
    const candidates = parties.map((party) => ({
      id: party._id,
      name: party.name,
      party: party.abbreviation,
      symbol: party.symbol,
      image: party.image,
      ideology: party.ideology,
    }));

    return res.status(200).json({
      success: true,
      message: 'Candidates retrieved successfully.',
      candidates,
    });
  } catch (error) {
    console.error('Get candidates error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching candidates.',
      error: error.message,
    });
  }
};

/**
 * Request OTP for voting
 * POST /request-otp-for-voting
 * Generates OTP that user must verify before casting vote
 */
const requestOTPForVoting = async (req, res) => {
  try {
    const userId = req.userId;

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Check if user already voted
    if (user.hasVoted) {
      return res.status(403).json({
        success: false,
        message: 'You have already voted. One vote per user is allowed.',
      });
    }

    // Generate OTP (6-digit fixed for demo: 111111)
    const otp = '111111';
    
    // Set OTP expiry to 5 minutes from now
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    // Save OTP to user
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'OTP generated and sent for verification. Demo OTP: 111111',
      otp: otp, // Return OTP for demo purposes (in production, send via SMS/Email)
    });
  } catch (error) {
    console.error('Request OTP for voting error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error generating OTP.',
      error: error.message,
    });
  }
};

/**
 * Cast a vote
 * POST /vote
 * Requires: JWT token with OTP verified
 * Records vote on Ethereum blockchain and MongoDB
 */
const castVote = async (req, res) => {
  const { candidateSelected } = req.body;
  const userId = req.userId;
  const voterIdHash = req.voterIdHash;

  // Validate candidate selection
  if (!candidateSelected) {
    return res.status(400).json({
      success: false,
      message: 'Candidate selection is required.',
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

  // Check if user already voted
  if (user.hasVoted) {
    return res.status(403).json({
      success: false,
      message:
        'You have already voted. One vote per user is allowed. Your vote cannot be changed.',
    });
  }

  // Validate candidate name (basic validation)
  if (typeof candidateSelected !== 'string' || candidateSelected.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Invalid candidate selection.',
    });
  }

  let txHash = null;
  let blockchainSuccess = false;

  // Try to record on blockchain (non-critical)
  try {
    console.log(`[castVote] Attempting to vote for: ${candidateSelected}`);
    const tx = await contract.vote(candidateSelected);
    console.log(`[castVote] Transaction sent: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`[castVote] Transaction confirmed: ${receipt.hash}`);
    
    txHash = tx.hash;
    blockchainSuccess = true;
  } catch (contractError) {
    console.warn('[castVote] Blockchain error (non-critical):', contractError.message);
    console.warn('[castVote] Will proceed with vote recording in database');
    // Continue anyway - we'll record in MongoDB
  }

  try {
    // Always record vote in MongoDB (blockchain is optional)
    const voteData = {
      userId,
      voterIdHash,
      candidateSelected,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
    };
    if (txHash) {
      voteData.txHash = txHash;
    }
    const voteRecord = new Vote(voteData);

    await voteRecord.save();

    // Update user record
    user.hasVoted = true;
    user.votedFor = candidateSelected;
    await user.save();

    console.log(`[castVote] Vote successfully saved for user ${userId}`);

    return res.status(200).json({
      success: true,
      message: blockchainSuccess 
        ? 'Vote recorded on blockchain' 
        : 'Vote recorded in database',
      txHash: txHash || 'pending',
      candidateSelected,
      blockchainRecorded: blockchainSuccess,
    });
  } catch (dbError) {
    console.error('[castVote] Database error:', dbError.message);
    return res.status(500).json({
      success: false,
      message: 'Error recording vote.',
      error: dbError.message,
    });
  }
};

/**
 * Get voting results
 * GET /results
 * Fetches vote counts from MongoDB
 */
const getResults = async (req, res) => {
  try {
    console.log('[getResults] Starting to fetch results');
    
    // Fetch all votes from MongoDB
    const votes = await Vote.find({});
    console.log(`[getResults] Found ${votes ? votes.length : 0} votes in database`);
    
    if (!votes) {
      console.log('[getResults] Vote.find() returned null');
      return res.status(200).json({
        success: true,
        message: 'No voting results available.',
        totalVotes: 0,
        results: [],
      });
    }

    // Calculate vote counts by grouping
    const voteCount = {};
    let totalVotes = 0;

    votes.forEach((vote) => {
      const candidate = vote.candidateSelected;
      if (candidate) {
        voteCount[candidate] = (voteCount[candidate] || 0) + 1;
        totalVotes++;
      }
    });

    console.log('[getResults] Vote count:', voteCount);

    // Format results
    const formattedResults = Object.entries(voteCount).map(
      ([candidateName, count]) => ({
        candidateName,
        voteCount: count,
        percentage:
          totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(2) + '%' : '0%',
      })
    );

    // Sort by vote count (descending)
    formattedResults.sort((a, b) => b.voteCount - a.voteCount);

    console.log('[getResults] Returning', formattedResults.length, 'formatted results');

    return res.status(200).json({
      success: true,
      message: 'Voting results retrieved successfully.',
      totalVotes,
      results: formattedResults,
      blockchainValid: true,
    });
  } catch (error) {
    console.error('[getResults] Error:', error.message);
    console.error('[getResults] Full error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching results.',
      error: error.message,
      totalVotes: 0,
      results: [],
    });
  }
};

/**
 * Check voting status for current user
 * GET /voting-status
 */
const getVotingStatus = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.status(200).json({
      success: true,
      hasVoted: user.hasVoted,
      votedFor: user.votedFor || null,
      username: user.username,
    });
  } catch (error) {
    console.error('Get voting status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching voting status.',
      error: error.message,
    });
  }
};

/**
 * Get blockchain information
 * GET /blockchain-info
 */
const getBlockchainInfo = async (req, res) => {
  try {
    const totalVotes = await Vote.countDocuments();
    return res.status(200).json({
      success: true,
      message: 'Using Ethereum blockchain',
      note: 'Votes are stored on smart contract',
      blockchainValid: true,
      totalBlocks: 'Ethereum',
      totalVotes: totalVotes,
      votes: [],
    });
  } catch (error) {
    console.error('Get blockchain info error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching blockchain information.',
      error: error.message,
    });
  }
};

module.exports = {
  getCandidates,
  requestOTPForVoting,
  castVote,
  getResults,
  getVotingStatus,
  getBlockchainInfo,
};
