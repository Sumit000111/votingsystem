import { useEffect, useRef, useState } from 'react';

/** Animates a number from its previous value to `value` (easeOutExpo). */
export default function CountUp({ value, duration = 1400, format = (n) => n.toLocaleString('en-IN') }) {
  const [display, setDisplay] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (value === null || value === undefined) return undefined;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setDisplay(value);
      from.current = value;
      return undefined;
    }
    const start = performance.now();
    const origin = from.current;
    let frame;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = p === 1 ? 1 : 1 - 2 ** (-10 * p);
      setDisplay(Math.round(origin + (value - origin) * eased));
      if (p < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return <span className="tabular">{value === null || value === undefined ? '—' : format(display)}</span>;
}
