import { useState } from 'react';

/** Party flag/logo, or a generated badge in the party colour when no image exists. */
export default function PartyBadge({ party, size = 40 }) {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size };

  if (party?.image && !broken) {
    return (
      <span className="party-badge" style={style}>
        <img src={party.image} alt="" onError={() => setBroken(true)} loading="lazy" />
      </span>
    );
  }

  const label = party?.symbol && party.symbol !== '✓' ? party.symbol : (party?.abbreviation || '?').slice(0, 3);
  return (
    <span
      className="party-badge fallback"
      style={{ ...style, background: party?.color || '#898781', fontSize: size * (label.length > 2 ? 0.3 : 0.45) }}
      aria-hidden="true"
    >
      {label}
    </span>
  );
}
