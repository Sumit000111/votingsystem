require('dotenv').config();
const mongoose = require('mongoose');

const clearDB = async () => {
  try {
    const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/voting-system';
    
    await mongoose.connect(mongodbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');
    
    // Clear Users
    const User = require('./models/User');
    await User.deleteMany({});
    console.log('Cleared all Users');
    
    // Clear Votes
    const Vote = require('./models/Vote');
    await Vote.deleteMany({});
    console.log('Cleared all Votes');
    
    console.log('Database successfully cleared for a fresh start!');
  } catch (error) {
    console.error('Error clearing database:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

clearDB();
