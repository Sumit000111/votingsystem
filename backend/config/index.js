/**
 * Central configuration. Everything environment-specific lives in backend/.env
 * (see .env.example). Safe development defaults are provided so the stack runs
 * out of the box against a local Hardhat node and MongoDB.
 */

const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';
const isTest = env === 'test';

// Hardhat's well-known account #0. Only ever used against a local node.
const HARDHAT_DEV_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

const warnings = [];

function secret(name, devFallback) {
  const value = process.env[name];
  if (value) return value;
  if (isProd) throw new Error(`${name} must be set in production`);
  warnings.push(`${name} is not set — using an insecure development default`);
  return devFallback;
}

const rpcUrl = process.env.RPC_URL || 'http://127.0.0.1:8545';
const isLocalRpc = /^https?:\/\/(127\.0\.0\.1|localhost|0\.0\.0\.0)(:\d+)?/.test(rpcUrl);

let relayerKey = process.env.RELAYER_PRIVATE_KEY || process.env.BLOCKCHAIN_PRIVATE_KEY;
if (!relayerKey) {
  if (!isLocalRpc) throw new Error('RELAYER_PRIVATE_KEY must be set for non-local RPC endpoints');
  relayerKey = HARDHAT_DEV_KEY;
}

const renflairApiKey = process.env.RENFLAIR_API_KEY || '';

const config = {
  env,
  isProd,
  isTest,
  port: Number(process.env.PORT) || 5000,
  corsOrigin: process.env.CORS_ORIGIN || '*',

  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/voting-system',

  jwtSecret: secret('JWT_SECRET', 'dev-only-insecure-jwt-secret'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',

  // Pepper used to derive the anonymous on-chain voter key from the voter hash.
  voterKeySecret: secret('VOTER_KEY_SECRET', 'dev-only-insecure-voter-key-secret'),

  chain: {
    rpcUrl,
    isLocalRpc,
    relayerKey,
    contractAddress: process.env.CONTRACT_ADDRESS || '',
    chainId: process.env.CHAIN_ID ? Number(process.env.CHAIN_ID) : undefined,
    deploymentFile:
      process.env.DEPLOYMENT_FILE || path.join(__dirname, '..', 'blockchain', 'deployment.json'),
    abiFile: path.join(__dirname, '..', 'blockchain', 'abi', 'Voting.json'),
    pollingIntervalMs: Number(process.env.CHAIN_POLLING_MS) || (isLocalRpc ? 1000 : 4000),
  },

  sms: {
    renflairApiKey,
  },

  otp: {
    ttlMinutes: Number(process.env.OTP_TTL_MINUTES) || 10,
    maxAttempts: 5,
    resendCooldownSeconds: 30,
    // Without an SMS gateway the OTP is printed to the server log and, outside
    // production, returned in the API response so the flow can be tested.
    exposeInResponse: !isProd && !renflairApiKey,
  },

  // Comma-separated list of phone numbers allowed to sign in as admin.
  adminPhones: (process.env.ADMIN_PHONES || '9694671392')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean),

  rateLimit: {
    authWindowMs: 15 * 60 * 1000,
    authMax: Number(process.env.AUTH_RATE_LIMIT) || (isProd ? 30 : 300),
  },

  frontendDist: path.join(__dirname, '..', '..', 'frontend', 'dist'),

  warnings,
};

if (!renflairApiKey && !isTest) {
  warnings.push('RENFLAIR_API_KEY is not set — OTPs are logged to the console instead of sent by SMS');
}

module.exports = config;
