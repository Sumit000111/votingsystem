const mongoose = require('mongoose');

async function fix() {
  await mongoose.connect('mongodb+srv://notTheXD:SumitJaat%40121@cluster0.fb46w0u.mongodb.net/voting-system?appName=Cluster0');
  try {
    await mongoose.connection.collection('votes').dropIndex('blockHash_1');
    console.log('Successfully dropped blockHash_1 index');
  } catch(e) {
    console.log('Error dropping blockHash_1 index (might not exist):', e.message);
  }
  
  try {
    await mongoose.connection.collection('votes').dropIndex('txHash_1');
    console.log('Successfully dropped txHash_1 index (so Mongoose can recreate it properly)');
  } catch(e) {
    console.log('Error dropping txHash_1 index (might not exist):', e.message);
  }
  
  console.log('Done.');
  process.exit(0);
}
fix();
