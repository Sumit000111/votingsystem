import { useEffect, useRef } from 'react';
import { Identicon, useNow } from '../ui.jsx';
import { shortHash, timeAgo } from '../../utils/format.js';
import { KIND_META, blockKind } from './kinds.jsx';

/**
 * Horizontal, scrollable chain of blocks (oldest → newest). Each tile shows
 * its own hash and its parent's hash; the matching identicons make the hash
 * link between neighbours visible.
 */
export default function ChainStrip({ blocks, selected, onSelect, hasOlder, onLoadOlder, loadingOlder, freshNumbers, compact = false }) {
  const scrollRef = useRef(null);
  const pinnedRight = useRef(true);
  const now = useNow(5000);
  const ordered = [...blocks].sort((a, b) => a.number - b.number);
  const newest = ordered[ordered.length - 1]?.number;

  useEffect(() => {
    const el = scrollRef.current;
    if (el && pinnedRight.current) el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
  }, [newest]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) pinnedRight.current = el.scrollLeft + el.clientWidth >= el.scrollWidth - 40;
  };

  return (
    <div className={`chain-strip ${compact ? 'compact' : ''}`} ref={scrollRef} onScroll={onScroll}>
      {hasOlder && (
        <button type="button" className="chain-older" onClick={onLoadOlder} disabled={loadingOlder}>
          {loadingOlder ? '…' : '← Older'}
        </button>
      )}
      {ordered.map((block, i) => {
        const kind = blockKind(block);
        const meta = KIND_META[kind] || KIND_META.other;
        const txSummary = block.transactions?.[0]?.summary || block.summaries?.[0];
        const extra = (block.txCount || 0) - 1;
        const isSelected = selected === block.number;
        const prev = ordered[i - 1];
        const linked = prev ? prev.hash === block.parentHash : null;
        return (
          <div key={block.hash} className="chain-cell">
            {i > 0 && (
              <span
                className={`chain-link ${linked === false ? 'broken' : ''}`}
                title={linked === false ? 'Gap — older blocks not loaded' : `parentHash of #${block.number} = hash of #${prev.number}`}
                aria-hidden="true"
              />
            )}
            <button
              type="button"
              className={`block-tile ${isSelected ? 'selected' : ''} ${freshNumbers?.has(block.number) ? 'fresh' : ''} kind-${kind}`}
              style={{ '--kind': meta.color }}
              onClick={() => onSelect?.(block.number)}
              aria-pressed={isSelected}
              aria-label={`Block ${block.number}: ${txSummary || 'empty block'}`}
            >
              <span className="bt-top">
                <span className="bt-num tabular">#{block.number}</span>
                <span className="bt-time">{timeAgo(block.timestamp, now)}</span>
              </span>
              <span className="bt-kind">
                <span aria-hidden="true">{meta.icon}</span>
                <span className="bt-summary">{txSummary || (block.number === 0 ? 'Genesis block' : 'Empty block')}</span>
                {extra > 0 && <span className="badge">+{extra}</span>}
              </span>
              {!compact && (
                <>
                  <span className="bt-hash">
                    <span className="bt-k">hash</span>
                    <Identicon hash={block.hash} />
                    <span className="mono">{shortHash(block.hash, 4, 4)}</span>
                  </span>
                  <span className="bt-hash">
                    <span className="bt-k">prev</span>
                    <Identicon hash={block.parentHash} />
                    <span className="mono">{shortHash(block.parentHash, 4, 4)}</span>
                  </span>
                </>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
