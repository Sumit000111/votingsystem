import { useState } from 'react';
import { Link } from 'react-router';
import { get } from '../../api/client.js';
import { Alert, Spinner } from '../ui.jsx';
import { formatDateTime, formatNumber } from '../../utils/format.js';

/**
 * Re-hashes every block header and checks each parent link, then shows one
 * cell per block. Status colours are always paired with an icon and label.
 */
export default function IntegrityPanel() {
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const { integrity } = await get('/admin/chain/integrity?limit=1000', 'admin');
      setResult(integrity);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const ledger = result?.ledger;

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2>Chain integrity</h2>
          <div className="sub">Recompute every block hash and verify each block points at its parent.</div>
        </div>
        <button type="button" className="btn btn-navy btn-sm" onClick={run} disabled={busy}>
          {busy ? <Spinner /> : '⛓'} {result ? 'Re-verify' : 'Verify chain'}
        </button>
      </div>
      <div className="card-body stack">
        {error && <Alert type="danger">{error}</Alert>}
        {!result && !error && (
          <p className="muted">
            Each block header is RLP-encoded and hashed with keccak256; the result must equal the block hash, and the
            header's <code>parentHash</code> must equal the previous block's hash. Changing any past block would break
            every hash after it.
          </p>
        )}
        {result && (
          <>
            <div className={`integrity-summary ${result.valid ? 'ok' : 'bad'}`}>
              <span className="verify-icon" aria-hidden="true">
                {result.valid ? '✓' : '✕'}
              </span>
              <div>
                <strong>
                  {result.valid
                    ? `All ${formatNumber(result.checked)} blocks verified`
                    : `${formatNumber(result.brokenBlocks.length)} of ${formatNumber(result.checked)} blocks failed`}
                </strong>
                <p className="muted">
                  Blocks #{result.from}–#{result.to} · checked {formatDateTime(result.checkedAt)}
                </p>
              </div>
            </div>
            <div className="integrity-grid" role="list" aria-label="Block verification results">
              {result.blocks.map((b) => {
                const ok = b.hashValid && b.linked;
                return (
                  <Link
                    key={b.number}
                    role="listitem"
                    to={`/admin/explorer/block/${b.number}`}
                    className={`integrity-cell ${ok ? 'ok' : 'bad'} ${b.txCount ? 'has-tx' : ''}`}
                    title={`#${b.number}: ${b.hashValid ? 'hash ✓' : 'hash ✕'} · ${b.linked ? 'linked ✓' : 'link ✕'} · ${b.txCount} tx`}
                    aria-label={`Block ${b.number} ${ok ? 'verified' : 'failed'}`}
                  >
                    {ok ? '' : '✕'}
                  </Link>
                );
              })}
            </div>
            <ul className="integrity-legend">
              <li>
                <span className="integrity-cell ok has-tx" aria-hidden="true" /> ✓ Verified block with transactions
              </li>
              <li>
                <span className="integrity-cell ok" aria-hidden="true" /> ✓ Verified empty block
              </li>
              <li>
                <span className="integrity-cell bad" aria-hidden="true">
                  ✕
                </span>{' '}
                Failed
              </li>
            </ul>
            {ledger && (
              <div className={`alert ${ledger.consistent ? 'alert-success' : 'alert-danger'}`}>
                <span className="alert-icon">{ledger.consistent ? '✓' : '✕'}</span>
                <div>
                  <strong>Contract ledger {ledger.consistent ? 'consistent' : 'inconsistent'}:</strong> totalVotes{' '}
                  {ledger.totalVotes} · sum of candidate tallies {ledger.sumOfTallies} · VoteCast events {ledger.voteEvents}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
