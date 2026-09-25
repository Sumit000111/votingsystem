import { useEffect, useRef, useState } from 'react';
import { session } from '../api/client.js';

/**
 * Subscribe to the admin live block stream (Server-Sent Events). Calls
 * `onBlock` for each newly mined block and reports the connection state.
 */
export function useBlockStream(onBlock) {
  const [connected, setConnected] = useState(false);
  const [lastBlock, setLastBlock] = useState(null);
  const handler = useRef(onBlock);
  handler.current = onBlock;

  useEffect(() => {
    const token = session.get('admin');
    if (!token || typeof EventSource === 'undefined') return undefined;

    const source = new EventSource(`/api/admin/chain/stream?token=${encodeURIComponent(token)}`);
    source.addEventListener('ready', () => setConnected(true));
    source.addEventListener('block', (event) => {
      try {
        const block = JSON.parse(event.data);
        setLastBlock(block);
        handler.current?.(block);
      } catch {
        /* ignore malformed frames */
      }
    });
    source.onerror = () => setConnected(false);
    source.onopen = () => setConnected(true);
    return () => source.close();
  }, []);

  return { connected, lastBlock };
}
