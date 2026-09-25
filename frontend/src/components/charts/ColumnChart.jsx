import { useMemo, useState } from 'react';
import { formatNumber } from '../../utils/format.js';
import { useElementWidth } from '../../hooks/useElementWidth.js';

function niceMax(value) {
  if (value <= 4) return 4;
  const exp = 10 ** Math.floor(Math.log10(value));
  const n = value / exp;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * exp;
}

/**
 * Single-series column chart over time (e.g. ballots per minute) with a
 * hover tooltip. points: [{ t: Date|string, value: number }]
 */
export default function ColumnChart({ points, height = 200, formatLabel, valueLabel = 'votes', title }) {
  const [hover, setHover] = useState(null);
  const [wrapRef, width] = useElementWidth();
  const pad = { top: 12, right: 8, bottom: 26, left: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const { max, ticks } = useMemo(() => {
    const m = niceMax(Math.max(1, ...points.map((p) => p.value)));
    return { max: m, ticks: [0, m / 2, m] };
  }, [points]);

  const slot = innerW / Math.max(points.length, 1);
  const barW = Math.min(24, Math.max(3, slot - 2));
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));

  const y = (v) => pad.top + innerH - (v / max) * innerH;

  return (
    <div className="columnchart" ref={wrapRef}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title} style={{ display: 'block' }}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="var(--hairline)" strokeWidth="1" />
            <text x={pad.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)" className="tabular">
              {formatNumber(t)}
            </text>
          </g>
        ))}
        {points.map((p, i) => {
          const x = pad.left + i * slot + (slot - barW) / 2;
          const h = Math.max(0, innerH - (y(p.value) - pad.top));
          const r = Math.min(4, barW / 2, h);
          const top = pad.top + innerH - h;
          // Rounded data-end, square at the baseline.
          const d =
            h > 0
              ? `M${x},${pad.top + innerH} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${pad.top + innerH} Z`
              : '';
          return (
            <g key={i}>
              {d && <path d={d} fill={hover === i ? 'var(--link)' : 'var(--bar)'} />}
              <rect
                x={pad.left + i * slot}
                y={pad.top}
                width={slot}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
              {i % labelEvery === 0 && (
                <text
                  x={pad.left + i * slot + slot / 2}
                  y={height - 8}
                  textAnchor={points.length > 1 && i >= points.length - labelEvery / 2 - 1 && pad.left + i * slot + slot / 2 > width - 40 ? 'end' : 'middle'}
                  fontSize="11"
                  fill="var(--muted)"
                >
                  {formatLabel ? formatLabel(p.t) : String(p.t)}
                </text>
              )}
            </g>
          );
        })}
        <line x1={pad.left} x2={width - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} stroke="var(--ink-2)" strokeOpacity="0.35" strokeWidth="1" />
      </svg>
      {hover !== null && points[hover] && (
        <div
          className="chart-tooltip"
          style={{ left: `${((pad.left + hover * slot + slot / 2) / width) * 100}%` }}
          role="status"
        >
          <strong>{formatNumber(points[hover].value)}</strong> {valueLabel}
          <span className="muted">{formatLabel ? formatLabel(points[hover].t, true) : String(points[hover].t)}</span>
        </div>
      )}
    </div>
  );
}
