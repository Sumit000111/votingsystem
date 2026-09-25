import { useState } from 'react';
import { Link } from 'react-router';
import { get, post } from '../../api/client.js';
import { Alert, Empty, ErrorState, Hash, Loading, Spinner, StatTile } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { formatDateTime, formatNumber } from '../../utils/format.js';

const CODE_LABELS = {
  NO_TX_HASH: 'Injected into DB',
  TX_NOT_ON_CHAIN: 'Unknown transaction',
  CANDIDATE_MISMATCH: 'Candidate altered',
  VOTER_MISMATCH: 'Voter altered',
  USER_MISSING: 'Voter deleted',
  PROFILE_MISMATCH: 'Profile out of sync',
  MISSING_IN_DB: 'Deleted from DB',
  ORPHAN_VOTER_FLAG: 'Orphan voter flag',
};

export default function Audit() {
  const { data, error, loading, reload, setData } = useApi(() => get('/admin/audit', 'admin'));
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState(null);

  async function run() {
    setRunning(true);
    setRunError(null);
    try {
      const res = await post('/admin/audit', {}, 'admin');
      setData((d) => ({ audit: res.audit, history: [res.audit, ...(d?.history || [])].slice(0, 10) }));
    } catch (err) {
      setRunError(err.message);
    } finally {
      setRunning(false);
    }
  }

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const audit = data?.audit;
  const s = audit?.summary;

  return (
    <>
      <div className="spread">
        <div>
          <h1 className="page-title">Database ↔ blockchain audit</h1>
          <p className="page-sub">
            Every MongoDB ballot must match a <code>VoteCast</code> event — same transaction, candidate and voter key — and
            every on-chain ballot must have a database record.
          </p>
        </div>
        <button type="button" className="btn btn-danger btn-lg" onClick={run} disabled={running}>
          {running ? <Spinner /> : '⚖'} Run deep audit
        </button>
      </div>

      {runError && <Alert type="danger">{runError}</Alert>}

      {!audit ? (
        <section className="card">
          <Empty title="No audit has been run yet">Run the audit to cross-check the database against the chain.</Empty>
        </section>
      ) : (
        <>
          <div className={`integrity-summary big ${s.clean ? 'ok' : 'bad'}`}>
            <span className="verify-icon" aria-hidden="true">
              {s.clean ? '✓' : '✕'}
            </span>
            <div>
              <strong>{s.clean ? 'Database matches the blockchain' : 'Tampering detected'}</strong>
              <p className="muted">
                {s.clean
                  ? `All ${formatNumber(s.dbVotes)} database ballots correspond to on-chain transactions.`
                  : `${formatNumber(audit.issues.length)} issue(s) found. Flagged ballots are disqualified and excluded from database tallies; on-chain tallies are unaffected.`}{' '}
                Ran {formatDateTime(audit.createdAt)} in {audit.durationMs} ms.
              </p>
            </div>
          </div>

          <div className="grid grid-kpi">
            <StatTile label="Ballots on-chain" value={formatNumber(s.chainVotes)} />
            <StatTile label="Ballots in database" value={formatNumber(s.dbVotes)} />
            <StatTile label="Verified" value={formatNumber(s.verifiedVotes)} accent="var(--good)" />
            <StatTile label="Flagged" value={formatNumber(s.flaggedVotes)} accent={s.flaggedVotes ? 'var(--critical)' : undefined} />
            <StatTile label="Missing from database" value={formatNumber(s.missingInDb)} accent={s.missingInDb ? 'var(--critical)' : undefined} />
          </div>

          <div className="grid grid-2" style={{ alignItems: 'start' }}>
            <section className="card">
              <div className="card-header">
                <div>
                  <h2>Tallies: chain vs database</h2>
                  <div className="sub">{s.talliesMatch ? '✓ Every tally matches' : '✕ Some tallies differ'}</div>
                </div>
              </div>
              <div className="card-body tight table-wrap">
                {audit.tallies.length === 0 ? (
                  <Empty title="No ballots yet" />
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Party</th>
                        <th className="num">Chain</th>
                        <th className="num">Database</th>
                        <th className="num">Δ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audit.tallies.map((t) => (
                        <tr key={t.candidate}>
                          <td>
                            <strong>{t.party}</strong> <span className="muted">{t.candidate}</span>
                          </td>
                          <td className="num">{formatNumber(t.chain)}</td>
                          <td className="num">{formatNumber(t.db)}</td>
                          <td className="num">
                            {t.delta === 0 ? <span className="badge badge-good">✓ 0</span> : <span className="badge badge-critical">✕ {t.delta > 0 ? '+' : ''}{t.delta}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            <section className="card">
              <div className="card-header">
                <h2>Audit history</h2>
              </div>
              <div className="card-body tight table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Result</th>
                      <th className="num">Chain</th>
                      <th className="num">DB</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.history || []).map((h) => (
                      <tr key={h._id}>
                        <td className="muted">{formatDateTime(h.createdAt)}</td>
                        <td>{h.summary.clean ? <span className="badge badge-good">✓ Clean</span> : <span className="badge badge-critical">✕ {h.summary.flaggedVotes + h.summary.missingInDb + h.summary.orphanVoterFlags} issues</span>}</td>
                        <td className="num">{h.summary.chainVotes}</td>
                        <td className="num">{h.summary.dbVotes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {audit.issues.length > 0 && (
            <section className="card">
              <div className="card-header">
                <h2>Issues ({audit.issues.length})</h2>
              </div>
              <div className="card-body tight table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Finding</th>
                      <th>Database says</th>
                      <th>Chain says</th>
                      <th>Transaction</th>
                      <th>Explanation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.issues.map((issue, i) => (
                      <tr key={i}>
                        <td>
                          <span className="badge badge-critical">✕ {CODE_LABELS[issue.code] || issue.code}</span>
                        </td>
                        <td>{issue.candidateInDb || <span className="muted">—</span>}</td>
                        <td>{issue.candidateOnChain || <span className="muted">—</span>}</td>
                        <td>
                          {issue.txHash ? (
                            <Hash value={issue.txHash} to={issue.code === 'TX_NOT_ON_CHAIN' ? undefined : `/admin/explorer/tx/${issue.txHash}`} copy={false} head={4} tail={4} />
                          ) : (
                            <span className="muted">none</span>
                          )}
                          {issue.blockNumber !== null && issue.blockNumber !== undefined && (
                            <>
                              {' '}
                              · <Link to={`/admin/explorer/block/${issue.blockNumber}`}>#{issue.blockNumber}</Link>
                            </>
                          )}
                        </td>
                        <td className="ink-2" style={{ fontSize: 13, minWidth: 260 }}>
                          {issue.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
