import { Link } from 'react-router';
import { get } from '../../api/client.js';
import BarList from '../../components/charts/BarList.jsx';
import PartyBadge from '../../components/PartyBadge.jsx';
import { Alert, Loading } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { formatNumber, shortHash } from '../../utils/format.js';

export default function PublicResultsPage() {
  const { data, error, loading } = useApi(() => get('/elections/results'));

  if (loading) return <Loading label="Reading results from the blockchain…" />;

  return (
    <div className="container narrow stack" style={{ gap: 20 }}>
      <div>
        <h1 className="page-title">{data?.election?.name || 'Election results'}</h1>
        <p className="page-sub">Tallies are read directly from the Voting smart contract.</p>
      </div>
      {error ? (
        <Alert type={error.status === 403 ? 'info' : 'danger'}>
          {error.message} {error.status === 403 && <Link to="/">Go to voting →</Link>}
        </Alert>
      ) : (
        <section className="card">
          <div className="card-header">
            <div>
              <h2>Final results</h2>
              <div className="sub">
                {formatNumber(data.totalVotes)} ballots · contract {shortHash(data.contractAddress)}
              </div>
            </div>
            <span className="badge badge-good">✓ Declared</span>
          </div>
          <div className="card-body">
            <BarList
              emphasizeFirst
              caption="Votes per party"
              rows={data.results.map((r) => ({
                key: r.abbreviation,
                label: r.name,
                secondary: r.abbreviation,
                value: r.votes,
                share: r.share,
                lead: <PartyBadge party={r} size={32} />,
              }))}
            />
          </div>
        </section>
      )}
    </div>
  );
}
