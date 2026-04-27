require('dotenv').config();
const jwt = require('jsonwebtoken');

const userId = '69e948c39296f53760afff43';
const voterIdHash = 'bb450a3c64ecfb7a95193d97d4a336642e2e4fbfa00c60a60d7a99bca316815d';

const token = jwt.sign(
  {
    userId,
    voterIdHash,
    isOtpVerified: true,
    state: 'Delhi',
  },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

console.log(token);
