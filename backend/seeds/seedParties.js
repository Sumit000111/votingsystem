/**
 * Seed script to populate parties into MongoDB
 * Run: node backend/seeds/seedParties.js
 */

require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Party = require('../models/Party');

const parties = [
  // National Parties
  {
    name: 'Bharatiya Janata Party',
    abbreviation: 'BJP',
    symbol: '🪷',
    image:
      'https://upload.wikimedia.org/wikipedia/en/thumb/7/71/Bharatiya_Janata_Party_logo.svg/220px-Bharatiya_Janata_Party_logo.svg.png',
    ideology: 'Right-wing conservatism, Hindutva',
    partyType: 'national',
    activeStates: [
      'Andhra Pradesh',
      'Arunachal Pradesh',
      'Assam',
      'Chhattisgarh',
      'Delhi',
      'Gujarat',
      'Haryana',
      'Himachal Pradesh',
    ],
    isActive: true,
  },
  {
    name: 'Indian National Congress',
    abbreviation: 'INC',
    symbol: '🤚',
    image:
      'https://upload.wikimedia.org/wikipedia/en/thumb/e/ec/Indian_National_Congress_blank_logo.svg/220px-Indian_National_Congress_blank_logo.svg.png',
    ideology: 'Centre, Social democracy, Secularism',
    partyType: 'national',
    activeStates: [
      'Karnataka',
      'Rajasthan',
      'Tamil Nadu',
      'Telangana',
      'Kerala',
      'Punjab',
    ],
    isActive: true,
  },
  {
    name: 'Aam Aadmi Party',
    abbreviation: 'AAP',
    symbol: '🧡',
    image:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Aam_Aadmi_Party_Logo.svg/220px-Aam_Aadmi_Party_Logo.svg.png',
    ideology: 'Centre, Anti-corruption, Welfarism',
    partyType: 'national',
    activeStates: ['Delhi', 'Punjab', 'Gujarat'],
    isActive: true,
  },
  {
    name: 'Bahujan Samaj Party',
    abbreviation: 'BSP',
    symbol: '🐘',
    image:
      'https://upload.wikimedia.org/wikipedia/en/thumb/a/a1/Bahujan_Samaj_Party_Logo.svg/220px-Bahujan_Samaj_Party_Logo.svg.png',
    ideology: 'Centre-left, Social justice, Ambedkarism',
    partyType: 'national',
    activeStates: ['Uttar Pradesh', 'Madhya Pradesh', 'Chhattisgarh'],
    isActive: true,
  },
  {
    name: 'Communist Party of India (Marxist)',
    abbreviation: 'CPI(M)',
    symbol: '☭',
    image:
      'https://upload.wikimedia.org/wikipedia/en/thumb/2/2c/CPI_MLogo.svg/220px-CPI_MLogo.svg.png',
    ideology: 'Left-wing, Marxism-Leninism, Socialism',
    partyType: 'national',
    activeStates: ['West Bengal', 'Kerala', 'Tripura'],
    isActive: true,
  },
  {
    name: 'National People\'s Party',
    abbreviation: 'NPP',
    symbol: '🌲',
    image:
      'https://upload.wikimedia.org/wikipedia/en/thumb/0/07/National_People%27s_Party_Logo.svg/220px-National_People%27s_Party_Logo.svg.png',
    ideology: 'Centre-right, Conservatism, Regionalism',
    partyType: 'national',
    activeStates: ['Meghalaya', 'Manipur', 'Nagaland', 'Mizoram'],
    isActive: true,
  },

  // Major State Parties
  {
    name: 'Trinamool Congress',
    abbreviation: 'AITC',
    symbol: '🐾',
    image:
      'https://upload.wikimedia.org/wikipedia/en/thumb/2/2c/Trinamool_Congress_Logo.svg/220px-Trinamool_Congress_Logo.svg.png',
    ideology: 'Centre, Regional interests, Secularism',
    partyType: 'state',
    activeStates: ['West Bengal', 'Tripura', 'Meghalaya'],
    isActive: true,
  },
  {
    name: 'Dravida Munnetra Kazhagam',
    abbreviation: 'DMK',
    symbol: '🌟',
    image:
      'https://upload.wikimedia.org/wikipedia/en/thumb/d/d5/DMK_Logo.svg/220px-DMK_Logo.svg.png',
    ideology: 'Centre-left, Dravidian, Secularism',
    partyType: 'state',
    activeStates: ['Tamil Nadu', 'Puducherry'],
    isActive: true,
  },
  {
    name: 'All India Anna Dravida Munnetra Kazhagam',
    abbreviation: 'AIADMK',
    symbol: '🍃',
    image:
      'https://upload.wikimedia.org/wikipedia/en/thumb/f/f8/AIADMK_%28new%29_party_flag.svg/220px-AIADMK_%28new%29_party_flag.svg.png',
    ideology: 'Centre-right, Dravidian, Populism',
    partyType: 'state',
    activeStates: ['Tamil Nadu', 'Puducherry'],
    isActive: true,
  },
  {
    name: 'Biju Janata Dal',
    abbreviation: 'BJD',
    symbol: '⚖️',
    image:
      'https://upload.wikimedia.org/wikipedia/en/thumb/3/3f/Biju_Janata_Dal.svg/220px-Biju_Janata_Dal.svg.png',
    ideology: 'Centre, Regional interests',
    partyType: 'state',
    activeStates: ['Odisha'],
    isActive: true,
  },
  {
    name: 'Samajwadi Party',
    abbreviation: 'SP',
    symbol: '🔱',
    image:
      'https://upload.wikimedia.org/wikipedia/en/thumb/a/a2/Samajwadi_party_flag.svg/220px-Samajwadi_party_flag.svg.png',
    ideology: 'Centre-left, Socialist, Secularism',
    partyType: 'state',
    activeStates: ['Uttar Pradesh'],
    isActive: true,
  },
  {
    name: 'Janata Dal (United)',
    abbreviation: 'JD(U)',
    symbol: '👌',
    image:
      'https://upload.wikimedia.org/wikipedia/en/thumb/8/84/Janata_Dal_%28United%29.svg/220px-Janata_Dal_%28United%29.svg.png',
    ideology: 'Centre, Regional, Secularism',
    partyType: 'state',
    activeStates: ['Bihar', 'Arunachal Pradesh', 'Manipur'],
    isActive: true,
  },
  {
    name: 'Telugu Desam Party',
    abbreviation: 'TDP',
    symbol: '🔶',
    image:
      'https://upload.wikimedia.org/wikipedia/en/thumb/f/f0/Telugu_Desam_Party_Logo.svg/220px-Telugu_Desam_Party_Logo.svg.png',
    ideology: 'Centre-right, Regionalism',
    partyType: 'state',
    activeStates: ['Andhra Pradesh', 'Telangana'],
    isActive: true,
  },
  {
    name: 'YSR Congress Party',
    abbreviation: 'YSRCP',
    symbol: '⭐',
    image:
      'https://upload.wikimedia.org/wikipedia/en/thumb/8/8e/YSR_Congress_Logo.svg/220px-YSR_Congress_Logo.svg.png',
    ideology: 'Centre, Regional, Populism',
    partyType: 'state',
    activeStates: ['Andhra Pradesh', 'Telangana'],
    isActive: true,
  },
  {
    name: 'Rashtriya Janata Dal',
    abbreviation: 'RJD',
    symbol: '🔗',
    image:
      'https://upload.wikimedia.org/wikipedia/en/thumb/2/2c/Rashtriya_Janata_Dal_flag.svg/220px-Rashtriya_Janata_Dal_flag.svg.png',
    ideology: 'Centre-left, Socialist',
    partyType: 'state',
    activeStates: ['Bihar', 'Jharkhand'],
    isActive: true,
  },
  {
    name: 'Shiv Sena',
    abbreviation: 'SS',
    symbol: '🐯',
    image:
      'https://upload.wikimedia.org/wikipedia/en/thumb/e/e4/Shiv_Sena_Logo.svg/220px-Shiv_Sena_Logo.svg.png',
    ideology: 'Centre-right, Marathi interests',
    partyType: 'state',
    activeStates: ['Maharashtra'],
    isActive: true,
  },
  {
    name: 'Communist Party of India',
    abbreviation: 'CPI',
    symbol: '🔤',
    image:
      'https://upload.wikimedia.org/wikipedia/en/thumb/3/3b/Communist_Party_of_India_logo.svg/220px-Communist_Party_of_India_logo.svg.png',
    ideology: 'Left-wing, Communism',
    partyType: 'state',
    activeStates: ['Kerala', 'West Bengal', 'Tamil Nadu'],
    isActive: true,
  },
];

async function seedParties() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Clear existing parties
    const deletedCount = await Party.deleteMany({});
    console.log(`Deleted ${deletedCount.deletedCount} existing parties`);

    // Insert new parties
    const result = await Party.insertMany(parties);
    console.log(`Successfully inserted ${result.length} parties`);

    // Display inserted parties
    const allParties = await Party.find({}).lean();
    console.log('\n✅ Parties in database:');
    allParties.forEach((party) => {
      console.log(`  - ${party.abbreviation}: ${party.name}`);
    });

    console.log(`\n✅ Total parties: ${allParties.length}`);

    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error seeding parties:', error);
    process.exit(1);
  }
}

seedParties();
