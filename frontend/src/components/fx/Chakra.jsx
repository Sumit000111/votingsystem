/** Ashoka Chakra — 24 spokes. Rotates slowly unless reduced motion is requested. */
export default function Chakra({ size = 420, className = '', spin = true }) {
  const spokes = Array.from({ length: 24 }, (_, i) => i * 15);
  return (
    <svg
      className={`chakra ${spin ? 'spin' : ''} ${className}`}
      width={size}
      height={size}
      viewBox="-50 -50 100 100"
      aria-hidden="true"
    >
      <circle r="46" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle r="7" fill="currentColor" />
      {spokes.map((deg) => (
        <g key={deg} transform={`rotate(${deg})`}>
          <path d="M0 -7 L1.6 -26 L0 -44 L-1.6 -26 Z" fill="currentColor" />
          <circle cy="-46" r="1.6" fill="currentColor" transform="rotate(7.5)" />
        </g>
      ))}
    </svg>
  );
}
