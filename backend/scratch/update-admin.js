require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function updateAdmin() {
  try {
    const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/voting-system';
    await mongoose.connect(mongodbUri);
    
    console.log('Connected to MongoDB');
    
    // Check for old admin
    const oldAdmin = await User.findOne({ voterIdHash: 'ADMIN_HASH_9467125975' });
    
    if (oldAdmin) {
      console.log('Found old admin user. Updating...');
      oldAdmin.voterIdHash = 'ADMIN_HASH_9694671392';
      oldAdmin.phoneNumber = '9694671392';
      await oldAdmin.save();
      console.log('Admin user updated successfully.');
    } else {
      console.log('Old admin user not found in database.');
      
      // Check if new admin already exists
      const newAdmin = await User.findOne({ voterIdHash: 'ADMIN_HASH_9694671392' });
      if (newAdmin) {
        console.log('New admin user already exists.');
      } else {
        console.log('Creating new admin user...');
        await User.create({
          voterIdHash: 'ADMIN_HASH_9694671392',
          username: 'SystemAdmin',
          phoneNumber: '9694671392',
          password: '',
        });
        console.log('New admin user created.');
      }
    }
  } catch (error) {
    console.error('Error updating admin:', error);
  } finally {
    mongoose.connection.close();
  }
}

updateAdmin();
