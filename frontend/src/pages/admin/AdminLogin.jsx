import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { post, session } from '../../api/client.js';
import { Alert, Spinner } from '../../components/ui.jsx';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [challenge, setChallenge] = useState(null);
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (session.get('admin')) navigate('/admin', { replace: true });
  }, [navigate]);

  async function requestOtp(e) {
    e?.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await post('/auth/admin-login', { phoneNumber: phone });
      setChallenge(res);
      setOtp('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await post('/auth/admin-verify-otp', { adminId: challenge.adminId, otp });
      session.set('admin', res.token);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container admin-login">
      <div className="card login-card" style={{ borderTopColor: 'var(--navy)' }}>
        <div className="stack">
          <div>
            <span className="badge">Restricted</span>
            <h1 style={{ fontSize: 24, marginTop: 10 }}>Election administration</h1>
            <p className="muted" style={{ marginTop: 4 }}>
              Sign in with an authorised mobile number.
            </p>
          </div>
          {error && <Alert type="danger">{error}</Alert>}
          {!challenge ? (
            <form className="stack" onSubmit={requestOtp}>
              <div className="field">
                <label htmlFor="admin-phone">Mobile number</label>
                <input
                  id="admin-phone"
                  className="input mono"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  autoFocus
                />
              </div>
              <button type="submit" className="btn btn-navy btn-lg btn-block" disabled={busy || phone.length !== 10}>
                {busy ? <Spinner /> : null} Send admin OTP
              </button>
            </form>
          ) : (
            <form className="stack" onSubmit={verify}>
              <p className="ink-2">{challenge.message}</p>
              {challenge.devOtp && (
                <Alert type="warning">
                  <strong>Development mode</strong> — OTP{' '}
                  <button type="button" className="linklike mono" onClick={() => setOtp(challenge.devOtp)}>
                    {challenge.devOtp}
                  </button>
                </Alert>
              )}
              <div className="field">
                <label htmlFor="admin-otp">6-digit code</label>
                <input
                  id="admin-otp"
                  className="input otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  autoFocus
                />
              </div>
              <button type="submit" className="btn btn-navy btn-lg btn-block" disabled={busy || otp.length !== 6}>
                {busy ? <Spinner /> : null} Sign in to dashboard
              </button>
              <div className="spread" style={{ fontSize: 14 }}>
                <button type="button" className="linklike" onClick={() => setChallenge(null)}>
                  ← Change number
                </button>
                <button type="button" className="linklike" onClick={requestOtp} disabled={busy}>
                  Resend OTP
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
