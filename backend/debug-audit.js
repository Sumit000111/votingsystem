require('dotenv').config();
const mongoose = require('mongoose');
const { ethers } = require('ethers');

async function debugAudit() {
  try {
    const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/voting-system';
    await mongoose.connect(mongodbUri, { useNewUrlParser: true, useUnifiedTopology: true });
    
    const Vote = require('./models/Vote');
    const dbVotes = await Vote.find({});
    
    const contract = require('./blockchain/contract');
    const events = await contract.queryFilter('VoteCast');
    
    console.log(`DB Votes: ${dbVotes.length}`);
    dbVotes.forEach(v => console.log(` - DB txHash: ${v.txHash}`));
    
    console.log(`Blockchain Events: ${events.length}`);
    events.forEach(e => console.log(` - BC txHash: ${e.transactionHash}`));
    
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
}

debugAudit();
