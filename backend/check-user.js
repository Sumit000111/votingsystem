require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function checkUser() {
  const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/voting-system';
  await mongoose.connect(mongodbUri);
  const users = await User.find({});
  console.log(`Total users: ${users.length}`);
  users.forEach((u, i) => {
    console.log(`User ${i+1}: ID: ${u._id}, Username: ${u.username}, voterIdHash: ${u.voterIdHash}`);
  });
  mongoose.connection.close();
}
checkUser();
