const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const Vote = require('./models/Vote');

async function flushDatabase() {
    console.log("Connecting to MongoDB Database...");
    try {
        await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        
        console.log("Emptying Blockchain Log Mappings (Votes)...");
        await Vote.deleteMany({});
        
        console.log("Resetting User Registration Flags...");
        await User.updateMany({}, { $set: { hasVoted: false, votedFor: null } });
        
        console.log("Database natively scrubbed and primed for fresh instances!");
    } catch (e) {
        console.error("Flush Failure:", e);
    } finally {
        process.exit(0);
    }
}
flushDatabase();
