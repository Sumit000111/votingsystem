import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { get, onSessionExpired, post, session } from '../../api/client.js';
import Evm, { beep } from '../../components/Evm.jsx';
import Confetti from '../../components/fx/Confetti.jsx';
import PartyBadge from '../../components/PartyBadge.jsx';
import VvpatSlip from '../../components/VvpatSlip.jsx';
import { Alert, Loading, Modal, Segmented, Spinner } from '../../components/ui.jsx';
import { useLang } from '../../i18n.jsx';

function VotedPanel({ fresh, candidate, candidateName, receipt }) {
  const { t } = useLang();
  return (
    <div className="voted-layout">
      {fresh && <Confetti />}
      <div className="voted-message glass-card">
        <div className="ink-finger" aria-hidden="true">
          ☝️<span className="ink-mark" />
        </div>
        <h2 className="shimmer-text">{fresh ? t('voted_title') : t('already_title')}</h2>
        <p className="ink-2">{t('voted_sub')}</p>
        <span className="badge badge-accent">✓ {t('ink')}</span>
        <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
          {t('keep_hash')}
        </p>
      </div>
      <VvpatSlip candidate={candidate} candidateName={candidateName} receipt={receipt} animate={fresh} />
    </div>
  );
}

export default function VotePage() {
  const navigate = useNavigate();
  const { t } = useLang();
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

  function press(candidate) {
    setSelected(candidate);
    setSubmitError(null);
    setConfirming(true);
  }

  async function castVote() {
    setSubmitting(true);
    setSubmitError(null);
    setSubmitStep(0);
    const timers = [setTimeout(() => setSubmitStep(1), 450), setTimeout(() => setSubmitStep(2), 1100)];
    try {
      const res = await post('/voting/vote', { partyId: selected.id, electionType }, 'voter');
      timers.forEach(clearTimeout);
      beep();
      setJustVoted({ receipt: res.receipt, candidate: res.candidate });
      setStatus((s) => ({ ...s, hasVoted: true, votedFor: res.candidate.name, receipt: res.receipt }));
      setConfirming(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
          ← {t('change_details')}
        </button>
      </div>
    );
  }
  if (!status) return <Loading label="Loading your ballot…" />;

  const { election, user } = status;
  const tabs = [
    { value: 'national', label: `🇮🇳 ${t('national')}`, disabled: !election.nationalElectionEnabled },
    { value: 'state', label: `📍 ${user.state} · ${t('state_election')}`, disabled: !election.stateElectionEnabled },
  ];

  return (
    <div className="container booth stack" style={{ gap: 24 }}>
      <div className="booth-head glass-card">
        <div className="voter-id-card">
          <span className="voter-avatar" aria-hidden="true">
            {user.username.slice(-2).toUpperCase()}
          </span>
          <div>
            <strong>{user.username}</strong>
            <span className="muted">
              Aadhaar {user.maskedAadhaar || '—'} · {user.state}
            </span>
          </div>
        </div>
        <div className="booth-election">
          <span className="muted">{election.name}</span>
          <span className={`live-pill ${election.status}`}>
            <span className={`dot ${election.status === 'active' ? 'live' : 'off'}`} />
            {t(`status_${election.status}`)}
          </span>
        </div>
        <button type="button" className="btn btn-sm" onClick={signOut}>
          {t('sign_out')}
        </button>
      </div>

      {status.hasVoted ? (
        <VotedPanel
          fresh={Boolean(justVoted)}
          candidate={justVoted?.candidate || status.candidate}
          candidateName={status.votedFor}
          receipt={justVoted?.receipt || status.receipt}
        />
      ) : election.status !== 'active' ? (
        <Alert type="warning">
          {election.status === 'completed' ? `${t('closed')} ` : t('not_open')}{' '}
          {election.status === 'completed' && <Link to="/results">{t('see_results')}</Link>}
        </Alert>
      ) : (
        <>
          {election.nationalElectionEnabled && election.stateElectionEnabled && (
            <div className="booth-tabs">
              <Segmented label="Election" options={tabs} value={electionType} onChange={setElectionType} />
            </div>
          )}
          {candidatesError ? (
            <Alert type="danger">{candidatesError}</Alert>
          ) : !candidates ? (
            <Loading label="Loading candidates…" />
          ) : (
            <Evm candidates={candidates} selected={selected} onPress={press} disabled={submitting} busy={submitting} />
          )}
        </>
      )}

      {confirming && selected && (
        <Modal
          title={t('confirm_title')}
          onClose={() => !submitting && (setConfirming(false), setSelected(null))}
          footer={
            <>
              <button type="button" className="btn" onClick={() => (setConfirming(false), setSelected(null))} disabled={submitting}>
                {t('go_back')}
              </button>
              <button type="button" className="btn btn-glow" onClick={castVote} disabled={submitting}>
                {submitting ? <Spinner /> : null} {t('confirm_cast')}
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
              {[t('step_sign'), t('step_mine'), t('step_record')].map((label, i) => (
                <li key={label} className={i < submitStep ? 'done' : i === submitStep ? 'active' : ''}>
                  <span className="step-mark">{i < submitStep ? '✓' : i === submitStep ? <Spinner /> : ''}</span>
                  {label}
                </li>
              ))}
            </ol>
          ) : (
            <p className="ink-2" style={{ marginTop: 16 }}>
              {t('confirm_body')}
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
