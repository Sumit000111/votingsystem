require('dotenv').config();
const { ethers } = require('ethers');
const contractDef = require('./blockchain/contract');

async function testQuery() {
  try {
    const events = await contractDef.queryFilter('VoteCast');
    console.log(`Found ${events.length} events!`);
  } catch(e) {
    console.error(e);
  }
}

testQuery();
