import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { get, onSessionExpired, session } from '../../api/client.js';
import { useBlockStream } from '../../hooks/useBlockStream.js';
import { formatNumber } from '../../utils/format.js';

const NAV = [
  { group: 'Election' },
  { to: '/admin', label: 'Overview', icon: '◧', end: true },
  { to: '/admin/results', label: 'Results', icon: '▤' },
  { to: '/admin/voters', label: 'Voters', icon: '☷' },
  { to: '/admin/election', label: 'Election control', icon: '⚙' },
  { group: 'Blockchain' },
  { to: '/admin/explorer', label: 'Chain explorer', icon: '⛓' },
  { to: '/admin/audit', label: 'Audit', icon: '⚖' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [chain, setChain] = useState(null);
  const [tick, setTick] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const authed = Boolean(session.get('admin'));

  const refreshChain = useCallback(async () => {
    try {
      const data = await get('/admin/chain/overview', 'admin');
      setChain(data);
    } catch {
      /* session errors are handled by onSessionExpired */
    }
  }, []);

  useEffect(() => {
    if (!authed) navigate('/admin/login', { replace: true });
  }, [authed, navigate]);

  useEffect(() => onSessionExpired((scope) => scope === 'admin' && navigate('/admin/login')), [navigate]);

  useEffect(() => {
    if (!authed) return undefined;
    refreshChain();
    const id = setInterval(refreshChain, 20_000);
    return () => clearInterval(id);
  }, [authed, refreshChain]);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const { connected, lastBlock } = useBlockStream(() => {
    setTick((t) => t + 1);
    refreshChain();
  });

  const context = useMemo(() => ({ chain, tick, lastBlock, connected, refreshChain }), [chain, tick, lastBlock, connected, refreshChain]);

  if (!authed) return null;

  const status = chain?.status;
  const contract = status?.contract;
  const latest = lastBlock?.number ?? status?.blockNumber;

  const signOut = () => {
    session.clear('admin');
    navigate('/admin/login');
  };

  return (
    <div className={`admin-shell ${menuOpen ? 'menu-open' : ''}`}>
      <aside className="admin-sidebar" aria-label="Admin navigation">
        <div className="admin-brand">
          <img src="/favicon.svg" alt="" width="30" height="30" />
          <div>
            <strong>NVS Admin</strong>
            <small>Election Commission</small>
          </div>
        </div>
        <nav className="admin-nav">
          {NAV.map((item) =>
            item.group ? (
              <div key={item.group} className="nav-group">
                {item.group}
              </div>
            ) : (
              <NavLink key={item.to} to={item.to} end={item.end}>
                <span className="nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            )
          )}
        </nav>
        <div className="admin-sidebar-foot">
          {contract?.deployed && (
            <span>
              Contract <span className="mono">{contract.address.slice(0, 10)}…</span>
            </span>
          )}
          <button type="button" className="btn btn-sm" onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="row">
            <button type="button" className="btn btn-sm menu-toggle" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">
              ☰
            </button>
            <div className="chain-pill" aria-live="polite">
              {status?.connected ? (
                <>
                  <span className={`dot ${connected ? 'live' : 'off'}`} aria-hidden="true" />
                  <span>{connected ? 'Live' : 'Polling'}</span>
                  <span className="sep" />
                  <span>
                    Block <strong className="tabular">#{formatNumber(latest)}</strong>
                  </span>
                  <span className="sep hide-sm" />
                  <span className="hide-sm">Chain {status.chainId}</span>
                  {contract?.deployed && (
                    <>
                      <span className="sep" />
                      <span>
                        Phase <strong>{contract.phase}</strong>
                      </span>
                    </>
                  )}
                </>
              ) : chain ? (
                <>
                  <span className="dot" style={{ background: 'var(--critical)' }} aria-hidden="true" />
                  <span>Blockchain offline</span>
                </>
              ) : (
                <span className="muted">Connecting to chain…</span>
              )}
            </div>
          </div>
          {lastBlock && (
            <span className="muted" style={{ fontSize: 13 }}>
              Latest: {lastBlock.summaries?.[0] || 'empty block'}
            </span>
          )}
        </header>
        <div className="admin-content">
          {chain && !status?.connected && (
            <div className="alert alert-danger">
              <span className="alert-icon">✕</span>
              <div>{status?.error}</div>
            </div>
          )}
          {status?.connected && contract && !contract.deployed && (
            <div className="alert alert-warning">
              <span className="alert-icon">!</span>
              <div>{contract.reason}</div>
            </div>
          )}
          <Outlet context={context} />
        </div>
      </div>
    </div>
  );
}
