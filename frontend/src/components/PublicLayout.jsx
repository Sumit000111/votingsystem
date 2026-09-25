import { NavLink, Outlet } from 'react-router';

export default function PublicLayout() {
  return (
    <div className="public-shell">
      <div className="tricolor" aria-hidden="true" />
      <header className="public-header">
        <div className="container spread">
          <NavLink to="/" className="brand">
            <img src="/favicon.svg" alt="" width="34" height="34" />
            <span>
              <strong>National Voting System</strong>
              <small>Secured by Ethereum · भारत निर्वाचन</small>
            </span>
          </NavLink>
          <nav className="public-nav" aria-label="Main">
            <NavLink to="/" end>
              Vote
            </NavLink>
            <NavLink to="/verify">Verify receipt</NavLink>
            <NavLink to="/results">Results</NavLink>
            <NavLink to="/admin/login" className="nav-admin">
              Admin
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="public-main">
        <Outlet />
      </main>
      <footer className="public-footer">
        <div className="container spread">
          <span>© 2026 National Voting System · Aadhaar and Voter ID are never stored in plain text.</span>
          <span className="muted">Votes are recorded on a tamper-evident Ethereum ledger.</span>
        </div>
      </footer>
    </div>
  );
}
