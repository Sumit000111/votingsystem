/**
 * Download party images from Wikipedia/external sources
 * Save them locally in /frontend/img folder
 * Update MongoDB with local image paths
 * 
 * Run: node backend/seeds/downloadPartyImages.js
 */

require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const Party = require('../models/Party');

// Image download folder
const IMG_FOLDER = path.join(__dirname, '../../frontend/img');

// Party images data - Using alternative sources
const partyImages = [
  {
    abbreviation: 'BJP',
    name: 'Bharatiya Janata Party',
    // Try alternative URL without thumb
    url: 'https://upload.wikimedia.org/wikipedia/en/7/71/Bharatiya_Janata_Party_logo.svg',
  },
  {
    abbreviation: 'INC',
    name: 'Indian National Congress',
    url: 'https://upload.wikimedia.org/wikipedia/en/e/ec/Indian_National_Congress_blank_logo.svg',
  },
  {
    abbreviation: 'AAP',
    name: 'Aam Aadmi Party',
    url: 'https://upload.wikimedia.org/wikipedia/commons/8/8d/Aam_Aadmi_Party_Logo.svg',
  },
  {
    abbreviation: 'BSP',
    name: 'Bahujan Samaj Party',
    url: 'https://upload.wikimedia.org/wikipedia/en/a/a1/Bahujan_Samaj_Party_Logo.svg',
  },
  {
    abbreviation: 'CPI(M)',
    name: 'Communist Party of India (Marxist)',
    url: 'https://upload.wikimedia.org/wikipedia/en/2/2c/CPI_MLogo.svg',
  },
  {
    abbreviation: 'NPP',
    name: 'National People\'s Party',
    url: 'https://upload.wikimedia.org/wikipedia/en/0/07/National_People%27s_Party_Logo.svg',
  },
  {
    abbreviation: 'AITC',
    name: 'Trinamool Congress',
    url: 'https://upload.wikimedia.org/wikipedia/en/2/2c/Trinamool_Congress_Logo.svg',
  },
  {
    abbreviation: 'DMK',
    name: 'Dravida Munnetra Kazhagam',
    url: 'https://upload.wikimedia.org/wikipedia/en/d/d5/DMK_Logo.svg',
  },
  {
    abbreviation: 'AIADMK',
    name: 'All India Anna Dravida Munnetra Kazhagam',
    url: 'https://upload.wikimedia.org/wikipedia/en/f/f8/AIADMK_%28new%29_party_flag.svg',
  },
  {
    abbreviation: 'BJD',
    name: 'Biju Janata Dal',
    url: 'https://upload.wikimedia.org/wikipedia/en/3/3f/Biju_Janata_Dal.svg',
  },
  {
    abbreviation: 'SP',
    name: 'Samajwadi Party',
    url: 'https://upload.wikimedia.org/wikipedia/en/a/a2/Samajwadi_party_flag.svg',
  },
  {
    abbreviation: 'JD(U)',
    name: 'Janata Dal (United)',
    url: 'https://upload.wikimedia.org/wikipedia/en/8/84/Janata_Dal_%28United%29.svg',
  },
  {
    abbreviation: 'TDP',
    name: 'Telugu Desam Party',
    url: 'https://upload.wikimedia.org/wikipedia/en/f/f0/Telugu_Desam_Party_Logo.svg',
  },
  {
    abbreviation: 'YSRCP',
    name: 'YSR Congress Party',
    url: 'https://upload.wikimedia.org/wikipedia/en/8/8e/YSR_Congress_Logo.svg',
  },
  {
    abbreviation: 'RJD',
    name: 'Rashtriya Janata Dal',
    url: 'https://upload.wikimedia.org/wikipedia/en/2/2c/Rashtriya_Janata_Dal_flag.svg',
  },
  {
    abbreviation: 'SS',
    name: 'Shiv Sena',
    url: 'https://upload.wikimedia.org/wikipedia/en/e/e4/Shiv_Sena_Logo.svg',
  },
  {
    abbreviation: 'CPI',
    name: 'Communist Party of India',
    url: 'https://upload.wikimedia.org/wikipedia/en/3/3b/Communist_Party_of_India_logo.svg',
  },
];

/**
 * Download image from URL and save to local folder
 * @param {string} url - Image URL
 * @param {string} filename - Filename to save as
 * @returns {Promise}
 */
function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const filepath = path.join(IMG_FOLDER, filename);
    const file = fs.createWriteStream(filepath);

    const protocol = url.startsWith('https') ? https : http;

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.wikipedia.org/'
      }
    };

    protocol
      .get(url, options, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          return downloadImage(response.headers.location, filename)
            .then(resolve)
            .catch(reject);
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
          return;
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve(filepath);
        });

        file.on('error', (err) => {
          fs.unlink(filepath, () => {});
          reject(err);
        });
      })
      .on('error', (err) => {
        fs.unlink(filepath, () => {});
        reject(err);
      });
  });
}

/**
 * Get file extension from URL
 * @param {string} url - Image URL
 * @returns {string} File extension
 */
function getFileExtension(url) {
  const pathname = url.split('?')[0];
  const ext = path.extname(pathname);
  return ext || '.png'; // Default to .png if no extension
}

/**
 * Main function to download all party images
 */
async function downloadAllImages() {
  try {
    console.log('🔗 Starting party image download...\n');

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

    // Download each party image
    const downloadResults = {};

    for (const party of partyImages) {
      const ext = getFileExtension(party.url);
      const filename = `${party.abbreviation.replace(/[()]/g, '').replace(/\s+/g, '_')}${ext}`;

      try {
        console.log(`⬇️  Downloading: ${party.name}...`);
        const filepath = await downloadImage(party.url, filename);
        downloadResults[party.abbreviation] = {
          filename: filename,
          localPath: `/img/${filename}`,
          success: true,
        };
        console.log(`   ✅ Saved as: ${filename}`);
      } catch (error) {
        console.error(`   ❌ Failed to download: ${error.message}`);
        downloadResults[party.abbreviation] = {
          success: false,
          error: error.message,
        };
      }
    }

    console.log('\n📊 Download Results:');
    console.log(`   Successful: ${Object.values(downloadResults).filter(r => r.success).length}/${partyImages.length}`);
    console.log(`   Failed: ${Object.values(downloadResults).filter(r => !r.success).length}/${partyImages.length}\n`);

    // Update database with local image paths
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

    console.log(`\n✅ Updated ${updateCount} parties in database`);

    // Display all parties with their new image paths
    const allParties = await Party.find({}).select('name abbreviation image').lean();
    console.log('\n📋 All Parties with Image Paths:');
    allParties.forEach((party) => {
      console.log(
        `   ${party.abbreviation.padEnd(10)} | ${party.name.padEnd(45)} | ${party.image}`
      );
    });

    console.log(`\n✅ Complete! ${allParties.length} parties ready for voting system`);
    console.log(`📂 Images stored in: ${IMG_FOLDER}`);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the download
downloadAllImages();
