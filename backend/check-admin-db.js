require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function checkAdmin() {
  const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/voting-system';
  await mongoose.connect(mongodbUri);
  const admin = await User.findOne({ voterIdHash: /ADMIN/ });
  if (admin) {
    console.log(`Admin found: ID: ${admin._id}, Username: ${admin.username}, voterIdHash: ${admin.voterIdHash}, Phone: ${admin.phoneNumber}`);
  } else {
    console.log('No admin user found with "ADMIN" in voterIdHash');
  }
  mongoose.connection.close();
}
checkAdmin();
