/**
 * Blockchain gateway: connection to the Ethereum node, the deployed Voting
 * contract, and every state-changing call the backend makes as the election
 * authority (relayer).
 *
 * The deployment (address + deploy block) is read from
 * backend/blockchain/deployment.json, written by `npm run deploy`. The file is
 * re-checked on every access so a redeploy is picked up without a restart.
 */

const fs = require('fs');
const { ethers } = require('ethers');
const config = require('../config');
const HttpError = require('../utils/httpError');

const PHASES = ['Registration', 'Voting', 'Ended'];
const STATUS_TO_PHASE = { preparation: 0, active: 1, completed: 2 };
const CODE_CHECK_TTL_MS = 5_000;

const FRIENDLY_ERRORS = {
  AlreadyVoted: [409, 'This voter has already cast a ballot on the blockchain.'],
  WrongPhase: [409, 'Voting is not open on the blockchain.'],
  ElectionEnded: [409, 'The election has ended on-chain. Results are final and cannot be changed.'],
  UnknownCandidate: [400, 'This candidate is not registered on the blockchain.'],
  CandidateInactive: [400, 'This candidate is not accepting votes.'],
  CandidateExists: [409, 'Candidate is already registered on the blockchain.'],
  NotOwner: [500, 'The backend relayer wallet is not the owner of the Voting contract.'],
  InvalidInput: [400, 'The contract rejected the input.'],
  CHAIN_OFFLINE: [503, `Blockchain node is unreachable at ${config.chain.rpcUrl}. Is \`npm run chain\` running?`],
  NOT_DEPLOYED: [503, 'The Voting contract is not deployed. Run `npm run deploy`.'],
};

class ChainError extends HttpError {
  constructor(code, message, status) {
    const [defaultStatus, friendly] = FRIENDLY_ERRORS[code] || [502, null];
    super(status || defaultStatus, message || friendly || 'Blockchain transaction failed.');
    this.code = code;
  }
}

let provider = null;
let wallet = null;
let abi = null;
let iface = null;
let ctx = null;
let lastContextKey = null;
let cachedDeployment = { mtimeMs: -1, data: null };
let writeQueue = Promise.resolve();
const deploymentListeners = new Set();

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function getAbi() {
  if (!abi) {
    abi = JSON.parse(fs.readFileSync(config.chain.abiFile, 'utf8'));
    iface = new ethers.Interface(abi);
  }
  return abi;
}

function getInterface() {
  getAbi();
  return iface;
}

function readDeploymentFile() {
  let stat;
  try {
    stat = fs.statSync(config.chain.deploymentFile);
  } catch {
    cachedDeployment = { mtimeMs: -1, data: null };
    return null;
  }
  if (stat.mtimeMs !== cachedDeployment.mtimeMs) {
    try {
      const data = JSON.parse(fs.readFileSync(config.chain.deploymentFile, 'utf8'));
      cachedDeployment = { mtimeMs: stat.mtimeMs, data };
    } catch {
      // Partially written file — keep the previous one until it is complete.
      return cachedDeployment.data;
    }
  }
  return cachedDeployment.data;
}

function readDeployment() {
  const file = readDeploymentFile();
  const override = config.chain.contractAddress;
  if (!override) return file;
  const sameContract = file && file.address && file.address.toLowerCase() === override.toLowerCase();
  return {
    ...(sameContract ? file : {}),
    address: override,
    deployBlock: sameContract ? file.deployBlock : Number(process.env.CONTRACT_DEPLOY_BLOCK || 0),
  };
}

function getProvider() {
  if (!provider) {
    const deployment = readDeployment();
    const chainId =
      config.chain.chainId ?? deployment?.chainId ?? (config.chain.isLocalRpc ? 31337 : undefined);
    const network = chainId ? ethers.Network.from(chainId) : undefined;
    provider = new ethers.JsonRpcProvider(config.chain.rpcUrl, network, {
      staticNetwork: network,
      pollingInterval: config.chain.pollingIntervalMs,
      // No response caching: nonces and block data must always be fresh.
      cacheTimeout: -1,
    });
    wallet = new ethers.Wallet(config.chain.relayerKey, provider);
  }
  return provider;
}

function getWallet() {
  getProvider();
  return wallet;
}

/** Current contract context, or null when nothing is deployed. */
function getContext() {
  const deployment = readDeployment();
  if (!deployment || !deployment.address) {
    ctx = null;
    return null;
  }
  const key = `${deployment.address}:${deployment.deployTx || ''}:${deployment.deployedAt || ''}`;
  if (!ctx || ctx.key !== key) {
    const changed = lastContextKey !== null && lastContextKey !== key;
    lastContextKey = key;
    ctx = {
      key,
      address: ethers.getAddress(deployment.address),
      deployment,
      contract: new ethers.Contract(deployment.address, getAbi(), getWallet()),
      codeCheckedAt: 0,
    };
    if (changed) deploymentListeners.forEach((fn) => fn(ctx));
  }
  return ctx;
}

function onDeploymentChange(fn) {
  deploymentListeners.add(fn);
  return () => deploymentListeners.delete(fn);
}

/** Context with verified contract code, or throws a ChainError. */
async function requireDeployed() {
  const c = getContext();
  if (!c) throw new ChainError('NOT_DEPLOYED');
  if (Date.now() - c.codeCheckedAt > CODE_CHECK_TTL_MS) {
    let code;
    try {
      code = await getProvider().getCode(c.address);
    } catch (err) {
      throw toChainError(err);
    }
    if (code === '0x') {
      throw new ChainError(
        'NOT_DEPLOYED',
        `No contract code at ${c.address}. The chain was probably restarted — run \`npm run deploy\`.`
      );
    }
    c.codeCheckedAt = Date.now();
  }
  return c;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

function decodeRevert(err) {
  if (err?.revert?.name) return err.revert;
  const data = err?.data || err?.info?.error?.data || err?.error?.data;
  if (typeof data === 'string' && data.length >= 10) {
    try {
      return getInterface().parseError(data);
    } catch {
      return null;
    }
  }
  return null;
}

function toChainError(err) {
  if (err instanceof ChainError) return err;
  const revert = decodeRevert(err);
  if (revert?.name) return new ChainError(revert.name);

  const text = `${err?.code || ''} ${err?.message || ''}`;
  if (/ECONNREFUSED|ECONNRESET|ENOTFOUND|NETWORK_ERROR|fetch failed|socket hang up/i.test(text)) {
    return new ChainError('CHAIN_OFFLINE');
  }
  if (err?.code === 'BAD_DATA' && err?.value === '0x') {
    return new ChainError('NOT_DEPLOYED', 'No contract at the configured address — run `npm run deploy`.');
  }
  return new ChainError(err?.code || 'CHAIN_ERROR', err?.shortMessage || err?.message);
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

async function getStatus() {
  const status = { rpcUrl: config.chain.rpcUrl, connected: false, contract: null };
  try {
    const p = getProvider();
    const [network, blockNumber, balance] = await Promise.all([
      p.getNetwork(),
      p.getBlockNumber(),
      p.getBalance(getWallet().address),
    ]);
    status.connected = true;
    status.chainId = Number(network.chainId);
    status.blockNumber = blockNumber;
    status.relayer = { address: wallet.address, balance: ethers.formatEther(balance) };
  } catch (err) {
    status.error = toChainError(err).message;
    return status;
  }

  let c;
  try {
    c = await requireDeployed();
  } catch (err) {
    status.contract = { deployed: false, address: getContext()?.address || null, reason: err.message };
    return status;
  }

  const [owner, phase, totalVotes, electionName, candidateCount] = await Promise.all([
    c.contract.owner(),
    c.contract.phase(),
    c.contract.totalVotes(),
    c.contract.electionName(),
    c.contract.candidateCount(),
  ]);

  status.contract = {
    deployed: true,
    address: c.address,
    owner,
    relayerIsOwner: owner.toLowerCase() === wallet.address.toLowerCase(),
    electionName,
    phase: PHASES[Number(phase)],
    phaseIndex: Number(phase),
    totalVotes: Number(totalVotes),
    candidateCount: Number(candidateCount),
    deployBlock: c.deployment.deployBlock ?? 0,
    deployTx: c.deployment.deployTx || null,
    deployedAt: c.deployment.deployedAt || null,
    network: c.deployment.network || null,
  };
  return status;
}

async function getOnChainCandidates() {
  const { contract } = await requireDeployed();
  try {
    const list = await contract.getAllCandidates();
    return list.map((c) => ({
      id: c.id,
      name: c.name,
      party: c.party,
      voteCount: Number(c.voteCount),
      active: c.active,
    }));
  } catch (err) {
    throw toChainError(err);
  }
}

async function getPhaseIndex() {
  const { contract } = await requireDeployed();
  return Number(await contract.phase());
}

// ---------------------------------------------------------------------------
// Writes (serialised so the relayer's nonces never collide)
// ---------------------------------------------------------------------------

function enqueue(fn) {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.catch(() => {});
  return run;
}

async function send(method, args) {
  const { contract } = await requireDeployed();
  try {
    const tx = await enqueue(() => contract[method](...args));
    const receipt = await tx.wait();
    const block = await getProvider().getBlock(receipt.blockNumber);
    return {
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed.toString(),
      timestamp: block ? new Date(block.timestamp * 1000).toISOString() : null,
    };
  } catch (err) {
    throw toChainError(err);
  }
}

function castVote(voterKey, candidateId) {
  return send('castVote', [voterKey, candidateId]);
}

async function setPhaseForStatus(status) {
  const target = STATUS_TO_PHASE[status];
  if (target === undefined) throw new HttpError(400, `Unknown election status "${status}"`);
  const current = await getPhaseIndex();
  if (current === target) return null;
  if (current === STATUS_TO_PHASE.completed) throw new ChainError('ElectionEnded');
  return send('setPhase', [target]);
}

async function registerCandidates(parties) {
  const receipts = [];
  for (let i = 0; i < parties.length; i += 20) {
    const chunk = parties.slice(i, i + 20);
    receipts.push(
      await send('addCandidates', [chunk.map((p) => p.name), chunk.map((p) => p.abbreviation)])
    );
  }
  return receipts;
}

/** Make the on-chain candidate state match the party's `isActive` flag. */
async function syncCandidate(party) {
  const onChain = (await getOnChainCandidates()).find((c) => c.id === party.chainId);
  if (!onChain) {
    return party.isActive ? (await registerCandidates([party]))[0] : null;
  }
  if (onChain.active === party.isActive) return null;
  return send('setCandidateActive', [party.chainId, party.isActive]);
}

let syncInFlight = null;

/**
 * Reconcile the contract with MongoDB: register active parties, mirror
 * active/inactive flags and align the phase with the election status.
 */
function syncWithDatabase() {
  if (!syncInFlight) {
    syncInFlight = doSync().finally(() => {
      syncInFlight = null;
    });
  }
  return syncInFlight;
}

async function doSync() {
  const Party = require('../models/Party');
  const ElectionSettings = require('../models/ElectionSettings');

  await requireDeployed();
  const actions = [];
  const phase = await getPhaseIndex();
  if (phase === STATUS_TO_PHASE.completed) {
    return { actions, note: 'Election has ended on-chain; nothing to synchronise.' };
  }

  const parties = await Party.find({});
  const chainById = new Map((await getOnChainCandidates()).map((c) => [c.id, c]));

  const toRegister = parties.filter((p) => p.isActive && !chainById.has(p.chainId));
  if (toRegister.length) {
    await registerCandidates(toRegister);
    actions.push(`Registered ${toRegister.length} candidate(s) on-chain`);
  }

  for (const party of parties) {
    const onChain = chainById.get(party.chainId);
    if (onChain && onChain.active !== party.isActive) {
      await send('setCandidateActive', [party.chainId, party.isActive]);
      actions.push(`${party.isActive ? 'Activated' : 'Deactivated'} ${party.abbreviation} on-chain`);
    }
  }

  const settings = await ElectionSettings.current();
  const receipt = await setPhaseForStatus(settings.status);
  if (receipt) actions.push(`Moved contract phase to ${PHASES[STATUS_TO_PHASE[settings.status]]}`);

  return { actions };
}

module.exports = {
  PHASES,
  STATUS_TO_PHASE,
  ChainError,
  getProvider,
  getWallet,
  getInterface,
  getContext,
  requireDeployed,
  onDeploymentChange,
  toChainError,
  getStatus,
  getOnChainCandidates,
  getPhaseIndex,
  castVote,
  setPhaseForStatus,
  syncCandidate,
  syncWithDatabase,
};
