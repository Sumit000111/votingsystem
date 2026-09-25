import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { hashHue, shortHash } from '../utils/format.js';

const ALERT_ICONS = { info: 'ℹ', success: '✓', warning: '!', danger: '✕' };

export function Alert({ type = 'info', children, className = '' }) {
  return (
    <div className={`alert alert-${type} ${className}`} role={type === 'danger' ? 'alert' : 'status'}>
      <span className="alert-icon" aria-hidden="true">
        {ALERT_ICONS[type]}
      </span>
      <div>{children}</div>
    </div>
  );
}

export function Spinner({ large = false, label }) {
  return <span className={`spinner ${large ? 'lg' : ''}`} role="status" aria-label={label || 'Loading'} />;
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="center-state">
      <Spinner large />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="center-state">
      <Alert type="danger">{error?.message || String(error)}</Alert>
      {onRetry && (
        <button type="button" className="btn btn-sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="center-state">
      <strong style={{ color: 'var(--ink-2)' }}>{title}</strong>
      {children && <span>{children}</span>}
    </div>
  );
}

export function Modal({ title, children, footer, onClose, labelledBy = 'modal-title' }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        {title && (
          <div className="modal-header">
            <h2 id={labelledBy} style={{ fontSize: 19 }}>
              {title}
            </h2>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function StatTile({ label, value, foot, accent }) {
  return (
    <div className="card stat" style={accent ? { borderTop: `3px solid ${accent}` } : undefined}>
      <span className="stat-label">{label}</span>
      <span className="stat-value" title={typeof value === 'string' ? value : undefined}>
        {value}
      </span>
      {foot && <span className="stat-foot">{foot}</span>}
    </div>
  );
}

export function CopyButton({ value, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <button type="button" className="copy-btn" onClick={copy} aria-label={`${label} ${value}`} title={label}>
      {copied ? '✓' : '⧉'}
    </button>
  );
}

export function Identicon({ hash }) {
  const hue = hashHue(hash);
  return (
    <span
      className="identicon"
      aria-hidden="true"
      style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 40) % 360} 70% 42%))` }}
    />
  );
}

/** Hash with identicon, optional link and copy button. */
export function Hash({ value, to, full = false, copy = true, head, tail }) {
  if (!value) return <span className="muted">—</span>;
  const text = full ? value : shortHash(value, head, tail);
  return (
    <span className={`hash ${full ? 'full' : ''}`} title={value}>
      <Identicon hash={value} />
      {to ? (
        <Link to={to} className="hash-text">
          {text}
        </Link>
      ) : (
        <span className="hash-text">{text}</span>
      )}
      {copy && <CopyButton value={value} />}
    </span>
  );
}

export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={value === opt.value}
          disabled={opt.disabled}
          onClick={() => onChange(opt.value)}
          title={opt.title}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** Re-render every `ms` so relative times ("12s ago") stay current. */
export function useNow(ms = 5000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
