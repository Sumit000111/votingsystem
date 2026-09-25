/** Words fade and un-blur in sequence. */
export default function BlurText({ text, delay = 0, step = 90, className = '' }) {
  return (
    <span className={`blur-text ${className}`}>
      {text.split(' ').map((word, i) => (
        <span key={`${word}-${i}`} className="blur-word" style={{ animationDelay: `${delay + i * step}ms` }}>
          {word}
          {' '}
        </span>
      ))}
    </span>
  );
}
