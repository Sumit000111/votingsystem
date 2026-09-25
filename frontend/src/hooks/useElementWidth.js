import { useEffect, useRef, useState } from 'react';

/** Track an element's rendered width so SVG charts draw at true pixel size. */
export function useElementWidth(initial = 640) {
  const ref = useRef(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w > 0) setWidth(w);
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}
