import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router';
import { get, patch, post, put } from '../../api/client.js';
import PartyBadge from '../../components/PartyBadge.jsx';
import { Alert, ErrorState, Loading, Modal, Segmented, Spinner } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { formatNumber, shortHash } from '../../utils/format.js';
import { INDIAN_STATES } from '../../utils/states.js';

const STATUS_OPTIONS = [
  { value: 'preparation', label: 'Preparation', phase: 'Registration', text: 'Voting closed. Candidates can be registered.' },
  { value: 'active', label: 'Active', phase: 'Voting', text: 'Ballots are accepted.' },
  { value: 'completed', label: 'Completed', phase: 'Ended', text: 'Voting closed permanently; results are published.' },
];

function TxNotice({ receipt, children }) {
  if (!receipt) return null;
  return (
    <Alert type="success">
      {children} Mined in block{' '}
      <Link to={`/admin/explorer/block/${receipt.blockNumber}`}>#{receipt.blockNumber}</Link> ·{' '}
      <Link to={`/admin/explorer/tx/${receipt.txHash}`} className="mono">
        {shortHash(receipt.txHash)}
      </Link>
    </Alert>
  );
}

function PartyForm({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '',
    abbreviation: '',
    partyType: 'national',
    symbol: '',
    color: '#FF9933',
    image: '',
    ideology: '',
    activeStates: [],
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const toggleState = (state) =>
    setForm((f) => ({
      ...f,
      activeStates: f.activeStates.includes(state) ? f.activeStates.filter((s) => s !== state) : [...f.activeStates, state],
    }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await post('/admin/parties', form, 'admin');
      onCreated(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Register a party"
      onClose={() => !busy && onClose()}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="party-form" className="btn btn-primary" disabled={busy}>
            {busy ? <Spinner /> : null} Register on-chain
          </button>
        </>
      }
    >
      <form id="party-form" className="stack" onSubmit={submit}>
        <Alert type="info">The party is registered in the smart contract. Its name becomes its permanent on-chain id.</Alert>
        {error && <Alert type="danger">{error}</Alert>}
        <div className="field">
          <label htmlFor="p-name">Party name</label>
          <input id="p-name" className="input" value={form.name} onChange={set('name')} required minLength={3} />
        </div>
        <div className="grid grid-2">
          <div className="field">
            <label htmlFor="p-abbr">Abbreviation</label>
            <input id="p-abbr" className="input mono" value={form.abbreviation} onChange={set('abbreviation')} required maxLength={12} style={{ textTransform: 'uppercase' }} />
          </div>
          <div className="field">
            <label htmlFor="p-type">Type</label>
            <select id="p-type" className="select" value={form.partyType} onChange={set('partyType')}>
              <option value="national">National</option>
              <option value="state">State</option>
              <option value="regional">Regional</option>
            </select>
          </div>
        </div>
        <div className="grid grid-2">
          <div className="field">
            <label htmlFor="p-symbol">Symbol (emoji)</label>
            <input id="p-symbol" className="input" value={form.symbol} onChange={set('symbol')} maxLength={8} />
          </div>
          <div className="field">
            <label htmlFor="p-color">Colour</label>
            <input id="p-color" className="input" type="color" value={form.color} onChange={set('color')} style={{ height: 42, padding: 4 }} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="p-image">Logo URL (optional)</label>
          <input id="p-image" className="input" value={form.image} onChange={set('image')} placeholder="/parties/logo.png" />
        </div>
        <div className="field">
          <label htmlFor="p-ideology">Ideology</label>
          <input id="p-ideology" className="input" value={form.ideology} onChange={set('ideology')} />
        </div>
        <fieldset className="field states-fieldset">
          <legend>States where the party contests (state elections)</legend>
          <div className="states-grid">
            {INDIAN_STATES.map((s) => (
              <label key={s} className="state-check">
                <input type="checkbox" checked={form.activeStates.includes(s)} onChange={() => toggleState(s)} /> {s}
              </label>
            ))}
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}

export default function Election() {
  const { refreshChain } = useOutletContext();
  const election = useApi(() => get('/admin/election', 'admin'));
  const parties = useApi(() => get('/admin/parties', 'admin'));
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [toggling, setToggling] = useState(null);

  useEffect(() => {
    if (election.data) {
      const s = election.data.settings;
      setDraft({ name: s.name, status: s.status, nationalElectionEnabled: s.nationalElectionEnabled, stateElectionEnabled: s.stateElectionEnabled });
    }
  }, [election.data]);

  if (election.loading && !election.data) return <Loading />;
  if (election.error && !election.data) return <ErrorState error={election.error} onRetry={election.reload} />;
  if (!draft) return null;

  const settings = election.data.settings;
  const chain = election.data.chain;
  const ended = settings.status === 'completed';
  const dirty =
    draft.name !== settings.name ||
    draft.status !== settings.status ||
    draft.nationalElectionEnabled !== settings.nationalElectionEnabled ||
    draft.stateElectionEnabled !== settings.stateElectionEnabled;

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await put('/admin/election', draft, 'admin');
      setMessage({ text: 'Election settings saved.', receipt: res.receipt });
      election.setData((d) => ({ ...d, settings: res.settings }));
      refreshChain();
      election.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
      setConfirmEnd(false);
    }
  }

  async function sync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await post('/admin/chain/sync', {}, 'admin');
      setSyncResult({ ok: true, actions: res.actions, note: res.note });
      parties.reload();
      refreshChain();
    } catch (err) {
      setSyncResult({ ok: false, error: err.message });
    } finally {
      setSyncing(false);
    }
  }

  async function toggleParty(party) {
    setToggling(party.id);
    setError(null);
    try {
      const res = await patch(`/admin/parties/${party.id}`, { isActive: !party.isActive }, 'admin');
      setMessage({ text: `${party.abbreviation} ${party.isActive ? 'deactivated' : 'activated'}.`, receipt: res.receipt });
      parties.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setToggling(null);
    }
  }

  return (
    <>
      <div>
        <h1 className="page-title">Election control</h1>
        <p className="page-sub">Changes to the election status and the candidate list are written to the smart contract first.</p>
      </div>

      {error && <Alert type="danger">{error}</Alert>}
      {message && (message.receipt ? <TxNotice receipt={message.receipt}>{message.text}</TxNotice> : <Alert type="success">{message.text}</Alert>)}

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <section className="card">
          <div className="card-header">
            <div>
              <h2>Election settings</h2>
              <div className="sub">
                On-chain phase: <strong>{chain.contract?.phase || 'unknown'}</strong>
              </div>
            </div>
          </div>
          <div className="card-body stack">
            <div className="field">
              <label htmlFor="e-name">Election name</label>
              <input id="e-name" className="input" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
            </div>
            <div className="field">
              <label>Status</label>
              <Segmented
                label="Election status"
                value={draft.status}
                onChange={(status) => setDraft((d) => ({ ...d, status }))}
                options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label, disabled: ended && o.value !== 'completed' }))}
              />
              <span className="hint">
                {STATUS_OPTIONS.find((o) => o.value === draft.status)?.text} Contract phase →{' '}
                <strong>{STATUS_OPTIONS.find((o) => o.value === draft.status)?.phase}</strong>.
              </span>
            </div>
            <div className="stack" style={{ gap: 10 }}>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={draft.nationalElectionEnabled}
                  onChange={(e) => setDraft((d) => ({ ...d, nationalElectionEnabled: e.target.checked }))}
                />
                National election ballot
              </label>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={draft.stateElectionEnabled}
                  onChange={(e) => setDraft((d) => ({ ...d, stateElectionEnabled: e.target.checked }))}
                />
                State election ballot
              </label>
            </div>
            {ended && <Alert type="info">The election has ended on-chain. Results are final and the phase can no longer change.</Alert>}
            <div className="row">
              <button
                type="button"
                className="btn btn-primary"
                disabled={!dirty || saving}
                onClick={() => (draft.status === 'completed' && settings.status !== 'completed' ? setConfirmEnd(true) : save())}
              >
                {saving ? <Spinner /> : null} Save changes
              </button>
              {dirty && (
                <button type="button" className="btn btn-ghost" onClick={() => election.reload()}>
                  Discard
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <h2>Contract synchronisation</h2>
              <div className="sub">Register missing parties and align active flags and phase with the database.</div>
            </div>
            <button type="button" className="btn btn-navy btn-sm" onClick={sync} disabled={syncing}>
              {syncing ? <Spinner /> : '↻'} Sync with chain
            </button>
          </div>
          <div className="card-body stack">
            <dl className="kv">
              <dt>Contract</dt>
              <dd className="mono">{chain.contract?.address || '—'}</dd>
              <dt>Relayer</dt>
              <dd className="mono">{chain.relayer?.address || '—'}</dd>
              <dt>Candidates on-chain</dt>
              <dd>{formatNumber(chain.contract?.candidateCount)}</dd>
              <dt>Ballots on-chain</dt>
              <dd>{formatNumber(chain.contract?.totalVotes)}</dd>
            </dl>
            {syncResult &&
              (syncResult.ok ? (
                <Alert type="success">
                  {syncResult.actions.length ? (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {syncResult.actions.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  ) : (
                    syncResult.note || 'Already in sync — nothing to do.'
                  )}
                </Alert>
              ) : (
                <Alert type="danger">{syncResult.error}</Alert>
              ))}
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card-header">
          <div>
            <h2>Parties</h2>
            <div className="sub">{parties.data ? `${parties.data.parties.length} parties` : 'Loading…'}</div>
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowForm(true)} disabled={ended}>
            + Register party
          </button>
        </div>
        <div className="card-body tight table-wrap">
          {!parties.data ? (
            <Loading />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Party</th>
                  <th>Type</th>
                  <th>States</th>
                  <th>On-chain</th>
                  <th className="num">Votes</th>
                  <th>Accepting votes</th>
                </tr>
              </thead>
              <tbody>
                {parties.data.parties.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="row" style={{ gap: 10 }}>
                        <PartyBadge party={p} size={32} />
                        <span>
                          <strong>{p.abbreviation}</strong>
                          <br />
                          <span className="muted" style={{ fontSize: 13 }}>
                            {p.name}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{p.partyType}</td>
                    <td className="muted" style={{ fontSize: 13, maxWidth: 260 }}>
                      {p.activeStates.length ? p.activeStates.join(', ') : '—'}
                    </td>
                    <td>
                      {p.onChain.registered ? (
                        <span className="badge badge-good" title={p.chainId}>
                          ✓ Registered
                        </span>
                      ) : (
                        <span className="badge badge-warning">! Not registered</span>
                      )}
                    </td>
                    <td className="num">{p.onChain.registered ? formatNumber(p.onChain.votes) : '—'}</td>
                    <td>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={p.isActive}
                          disabled={toggling === p.id || ended}
                          onChange={() => toggleParty(p)}
                          aria-label={`${p.abbreviation} accepting votes`}
                        />
                        {toggling === p.id ? <Spinner /> : <span className="muted">{p.isActive ? 'Active' : 'Inactive'}</span>}
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {confirmEnd && (
        <Modal
          title="End the election permanently?"
          onClose={() => !saving && setConfirmEnd(false)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setConfirmEnd(false)} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={save} disabled={saving}>
                {saving ? <Spinner /> : null} End election on-chain
              </button>
            </>
          }
        >
          <p className="ink-2">
            This moves the smart contract to the <strong>Ended</strong> phase. It is irreversible: no further ballots,
            candidates or phase changes will ever be accepted, and results become public.
          </p>
        </Modal>
      )}

      {showForm && (
        <PartyForm
          onClose={() => setShowForm(false)}
          onCreated={(res) => {
            setShowForm(false);
            setMessage({ text: `${res.party.abbreviation} registered.`, receipt: res.receipt });
            parties.reload();
            refreshChain();
          }}
        />
      )}
    </>
  );
}
