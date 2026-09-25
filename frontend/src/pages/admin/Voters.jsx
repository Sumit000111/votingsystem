import { useState } from 'react';
import { get } from '../../api/client.js';
import { Empty, ErrorState, Loading, Segmented } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { formatDateTime, formatNumber } from '../../utils/format.js';
import { INDIAN_STATES } from '../../utils/states.js';

export default function Voters() {
  const [page, setPage] = useState(1);
  const [state, setState] = useState('');
  const [voted, setVoted] = useState('');
  const query = new URLSearchParams({ page: String(page), ...(state && { state }), ...(voted && { voted }) });
  const { data, error, loading, reload } = useApi(() => get(`/admin/voters?${query}`, 'admin'), [page, state, voted]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <div>
        <h1 className="page-title">Voters</h1>
        <p className="page-sub">Identity data is masked; raw Aadhaar and Voter ID numbers are never stored.</p>
      </div>

      <div className="row wrap">
        <label htmlFor="v-state" className="sr-only">
          State
        </label>
        <select id="v-state" className="select" style={{ width: 220 }} value={state} onChange={(e) => (setPage(1), setState(e.target.value))}>
          <option value="">All states</option>
          {INDIAN_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Segmented
          label="Voting status"
          value={voted}
          onChange={(v) => (setPage(1), setVoted(v))}
          options={[
            { value: '', label: 'Everyone' },
            { value: 'true', label: 'Voted' },
            { value: 'false', label: 'Not voted' },
          ]}
        />
      </div>

      <section className="card">
        <div className="card-header">
          <h2>{data ? `${formatNumber(data.total)} voters` : 'Voters'}</h2>
          {data && pages > 1 && (
            <div className="row">
              <button type="button" className="btn btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                ← Prev
              </button>
              <span className="muted tabular">
                {page} / {pages}
              </span>
              <button type="button" className="btn btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                Next →
              </button>
            </div>
          )}
        </div>
        <div className="card-body tight table-wrap">
          {loading && !data ? (
            <Loading />
          ) : error ? (
            <ErrorState error={error} onRetry={reload} />
          ) : data.voters.length === 0 ? (
            <Empty title="No voters match these filters" />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Voter</th>
                  <th>Aadhaar</th>
                  <th>Mobile</th>
                  <th>State</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th>Last sign-in</th>
                </tr>
              </thead>
              <tbody>
                {data.voters.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <strong>{v.username}</strong>
                    </td>
                    <td className="mono">{v.maskedAadhaar || '—'}</td>
                    <td className="mono">{v.maskedPhone}</td>
                    <td>{v.state || '—'}</td>
                    <td>{v.hasVoted ? <span className="badge badge-good">✓ Voted</span> : <span className="badge">Not voted</span>}</td>
                    <td className="muted">{formatDateTime(v.createdAt)}</td>
                    <td className="muted">{formatDateTime(v.lastLoginAt)}</td>
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
