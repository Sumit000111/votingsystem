require('dotenv').config();
const mongoose = require('mongoose');
const Vote = require('./models/Vote');

async function checkDb() {
  const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/voting-system';
  await mongoose.connect(mongodbUri);
  const votes = await Vote.find({});
  console.log(`Total votes: ${votes.length}`);
  votes.forEach((v, i) => {
    console.log(`Vote ${i+1}: Candidate: ${v.candidateSelected}, txHash: ${v.txHash}`);
  });
  mongoose.connection.close();
}
checkDb();
