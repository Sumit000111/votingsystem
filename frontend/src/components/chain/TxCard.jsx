import { Link } from 'react-router';
import { Hash } from '../ui.jsx';
import ArgsTable from './ArgsTable.jsx';
import { KindChip } from './kinds.jsx';

/** One transaction inside a block: decoded call, emitted events, gas. */
export default function TxCard({ tx }) {
  return (
    <article className="tx-card">
      <header className="tx-card-head">
        <div className="row wrap" style={{ gap: 10 }}>
          <KindChip kind={tx.kind} />
          <strong>{tx.summary}</strong>
          {tx.status === 1 && <span className="badge badge-good">✓ Success</span>}
          {tx.status === 0 && <span className="badge badge-critical">✕ Reverted</span>}
        </div>
        <Link to={`/admin/explorer/tx/${tx.hash}`} className="btn btn-sm">
          Transaction →
        </Link>
      </header>
      <dl className="kv tx-kv">
        <dt>Hash</dt>
        <dd>
          <Hash value={tx.hash} to={`/admin/explorer/tx/${tx.hash}`} head={12} tail={8} />
        </dd>
        <dt>From → To</dt>
        <dd className="row wrap" style={{ gap: 6 }}>
          <Hash value={tx.from} copy={false} /> → {tx.to ? <Hash value={tx.to} copy={false} /> : <span className="badge">Contract creation</span>}
        </dd>
        <dt>Call</dt>
        <dd>
          <code className="call-sig">{tx.signature || tx.method}</code>
        </dd>
        {tx.gasUsed && (
          <>
            <dt>Gas · fee</dt>
            <dd className="tabular">
              {Number(tx.gasUsed).toLocaleString('en-IN')} gas · {Number(tx.fee).toFixed(6)} ETH
            </dd>
          </>
        )}
      </dl>
      {tx.args?.length > 0 && (
        <div className="tx-section">
          <div className="section-title">Decoded input</div>
          <ArgsTable args={tx.args} />
        </div>
      )}
      {tx.events?.length > 0 && (
        <div className="tx-section">
          <div className="section-title">Events emitted</div>
          <div className="stack" style={{ gap: 10 }}>
            {tx.events.map((ev) => (
              <div key={ev.logIndex} className="event-box">
                <div className="row" style={{ gap: 8 }}>
                  <span className="badge badge-accent">{ev.name}</span>
                  <span className="muted mono" style={{ fontSize: 12 }}>
                    log #{ev.logIndex}
                  </span>
                </div>
                <ArgsTable args={ev.args} />
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
