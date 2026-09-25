import { formatNumber, formatPercent } from '../../utils/format.js';

/**
 * Horizontal bar chart for one measure across named items (e.g. votes per
 * party). One colour for every bar; identity comes from the label and the
 * optional leading mark (party badge), never from bar colour.
 *
 * rows: [{ key, label, value, share?, lead?: ReactNode, secondary?: string }]
 */
export default function BarList({ rows, max, valueLabel = 'votes', emphasizeFirst = false, caption }) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <figure className="barlist" style={{ margin: 0 }}>
      {caption && <figcaption className="sr-only">{caption}</figcaption>}
      <ul role="list" className="barlist-rows">
        {rows.map((row, i) => {
          const pct = top ? (row.value / top) * 100 : 0;
          const emphasized = emphasizeFirst && i === 0 && row.value > 0;
          return (
            <li
              key={row.key}
              className="barlist-row"
              title={`${row.label}: ${formatNumber(row.value)} ${valueLabel}${row.share !== undefined ? ` (${formatPercent(row.share)})` : ''}`}
            >
              {row.lead && <span className="barlist-lead">{row.lead}</span>}
              <div className="barlist-main">
                <div className="barlist-label">
                  <span className="barlist-name">{row.label}</span>
                  {row.secondary && <span className="barlist-secondary">{row.secondary}</span>}
                </div>
                <div className="barlist-track" aria-hidden="true">
                  <div
                    className={`barlist-fill ${emphasized ? 'emph' : ''}`}
                    style={{ width: `${Math.max(pct, row.value > 0 ? 1.5 : 0)}%` }}
                  />
                </div>
              </div>
              <div className="barlist-value">
                <strong>{formatNumber(row.value)}</strong>
                {row.share !== undefined && <span className="muted">{formatPercent(row.share)}</span>}
              </div>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
