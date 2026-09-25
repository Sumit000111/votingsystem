import { Link } from 'react-router';
import { get } from '../../api/client.js';
import BarList from '../../components/charts/BarList.jsx';
import PartyBadge from '../../components/PartyBadge.jsx';
import { Alert, Loading } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { formatNumber, formatPercent, shortHash } from '../../utils/format.js';
import { useLang } from '../../i18n.jsx';
import CountUp from '../../components/fx/CountUp.jsx';
import Confetti from '../../components/fx/Confetti.jsx';

function Podium({ results }) {
  const top = results.filter((r) => r.votes > 0).slice(0, 3);
  if (!top.length) return null;
  const order = [top[1], top[0], top[2]].filter(Boolean);
  return (
    <div className="podium">
      {order.map((r) => {
        const rank = top.indexOf(r) + 1;
        return (
          <div key={r.abbreviation} className={`podium-col rank-${rank}`}>
            <PartyBadge party={r} size={rank === 1 ? 84 : 64} />
            <strong>{r.abbreviation}</strong>
            <span className="muted">{formatPercent(r.share)}</span>
            <div className="podium-block">
              <span className="podium-rank">{rank === 1 ? '🏆' : rank}</span>
              <span className="podium-votes">
                <CountUp value={r.votes} />
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function PublicResultsPage() {
  const { t } = useLang();
  const { data, error, loading } = useApi(() => get('/elections/results'));

  if (loading) return <Loading label="Reading results from the blockchain…" />;

  return (
    <div className="container narrow stack" style={{ gap: 20 }}>
      <div className="page-hero">
        <h1 className="display-title">{data?.election?.name || t('results_title')}</h1>
        <p className="page-sub">{t('results_sub')}</p>
      </div>
      {error ? (
        <Alert type={error.status === 403 ? 'info' : 'danger'}>
          {error.message} {error.status === 403 && <Link to="/">Go to voting →</Link>}
        </Alert>
      ) : (
        <>
        {data.totalVotes > 0 && <Confetti pieces={60} />}
        <Podium results={data.results} />
        <section className="glass-card">
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
        </>
      )}
    </div>
  );
}
