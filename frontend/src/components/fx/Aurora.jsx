/** Slow-drifting tricolour aurora with a faint grid — the page backdrop. */
export default function Aurora({ className = '' }) {
  return (
    <div className={`aurora ${className}`} aria-hidden="true">
      <span className="aurora-blob saffron" />
      <span className="aurora-blob white" />
      <span className="aurora-blob green" />
      <span className="aurora-blob navy" />
      <span className="aurora-grid" />
    </div>
  );
}
