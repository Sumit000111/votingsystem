/**
 * Block explorer for the admin dashboard: blocks, transactions and contract
 * events decoded against the Voting ABI, a header-level integrity check that
 * re-hashes every block, and a live block feed (Server-Sent Events).
 */

const { ethers } = require('ethers');
const chain = require('./chain');
const HttpError = require('../utils/httpError');

const KIND_BY_METHOD = {
  castVote: 'vote',
  addCandidate: 'candidate',
  addCandidates: 'candidate',
  setCandidateActive: 'candidate',
  setPhase: 'phase',
  transferOwnership: 'admin',
};

const PHASE_ARGS = new Set(['next', 'previous', 'current']);

// Header fields in RLP order. Later fields only exist after their hard fork
// (London, Shanghai, Cancun, Prague) and are included when the node returns them.
const HEADER_FIELDS = [
  ['parentHash', 'bytes'],
  ['sha3Uncles', 'bytes'],
  ['miner', 'bytes'],
  ['stateRoot', 'bytes'],
  ['transactionsRoot', 'bytes'],
  ['receiptsRoot', 'bytes'],
  ['logsBloom', 'bytes'],
  ['difficulty', 'quantity'],
  ['number', 'quantity'],
  ['gasLimit', 'quantity'],
  ['gasUsed', 'quantity'],
  ['timestamp', 'quantity'],
  ['extraData', 'bytes'],
  ['mixHash', 'bytes'],
  ['nonce', 'bytes'],
  ['baseFeePerGas', 'quantity'],
  ['withdrawalsRoot', 'bytes'],
  ['blobGasUsed', 'quantity'],
  ['excessBlobGas', 'quantity'],
  ['parentBeaconBlockRoot', 'bytes'],
  ['requestsHash', 'bytes'],
];

const short = (hash) => (hash ? `${hash.slice(0, 8)}…${hash.slice(-4)}` : '');

// ---------------------------------------------------------------------------
// Decoding helpers
// ---------------------------------------------------------------------------

function plain(value) {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(plain);
  return value;
}

function formatArgs(inputs, values, names) {
  return inputs.map((input, i) => {
    const value = plain(values[i]);
    const arg = { name: input.name, type: input.type, value };
    if (input.type === 'uint8' && PHASE_ARGS.has(input.name)) {
      arg.label = chain.PHASES[Number(value)] || null;
    } else if (input.type === 'bytes32' && input.name === 'candidateId') {
      const c = names.get(value);
      if (c) arg.label = `${c.name} (${c.party})`;
    }
    return arg;
  });
}

function argValue(args, name) {
  return args.find((a) => a.name === name)?.value;
}

function summarizeCall(method, args, names) {
  const candidate = names.get(argValue(args, 'candidateId'));
  switch (method) {
    case 'castVote':
      return `Ballot for ${candidate ? candidate.party || candidate.name : short(argValue(args, 'candidateId'))}`;
    case 'addCandidate':
      return `Registered ${argValue(args, 'party') || argValue(args, 'name')}`;
    case 'addCandidates': {
      const count = argValue(args, 'names').length;
      return `Registered ${count} candidate${count === 1 ? '' : 's'}`;
    }
    case 'setCandidateActive':
      return `${argValue(args, 'active') ? 'Activated' : 'Deactivated'} ${candidate ? candidate.party : 'candidate'}`;
    case 'setPhase':
      return `Phase → ${chain.PHASES[Number(argValue(args, 'next'))]}`;
    case 'transferOwnership':
      return `Ownership → ${short(argValue(args, 'newOwner'))}`;
    default:
      return method;
  }
}

function describeTransaction(tx, c, names) {
  const base = {
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    nonce: tx.nonce,
    index: tx.index,
    value: ethers.formatEther(tx.value || 0n),
  };

  if (!tx.to) {
    const isVoting = Boolean(c && c.deployment.deployTx && c.deployment.deployTx.toLowerCase() === tx.hash.toLowerCase());
    return {
      ...base,
      kind: 'deploy',
      method: 'constructor',
      args: isVoting && c.deployment.electionName ? [{ name: 'name_', type: 'string', value: c.deployment.electionName }] : [],
      summary: isVoting ? 'Deployed Voting contract' : 'Contract creation',
    };
  }

  if (c && tx.to.toLowerCase() === c.address.toLowerCase()) {
    let parsed = null;
    try {
      parsed = chain.getInterface().parseTransaction({ data: tx.data, value: tx.value });
    } catch {
      parsed = null;
    }
    if (!parsed) return { ...base, kind: 'other', method: 'unknown', args: [], summary: 'Unrecognised contract call' };
    const args = formatArgs(parsed.fragment.inputs, parsed.args, names);
    return {
      ...base,
      kind: KIND_BY_METHOD[parsed.name] || 'other',
      method: parsed.name,
      signature: parsed.signature,
      selector: parsed.selector,
      args,
      summary: summarizeCall(parsed.name, args, names),
    };
  }

  const isTransfer = !tx.data || tx.data === '0x';
  return {
    ...base,
    kind: isTransfer ? 'transfer' : 'other',
    method: isTransfer ? 'transfer' : 'call',
    args: [],
    summary: isTransfer ? `Transfer ${base.value} ETH` : 'External contract call',
  };
}

function decodeLogs(logs, c, names) {
  const iface = chain.getInterface();
  return logs.map((log) => {
    const base = { logIndex: log.index ?? log.logIndex, address: log.address };
    if (!c || log.address.toLowerCase() !== c.address.toLowerCase()) {
      return { ...base, name: 'UnknownLog', topics: log.topics, data: log.data, args: [] };
    }
    let parsed = null;
    try {
      parsed = iface.parseLog({ topics: log.topics, data: log.data });
    } catch {
      parsed = null;
    }
    if (!parsed) return { ...base, name: 'UnknownLog', topics: log.topics, data: log.data, args: [] };
    return {
      ...base,
      name: parsed.name,
      signature: parsed.signature,
      topic: parsed.topic,
      args: formatArgs(parsed.fragment.inputs, parsed.args, names),
    };
  });
}

async function candidateNames() {
  try {
    const list = await chain.getOnChainCandidates();
    return new Map(list.map((c) => [c.id, c]));
  } catch {
    return new Map();
  }
}

async function contextIfDeployed() {
  try {
    return await chain.requireDeployed();
  } catch {
    return chain.getContext();
  }
}

function summarizeBlock(block, c, names) {
  const transactions = (block.prefetchedTransactions || []).map((tx) => describeTransaction(tx, c, names));
  return {
    number: block.number,
    hash: block.hash,
    parentHash: block.parentHash,
    timestamp: block.timestamp,
    miner: block.miner,
    gasUsed: block.gasUsed.toString(),
    gasLimit: block.gasLimit.toString(),
    baseFeePerGas: block.baseFeePerGas != null ? block.baseFeePerGas.toString() : null,
    txCount: transactions.length,
    transactions,
  };
}

// ---------------------------------------------------------------------------
// Header verification
// ---------------------------------------------------------------------------

function computeHeaderHash(raw) {
  const items = [];
  for (const [field, kind] of HEADER_FIELDS) {
    const value = raw[field];
    if (value === undefined || value === null) continue;
    items.push(kind === 'quantity' ? ethers.hexlify(ethers.toBeArray(BigInt(value))) : value);
  }
  return ethers.keccak256(ethers.encodeRlp(items));
}

function rawBlock(tag) {
  const param = typeof tag === 'number' ? ethers.toQuantity(tag) : tag;
  const method = typeof tag === 'string' && tag.length === 66 ? 'eth_getBlockByHash' : 'eth_getBlockByNumber';
  return chain.getProvider().send(method, [param, false]);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

async function withChain(fn) {
  try {
    return await fn(chain.getProvider());
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw chain.toChainError(err);
  }
}

async function getOverview() {
  const status = await chain.getStatus();
  if (!status.connected) return { status };

  return withChain(async (provider) => {
    const [feeData, clientVersion, latest] = await Promise.all([
      provider.getFeeData(),
      provider.send('web3_clientVersion', []).catch(() => null),
      provider.getBlock('latest'),
    ]);

    let eventCounts = null;
    const c = status.contract?.deployed ? chain.getContext() : null;
    if (c) {
      const logs = await provider.getLogs({ address: c.address, fromBlock: c.deployment.deployBlock || 0, toBlock: 'latest' });
      eventCounts = {};
      for (const log of decodeLogs(logs, c, new Map())) {
        eventCounts[log.name] = (eventCounts[log.name] || 0) + 1;
      }
    }

    return {
      status,
      clientVersion,
      gasPrice: feeData.gasPrice != null ? feeData.gasPrice.toString() : null,
      latestBlock: latest
        ? { number: latest.number, hash: latest.hash, timestamp: latest.timestamp, txCount: latest.transactions.length }
        : null,
      eventCounts,
    };
  });
}

async function listBlocks({ before, limit = 20 } = {}) {
  return withChain(async (provider) => {
    const size = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const latest = await provider.getBlockNumber();
    const top = before !== undefined && before !== null && before !== '' ? Math.min(Number(before) - 1, latest) : latest;

    const numbers = [];
    for (let n = top; n >= 0 && numbers.length < size; n--) numbers.push(n);

    const [c, names] = await Promise.all([contextIfDeployed(), candidateNames()]);
    const blocks = await Promise.all(numbers.map((n) => provider.getBlock(n, true)));
    const last = numbers[numbers.length - 1];

    return {
      latest,
      blocks: blocks.filter(Boolean).map((b) => summarizeBlock(b, c, names)),
      nextBefore: last > 0 ? last : null,
    };
  });
}

async function getBlock(id) {
  return withChain(async (provider) => {
    const tag = /^\d+$/.test(String(id)) ? Number(id) : String(id);
    if (typeof tag === 'string' && !ethers.isHexString(tag, 32)) throw new HttpError(400, 'Invalid block number or hash');

    const [block, raw] = await Promise.all([provider.getBlock(tag, true), rawBlock(tag)]);
    if (!block || !raw) throw new HttpError(404, `Block ${id} not found`);

    const [c, names, latest, receipts, parent] = await Promise.all([
      contextIfDeployed(),
      candidateNames(),
      provider.getBlockNumber(),
      Promise.all(block.prefetchedTransactions.map((tx) => provider.getTransactionReceipt(tx.hash))),
      block.number > 0 ? provider.getBlock(block.number - 1) : null,
    ]);

    const summary = summarizeBlock(block, c, names);
    summary.transactions = summary.transactions.map((tx, i) => {
      const receipt = receipts[i];
      return {
        ...tx,
        status: receipt ? receipt.status : null,
        gasUsed: receipt ? receipt.gasUsed.toString() : null,
        fee: receipt ? ethers.formatEther(receipt.gasUsed * (receipt.gasPrice || 0n)) : null,
        events: receipt ? decodeLogs(receipt.logs, c, names) : [],
      };
    });

    const computedHash = computeHeaderHash(raw);
    return {
      ...summary,
      header: {
        stateRoot: raw.stateRoot,
        transactionsRoot: raw.transactionsRoot,
        receiptsRoot: raw.receiptsRoot,
        sha3Uncles: raw.sha3Uncles,
        extraData: raw.extraData,
        mixHash: raw.mixHash,
        nonce: raw.nonce,
        difficulty: BigInt(raw.difficulty).toString(),
        size: raw.size ? Number(BigInt(raw.size)) : null,
        blobGasUsed: raw.blobGasUsed != null ? BigInt(raw.blobGasUsed).toString() : null,
        parentBeaconBlockRoot: raw.parentBeaconBlockRoot || null,
      },
      verification: {
        computedHash,
        hashValid: computedHash === raw.hash,
        parentLinked: block.number === 0 ? true : Boolean(parent && parent.hash === block.parentHash),
      },
      confirmations: latest - block.number + 1,
      latest,
      prev: block.number > 0 ? block.number - 1 : null,
      next: block.number < latest ? block.number + 1 : null,
    };
  });
}

async function getTransaction(hash) {
  if (!ethers.isHexString(hash, 32)) throw new HttpError(400, 'Invalid transaction hash');
  const Vote = require('../models/Vote');

  return withChain(async (provider) => {
    const [tx, receipt] = await Promise.all([provider.getTransaction(hash), provider.getTransactionReceipt(hash)]);
    if (!tx) throw new HttpError(404, 'Transaction not found on this chain');

    const [c, names, latest, block, vote] = await Promise.all([
      contextIfDeployed(),
      candidateNames(),
      provider.getBlockNumber(),
      receipt ? provider.getBlock(receipt.blockNumber) : null,
      Vote.findOne({ txHash: hash }).lean(),
    ]);

    const described = describeTransaction(tx, c, names);
    const events = receipt ? decodeLogs(receipt.logs, c, names) : [];

    let dbRecord = null;
    if (vote) {
      const voteEvent = events.find((e) => e.name === 'VoteCast');
      const chainCandidateId = voteEvent ? argValue(voteEvent.args, 'candidateId') : argValue(described.args, 'candidateId');
      const chainVoterKey = voteEvent ? argValue(voteEvent.args, 'voterKey') : argValue(described.args, 'voterKey');
      dbRecord = {
        id: vote._id,
        candidateSelected: vote.candidateSelected,
        partyAbbreviation: vote.partyAbbreviation,
        electionType: vote.electionType,
        state: vote.state,
        votedAt: vote.votedAt,
        isDisqualified: vote.isDisqualified,
        auditReason: vote.auditReason,
        checks: {
          candidateMatches: ethers.id(vote.candidateSelected) === chainCandidateId,
          voterKeyMatches: !vote.voterKey || vote.voterKey === chainVoterKey,
        },
      };
    }

    return {
      ...described,
      data: tx.data,
      gasLimit: tx.gasLimit.toString(),
      gasPrice: tx.gasPrice != null ? tx.gasPrice.toString() : null,
      maxFeePerGas: tx.maxFeePerGas != null ? tx.maxFeePerGas.toString() : null,
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas != null ? tx.maxPriorityFeePerGas.toString() : null,
      type: tx.type,
      chainId: tx.chainId.toString(),
      signature: tx.signature ? { r: tx.signature.r, s: tx.signature.s, v: tx.signature.v } : null,
      callSignature: described.signature || null,
      receipt: receipt
        ? {
            status: receipt.status,
            gasUsed: receipt.gasUsed.toString(),
            cumulativeGasUsed: receipt.cumulativeGasUsed.toString(),
            effectiveGasPrice: (receipt.gasPrice || 0n).toString(),
            fee: ethers.formatEther(receipt.gasUsed * (receipt.gasPrice || 0n)),
            contractAddress: receipt.contractAddress,
          }
        : null,
      block: block ? { number: block.number, hash: block.hash, timestamp: block.timestamp } : null,
      confirmations: receipt ? latest - receipt.blockNumber + 1 : 0,
      events,
      dbRecord,
    };
  });
}

async function listEvents({ limit = 50, name } = {}) {
  return withChain(async (provider) => {
    const c = await chain.requireDeployed();
    const names = await candidateNames();
    const logs = await provider.getLogs({ address: c.address, fromBlock: c.deployment.deployBlock || 0, toBlock: 'latest' });

    const decoded = decodeLogs(logs, c, names).map((event, i) => ({
      ...event,
      blockNumber: logs[i].blockNumber,
      transactionHash: logs[i].transactionHash,
    }));

    const counts = {};
    for (const e of decoded) counts[e.name] = (counts[e.name] || 0) + 1;

    const size = Math.min(Math.max(Number(limit) || 50, 1), 500);
    const filtered = (name ? decoded.filter((e) => e.name === name) : decoded).reverse().slice(0, size);

    const blockNumbers = [...new Set(filtered.map((e) => e.blockNumber))];
    const blocks = await Promise.all(blockNumbers.map((n) => provider.getBlock(n)));
    const timestamps = new Map(blocks.filter(Boolean).map((b) => [b.number, b.timestamp]));

    return {
      total: decoded.length,
      counts,
      events: filtered.map((e) => ({ ...e, timestamp: timestamps.get(e.blockNumber) || null })),
    };
  });
}

/**
 * Re-hash every block header in range, check each block links to its parent,
 * and check the contract ledger is internally consistent.
 */
async function verifyIntegrity({ limit = 500 } = {}) {
  return withChain(async (provider) => {
    const size = Math.min(Math.max(Number(limit) || 500, 1), 5000);
    const latest = await provider.getBlockNumber();
    const from = Math.max(0, latest - size + 1);

    const numbers = [];
    for (let n = from; n <= latest; n++) numbers.push(n);
    const [raws, parentOfFirst] = await Promise.all([
      Promise.all(numbers.map((n) => rawBlock(n))),
      from > 0 ? rawBlock(from - 1) : null,
    ]);

    let prevHash = parentOfFirst ? parentOfFirst.hash : null;
    const blocks = raws.map((raw) => {
      const number = Number(BigInt(raw.number));
      const computedHash = computeHeaderHash(raw);
      const hashValid = computedHash === raw.hash;
      const linked = number === 0 ? true : raw.parentHash === prevHash;
      prevHash = raw.hash;
      return {
        number,
        hash: raw.hash,
        parentHash: raw.parentHash,
        computedHash,
        hashValid,
        linked,
        txCount: raw.transactions.length,
      };
    });

    let ledger = null;
    const c = await contextIfDeployed();
    if (c) {
      try {
        const [totalVotes, candidates, voteLogs] = await Promise.all([
          c.contract.totalVotes(),
          chain.getOnChainCandidates(),
          provider.getLogs({
            address: c.address,
            fromBlock: c.deployment.deployBlock || 0,
            toBlock: 'latest',
            topics: [chain.getInterface().getEvent('VoteCast').topicHash],
          }),
        ]);
        const sumOfTallies = candidates.reduce((sum, cand) => sum + cand.voteCount, 0);
        ledger = {
          totalVotes: Number(totalVotes),
          sumOfTallies,
          voteEvents: voteLogs.length,
          consistent: Number(totalVotes) === sumOfTallies && sumOfTallies === voteLogs.length,
        };
      } catch {
        ledger = null;
      }
    }

    const broken = blocks.filter((b) => !b.hashValid || !b.linked);
    return {
      checkedAt: new Date().toISOString(),
      from,
      to: latest,
      checked: blocks.length,
      valid: broken.length === 0 && (!ledger || ledger.consistent),
      brokenBlocks: broken.map((b) => b.number),
      blocks,
      ledger,
    };
  });
}

// ---------------------------------------------------------------------------
// Live block stream
// ---------------------------------------------------------------------------

const streamClients = new Set();
let blockListener = null;

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of streamClients) res.write(payload);
}

async function handleNewBlock(number) {
  try {
    const provider = chain.getProvider();
    const [block, c, names] = await Promise.all([provider.getBlock(number, true), contextIfDeployed(), candidateNames()]);
    if (!block) return;
    const summary = summarizeBlock(block, c, names);
    broadcast('block', {
      number: summary.number,
      hash: summary.hash,
      timestamp: summary.timestamp,
      txCount: summary.txCount,
      kinds: summary.transactions.map((t) => t.kind),
      summaries: summary.transactions.map((t) => t.summary),
    });
  } catch {
    // The next block (or the client's fallback polling) will catch up.
  }
}

function subscribe(res) {
  streamClients.add(res);
  if (!blockListener) {
    blockListener = (n) => handleNewBlock(n);
    chain.getProvider().on('block', blockListener);
  }
  return () => {
    streamClients.delete(res);
    if (streamClients.size === 0 && blockListener) {
      chain.getProvider().off('block', blockListener);
      blockListener = null;
    }
  };
}

module.exports = {
  computeHeaderHash,
  describeTransaction,
  getOverview,
  listBlocks,
  getBlock,
  getTransaction,
  listEvents,
  verifyIntegrity,
  subscribe,
};
