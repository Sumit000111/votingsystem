import { formatPercent } from '../../utils/format.js';

/** Ratio against 100% (e.g. turnout). The track is a lighter step of the fill. */
export default function Meter({ value, label }) {
  const pct = Math.min(Math.max(value || 0, 0), 1);
  return (
    <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct * 100)} aria-label={label}>
      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${pct * 100}%` }} />
      </div>
      <span className="meter-value tabular">{formatPercent(pct)}</span>
    </div>
  );
}
