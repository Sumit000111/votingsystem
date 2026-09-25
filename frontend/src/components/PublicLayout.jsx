import { NavLink, Outlet } from 'react-router';
import { useLang } from '../i18n.jsx';
import Aurora from './fx/Aurora.jsx';

export default function PublicLayout() {
  const { t, lang, setLang } = useLang();
  return (
    <div className="public-shell">
      <Aurora />
      <div className="tricolor" aria-hidden="true" />
      <header className="public-header">
        <div className="container spread">
          <NavLink to="/" className="brand">
            <span className="brand-mark" aria-hidden="true">
              <img src="/favicon.svg" alt="" width="36" height="36" />
            </span>
            <span>
              <strong>{lang === 'hi' ? 'राष्ट्रीय मतदान प्रणाली' : 'National Voting System'}</strong>
              <small>{t('tagline')} · भारत</small>
            </span>
          </NavLink>
          <nav className="public-nav" aria-label="Main">
            <NavLink to="/" end>
              {t('nav_vote')}
            </NavLink>
            <NavLink to="/verify">{t('nav_verify')}</NavLink>
            <NavLink to="/results">{t('nav_results')}</NavLink>
            <button
              type="button"
              className="lang-toggle"
              onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
              aria-label="Switch language / भाषा बदलें"
            >
              <span className={lang === 'en' ? 'on' : ''}>EN</span>
              <span className={lang === 'hi' ? 'on' : ''}>हि</span>
            </button>
            <NavLink to="/admin/login" className="nav-admin">
              {t('nav_admin')}
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="public-main">
        <Outlet />
      </main>
      <footer className="public-footer">
        <div className="container spread">
          <span>
            <strong>सत्यमेव जयते</strong> · © 2026 National Voting System
          </span>
          <span className="muted">Aadhaar & Voter ID are never stored in plain text · Votes live on a tamper-evident Ethereum ledger</span>
        </div>
      </footer>
    </div>
  );
}
