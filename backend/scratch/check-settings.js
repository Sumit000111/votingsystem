require('dotenv').config();
const mongoose = require('mongoose');
const ElectionSettings = require('../models/ElectionSettings');

async function checkSettings() {
  try {
    const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/voting-system';
    await mongoose.connect(mongodbUri);
    const settings = await ElectionSettings.findOne({});
    console.log('Election Settings:', settings);
    mongoose.connection.close();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
checkSettings();
