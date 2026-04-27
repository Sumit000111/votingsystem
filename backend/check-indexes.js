require('dotenv').config();
const mongoose = require('mongoose');

const checkIndexes = async () => {
  try {
    const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/voting-system';
    await mongoose.connect(mongodbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
    
    const indexes = await mongoose.connection.collection('users').indexes();
    console.log('Indexes on users collection:');
    console.log(JSON.stringify(indexes, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

checkIndexes();
