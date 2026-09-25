import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { get, onSessionExpired, post, session } from '../../api/client.js';
import PartyBadge from '../../components/PartyBadge.jsx';
import { Alert, CopyButton, Loading, Modal, Segmented, Spinner } from '../../components/ui.jsx';
import { formatDateTime, shortHash } from '../../utils/format.js';

const SUBMIT_STEPS = ['Signing ballot transaction', 'Mining block', 'Recording receipt'];

function Receipt({ receipt, candidateName, fresh }) {
  return (
    <div className={`card receipt ${fresh ? 'fresh' : ''}`}>
      <div className="receipt-head">
        <div className="receipt-seal" aria-hidden="true">
          ✓
        </div>
        <div>
          <h2>{fresh ? 'Your vote is on the blockchain' : 'You have already voted'}</h2>
          <p className="ink-2">
            {candidateName ? (
              <>
                Ballot cast for <strong>{candidateName}</strong>.{' '}
              </>
            ) : null}
            Each voter can vote only once; this ballot is final.
          </p>
        </div>
      </div>
      {receipt?.txHash ? (
        <dl className="kv receipt-body">
          <dt>Transaction</dt>
          <dd className="mono">
            {receipt.txHash} <CopyButton value={receipt.txHash} />
          </dd>
          <dt>Block</dt>
          <dd className="mono">
            #{receipt.blockNumber} · {shortHash(receipt.blockHash, 10, 8)}
          </dd>
          <dt>Recorded</dt>
          <dd>{formatDateTime(receipt.timestamp || receipt.votedAt)}</dd>
          <dt>Election</dt>
          <dd style={{ textTransform: 'capitalize' }}>{receipt.electionType} election</dd>
        </dl>
      ) : (
        <div className="receipt-body">
          <Alert type="warning">No blockchain receipt is on file for this ballot.</Alert>
        </div>
      )}
      {receipt?.txHash && (
        <div className="receipt-foot">
          <p className="muted">Keep the transaction hash. Anyone can use it to confirm your ballot was counted — without revealing your choice.</p>
          <Link className="btn" to={`/verify/${receipt.txHash}`}>
            Verify receipt →
          </Link>
        </div>
      )}
    </div>
  );
}

export default function VotePage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [electionType, setElectionType] = useState('national');
  const [candidates, setCandidates] = useState(null);
  const [candidatesError, setCandidatesError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState(0);
  const [submitError, setSubmitError] = useState(null);
  const [justVoted, setJustVoted] = useState(null);

  const signOut = useCallback(() => {
    session.clear('voter');
    navigate('/');
  }, [navigate]);

  useEffect(() => onSessionExpired((scope) => scope === 'voter' && navigate('/')), [navigate]);

  useEffect(() => {
    if (!session.get('voter')) {
      navigate('/', { replace: true });
      return;
    }
    get('/voting/status', 'voter')
      .then((s) => {
        setStatus(s);
        if (!s.election.nationalElectionEnabled && s.election.stateElectionEnabled) setElectionType('state');
      })
      .catch((err) => setError(err));
  }, [navigate]);

  const canVote = status && !status.hasVoted && status.election.status === 'active';

  useEffect(() => {
    if (!canVote) return;
    setCandidates(null);
    setCandidatesError(null);
    setSelected(null);
    get(`/elections/candidates?type=${electionType}`, 'voter')
      .then((d) => setCandidates(d.candidates))
      .catch((err) => setCandidatesError(err.message));
  }, [canVote, electionType]);

  async function castVote() {
    setSubmitting(true);
    setSubmitError(null);
    setSubmitStep(0);
    const timers = [setTimeout(() => setSubmitStep(1), 450), setTimeout(() => setSubmitStep(2), 1100)];
    try {
      const res = await post('/voting/vote', { partyId: selected.id, electionType }, 'voter');
      timers.forEach(clearTimeout);
      setSubmitStep(3);
      setJustVoted({ receipt: res.receipt, candidate: res.candidate });
      setStatus((s) => ({ ...s, hasVoted: true, votedFor: res.candidate.name, receipt: res.receipt }));
      setConfirming(false);
    } catch (err) {
      timers.forEach(clearTimeout);
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (error) {
    return (
      <div className="container narrow">
        <Alert type="danger">{error.message}</Alert>
        <button type="button" className="btn" style={{ marginTop: 16 }} onClick={signOut}>
          Back to sign in
        </button>
      </div>
    );
  }
  if (!status) return <Loading label="Loading your ballot…" />;

  const { election, user } = status;
  const tabs = [
    { value: 'national', label: '🇮🇳 National election', disabled: !election.nationalElectionEnabled },
    { value: 'state', label: `📍 ${user.state} state election`, disabled: !election.stateElectionEnabled },
  ];

  return (
    <div className="container narrow stack" style={{ gap: 20 }}>
      <div className="spread">
        <div>
          <h1 className="page-title">{election.name}</h1>
          <p className="page-sub">
            {user.username} · Aadhaar {user.maskedAadhaar || 'on file'} · {user.state}
          </p>
        </div>
        <button type="button" className="btn btn-sm" onClick={signOut}>
          Sign out
        </button>
      </div>

      {status.hasVoted ? (
        <Receipt
          receipt={justVoted?.receipt || status.receipt}
          candidateName={justVoted?.candidate?.name || status.votedFor}
          fresh={Boolean(justVoted)}
        />
      ) : election.status !== 'active' ? (
        <Alert type="warning">
          {election.status === 'completed'
            ? 'This election has closed. '
            : 'Voting has not opened yet. Please come back when the election is active. '}
          {election.status === 'completed' && <Link to="/results">See the results →</Link>}
        </Alert>
      ) : (
        <>
          {election.nationalElectionEnabled && election.stateElectionEnabled && (
            <Segmented label="Election" options={tabs} value={electionType} onChange={setElectionType} />
          )}

          <section className="card" aria-labelledby="ballot-title">
            <div className="card-header">
              <div>
                <h2 id="ballot-title">Your ballot</h2>
                <div className="sub">Select one party, then confirm. You cannot change your vote afterwards.</div>
              </div>
              {candidates && <span className="badge">{candidates.length} candidates</span>}
            </div>
            <div className="card-body">
              {candidatesError ? (
                <Alert type="danger">{candidatesError}</Alert>
              ) : !candidates ? (
                <Loading label="Loading candidates…" />
              ) : (
                <div className="ballot" role="radiogroup" aria-labelledby="ballot-title">
                  {candidates.map((c) => (
                    <label key={c.id} className={`ballot-option ${selected?.id === c.id ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="candidate"
                        value={c.id}
                        checked={selected?.id === c.id}
                        onChange={() => setSelected(c)}
                      />
                      <PartyBadge party={c} size={48} />
                      <span className="ballot-text">
                        <strong>{c.name}</strong>
                        <span className="muted">
                          {c.abbreviation}
                          {c.ideology ? ` · ${c.ideology}` : ''}
                        </span>
                      </span>
                      <span className="ballot-radio" aria-hidden="true" />
                    </label>
                  ))}
                </div>
              )}
            </div>
          </section>

          <div className="vote-bar">
            <span className="ink-2">
              {selected ? (
                <>
                  Selected: <strong>{selected.name}</strong>
                </>
              ) : (
                'No party selected'
              )}
            </span>
            <button type="button" className="btn btn-primary btn-lg" disabled={!selected} onClick={() => setConfirming(true)}>
              Cast vote
            </button>
          </div>
        </>
      )}

      {confirming && selected && (
        <Modal
          title="Confirm your vote"
          onClose={() => !submitting && setConfirming(false)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setConfirming(false)} disabled={submitting}>
                Go back
              </button>
              <button type="button" className="btn btn-primary" onClick={castVote} disabled={submitting}>
                {submitting ? <Spinner /> : null} Confirm and cast vote
              </button>
            </>
          }
        >
          <div className="confirm-party">
            <PartyBadge party={selected} size={64} />
            <div>
              <strong style={{ fontSize: 18 }}>{selected.name}</strong>
              <div className="muted">{selected.abbreviation}</div>
            </div>
          </div>
          {submitting ? (
            <ol className="submit-steps" aria-live="polite">
              {SUBMIT_STEPS.map((label, i) => (
                <li key={label} className={i < submitStep ? 'done' : i === submitStep ? 'active' : ''}>
                  <span className="step-mark">{i < submitStep ? '✓' : i === submitStep ? <Spinner /> : ''}</span>
                  {label}
                </li>
              ))}
            </ol>
          ) : (
            <p className="ink-2" style={{ marginTop: 16 }}>
              Your ballot will be written to the Ethereum ledger as a permanent transaction. It cannot be changed or
              withdrawn.
            </p>
          )}
          {submitError && (
            <div style={{ marginTop: 16 }}>
              <Alert type="danger">{submitError}</Alert>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
