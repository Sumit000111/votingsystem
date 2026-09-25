import { useRef } from 'react';

/** Card whose border and surface glow follow the pointer. */
export default function Spotlight({ as: Tag = 'div', className = '', children, ...rest }) {
  const ref = useRef(null);
  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  return (
    <Tag ref={ref} className={`spotlight ${className}`} onPointerMove={onMove} {...rest}>
      {children}
    </Tag>
  );
}
