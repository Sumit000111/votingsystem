/**
 * Voting Controller
 * Handles voting and result retrieval
 * Uses Ethereum smart contract for vote recording
 */

const User = require('../models/User');
const Vote = require('../models/Vote');
const Party = require('../models/Party');
const contract = require('../blockchain/contract');
const { ethers } = require('ethers');

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
    const otpExpiry = new Date(Date.now() + 30 * 60 * 1000);

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
  console.log(`[DEBUG] castVote: userId=${userId}, voterIdHash=${voterIdHash}`);

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

  // Use voterIdHash from request (JWT) or fallback to database record
  const finalVoterIdHash = voterIdHash || user.voterIdHash;
  if (!finalVoterIdHash) {
    return res.status(400).json({
      success: false,
      message: 'Critical Error: Voter Identity Hash missing. Please re-login.',
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
      voterIdHash: finalVoterIdHash,
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
    console.log('[getResults] Starting to fetch results from Ethereum Blockchain');
    
    // Fetch all events natively from the Blockchain mapping to 'VoteCast'
    let events;
    try {
      events = await contract.queryFilter('VoteCast');
      console.log(`[getResults] Found ${events ? events.length : 0} VoteCast events on the blockchain`);
    } catch (bcError) {
      console.error('[getResults] Blockchain Connection Error:', bcError.message);
      return res.status(500).json({
        success: false,
        message: 'Critical Error: The local Ethereum Blockchain Node is offline. Please ensure Hardhat is running on port 8545.',
      });
    }
    
    if (!events || events.length === 0) {
      console.log('[getResults] No votes found on the blockchain. Returning empty blockchain ledger.');
      return res.status(200).json({
        success: true,
        message: 'Ledger is empty. No votes recorded on the blockchain yet.',
        totalVotes: 0,
        totalInvalidVotes: 0,
        results: [],
        invalidResults: [],
        contractAddress: process.env.CONTRACT_ADDRESS || 'Unknown RPC Target'
      });
    }

    // Pre-calculate hashes for all legitimate candidates
    const activeParties = await Party.find({ isActive: true });
    const candidateHashMap = {};
    for (const party of activeParties) {
      candidateHashMap[ethers.id(party.name)] = party.name;
    }

    // Calculate vote counts by grouping
    const voteCount = {};
    let totalVotes = 0;

    // Loop through all blockchain events
    for (const event of events) {
      // Decode event arguments
      const candidateHash = event.args[1] && event.args[1].hash ? event.args[1].hash : event.args[1]; 
      if (!candidateHash) continue;

      // Lookup the real candidate name strictly using the immutable blockchain hash!
      const realCandidateName = candidateHashMap[candidateHash] || 'Unknown Blockchain Candidate';
      
      voteCount[realCandidateName] = (voteCount[realCandidateName] || 0) + 1;
      totalVotes++;
    }

    console.log(`[getResults] Valid votes directly from blockchain: ${totalVotes}`);

    // Format valid results
    const formattedResults = Object.entries(voteCount).map(
      ([candidateName, count]) => ({
        candidateName,
        voteCount: count,
        percentage:
          totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(2) + '%' : '0%',
      })
    );

    // Sort by valid vote count (descending)
    formattedResults.sort((a, b) => b.voteCount - a.voteCount);

    return res.status(200).json({
      success: true,
      message: 'Voting results retrieved successfully.',
      totalVotes,
      totalInvalidVotes: 0,
      results: formattedResults,
      invalidResults: [],
      contractAddress: process.env.CONTRACT_ADDRESS || 'Unknown RPC Target'
    });
  } catch (error) {
    console.error('[getResults] Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error fetching results.',
      error: error.message,
      totalVotes: 0,
      totalInvalidVotes: 0,
      results: [],
      invalidResults: []
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
/**
 * Perform a Deep Audit of Database against Blockchain
 * GET /audit
 */
const runDeepAudit = async (req, res) => {
  try {
    const dbVotes = await Vote.find({});
    const events = await contract.queryFilter('VoteCast');
    
    // Create a map of blockchain events by transaction hash
    const blockchainEventsMap = {};
    for (const event of events) {
      blockchainEventsMap[event.transactionHash] = event;
    }

    const manipulatedVotes = [];
    let checkedCount = 0;

    for (const voteRecord of dbVotes) {
      checkedCount++;
      let isFake = false;
      let mismatchReason = "";

      // 1. Check if the vote lacks a blockchain transaction entirely (injected directly to DB)
      if (!voteRecord.txHash) {
        isFake = true;
        mismatchReason = "Fake Vote: Injected directly into database (No Blockchain TX Hash)";
      } 
      // 2. Check if the transaction hash actually exists on the blockchain
      else if (!blockchainEventsMap[voteRecord.txHash]) {
        isFake = true;
        mismatchReason = `Fake Vote: Transaction Hash ${voteRecord.txHash.substring(0, 15)}... does not exist on the Ledger!`;
      } 
      // 3. The transaction exists, now we verify the cryptographic hashes
      else {
        const event = blockchainEventsMap[voteRecord.txHash];
        const candidateHash = event.args[1] && event.args[1].hash ? event.args[1].hash : event.args[1];
        const expectedHash = ethers.id(voteRecord.candidateSelected);

        if (expectedHash !== candidateHash) {
          isFake = true;
          mismatchReason = `Data Tampered! DB says '${voteRecord.candidateSelected}', but Blockchain Hash does not match.`;
        } else {
          // 4. Verify User Profile consistency
          const user = await User.findOne({ voterIdHash: voteRecord.voterIdHash });
          if (!user) {
            isFake = true;
            mismatchReason = "Orphaned vote record (User profile deleted)";
          } else if (user.hasVoted !== true || user.votedFor !== voteRecord.candidateSelected) {
            isFake = true;
            mismatchReason = "User profile out-of-sync with DB vote record (Profile Tampered)";
          }
        }
      }

      if (isFake) {
        voteRecord.isDisqualified = true;
        await voteRecord.save();

        manipulatedVotes.push({
          txHash: voteRecord.txHash ? voteRecord.txHash.substring(0, 15) + '...' : 'NO_TX_HASH',
          candidateInDb: voteRecord.candidateSelected || 'Unknown',
          reason: mismatchReason
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Deep Audit Completed',
      totalChecked: checkedCount,
      manipulatedCount: manipulatedVotes.length,
      manipulatedVotes
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getCandidates,
  requestOTPForVoting,
  castVote,
  getResults,
  getVotingStatus,
  getBlockchainInfo,
  runDeepAudit,
};
