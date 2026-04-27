require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('./models/User');

const generateVoterIdHash = (aadhaar, voterNumber) => {
  const combinedData = aadhaar + voterNumber.toUpperCase();
  return crypto.createHash('sha256').update(combinedData).digest('hex');
};

const testLogic = async () => {
  try {
    const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/voting-system';
    await mongoose.connect(mongodbUri, { useNewUrlParser: true, useUnifiedTopology: true });
    
    console.log('Testing with Mobile: 9999999999');
    
    // User 1
    const aadhaar1 = '111111111111';
    const pan1 = 'AAAAA1111A';
    const hash1 = generateVoterIdHash(aadhaar1, pan1);
    
    let user1 = await User.findOne({ voterIdHash: hash1 });
    if (!user1) {
      user1 = new User({ voterIdHash: hash1, username: 'test1', phoneNumber: '9999999999', state: 'Delhi' });
      await user1.save();
    }
    user1.hasVoted = true;
    await user1.save();
    console.log(`User 1 (${hash1}) hasVoted: ${user1.hasVoted}`);
    
    // User 2
    const aadhaar2 = '222222222222';
    const pan2 = 'BBBBB2222B';
    const hash2 = generateVoterIdHash(aadhaar2, pan2);
    
    let user2 = await User.findOne({ voterIdHash: hash2 });
    if (!user2) {
      user2 = new User({ voterIdHash: hash2, username: 'test2', phoneNumber: '9999999999', state: 'Delhi' });
      await user2.save();
    }
    console.log(`User 2 (${hash2}) hasVoted: ${user2.hasVoted}`);
    
    if (user2.hasVoted) {
      console.log('BUG DETECTED! User 2 hasVoted is true!');
    } else {
      console.log('Backend logic is correct. User 2 hasVoted is false.');
    }
    
    // Cleanup
    await User.deleteMany({ phoneNumber: '9999999999' });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

testLogic();
