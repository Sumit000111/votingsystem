import { Link, useNavigate, useOutletContext } from 'react-router';
import { get } from '../../api/client.js';
import BarList from '../../components/charts/BarList.jsx';
import ColumnChart from '../../components/charts/ColumnChart.jsx';
import Meter from '../../components/charts/Meter.jsx';
import ChainStrip from '../../components/chain/ChainStrip.jsx';
import PartyBadge from '../../components/PartyBadge.jsx';
import { Empty, ErrorState, Hash, Loading, StatTile, useNow } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { formatNumber, formatPercent, timeAgo } from '../../utils/format.js';

const STATUS_BADGE = { active: 'badge-good', preparation: 'badge-warning', completed: '' };

function bucketLabel(unit) {
  return (t, long) => {
    const d = new Date(t);
    if (unit === 'day') return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    if (unit === 'hour' && !long) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return long ? d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };
}

/** Fill empty buckets so the timeline has an even time axis. */
function densify(points, unit) {
  if (points.length < 2) return points.map((p) => ({ t: p.t, value: p.votes }));
  const step = { minute: 60e3, hour: 3600e3, day: 86400e3 }[unit];
  const byTime = new Map(points.map((p) => [new Date(p.t).getTime(), p.votes]));
  const start = new Date(points[0].t).getTime();
  const end = new Date(points[points.length - 1].t).getTime();
  const out = [];
  for (let t = start; t <= end && out.length < 240; t += step) out.push({ t, value: byTime.get(t) || 0 });
  return out;
}

export default function Overview() {
  const { tick } = useOutletContext();
  const navigate = useNavigate();
  const now = useNow(10000);
  const stats = useApi(() => get('/admin/stats', 'admin'), [tick]);
  const results = useApi(() => get('/admin/results', 'admin').catch(() => null), [tick]);
  const blocks = useApi(() => get('/admin/chain/blocks?limit=8', 'admin').catch(() => null), [tick]);

  if (stats.loading && !stats.data) return <Loading label="Loading dashboard…" />;
  if (stats.error && !stats.data) return <ErrorState error={stats.error} onRetry={stats.reload} />;

  const s = stats.data;
  const contract = s.chain?.contract;
  const timeline = densify(s.timeline.points, s.timeline.unit);
  const mismatch = contract?.deployed && s.votes.chain !== null && s.votes.chain !== s.votes.database;

  return (
    <>
      <div className="spread">
        <div>
          <h1 className="page-title">{s.election.name}</h1>
          <p className="page-sub">
            <span className={`badge ${STATUS_BADGE[s.election.status]}`}>{s.election.status}</span>{' '}
            {s.election.nationalElectionEnabled && 'National'}
            {s.election.nationalElectionEnabled && s.election.stateElectionEnabled && ' + '}
            {s.election.stateElectionEnabled && 'State'} election
          </p>
        </div>
        <Link to="/admin/election" className="btn">
          Election control
        </Link>
      </div>

      <div className="grid grid-kpi">
        <StatTile label="Registered voters" value={formatNumber(s.voters.registered)} foot={`${formatNumber(s.voters.voted)} have voted`} />
        <StatTile
          label="Ballots on-chain"
          value={formatNumber(s.votes.chain)}
          foot={mismatch ? `⚠ Database has ${formatNumber(s.votes.database)} — run an audit` : `${formatNumber(s.votes.database)} mirrored in MongoDB`}
          accent={mismatch ? 'var(--critical)' : undefined}
        />
        <div className="card stat">
          <span className="stat-label">Turnout</span>
          <span className="stat-value">{formatPercent(s.voters.turnout)}</span>
          <Meter value={s.voters.turnout} label="Turnout" />
        </div>
        <StatTile
          label="Flagged by audit"
          value={formatNumber(s.votes.flagged)}
          foot={s.votes.flagged ? 'Records that disagree with the chain' : 'No tampering detected'}
          accent={s.votes.flagged ? 'var(--critical)' : undefined}
        />
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <section className="card">
          <div className="card-header">
            <div>
              <h2>Ballots over time</h2>
              <div className="sub">Per {s.timeline.unit}, from confirmed blocks</div>
            </div>
          </div>
          <div className="card-body">
            {timeline.length ? (
              <ColumnChart points={timeline} formatLabel={bucketLabel(s.timeline.unit)} title="Ballots over time" valueLabel="ballots" />
            ) : (
              <Empty title="No ballots yet">The timeline fills in as votes are mined.</Empty>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <h2>Leading parties</h2>
              <div className="sub">Live tallies read from the smart contract</div>
            </div>
            <Link to="/admin/results" className="btn btn-sm">
              All results →
            </Link>
          </div>
          <div className="card-body">
            {!results.data ? (
              results.loading ? <Loading /> : <Empty title="Results unavailable">Is the contract deployed?</Empty>
            ) : results.data.totalVotes === 0 ? (
              <Empty title="No ballots yet" />
            ) : (
              <BarList
                emphasizeFirst
                caption="Top parties by votes"
                rows={results.data.results.filter((r) => r.chainVotes > 0).slice(0, 5).map((r) => ({
                  key: r.chainId,
                  label: r.name,
                  secondary: r.abbreviation,
                  value: r.chainVotes,
                  share: r.share,
                  lead: <PartyBadge party={r} size={30} />,
                }))}
              />
            )}
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card-header">
          <div>
            <h2>Latest blocks</h2>
            <div className="sub">The chain as it grows — open the explorer for full detail</div>
          </div>
          <Link to="/admin/explorer" className="btn btn-sm">
            Chain explorer →
          </Link>
        </div>
        <div className="card-body" style={{ paddingTop: 12, paddingBottom: 12 }}>
          {blocks.data ? (
            <ChainStrip compact blocks={blocks.data.blocks} onSelect={(n) => navigate(`/admin/explorer/block/${n}`)} />
          ) : (
            <Empty title="Blockchain unavailable" />
          )}
        </div>
      </section>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <section className="card">
          <div className="card-header">
            <h2>Recent ballots</h2>
          </div>
          <div className="card-body tight table-wrap">
            {s.recentVotes.length === 0 ? (
              <Empty title="No ballots yet" />
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Party</th>
                    <th>State</th>
                    <th>Block</th>
                    <th>Transaction</th>
                  </tr>
                </thead>
                <tbody>
                  {s.recentVotes.map((v) => (
                    <tr key={v._id}>
                      <td className="muted">{timeAgo(v.votedAt, now)}</td>
                      <td>
                        <strong>{v.partyAbbreviation || v.candidateSelected}</strong>
                        {v.isDisqualified && (
                          <span className="badge badge-critical" style={{ marginLeft: 6 }}>
                            ✕ flagged
                          </span>
                        )}
                      </td>
                      <td>{v.state}</td>
                      <td className="tabular">{v.blockNumber !== null ? <Link to={`/admin/explorer/block/${v.blockNumber}`}>#{v.blockNumber}</Link> : '—'}</td>
                      <td>{v.txHash ? <Hash value={v.txHash} to={`/admin/explorer/tx/${v.txHash}`} copy={false} head={4} tail={4} /> : <span className="badge badge-critical">none</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h2>Turnout by state</h2>
          </div>
          <div className="card-body tight table-wrap">
            {s.byState.length === 0 ? (
              <Empty title="No voters registered yet" />
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>State</th>
                    <th className="num">Registered</th>
                    <th className="num">Voted</th>
                    <th style={{ width: '40%' }}>Turnout</th>
                  </tr>
                </thead>
                <tbody>
                  {s.byState.map((row) => (
                    <tr key={row.state}>
                      <td>{row.state}</td>
                      <td className="num">{formatNumber(row.registered)}</td>
                      <td className="num">{formatNumber(row.voted)}</td>
                      <td>
                        <Meter value={row.registered ? row.voted / row.registered : 0} label={`Turnout in ${row.state}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
