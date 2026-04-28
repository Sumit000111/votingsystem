require('dotenv').config();
const { ethers } = require('ethers');
const contract = require('./blockchain/contract');

async function testFilter() {
  try {
    console.log('Contract Address:', await contract.getAddress());
    console.log('Fetching events...');
    const events = await contract.queryFilter('VoteCast');
    console.log(`Found ${events.length} events.`);
    events.forEach((e, i) => {
      console.log(`Event ${i}: Voter: ${e.args[0]}, CandidateHash: ${e.args[1]}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testFilter();
