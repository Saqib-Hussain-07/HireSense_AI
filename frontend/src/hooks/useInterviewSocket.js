import { useEffect, useRef, useState, useCallback } from 'react';
import { wsUrl } from '../lib/api';

export function useInterviewSocket(sessionId, handlers) {
  const wsRef = useRef(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    const ws = new WebSocket(wsUrl(sessionId));
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = (e) => console.warn('[useInterviewSocket] error', e);

    ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      const handler = handlersRef.current?.[msg.type];
      if (handler) handler(msg);
    };

    return () => ws.close();
  }, [sessionId]);

  const send = useCallback((payload) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  return { send, connected };
}
