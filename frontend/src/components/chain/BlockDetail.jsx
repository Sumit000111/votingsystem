import { Link } from 'react-router';
import { Hash, Identicon, useNow } from '../ui.jsx';
import { formatDateTime, formatGwei, formatNumber, shortHash, timeAgo } from '../../utils/format.js';
import TxCard from './TxCard.jsx';

/** Full block view: header, hash-link verification, and decoded transactions. */
export default function BlockDetail({ block, showNav = true }) {
  const now = useNow(5000);
  const gasPct = Number(block.gasLimit) ? Number(block.gasUsed) / Number(block.gasLimit) : 0;
  const v = block.verification;

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="spread">
        <div>
          <h2 style={{ fontSize: 20 }}>
            Block <span className="tabular">#{formatNumber(block.number)}</span>
          </h2>
          <p className="muted" style={{ marginTop: 2 }}>
            Mined {timeAgo(block.timestamp, now)} · {formatDateTime(block.timestamp)} · {formatNumber(block.confirmations)} confirmation
            {block.confirmations === 1 ? '' : 's'}
          </p>
        </div>
        {showNav && (
          <div className="row">
            {block.prev !== null ? (
              <Link className="btn btn-sm" to={`/admin/explorer/block/${block.prev}`}>
                ← #{block.prev}
              </Link>
            ) : null}
            {block.next !== null ? (
              <Link className="btn btn-sm" to={`/admin/explorer/block/${block.next}`}>
                #{block.next} →
              </Link>
            ) : null}
          </div>
        )}
      </div>

      {v && (
        <div className="verify-row">
          <div className={`verify-item ${v.hashValid ? 'ok' : 'bad'}`}>
            <span className="verify-icon" aria-hidden="true">
              {v.hashValid ? '✓' : '✕'}
            </span>
            <div>
              <strong>{v.hashValid ? 'Header hash verified' : 'Header hash mismatch'}</strong>
              <p>keccak256(RLP(header)) recomputed from the block's fields {v.hashValid ? 'equals' : 'differs from'} its hash.</p>
            </div>
          </div>
          <div className={`verify-item ${v.parentLinked ? 'ok' : 'bad'}`}>
            <span className="verify-icon" aria-hidden="true">
              {v.parentLinked ? '✓' : '✕'}
            </span>
            <div>
              <strong>{block.number === 0 ? 'Genesis block' : v.parentLinked ? `Linked to block #${block.number - 1}` : 'Parent link broken'}</strong>
              <p>
                {block.number === 0
                  ? 'The first block has no parent.'
                  : 'The parentHash in this header equals the hash of the previous block.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {block.number > 0 && (
        <div className="link-diagram" aria-label="Hash link to parent block">
          <div className="ld-block">
            <span className="ld-title">Block #{block.number - 1}</span>
            <span className="ld-field">hash</span>
            <span className="hash">
              <Identicon hash={block.parentHash} />
              {shortHash(block.parentHash, 8, 6)}
            </span>
          </div>
          <span className="ld-arrow" aria-hidden="true">
            {v?.parentLinked ? '＝' : '≠'}
          </span>
          <div className="ld-block current">
            <span className="ld-title">Block #{block.number}</span>
            <span className="ld-field">parentHash</span>
            <span className="hash">
              <Identicon hash={block.parentHash} />
              {shortHash(block.parentHash, 8, 6)}
            </span>
            <span className="ld-field">hash</span>
            <span className="hash">
              <Identicon hash={block.hash} />
              {shortHash(block.hash, 8, 6)}
            </span>
          </div>
        </div>
      )}

      <dl className="kv">
        <dt>Hash</dt>
        <dd>
          <Hash value={block.hash} full />
        </dd>
        <dt>Parent hash</dt>
        <dd>
          <Hash value={block.parentHash} full to={block.number > 0 ? `/admin/explorer/block/${block.number - 1}` : undefined} />
        </dd>
        {v && (
          <>
            <dt>Recomputed hash</dt>
            <dd>
              <Hash value={v.computedHash} full />
            </dd>
          </>
        )}
        <dt>Miner</dt>
        <dd>
          <Hash value={block.miner} full copy={false} />
        </dd>
        <dt>Gas used</dt>
        <dd>
          <div className="meter" style={{ maxWidth: 360 }}>
            <div className="meter-track">
              <div className="meter-fill" style={{ width: `${Math.max(gasPct * 100, gasPct > 0 ? 1 : 0)}%` }} />
            </div>
            <span className="tabular" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
              {formatNumber(Number(block.gasUsed))} / {formatNumber(Number(block.gasLimit))}
            </span>
          </div>
        </dd>
        <dt>Base fee</dt>
        <dd>{formatGwei(block.baseFeePerGas)}</dd>
        {block.header && (
          <>
            <dt>State root</dt>
            <dd className="mono">{block.header.stateRoot}</dd>
            <dt>Transactions root</dt>
            <dd className="mono">{block.header.transactionsRoot}</dd>
            <dt>Receipts root</dt>
            <dd className="mono">{block.header.receiptsRoot}</dd>
            <dt>Size</dt>
            <dd>{block.header.size ? `${formatNumber(block.header.size)} bytes` : '—'}</dd>
          </>
        )}
      </dl>

      <div className="stack" style={{ gap: 12 }}>
        <div className="section-title">
          {block.txCount} transaction{block.txCount === 1 ? '' : 's'}
        </div>
        {block.transactions.length === 0 ? (
          <p className="muted">No transactions in this block.</p>
        ) : (
          block.transactions.map((tx) => <TxCard key={tx.hash} tx={tx} />)
        )}
      </div>
    </div>
  );
}
