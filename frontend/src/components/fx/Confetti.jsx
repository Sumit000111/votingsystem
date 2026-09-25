import { useMemo } from 'react';

const COLORS = ['#FF9933', '#FFFFFF', '#138808', '#000080', '#FFB870', '#1FAE12'];

/** One-shot tricolour confetti burst (pure CSS). */
export default function Confetti({ pieces = 90 }) {
  const bits = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2.4 + Math.random() * 1.8,
        rotate: Math.random() * 720 - 360,
        drift: Math.random() * 160 - 80,
        color: COLORS[i % COLORS.length],
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 10,
      })),
    [pieces]
  );
  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((b, i) => (
        <span
          key={i}
          style={{
            left: `${b.left}%`,
            width: b.w,
            height: b.h,
            background: b.color,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`,
            '--rot': `${b.rotate}deg`,
            '--drift': `${b.drift}px`,
          }}
        />
      ))}
    </div>
  );
}
