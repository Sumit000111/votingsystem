/**
 * Fast tests that need neither MongoDB nor an Ethereum node.
 *   npm test -w backend
 */

process.env.NODE_ENV = 'test';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { ethers } = require('ethers');
const request = require('supertest');

const crypto = require('../utils/crypto');
const explorer = require('../services/explorer');
const chain = require('../services/chain');
const app = require('../app');

describe('crypto utils', () => {
  test('voter id hash is stable and case-insensitive on the voter number', () => {
    assert.equal(crypto.voterIdHash('123456789012', 'abc123'), crypto.voterIdHash('123456789012', 'ABC123'));
    assert.match(crypto.voterIdHash('123456789012', 'ABC123'), /^[0-9a-f]{64}$/);
  });

  test('on-chain voter key is a bytes32 HMAC, distinct from the voter hash', () => {
    const idHash = crypto.voterIdHash('123456789012', 'ABC123');
    const key = crypto.voterKey(idHash);
    assert.ok(ethers.isHexString(key, 32));
    assert.notEqual(key.slice(2), idHash);
    assert.equal(key, crypto.voterKey(idHash));
  });

  test('OTPs are six digits and verified in constant time', () => {
    const otp = crypto.generateOtp();
    assert.match(otp, /^\d{6}$/);
    const hash = crypto.hashOtp(otp);
    assert.equal(crypto.otpMatches(otp, hash), true);
    assert.equal(crypto.otpMatches('000000' === otp ? '111111' : '000000', hash), false);
    assert.equal(crypto.otpMatches(otp, null), false);
  });

  test('phone numbers are masked', () => {
    assert.equal(crypto.maskPhone('9876543210'), '******3210');
  });
});

describe('explorer decoding', () => {
  const iface = chain.getInterface();
  const address = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  const ctx = { address, deployment: { deployTx: '0x' + '11'.repeat(32), electionName: 'Test Election' } };
  const candidateId = ethers.id('Alpha Party');
  const names = new Map([[candidateId, { name: 'Alpha Party', party: 'ALP' }]]);

  test('decodes a castVote call with the candidate label', () => {
    const tx = {
      hash: '0x' + 'ab'.repeat(32),
      from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      to: address,
      nonce: 3,
      index: 0,
      value: 0n,
      data: iface.encodeFunctionData('castVote', [ethers.id('voter'), candidateId]),
    };
    const d = explorer.describeTransaction(tx, ctx, names);
    assert.equal(d.kind, 'vote');
    assert.equal(d.method, 'castVote');
    assert.equal(d.summary, 'Ballot for ALP');
    assert.equal(d.args[1].label, 'Alpha Party (ALP)');
  });

  test('labels phase changes and batch registrations', () => {
    const base = { hash: '0x' + 'cd'.repeat(32), from: address, to: address, nonce: 1, index: 0, value: 0n };
    const phase = explorer.describeTransaction({ ...base, data: iface.encodeFunctionData('setPhase', [2]) }, ctx, names);
    assert.equal(phase.kind, 'phase');
    assert.equal(phase.summary, 'Phase → Ended');
    assert.equal(phase.args[0].label, 'Ended');

    const batch = explorer.describeTransaction(
      { ...base, data: iface.encodeFunctionData('addCandidates', [['A', 'B'], ['a', 'b']]) },
      ctx,
      names
    );
    assert.equal(batch.summary, 'Registered 2 candidates');
  });

  test('recognises the Voting deployment transaction', () => {
    const d = explorer.describeTransaction(
      { hash: ctx.deployment.deployTx, from: address, to: null, nonce: 0, index: 0, value: 0n, data: '0x' },
      ctx,
      names
    );
    assert.equal(d.kind, 'deploy');
    assert.equal(d.args[0].value, 'Test Election');
  });

  test('re-computes a block header hash from its RLP encoding', () => {
    // Header fields of a real Hardhat block (Prague rules).
    const raw = {
      parentHash: '0x' + '00'.repeat(32),
      sha3Uncles: '0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347',
      miner: '0xc014ba5ec014ba5ec014ba5ec014ba5ec014ba5e',
      stateRoot: '0x' + '12'.repeat(32),
      transactionsRoot: '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421',
      receiptsRoot: '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421',
      logsBloom: '0x' + '00'.repeat(256),
      difficulty: '0x0',
      number: '0x0',
      gasLimit: '0x1c9c380',
      gasUsed: '0x0',
      timestamp: '0x66f3a000',
      extraData: '0x',
      mixHash: '0x' + '00'.repeat(32),
      nonce: '0x0000000000000000',
      baseFeePerGas: '0x3b9aca00',
    };
    const items = [
      raw.parentHash, raw.sha3Uncles, raw.miner, raw.stateRoot, raw.transactionsRoot, raw.receiptsRoot,
      raw.logsBloom, '0x', '0x', '0x01c9c380', '0x', '0x66f3a000', '0x', raw.mixHash, raw.nonce, '0x3b9aca00',
    ];
    assert.equal(explorer.computeHeaderHash(raw), ethers.keccak256(ethers.encodeRlp(items)));
  });
});

describe('API guards', () => {
  test('unknown API routes return JSON 404', async () => {
    const res = await request(app).get('/api/does-not-exist');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  test('admin routes require a token', async () => {
    const res = await request(app).get('/api/admin/stats');
    assert.equal(res.status, 401);
  });

  test('admin routes reject forged tokens', async () => {
    const res = await request(app).get('/api/admin/stats').set('Authorization', 'Bearer not-a-jwt');
    assert.equal(res.status, 401);
  });

  test('voter authentication validates input before touching the database', async () => {
    const bad = [
      { aadhaar: '123', voterNumber: 'ABC123', phoneNumber: '9876543210', state: 'Delhi' },
      { aadhaar: '123456789012', voterNumber: '!', phoneNumber: '9876543210', state: 'Delhi' },
      { aadhaar: '123456789012', voterNumber: 'ABC123', phoneNumber: '12345', state: 'Delhi' },
      { aadhaar: '123456789012', voterNumber: 'ABC123', phoneNumber: '9876543210', state: 'Atlantis' },
    ];
    for (const body of bad) {
      const res = await request(app).post('/api/auth/authenticate').send(body);
      assert.equal(res.status, 400, JSON.stringify(body));
    }
  });

  test('admin login rejects numbers outside ADMIN_PHONES', async () => {
    const res = await request(app).post('/api/auth/admin-login').send({ phoneNumber: '9000000000' });
    assert.equal(res.status, 403);
  });

  test('malformed JSON is a 400', async () => {
    const res = await request(app).post('/api/auth/authenticate').set('Content-Type', 'application/json').send('{bad');
    assert.equal(res.status, 400);
  });

  test('receipt verification rejects malformed hashes', async () => {
    const res = await request(app).get('/api/voting/receipt/0x1234');
    assert.equal(res.status, 400);
  });
});
