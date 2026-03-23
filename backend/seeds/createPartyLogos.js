#!/usr/bin/env node
/**
 * Create SVG placeholder images for Indian political parties
 * Much faster and more reliable than downloading from external sources
 */

require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Party = require('../models/Party');

const IMG_FOLDER = path.join(__dirname, '../../frontend/img');

// Party data with custom colors
const partyLogos = [
  {
    abbreviation: 'BJP',
    name: 'Bharatiya Janata Party',
    color: '#FF9933', // Saffron
    symbol: '🪷',
  },
  {
    abbreviation: 'INC',
    name: 'Indian National Congress',
    color: '#117DBA', // Congress blue
    symbol: '🤚',
  },
  {
    abbreviation: 'AAP',
    name: 'Aam Aadmi Party',
    color: '#0C7FED', // AAP blue
    symbol: '🧡',
  },
  {
    abbreviation: 'BSP',
    name: 'Bahujan Samaj Party',
    color: '#00008B', // Dark blue
    symbol: '🐘',
  },
  {
    abbreviation: 'CPI(M)',
    name: 'Communist Party of India (Marxist)',
    color: '#FF0000', // Red
    symbol: '☭',
  },
  {
    abbreviation: 'NPP',
    name: 'National People\'s Party',
    color: '#006400', // Green
    symbol: '🌲',
  },
  {
    abbreviation: 'AITC',
    name: 'Trinamool Congress',
    color: '#6FCE97', // Green
    symbol: '🐾',
  },
  {
    abbreviation: 'DMK',
    name: 'Dravida Munnetra Kazhagam',
    color: '#0066CC', // Blue
    symbol: '🌟',
  },
  {
    abbreviation: 'AIADMK',
    name: 'All India Anna Dravida Munnetra Kazhagam',
    color: '#FFD100', // Gold
    symbol: '🍃',
  },
  {
    abbreviation: 'BJD',
    name: 'Biju Janata Dal',
    color: '#FF6B35', // Orange
    symbol: '⚖️',
  },
  {
    abbreviation: 'SP',
    name: 'Samajwadi Party',
    color: '#CD212A', // Red
    symbol: '🔱',
  },
  {
    abbreviation: 'JD(U)',
    name: 'Janata Dal (United)',
    color: '#008000', // Green
    symbol: '👌',
  },
  {
    abbreviation: 'TDP',
    name: 'Telugu Desam Party',
    color: '#FF8C00', // Orange
    symbol: '🔶',
  },
  {
    abbreviation: 'YSRCP',
    name: 'YSR Congress Party',
    color: '#FFD700', // Gold
    symbol: '⭐',
  },
  {
    abbreviation: 'RJD',
    name: 'Rashtriya Janata Dal',
    color: '#1E90FF', // Blue
    symbol: '🔗',
  },
  {
    abbreviation: 'SS',
    name: 'Shiv Sena',
    color: '#FF6347', // Tomato red
    symbol: '🐯',
  },
  {
    abbreviation: 'CPI',
    name: 'Communist Party of India',
    color: '#E41E20', // Red
    symbol: '🔤',
  },
];

/**
 * Create an SVG logo for a party
 * @param {string} abbreviation - Party abbreviation
 * @param {string} color - Party color
 * @returns {string} SVG content
 */
function createPartyLogo(abbreviation, color) {
  // Create a simple circle with text logo
  const shortAbbr = abbreviation.replace(/\(|\)/g, '').substring(0, 3);
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <!-- Background circle -->
  <circle cx="100" cy="100" r="95" fill="${color}" opacity="0.9" stroke="#333" stroke-width="2"/>
  
  <!-- Inner circle -->
  <circle cx="100" cy="100" r="85" fill="white" stroke="${color}" stroke-width="3"/>
  
  <!-- Text -->
  <text x="100" y="110" font-size="48" font-weight="bold" text-anchor="middle" fill="${color}" font-family="Arial, sans-serif">
    ${shortAbbr}
  </text>
  
  <!-- Decorative bottom line -->
  <rect x="50" y="140" width="100" height="3" fill="${color}" rx="2"/>
</svg>`;
}

/**
 * Main function to create all party logos
 */
async function createAllLogos() {
  try {
    console.log('🎨 Creating custom SVG party logos...\n');

    // Ensure img folder exists
    if (!fs.existsSync(IMG_FOLDER)) {
      fs.mkdirSync(IMG_FOLDER, { recursive: true });
      console.log(`📁 Created image folder: ${IMG_FOLDER}\n`);
    }

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB\n');

    // Create each party logo
    let createdCount = 0;
    const results = {};

    for (const party of partyLogos) {
      const filename = `${party.abbreviation.replace(/[()]/g, '').replace(/\s+/g, '_')}.svg`;
      const filepath = path.join(IMG_FOLDER, filename);

      try {
        const svgContent = createPartyLogo(party.abbreviation, party.color);
        fs.writeFileSync(filepath, svgContent, 'utf8');

        results[party.abbreviation] = {
          filename: filename,
          localPath: `/img/${filename}`,
          success: true,
        };

        createdCount++;
        console.log(`✅ Created: ${party.name}`);
      } catch (error) {
        console.error(`❌ Failed to create ${party.name}: ${error.message}`);
        results[party.abbreviation] = {
          success: false,
          error: error.message,
        };
      }
    }

    console.log(`\n📊 Logo Creation Results:`);
    console.log(`   Created: ${createdCount}/${partyLogos.length}\n`);

    // Update database with local image paths
    console.log('💾 Updating database with local image paths...\n');

    let updateCount = 0;
    for (const [abbreviation, result] of Object.entries(results)) {
      if (result.success) {
        await Party.updateOne(
          { abbreviation: abbreviation },
          { image: result.localPath }
        );
        updateCount++;
        console.log(`   ✅ Updated ${abbreviation}: ${result.localPath}`);
      }
    }

    console.log(`\n✅ Updated ${updateCount} parties in database\n`);

    // Display all parties with their new locals paths
    const allParties = await Party.find({}).select('name abbreviation image').lean();
    console.log('📋 All Parties with Local Image Paths:');
    console.log('═'.repeat(80));
    allParties.forEach((party) => {
      console.log(`${party.abbreviation.padEnd(12)} | ${party.name.padEnd(45)} | ${party.image}`);
    });
    console.log('═'.repeat(80));

    console.log(`\n✅ Complete! ${allParties.length} parties updated with local image paths`);
    console.log(`📂 Images stored in: ${IMG_FOLDER}`);
    console.log(`📂 Total files: ${fs.readdirSync(IMG_FOLDER).length}`);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the logo creation
createAllLogos();
