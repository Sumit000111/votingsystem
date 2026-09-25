/** Transaction kinds in the explorer: colour slot + icon + label (never colour alone). */
export const KIND_META = {
  vote: { label: 'Ballot', icon: '🗳', color: 'var(--kind-vote)' },
  candidate: { label: 'Candidate', icon: '👤', color: 'var(--kind-candidate)' },
  phase: { label: 'Phase', icon: '⏱', color: 'var(--kind-phase)' },
  deploy: { label: 'Deploy', icon: '📜', color: 'var(--kind-other)' },
  admin: { label: 'Admin', icon: '🔑', color: 'var(--kind-other)' },
  transfer: { label: 'Transfer', icon: '↔', color: 'var(--kind-other)' },
  other: { label: 'Other', icon: '•', color: 'var(--kind-other)' },
  empty: { label: 'Empty', icon: '∅', color: 'var(--hairline)' },
};

export const LEGEND_KINDS = ['vote', 'candidate', 'phase', 'deploy'];

export function blockKind(block) {
  if (!block.transactions?.length && !block.kinds?.length) return 'empty';
  return block.transactions?.[0]?.kind || block.kinds?.[0] || 'other';
}

export function KindChip({ kind }) {
  const meta = KIND_META[kind] || KIND_META.other;
  return (
    <span className="kind-chip" style={{ '--kind': meta.color }}>
      <span aria-hidden="true">{meta.icon}</span>
      {meta.label}
    </span>
  );
}

export function KindLegend() {
  return (
    <ul className="kind-legend" aria-label="Block types">
      {LEGEND_KINDS.map((k) => (
        <li key={k}>
          <span className="kind-swatch" style={{ background: KIND_META[k].color }} aria-hidden="true" />
          {KIND_META[k].icon} {KIND_META[k].label}
        </li>
      ))}
    </ul>
  );
}
