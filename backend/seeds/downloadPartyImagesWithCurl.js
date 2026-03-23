#!/usr/bin/env node
/**
 * Alternative image download using curl wrapper
 * More reliable than native https module
 */

require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const Party = require('../models/Party');

const IMG_FOLDER = path.join(__dirname, '../../frontend/img');

// Party images data
const partyImages = [
  { abbreviation: 'BJP', name: 'Bharatiya Janata Party', url: 'https://upload.wikimedia.org/wikipedia/en/7/71/Bharatiya_Janata_Party_logo.svg' },
  { abbreviation: 'INC', name: 'Indian National Congress', url: 'https://upload.wikimedia.org/wikipedia/en/e/ec/Indian_National_Congress_blank_logo.svg' },
  { abbreviation: 'AAP', name: 'Aam Aadmi Party', url: 'https://upload.wikimedia.org/wikipedia/commons/8/8d/Aam_Aadmi_Party_Logo.svg' },
  { abbreviation: 'BSP', name: 'Bahujan Samaj Party', url: 'https://upload.wikimedia.org/wikipedia/en/a/a1/Bahujan_Samaj_Party_Logo.svg' },
  { abbreviation: 'CPI(M)', name: 'Communist Party of India (Marxist)', url: 'https://upload.wikimedia.org/wikipedia/en/2/2c/CPI_MLogo.svg' },
  { abbreviation: 'NPP', name: 'National People\'s Party', url: 'https://upload.wikimedia.org/wikipedia/en/0/07/National_People%27s_Party_Logo.svg' },
  { abbreviation: 'AITC', name: 'Trinamool Congress', url: 'https://upload.wikimedia.org/wikipedia/en/2/2c/Trinamool_Congress_Logo.svg' },
  { abbreviation: 'DMK', name: 'Dravida Munnetra Kazhagam', url: 'https://upload.wikimedia.org/wikipedia/en/d/d5/DMK_Logo.svg' },
  { abbreviation: 'AIADMK', name: 'All India Anna Dravida Munnetra Kazhagam', url: 'https://upload.wikimedia.org/wikipedia/en/f/f8/AIADMK_%28new%29_party_flag.svg' },
  { abbreviation: 'BJD', name: 'Biju Janata Dal', url: 'https://upload.wikimedia.org/wikipedia/en/3/3f/Biju_Janata_Dal.svg' },
  { abbreviation: 'SP', name: 'Samajwadi Party', url: 'https://upload.wikimedia.org/wikipedia/en/a/a2/Samajwadi_party_flag.svg' },
  { abbreviation: 'JD(U)', name: 'Janata Dal (United)', url: 'https://upload.wikimedia.org/wikipedia/en/8/84/Janata_Dal_%28United%29.svg' },
  { abbreviation: 'TDP', name: 'Telugu Desam Party', url: 'https://upload.wikimedia.org/wikipedia/en/f/f0/Telugu_Desam_Party_Logo.svg' },
  { abbreviation: 'YSRCP', name: 'YSR Congress Party', url: 'https://upload.wikimedia.org/wikipedia/en/8/8e/YSR_Congress_Logo.svg' },
  { abbreviation: 'RJD', name: 'Rashtriya Janata Dal', url: 'https://upload.wikimedia.org/wikipedia/en/2/2c/Rashtriya_Janata_Dal_flag.svg' },
  { abbreviation: 'SS', name: 'Shiv Sena', url: 'https://upload.wikimedia.org/wikipedia/en/e/e4/Shiv_Sena_Logo.svg' },
  { abbreviation: 'CPI', name: 'Communist Party of India', url: 'https://upload.wikimedia.org/wikipedia/en/3/3b/Communist_Party_of_India_logo.svg' },
];

function downloadWithCurl(url, outputPath) {
  return new Promise((resolve, reject) => {
    const cmd = `curl -L -o "${outputPath}" -A "Mozilla/5.0" "${url}" 2>nul`;
    exec(cmd, { shell: true }, (error) => {
      if (error) {
        reject(error);
      } else {
        // Check if file was actually created
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
          resolve(outputPath);
        } else {
          reject(new Error('File not downloaded or empty'));
        }
      }
    });
  });
}

async function downloadAllImages() {
  try {
    console.log('🔗 Starting party image download with curl...\n');

    if (!fs.existsSync(IMG_FOLDER)) {
      fs.mkdirSync(IMG_FOLDER, { recursive: true });
      console.log(`📁 Created image folder: ${IMG_FOLDER}\n`);
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB\n');

    const downloadResults = {};
    let successCount = 0;

    for (const party of partyImages) {
      const filename = `${party.abbreviation.replace(/[()]/g, '').replace(/\s+/g, '_')}.svg`;
      const filepath = path.join(IMG_FOLDER, filename);

      try {
        console.log(`⬇️  Downloading: ${party.name}...`);
        await downloadWithCurl(party.url, filepath);
        downloadResults[party.abbreviation] = {
          filename: filename,
          localPath: `/img/${filename}`,
          success: true,
        };
        successCount++;
        console.log(`   ✅ Saved as: ${filename}`);
      } catch (error) {
        console.error(`   ❌ Failed: ${error.message}`);
        downloadResults[party.abbreviation] = {
          success: false,
          error: error.message,
        };
      }
    }

    console.log(`\n📊 Download Results:`);
    console.log(`   Successful: ${successCount}/${partyImages.length}`);
    console.log(`   Failed: ${partyImages.length - successCount}/${partyImages.length}\n`);

    // Update database
    console.log('💾 Updating database with local image paths...\n');

    let updateCount = 0;
    for (const [abbreviation, result] of Object.entries(downloadResults)) {
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

    // Display all parties
    const allParties = await Party.find({}).select('name abbreviation image').lean();
    console.log('📋 All Parties with Updated Image Paths:');
    allParties.forEach((party) => {
      const img = party.image.startsWith('/') ? party.image : party.image;
      console.log(`   ${party.abbreviation.padEnd(10)} | ${party.name.padEnd(45)} | ${img}`);
    });

    console.log(`\n✅ Done! ${allParties.length} parties ready\n`);
    console.log(`📂 Images stored in: ${IMG_FOLDER}`);
    console.log(`📂 Total files: ${fs.readdirSync(IMG_FOLDER).length}`);

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

downloadAllImages();
