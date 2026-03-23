/**
 * Blockchain Class for Voting System
 * Implements a simple blockchain to store immutable voting records
 */

const crypto = require('crypto');

class Block {
  constructor(index, voterHash, candidateSelected, timestamp, previousHash) {
    this.index = index;
    this.voterHash = voterHash; // Hashed voter ID (SHA-256)
    this.candidateSelected = candidateSelected; // Name of the selected candidate
    this.timestamp = timestamp; // Time when vote was cast
    this.previousHash = previousHash; // Hash of the previous block
    // Calculate the current block's hash
    this.currentHash = this.calculateHash();
  }

  /**
   * Calculate SHA-256 hash for the current block
   * Combines all block data into a single hash
   */
  calculateHash() {
    const blockData = JSON.stringify({
      index: this.index,
      voterHash: this.voterHash,
      candidateSelected: this.candidateSelected,
      timestamp: this.timestamp,
      previousHash: this.previousHash,
    });

    return crypto.createHash('sha256').update(blockData).digest('hex');
  }
}

class VotingBlockchain {
  constructor() {
    // Initialize blockchain with genesis block (first block)
    this.chain = [this.createGenesisBlock()];
  }

  /**
   * Create the first block in the blockchain (Genesis Block)
   */
  createGenesisBlock() {
    const genesisBlock = new Block(
      0,
      'genesis',
      'genesis',
      new Date().toISOString(),
      '0'
    );
    return genesisBlock;
  }

  /**
   * Get the latest block in the chain
   */
  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  /**
   * Add a new vote as a block to the blockchain
   * @param {string} voterHash - Hashed voter ID
   * @param {string} candidateSelected - Name of the candidate voted for
   * @returns {Block} The newly created block
   */
  addVote(voterHash, candidateSelected) {
    const latestBlock = this.getLatestBlock();
    const newBlock = new Block(
      latestBlock.index + 1,
      voterHash,
      candidateSelected,
      new Date().toISOString(),
      latestBlock.currentHash
    );

    // Validate before adding
    if (this.isValidNewBlock(newBlock, latestBlock)) {
      this.chain.push(newBlock);
      return newBlock;
    } else {
      throw new Error('Invalid block! Cannot add to blockchain');
    }
  }

  /**
   * Validate if a new block can be added to the blockchain
   * @param {Block} newBlock - Block to validate
   * @param {Block} previousBlock - Previous block in chain
   * @returns {boolean} True if valid, false otherwise
   */
  isValidNewBlock(newBlock, previousBlock) {
    // Check if the previous hash matches
    if (previousBlock.currentHash !== newBlock.previousHash) {
      console.log('Invalid previous hash!');
      return false;
    }

    // Check if index is incremented correctly
    if (previousBlock.index + 1 !== newBlock.index) {
      console.log('Invalid index!');
      return false;
    }

    // Check if the hash is calculated correctly
    if (newBlock.calculateHash() !== newBlock.currentHash) {
      console.log('Invalid hash!');
      return false;
    }

    return true;
  }

  /**
   * Validate the entire blockchain
   * Ensures no blocks have been tampered with
   * @returns {boolean} True if blockchain is valid, false otherwise
   */
  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // Verify current block's hash
      if (currentBlock.currentHash !== currentBlock.calculateHash()) {
        console.log(
          `Block ${i} has invalid hash! Block may have been tampered with.`
        );
        return false;
      }

      // Verify link to previous block
      if (currentBlock.previousHash !== previousBlock.currentHash) {
        console.log(`Block ${i} has invalid previous hash!`);
        return false;
      }
    }

    return true;
  }

  /**
   * Get all votes recorded in the blockchain
   * @returns {Array} Array of all blocks (votes) in the chain
   */
  getAllVotes() {
    // Return all blocks except the genesis block
    return this.chain.slice(1);
  }

  /**
   * Get vote count for each candidate
   * @returns {Object} Object with candidate names as keys and vote counts as values
   */
  getVoteResults() {
    const results = {};
    const votes = this.getAllVotes();

    votes.forEach((block) => {
      if (!results[block.candidateSelected]) {
        results[block.candidateSelected] = 0;
      }
      results[block.candidateSelected]++;
    });

    return results;
  }

  /**
   * Get total number of votes cast
   * @returns {number} Total vote count
   */
  getTotalVotes() {
    return this.chain.length - 1; // Exclude genesis block
  }
}

module.exports = VotingBlockchain;
