require('dotenv').config();
const mongoose = require('mongoose');
const Party = require('../models/Party');

async function checkParties() {
  try {
    const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/voting-system';
    await mongoose.connect(mongodbUri);
    const parties = await Party.find({});
    console.log(`Total parties: ${parties.length}`);
    parties.forEach((p, i) => {
      console.log(`${i+1}. ${p.name} (${p.abbreviation}) - Type: ${p.partyType}, Active: ${p.isActive}, States: ${p.activeStates}`);
    });
    mongoose.connection.close();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
checkParties();
