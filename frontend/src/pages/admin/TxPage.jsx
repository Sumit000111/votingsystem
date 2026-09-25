import { Link, useParams } from 'react-router';
import { get } from '../../api/client.js';
import ArgsTable from '../../components/chain/ArgsTable.jsx';
import { KindChip } from '../../components/chain/kinds.jsx';
import { Alert, ErrorState, Hash, Loading } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { formatDateTime, formatGwei, formatNumber } from '../../utils/format.js';

function Check({ ok, label }) {
  return (
    <span className={`badge ${ok ? 'badge-good' : 'badge-critical'}`}>
      {ok ? '✓' : '✕'} {label}
    </span>
  );
}

export default function TxPage() {
  const { hash } = useParams();
  const { data, error, loading, reload } = useApi(() => get(`/admin/chain/tx/${hash}`, 'admin'), [hash]);

  if (loading) return <Loading label="Loading transaction…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const tx = data.transaction;
  const db = tx.dbRecord;

  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/admin/explorer">Chain explorer</Link> /{' '}
        {tx.block && <Link to={`/admin/explorer/block/${tx.block.number}`}>Block #{tx.block.number}</Link>} / <span>Transaction</span>
      </nav>

      <section className="card">
        <div className="card-header">
          <div className="row wrap">
            <KindChip kind={tx.kind} />
            <h1 style={{ fontSize: 20 }}>{tx.summary}</h1>
          </div>
          {tx.receipt?.status === 1 ? (
            <span className="badge badge-good">✓ Success</span>
          ) : tx.receipt ? (
            <span className="badge badge-critical">✕ Reverted</span>
          ) : (
            <span className="badge badge-warning">Pending</span>
          )}
        </div>
        <div className="card-body">
          <dl className="kv">
            <dt>Transaction hash</dt>
            <dd>
              <Hash value={tx.hash} full />
            </dd>
            <dt>Block</dt>
            <dd>
              {tx.block ? (
                <>
                  <Link to={`/admin/explorer/block/${tx.block.number}`}>#{tx.block.number}</Link> ·{' '}
                  {formatNumber(tx.confirmations)} confirmation{tx.confirmations === 1 ? '' : 's'} · {formatDateTime(tx.block.timestamp)}
                </>
              ) : (
                '—'
              )}
            </dd>
            <dt>From</dt>
            <dd>
              <Hash value={tx.from} full /> <span className="muted">(election relayer)</span>
            </dd>
            <dt>To</dt>
            <dd>{tx.to ? <Hash value={tx.to} full /> : <span className="badge">Contract creation → {tx.receipt?.contractAddress}</span>}</dd>
            <dt>Function</dt>
            <dd>
              <code className="call-sig">{tx.callSignature || tx.method}</code>
              {tx.selector && <span className="muted mono"> · selector {tx.selector}</span>}
            </dd>
            <dt>Nonce</dt>
            <dd className="tabular">{tx.nonce}</dd>
            <dt>Gas</dt>
            <dd className="tabular">
              {tx.receipt ? `${formatNumber(Number(tx.receipt.gasUsed))} used of ${formatNumber(Number(tx.gasLimit))} limit` : formatNumber(Number(tx.gasLimit))}
            </dd>
            <dt>Gas price · fee</dt>
            <dd className="tabular">
              {formatGwei(tx.receipt?.effectiveGasPrice || tx.gasPrice)} · {tx.receipt ? `${Number(tx.receipt.fee).toFixed(8)} ETH` : '—'}
            </dd>
          </dl>
        </div>
      </section>

      {db && (
        <section className="card">
          <div className="card-header">
            <div>
              <h2>Database cross-check</h2>
              <div className="sub">The MongoDB mirror of this ballot compared with what the chain recorded.</div>
            </div>
            {db.checks.candidateMatches && db.checks.voterKeyMatches && !db.isDisqualified ? (
              <span className="badge badge-good">✓ Consistent</span>
            ) : (
              <span className="badge badge-critical">✕ Tampering detected</span>
            )}
          </div>
          <div className="card-body stack">
            <div className="row wrap">
              <Check ok={db.checks.candidateMatches} label="Candidate matches chain" />
              <Check ok={db.checks.voterKeyMatches} label="Voter key matches chain" />
              <Check ok={!db.isDisqualified} label={db.isDisqualified ? `Disqualified (${db.auditReason})` : 'Not flagged by audit'} />
            </div>
            <dl className="kv">
              <dt>Candidate in DB</dt>
              <dd>
                {db.candidateSelected} ({db.partyAbbreviation})
              </dd>
              <dt>Election</dt>
              <dd style={{ textTransform: 'capitalize' }}>
                {db.electionType} · {db.state}
              </dd>
              <dt>Recorded</dt>
              <dd>{formatDateTime(db.votedAt)}</dd>
            </dl>
          </div>
        </section>
      )}

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <section className="card">
          <div className="card-header">
            <h2>Decoded input</h2>
          </div>
          <div className="card-body">
            <ArgsTable args={tx.args} />
          </div>
        </section>
        <section className="card">
          <div className="card-header">
            <h2>Events ({tx.events.length})</h2>
          </div>
          <div className="card-body stack">
            {tx.events.length === 0 ? (
              <p className="muted">No events emitted.</p>
            ) : (
              tx.events.map((ev) => (
                <div key={ev.logIndex} className="event-box">
                  <div className="row">
                    <span className="badge badge-accent">{ev.name}</span>
                    <code className="muted" style={{ fontSize: 12 }}>
                      {ev.signature}
                    </code>
                  </div>
                  <ArgsTable args={ev.args} />
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <details className="card raw-details">
        <summary>Raw transaction data</summary>
        <div className="card-body stack">
          {tx.signature && (
            <dl className="kv">
              <dt>Signature r</dt>
              <dd className="mono">{tx.signature.r}</dd>
              <dt>Signature s</dt>
              <dd className="mono">{tx.signature.s}</dd>
              <dt>Signature v</dt>
              <dd className="mono">{tx.signature.v}</dd>
              <dt>Type · chain</dt>
              <dd className="mono">
                {tx.type} · {tx.chainId}
              </dd>
            </dl>
          )}
          <div>
            <div className="section-title" style={{ marginBottom: 6 }}>
              Input data ({(tx.data.length - 2) / 2} bytes)
            </div>
            <pre className="raw-data">{tx.data}</pre>
          </div>
          {!tx.receipt && <Alert type="warning">Transaction not yet mined.</Alert>}
        </div>
      </details>
    </>
  );
}
