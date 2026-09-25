import { useState } from 'react';
import { useOutletContext } from 'react-router';
import { get } from '../../api/client.js';
import BarList from '../../components/charts/BarList.jsx';
import PartyBadge from '../../components/PartyBadge.jsx';
import { ErrorState, Hash, Loading, Segmented } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { formatNumber, formatPercent } from '../../utils/format.js';

export default function Results() {
  const { tick } = useOutletContext();
  const [view, setView] = useState('chart');
  const [scope, setScope] = useState('all');
  const { data, error, loading, reload } = useApi(() => get('/admin/results', 'admin'), [tick]);

  if (loading && !data) return <Loading label="Reading tallies from the contract…" />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const rows = data.results.filter((r) => scope === 'all' || r.partyType === scope);
  const mismatched = data.results.filter((r) => r.chainVotes !== r.dbVotes);

  return (
    <>
      <div className="spread">
        <div>
          <h1 className="page-title">Results</h1>
          <p className="page-sub">
            Source of truth: <code>getAllCandidates()</code> on the Voting contract ·{' '}
            {data.contractAddress && <Hash value={data.contractAddress} copy={false} />}
          </p>
        </div>
        <div className="row wrap">
          <Segmented
            label="Party type"
            value={scope}
            onChange={setScope}
            options={[
              { value: 'all', label: 'All parties' },
              { value: 'national', label: 'National' },
              { value: 'state', label: 'State' },
            ]}
          />
          <Segmented
            label="View"
            value={view}
            onChange={setView}
            options={[
              { value: 'chart', label: 'Chart' },
              { value: 'table', label: 'Table' },
            ]}
          />
        </div>
      </div>

      <div className="grid grid-kpi">
        <div className="card stat">
          <span className="stat-label">Ballots on-chain</span>
          <span className="stat-value">{formatNumber(data.totalVotes)}</span>
          <span className="stat-foot">Contract phase: {data.phase}</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Verified ballots in database</span>
          <span className="stat-value">{formatNumber(data.totalDbVotes)}</span>
          <span className="stat-foot">Excludes records disqualified by the audit</span>
        </div>
        <div className="card stat" style={mismatched.length ? { borderTop: '3px solid var(--critical)' } : undefined}>
          <span className="stat-label">Chain vs database</span>
          <span className="stat-value">{mismatched.length ? `✕ ${mismatched.length} differ` : '✓ Match'}</span>
          <span className="stat-foot">{mismatched.length ? 'Run an audit to see why' : 'Every tally agrees'}</span>
        </div>
      </div>

      <section className="card">
        <div className="card-header">
          <div>
            <h2>Votes by party</h2>
            <div className="sub">{rows.length} parties registered on-chain</div>
          </div>
        </div>
        <div className={view === 'table' ? 'card-body tight table-wrap' : 'card-body'}>
          {view === 'chart' ? (
            <BarList
              emphasizeFirst
              caption="Votes per party"
              rows={rows.map((r) => ({
                key: r.chainId,
                label: r.name,
                secondary: `${r.abbreviation}${r.activeOnChain ? '' : ' · inactive'}`,
                value: r.chainVotes,
                share: r.share,
                lead: <PartyBadge party={r} size={34} />,
              }))}
            />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Party</th>
                  <th>Type</th>
                  <th className="num">On-chain</th>
                  <th className="num">Share</th>
                  <th className="num">Database</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.chainId}>
                    <td className="tabular muted">{i + 1}</td>
                    <td>
                      <span className="row" style={{ gap: 10 }}>
                        <PartyBadge party={r} size={28} />
                        <span>
                          <strong>{r.abbreviation}</strong> <span className="muted">{r.name}</span>
                        </span>
                      </span>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{r.partyType || '—'}</td>
                    <td className="num">{formatNumber(r.chainVotes)}</td>
                    <td className="num">{formatPercent(r.share)}</td>
                    <td className="num">
                      {formatNumber(r.dbVotes)}{' '}
                      {r.dbVotes !== r.chainVotes && <span className="badge badge-critical">✕ {r.dbVotes - r.chainVotes > 0 ? '+' : ''}{r.dbVotes - r.chainVotes}</span>}
                    </td>
                    <td>{r.activeOnChain ? <span className="badge badge-good">✓ Active</span> : <span className="badge">Inactive</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}
