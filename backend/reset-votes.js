require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function resetVotes() {
  const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/voting-system';
  await mongoose.connect(mongodbUri);
  const result = await User.updateMany({}, { $set: { hasVoted: false, votedFor: null } });
  console.log(`Updated ${result.modifiedCount} users.`);
  mongoose.connection.close();
}
resetVotes();
