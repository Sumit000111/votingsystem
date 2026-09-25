import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router';
import { get } from '../../api/client.js';
import BlockDetail from '../../components/chain/BlockDetail.jsx';
import ChainStrip from '../../components/chain/ChainStrip.jsx';
import EventsFeed from '../../components/chain/EventsFeed.jsx';
import IntegrityPanel from '../../components/chain/IntegrityPanel.jsx';
import { KindLegend } from '../../components/chain/kinds.jsx';
import { Alert, Loading, StatTile } from '../../components/ui.jsx';
import { formatGwei, formatNumber } from '../../utils/format.js';

const PAGE = 24;

function mergeBlocks(current, incoming) {
  const byNumber = new Map(current.map((b) => [b.number, b]));
  for (const b of incoming) {
    const existing = byNumber.get(b.number);
    // Same height, different hash → the node was restarted; start over.
    if (existing && existing.hash !== b.hash) return { reset: true, blocks: incoming };
    byNumber.set(b.number, b);
  }
  return { reset: false, blocks: [...byNumber.values()].sort((a, b) => b.number - a.number) };
}

export default function Explorer() {
  const navigate = useNavigate();
  const { chain, tick } = useOutletContext();
  const [blocks, setBlocks] = useState([]);
  const [nextBefore, setNextBefore] = useState(null);
  const [error, setError] = useState(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [selected, setSelected] = useState(null);
  const [followLatest, setFollowLatest] = useState(true);
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState(null);
  const [fresh, setFresh] = useState(new Set());
  const [query, setQuery] = useState('');
  const blocksRef = useRef([]);
  const freshTimer = useRef(null);

  const applyBlocks = useCallback((next) => {
    blocksRef.current = next;
    setBlocks(next);
  }, []);

  const loadLatest = useCallback(
    async (limit) => {
      try {
        const data = await get(`/admin/chain/blocks?limit=${limit}`, 'admin');
        setError(null);
        const current = blocksRef.current;
        const { reset, blocks: merged } = mergeBlocks(current, data.blocks);
        if (current.length && !reset) {
          const known = new Set(current.map((b) => b.number));
          const added = data.blocks.filter((b) => !known.has(b.number)).map((b) => b.number);
          if (added.length) {
            setFresh(new Set(added));
            clearTimeout(freshTimer.current);
            freshTimer.current = setTimeout(() => setFresh(new Set()), 2500);
          }
        }
        if (reset || !current.length) setNextBefore(data.nextBefore);
        applyBlocks(merged);
        return data;
      } catch (err) {
        setError(err);
        return null;
      }
    },
    [applyBlocks]
  );

  useEffect(() => () => clearTimeout(freshTimer.current), []);

  useEffect(() => {
    loadLatest(PAGE);
  }, [loadLatest]);

  useEffect(() => {
    if (tick > 0) loadLatest(6);
  }, [tick, loadLatest]);

  const latestNumber = blocks[0]?.number;
  useEffect(() => {
    if (followLatest && latestNumber !== undefined) setSelected(latestNumber);
  }, [followLatest, latestNumber]);

  useEffect(() => {
    if (selected === null) return;
    let cancelled = false;
    setDetailError(null);
    get(`/admin/chain/blocks/${selected}`, 'admin')
      .then((d) => !cancelled && setDetail(d.block))
      .catch((err) => !cancelled && setDetailError(err.message));
    return () => {
      cancelled = true;
    };
  }, [selected, tick]);

  async function loadOlder() {
    if (nextBefore === null) return;
    setLoadingOlder(true);
    try {
      const data = await get(`/admin/chain/blocks?limit=${PAGE}&before=${nextBefore}`, 'admin');
      applyBlocks(mergeBlocks(blocksRef.current, data.blocks).blocks);
      setNextBefore(data.nextBefore);
    } finally {
      setLoadingOlder(false);
    }
  }

  function select(number) {
    setFollowLatest(number === latestNumber);
    setSelected(number);
  }

  function search(e) {
    e.preventDefault();
    const q = query.trim();
    if (/^\d+$/.test(q)) navigate(`/admin/explorer/block/${q}`);
    else if (/^0x[0-9a-fA-F]{64}$/.test(q)) navigate(`/admin/explorer/tx/${q}`);
  }

  const status = chain?.status;
  const contract = status?.contract;

  return (
    <>
      <div className="spread">
        <div>
          <h1 className="page-title">Chain explorer</h1>
          <p className="page-sub">
            Every ballot and admin action is a transaction mined into a block; each block commits to its parent's hash.
          </p>
        </div>
        <form className="row explorer-search" onSubmit={search} role="search">
          <label htmlFor="chain-search" className="sr-only">
            Block number or transaction hash
          </label>
          <input
            id="chain-search"
            className="input mono"
            placeholder="Block # or tx hash"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="btn">
            Go
          </button>
        </form>
      </div>

      <div className="grid grid-kpi">
        <StatTile label="Latest block" value={`#${formatNumber(status?.blockNumber)}`} foot={chain?.clientVersion?.split('/').slice(0, 2).join(' ')} />
        <StatTile
          label="Ballots on-chain"
          value={formatNumber(contract?.totalVotes)}
          foot={contract?.deployed ? `${contract.candidateCount} candidates registered` : 'Contract not deployed'}
        />
        <StatTile label="Contract phase" value={contract?.phase || '—'} foot={contract?.electionName} />
        <StatTile
          label="Contract events"
          value={chain?.eventCounts ? formatNumber(Object.values(chain.eventCounts).reduce((a, b) => a + b, 0)) : '—'}
          foot={chain?.eventCounts ? `${chain.eventCounts.VoteCast || 0} VoteCast · ${chain.eventCounts.CandidateAdded || 0} CandidateAdded` : null}
        />
        <StatTile label="Gas price" value={formatGwei(chain?.gasPrice)} foot={`Chain ID ${status?.chainId ?? '—'}`} />
        <StatTile label="Relayer balance (ETH)" value={formatNumber(Math.floor(Number(status?.relayer?.balance ?? NaN)) || null)} foot={contract?.relayerIsOwner ? 'Relayer owns the contract ✓' : 'Relayer is not the owner'} />
      </div>

      <section className="card">
        <div className="card-header">
          <div>
            <h2>Blockchain</h2>
            <div className="sub">Newest on the right · matching colour chips show each block's parentHash = previous block's hash</div>
          </div>
          <div className="row wrap">
            <KindLegend />
            {!followLatest && (
              <button type="button" className="btn btn-sm" onClick={() => setFollowLatest(true)}>
                Follow latest ↦
              </button>
            )}
          </div>
        </div>
        <div className="card-body" style={{ paddingTop: 12, paddingBottom: 12 }}>
          {error ? (
            <Alert type="danger">{error.message}</Alert>
          ) : blocks.length === 0 ? (
            <Loading label="Reading blocks…" />
          ) : (
            <ChainStrip
              blocks={blocks}
              selected={selected}
              onSelect={select}
              hasOlder={nextBefore !== null}
              onLoadOlder={loadOlder}
              loadingOlder={loadingOlder}
              freshNumbers={fresh}
            />
          )}
        </div>
      </section>

      <section className="card">
        <div className="card-body">
          {detailError ? (
            <Alert type="danger">{detailError}</Alert>
          ) : detail ? (
            <BlockDetail block={detail} showNav={false} />
          ) : (
            <Loading label="Loading block…" />
          )}
        </div>
      </section>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <EventsFeed tick={tick} />
        <IntegrityPanel />
      </div>
    </>
  );
}
