/**
 * Seed (or refresh) the political parties on the ballot.
 *
 *   npm run seed            upsert parties by abbreviation (safe to re-run)
 *   npm run seed -- --fresh delete every party first
 *
 * The running API registers new parties on the blockchain automatically on
 * startup, or immediately via Admin → Election → "Sync with chain".
 */

const mongoose = require('mongoose');
const { ethers } = require('ethers');
const config = require('../config');
const Party = require('../models/Party');

const parties = [
  // National parties
  {
    name: 'Bharatiya Janata Party',
    abbreviation: 'BJP',
    symbol: '🪷',
    image: '/parties/bjp.webp',
    color: '#F97D09',
    ideology: 'Right-wing conservatism, Hindutva',
    partyType: 'national',
    activeStates: ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Chhattisgarh', 'Delhi', 'Gujarat', 'Haryana', 'Himachal Pradesh'],
  },
  {
    name: 'Indian National Congress',
    abbreviation: 'INC',
    symbol: '✋',
    image: '/parties/inc.webp',
    color: '#19AAED',
    ideology: 'Centre, Social democracy, Secularism',
    partyType: 'national',
    activeStates: ['Karnataka', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Kerala', 'Punjab'],
  },
  {
    name: 'Aam Aadmi Party',
    abbreviation: 'AAP',
    symbol: '🧹',
    image: '/parties/aap.png',
    color: '#0066A4',
    ideology: 'Centre, Anti-corruption, Welfarism',
    partyType: 'national',
    activeStates: ['Delhi', 'Punjab', 'Gujarat'],
  },
  {
    name: 'Bahujan Samaj Party',
    abbreviation: 'BSP',
    symbol: '🐘',
    image: '/parties/bsp.webp',
    color: '#22409A',
    ideology: 'Centre-left, Social justice, Ambedkarism',
    partyType: 'national',
    activeStates: ['Uttar Pradesh', 'Madhya Pradesh', 'Chhattisgarh'],
  },
  {
    name: 'Communist Party of India (Marxist)',
    abbreviation: 'CPI(M)',
    symbol: '☭',
    image: '/parties/cpim.webp',
    color: '#CC0D0D',
    ideology: 'Left-wing, Marxism-Leninism, Socialism',
    partyType: 'national',
    activeStates: ['West Bengal', 'Kerala', 'Tripura'],
  },
  {
    name: "National People's Party",
    abbreviation: 'NPP',
    symbol: '📖',
    image: '/parties/npp.jpg',
    color: '#DB7D08',
    ideology: 'Centre-right, Conservatism, Regionalism',
    partyType: 'national',
    activeStates: ['Meghalaya', 'Manipur', 'Nagaland', 'Mizoram'],
  },

  // Major state parties
  {
    name: 'Trinamool Congress',
    abbreviation: 'AITC',
    symbol: '🌸',
    color: '#20C646',
    ideology: 'Centre, Regional interests, Secularism',
    partyType: 'state',
    activeStates: ['West Bengal', 'Tripura', 'Meghalaya'],
  },
  {
    name: 'Dravida Munnetra Kazhagam',
    abbreviation: 'DMK',
    symbol: '🌅',
    color: '#DD1100',
    ideology: 'Centre-left, Dravidian, Secularism',
    partyType: 'state',
    activeStates: ['Tamil Nadu', 'Puducherry'],
  },
  {
    name: 'All India Anna Dravida Munnetra Kazhagam',
    abbreviation: 'AIADMK',
    symbol: '🍃',
    color: '#138808',
    ideology: 'Centre-right, Dravidian, Populism',
    partyType: 'state',
    activeStates: ['Tamil Nadu', 'Puducherry'],
  },
  {
    name: 'Biju Janata Dal',
    abbreviation: 'BJD',
    symbol: '🐚',
    color: '#006400',
    ideology: 'Centre, Regional interests',
    partyType: 'state',
    activeStates: ['Odisha'],
  },
  {
    name: 'Samajwadi Party',
    abbreviation: 'SP',
    symbol: '🚲',
    color: '#E40001',
    ideology: 'Centre-left, Socialist, Secularism',
    partyType: 'state',
    activeStates: ['Uttar Pradesh'],
  },
  {
    name: 'Janata Dal (United)',
    abbreviation: 'JD(U)',
    symbol: '🏹',
    color: '#003366',
    ideology: 'Centre, Regional, Secularism',
    partyType: 'state',
    activeStates: ['Bihar', 'Arunachal Pradesh', 'Manipur'],
  },
  {
    name: 'Telugu Desam Party',
    abbreviation: 'TDP',
    symbol: '🚴',
    color: '#FCE600',
    ideology: 'Centre-right, Regionalism',
    partyType: 'state',
    activeStates: ['Andhra Pradesh', 'Telangana'],
  },
  {
    name: 'YSR Congress Party',
    abbreviation: 'YSRCP',
    symbol: '🌀',
    color: '#1569C7',
    ideology: 'Centre, Regional, Populism',
    partyType: 'state',
    activeStates: ['Andhra Pradesh', 'Telangana'],
  },
  {
    name: 'Rashtriya Janata Dal',
    abbreviation: 'RJD',
    symbol: '🏮',
    color: '#008000',
    ideology: 'Centre-left, Socialist',
    partyType: 'state',
    activeStates: ['Bihar', 'Jharkhand'],
  },
  {
    name: 'Shiv Sena',
    abbreviation: 'SS',
    symbol: '🏹',
    color: '#F26F21',
    ideology: 'Centre-right, Marathi interests',
    partyType: 'state',
    activeStates: ['Maharashtra'],
  },
  {
    name: 'Communist Party of India',
    abbreviation: 'CPI',
    symbol: '🌾',
    color: '#FF0000',
    ideology: 'Left-wing, Communism',
    partyType: 'state',
    activeStates: ['Kerala', 'West Bengal', 'Tamil Nadu'],
  },
];

async function seed() {
  await mongoose.connect(config.mongoUri);
  console.log(`Connected to ${mongoose.connection.name}`);

  if (process.argv.includes('--fresh')) {
    const { deletedCount } = await Party.deleteMany({});
    console.log(`Deleted ${deletedCount} existing parties`);
  }

  for (const party of parties) {
    await Party.findOneAndUpdate(
      { abbreviation: party.abbreviation },
      { $set: { ...party, isActive: true, chainId: ethers.id(party.name) } },
      { upsert: true, runValidators: true }
    );
    console.log(`  ✓ ${party.abbreviation.padEnd(7)} ${party.name}`);
  }

  console.log(`\n${parties.length} parties seeded. Start (or restart) the API to register them on-chain.`);
  await mongoose.connection.close();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
