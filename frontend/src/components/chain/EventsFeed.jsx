import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { get } from '../../api/client.js';
import { Alert, Loading, Segmented, useNow } from '../ui.jsx';
import { shortHash, timeAgo } from '../../utils/format.js';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'VoteCast', label: 'Ballots' },
  { value: 'CandidateAdded', label: 'Candidates' },
  { value: 'PhaseChanged', label: 'Phases' },
];

function describe(event) {
  const arg = (name) => event.args.find((a) => a.name === name);
  switch (event.name) {
    case 'VoteCast':
      return `Ballot #${arg('totalVotes')?.value} for ${arg('candidateName')?.value}`;
    case 'CandidateAdded':
      return `${arg('name')?.value} (${arg('party')?.value})`;
    case 'CandidateStatusChanged':
      return `${arg('candidateId')?.label || shortHash(arg('candidateId')?.value)} → ${arg('active')?.value ? 'active' : 'inactive'}`;
    case 'PhaseChanged':
      return `${arg('previous')?.label} → ${arg('current')?.label}`;
    case 'ElectionCreated':
      return `“${arg('name')?.value}” created`;
    case 'OwnershipTransferred':
      return `Owner → ${shortHash(arg('newOwner')?.value)}`;
    default:
      return event.name;
  }
}

/** Latest events emitted by the Voting contract, refreshed on every new block. */
export default function EventsFeed({ tick }) {
  const [filter, setFilter] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const now = useNow(5000);

  useEffect(() => {
    let cancelled = false;
    get(`/admin/chain/events?limit=30${filter ? `&name=${filter}` : ''}`, 'admin')
      .then((d) => !cancelled && (setData(d), setError(null)))
      .catch((err) => !cancelled && setError(err));
    return () => {
      cancelled = true;
    };
  }, [filter, tick]);

  return (
    <section className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <div>
          <h2>Contract events</h2>
          <div className="sub">{data ? `${data.total} events emitted since deployment` : 'Decoded from transaction logs'}</div>
        </div>
        <Segmented label="Filter events" options={FILTERS} value={filter} onChange={setFilter} />
      </div>
      <div className="card-body tight events-scroll">
        {error ? (
          <div className="card-body">
            <Alert type="danger">{error.message}</Alert>
          </div>
        ) : !data ? (
          <Loading />
        ) : data.events.length === 0 ? (
          <p className="muted card-body">No events yet.</p>
        ) : (
          <ul className="events-list">
            {data.events.map((ev) => (
              <li key={`${ev.transactionHash}-${ev.logIndex}`}>
                <span className={`badge ${ev.name === 'VoteCast' ? 'badge-accent' : ''}`}>{ev.name}</span>
                <span className="ev-desc">{describe(ev)}</span>
                <span className="ev-meta">
                  <Link to={`/admin/explorer/block/${ev.blockNumber}`}>#{ev.blockNumber}</Link>
                  <Link to={`/admin/explorer/tx/${ev.transactionHash}`} className="mono">
                    {shortHash(ev.transactionHash, 4, 4)}
                  </Link>
                  <span className="muted">{timeAgo(ev.timestamp, now)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
