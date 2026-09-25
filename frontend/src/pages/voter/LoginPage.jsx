import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { get, post, session } from '../../api/client.js';
import BlurText from '../../components/fx/BlurText.jsx';
import Chakra from '../../components/fx/Chakra.jsx';
import CountUp from '../../components/fx/CountUp.jsx';
import Marquee from '../../components/fx/Marquee.jsx';
import Spotlight from '../../components/fx/Spotlight.jsx';
import { useReveal } from '../../components/fx/useReveal.js';
import PartyBadge from '../../components/PartyBadge.jsx';
import { Alert, Spinner } from '../../components/ui.jsx';
import { useLang } from '../../i18n.jsx';
import { INDIAN_STATES } from '../../utils/states.js';

function formatAadhaar(value) {
  return value
    .replace(/\D/g, '')
    .slice(0, 12)
    .replace(/(\d{4})(?=\d)/g, '$1 ');
}

const STEPS = [
  { icon: '🪪', t: 'step1_t', d: 'step1_d' },
  { icon: '📲', t: 'step2_t', d: 'step2_d' },
  { icon: '🔵', t: 'step3_t', d: 'step3_d' },
  { icon: '🧾', t: 'step4_t', d: 'step4_d' },
];

const TRUST = [
  { icon: '⛓️', t: 'trust_1', d: 'trust_1d' },
  { icon: '🕶️', t: 'trust_2', d: 'trust_2d' },
  { icon: '🔍', t: 'trust_3', d: 'trust_3d' },
  { icon: '☝️', t: 'trust_4', d: 'trust_4d' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [stats, setStats] = useState(null);
  const [step, setStep] = useState('details');
  const [form, setForm] = useState({ aadhaar: '', voterNumber: '', phoneNumber: '', state: '' });
  const [challenge, setChallenge] = useState(null);
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  useReveal();

  useEffect(() => {
    if (session.get('voter')) navigate('/vote', { replace: true });
    const load = () => get('/elections/stats').then(setStats).catch(() => {});
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [navigate]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const update = (field) => (e) => {
    const value = field === 'aadhaar' ? formatAadhaar(e.target.value) : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
  };

  async function submitDetails(e) {
    e.preventDefault();
    setError(null);
    const aadhaar = form.aadhaar.replace(/\s/g, '');
    if (aadhaar.length !== 12) return setError('Aadhaar number must be 12 digits.');
    if (!/^[6-9]\d{9}$/.test(form.phoneNumber)) return setError('Enter a valid 10-digit mobile number.');
    if (!form.state) return setError('Please choose your state.');
    setBusy(true);
    try {
      const res = await post('/auth/authenticate', { ...form, aadhaar, voterNumber: form.voterNumber.toUpperCase() });
      setChallenge(res);
      setOtp('');
      setStep('otp');
      setCooldown(30);
      setNotice(res.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitOtp(e) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(otp)) return setError('Enter the 6-digit OTP.');
    setBusy(true);
    try {
      const res = await post('/auth/verify-otp', { userId: challenge.userId, otp });
      session.set('voter', res.token);
      navigate('/vote');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError(null);
    setBusy(true);
    try {
      const res = await post('/auth/resend-otp', { userId: challenge.userId });
      setChallenge((c) => ({ ...c, devOtp: res.devOtp }));
      setNotice(res.message);
      setCooldown(30);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const status = stats?.election?.status;

  return (
    <div className="landing">
      <section className="container hero-grid">
        <div className="hero">
          <Chakra className="hero-chakra" size={560} />
          {status && (
            <span className={`live-pill ${status}`}>
              <span className={`dot ${status === 'active' ? 'live' : 'off'}`} />
              {t(`status_${status}`)}
            </span>
          )}
          <h1 className="hero-title">
            <BlurText text={t('hero_1')} />
            <span className="shimmer-text">
              <BlurText text={t('hero_2')} delay={250} />
            </span>
            <BlurText text={t('hero_3')} delay={550} />
          </h1>
          <p className="hero-lede fade-up" style={{ animationDelay: '700ms' }}>
            {t('hero_lede')}
          </p>

          <div className="hero-stats fade-up" style={{ animationDelay: '850ms' }}>
            <div>
              <strong>
                <CountUp value={stats?.ballots} />
              </strong>
              <span>{t('stat_ballots')}</span>
            </div>
            <div>
              <strong>
                <CountUp value={stats?.blockNumber} />
              </strong>
              <span>{t('stat_blocks')}</span>
            </div>
            <div>
              <strong>
                <CountUp value={stats?.registeredVoters} />
              </strong>
              <span>{t('stat_voters')}</span>
            </div>
            <div>
              <strong>
                <CountUp value={stats?.parties?.length} />
              </strong>
              <span>{t('stat_parties')}</span>
            </div>
          </div>
        </div>

        <Spotlight as="section" className="glass-card login-card fade-up" style={{ animationDelay: '300ms' }} aria-labelledby="login-title">
          <div className="login-card-flag" aria-hidden="true" />
          {step === 'details' ? (
            <form onSubmit={submitDetails} className="stack" noValidate>
              <div>
                <h2 id="login-title">{t('signin_title')}</h2>
                <p className="muted" style={{ marginTop: 4 }}>
                  {t('signin_sub')}
                </p>
              </div>
              {error && <Alert type="danger">{error}</Alert>}
              <div className="field">
                <label htmlFor="aadhaar">{t('aadhaar')}</label>
                <input id="aadhaar" className="input mono" inputMode="numeric" autoComplete="off" placeholder="1234 5678 9012" value={form.aadhaar} onChange={update('aadhaar')} required />
              </div>
              <div className="field">
                <label htmlFor="voterNumber">{t('voter_id')}</label>
                <input id="voterNumber" className="input mono" style={{ textTransform: 'uppercase' }} autoComplete="off" placeholder="ABC1234567" maxLength={12} value={form.voterNumber} onChange={update('voterNumber')} required />
              </div>
              <div className="field">
                <label htmlFor="phone">{t('mobile')}</label>
                <div className="phone-input">
                  <span>+91</span>
                  <input
                    id="phone"
                    className="input mono"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="98765 43210"
                    maxLength={10}
                    value={form.phoneNumber}
                    onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    required
                  />
                </div>
                <span className="hint">{t('mobile_hint')}</span>
              </div>
              <div className="field">
                <label htmlFor="state">{t('state')}</label>
                <select id="state" className="select" value={form.state} onChange={update('state')} required>
                  <option value="">{t('choose_state')}</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-glow btn-lg btn-block" disabled={busy}>
                {busy ? <Spinner /> : null} {t('send_otp')} →
              </button>
            </form>
          ) : (
            <form onSubmit={submitOtp} className="stack" noValidate>
              <div>
                <h2 id="login-title">{t('otp_title')}</h2>
                <p className="muted" style={{ marginTop: 4 }}>
                  {notice}
                </p>
              </div>
              {challenge?.devOtp && (
                <Alert type="warning">
                  {t('dev_otp')}{' '}
                  <button type="button" className="linklike mono" onClick={() => setOtp(challenge.devOtp)}>
                    {challenge.devOtp}
                  </button>
                </Alert>
              )}
              {error && <Alert type="danger">{error}</Alert>}
              <div className="field">
                <label htmlFor="otp">{t('otp_label')}</label>
                <input id="otp" className="input otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus />
              </div>
              <button type="submit" className="btn btn-glow btn-lg btn-block" disabled={busy || otp.length !== 6}>
                {busy ? <Spinner /> : null} {t('verify_continue')}
              </button>
              <div className="spread" style={{ fontSize: 14 }}>
                <button type="button" className="linklike" onClick={() => setStep('details')}>
                  {t('change_details')}
                </button>
                <button type="button" className="linklike" onClick={resend} disabled={cooldown > 0 || busy}>
                  {cooldown > 0 ? `${t('resend_in')} ${cooldown}s` : t('resend')}
                </button>
              </div>
            </form>
          )}
        </Spotlight>
      </section>

      {stats?.parties?.length > 0 && (
        <section className="party-strip" aria-label="Parties on the ballot">
          <Marquee speed={Math.max(30, stats.parties.length * 3)}>
            {stats.parties.map((p) => (
              <span key={p.id} className="party-chip">
                <PartyBadge party={p} size={30} />
                <strong>{p.abbreviation}</strong>
                <span>{p.name}</span>
              </span>
            ))}
          </Marquee>
        </section>
      )}

      <section className="container section">
        <h2 className="section-heading">{t('how_title')}</h2>
        <ol className="steps-rail">
          {STEPS.map((s, i) => (
            <li key={s.t} className="step-card reveal" style={{ transitionDelay: `${i * 110}ms` }}>
              <span className="step-index">{String(i + 1).padStart(2, '0')}</span>
              <span className="step-icon" aria-hidden="true">
                {s.icon}
              </span>
              <strong>{t(s.t)}</strong>
              <p>{t(s.d)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="container section">
        <div className="trust-grid">
          {TRUST.map((x) => (
            <Spotlight key={x.t} className="trust-card reveal">
              <span className="trust-icon" aria-hidden="true">
                {x.icon}
              </span>
              <strong>{t(x.t)}</strong>
              <p>{t(x.d)}</p>
            </Spotlight>
          ))}
        </div>
        <div className="cta-band reveal">
          <div>
            <strong>{t('verify_title')}</strong>
            <p>{t('keep_hash')}</p>
          </div>
          <Link to="/verify" className="btn btn-lg btn-light">
            {t('nav_verify')} →
          </Link>
        </div>
      </section>
    </div>
  );
}
