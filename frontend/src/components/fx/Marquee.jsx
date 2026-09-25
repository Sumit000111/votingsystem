/** Infinite horizontal marquee; content is duplicated for a seamless loop. */
export default function Marquee({ children, speed = 40, className = '' }) {
  return (
    <div className={`marquee ${className}`} style={{ '--marquee-duration': `${speed}s` }}>
      <div className="marquee-track">
        <div className="marquee-group">{children}</div>
        <div className="marquee-group" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
