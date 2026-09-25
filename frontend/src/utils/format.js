export const shortHash = (hash, head = 6, tail = 4) =>
  hash ? `${hash.slice(0, head + 2)}…${hash.slice(-tail)}` : '—';

const numberFormat = new Intl.NumberFormat('en-IN');
export const formatNumber = (n) => (n === null || n === undefined ? '—' : numberFormat.format(n));

export const formatPercent = (ratio, digits = 1) =>
  ratio === null || ratio === undefined || Number.isNaN(ratio) ? '—' : `${(ratio * 100).toFixed(digits)}%`;

export function compactNumber(n) {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

/** Seconds (unix) or Date/ISO → "12s ago", "5m ago", "3h ago", "2d ago". */
export function timeAgo(value, now = Date.now()) {
  if (value === null || value === undefined) return '—';
  const ms = typeof value === 'number' ? value * 1000 : new Date(value).getTime();
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function formatDateTime(value) {
  if (value === null || value === undefined) return '—';
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' });
}

export const formatGwei = (wei) => (wei ? `${(Number(wei) / 1e9).toFixed(2)} gwei` : '—');

export function formatEth(value, digits = 4) {
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toLocaleString('en-IN', { maximumFractionDigits: digits })} ETH` : '—';
}

/**
 * Deterministic colour for a hash, used for the small identicon next to
 * hashes so a block's "parent" chip visibly matches the previous block.
 */
export function hashHue(hash) {
  if (!hash) return 0;
  return parseInt(hash.slice(2, 8), 16) % 360;
}
