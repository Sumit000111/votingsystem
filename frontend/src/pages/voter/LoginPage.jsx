import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { get, post, session } from '../../api/client.js';
import { Alert, Spinner } from '../../components/ui.jsx';
import { INDIAN_STATES } from '../../utils/states.js';

const STATUS_COPY = {
  active: { label: 'Voting is open', badge: 'badge-good' },
  preparation: { label: 'Voting opens soon', badge: 'badge-warning' },
  completed: { label: 'Election closed', badge: '' },
};

function formatAadhaar(value) {
  return value
    .replace(/\D/g, '')
    .slice(0, 12)
    .replace(/(\d{4})(?=\d)/g, '$1 ');
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [step, setStep] = useState('details');
  const [form, setForm] = useState({ aadhaar: '', voterNumber: '', phoneNumber: '', state: '' });
  const [challenge, setChallenge] = useState(null);
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (session.get('voter')) navigate('/vote', { replace: true });
    get('/elections/settings')
      .then((d) => setSettings(d.settings))
      .catch(() => setSettings(null));
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

  const status = settings ? STATUS_COPY[settings.status] : null;

  return (
    <div className="container login-grid">
      <section className="hero">
        {status && (
          <span className={`badge ${status.badge}`}>
            <span className={`dot ${settings.status === 'active' ? 'live' : 'off'}`} /> {status.label}
          </span>
        )}
        <h1>
          Your vote,
          <br />
          <span className="hero-accent">sealed on the blockchain.</span>
        </h1>
        <p className="hero-lede">
          {settings?.name || 'General Election'} — every ballot becomes an Ethereum transaction that no one, not even
          the administrators, can alter or delete without it being detected.
        </p>
        <ol className="hero-steps">
          <li>
            <span>1</span>
            <div>
              <strong>Verify your identity</strong>
              <p>Aadhaar + Voter ID are hashed; the raw numbers never leave this request.</p>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <strong>Confirm with an OTP</strong>
              <p>A one-time code is sent to your registered mobile number.</p>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <strong>Cast and keep your receipt</strong>
              <p>Your ballot is mined into a block. Anyone can verify its inclusion with the receipt.</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="card login-card" aria-labelledby="login-title">
        {step === 'details' ? (
          <form onSubmit={submitDetails} className="stack" noValidate>
            <div>
              <h2 id="login-title">Voter sign in</h2>
              <p className="muted" style={{ marginTop: 4 }}>
                New voters are registered automatically.
              </p>
            </div>
            {error && <Alert type="danger">{error}</Alert>}
            <div className="field">
              <label htmlFor="aadhaar">Aadhaar number</label>
              <input
                id="aadhaar"
                className="input mono"
                inputMode="numeric"
                autoComplete="off"
                placeholder="1234 5678 9012"
                value={form.aadhaar}
                onChange={update('aadhaar')}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="voterNumber">Voter ID (EPIC number)</label>
              <input
                id="voterNumber"
                className="input mono"
                style={{ textTransform: 'uppercase' }}
                autoComplete="off"
                placeholder="ABC1234567"
                maxLength={12}
                value={form.voterNumber}
                onChange={update('voterNumber')}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="phone">Mobile number</label>
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
              <span className="hint">Must match the number you registered with.</span>
            </div>
            <div className="field">
              <label htmlFor="state">State</label>
              <select id="state" className="select" value={form.state} onChange={update('state')} required>
                <option value="">Choose your state</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
              {busy ? <Spinner /> : null} Send OTP
            </button>
          </form>
        ) : (
          <form onSubmit={submitOtp} className="stack" noValidate>
            <div>
              <h2 id="login-title">Enter your OTP</h2>
              <p className="muted" style={{ marginTop: 4 }}>
                {notice}
              </p>
            </div>
            {challenge?.devOtp && (
              <Alert type="warning">
                <strong>Development mode</strong> — no SMS gateway is configured. Your OTP is{' '}
                <button type="button" className="linklike mono" onClick={() => setOtp(challenge.devOtp)}>
                  {challenge.devOtp}
                </button>
                .
              </Alert>
            )}
            {error && <Alert type="danger">{error}</Alert>}
            <div className="field">
              <label htmlFor="otp">6-digit code</label>
              <input
                id="otp"
                className="input otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy || otp.length !== 6}>
              {busy ? <Spinner /> : null} Verify and continue
            </button>
            <div className="spread" style={{ fontSize: 14 }}>
              <button type="button" className="linklike" onClick={() => setStep('details')}>
                ← Change details
              </button>
              <button type="button" className="linklike" onClick={resend} disabled={cooldown > 0 || busy}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
