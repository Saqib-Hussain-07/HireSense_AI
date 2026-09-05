import { useEffect, useRef, useState, useCallback } from 'react';
import { wsUrl, getAuthToken } from '../lib/api';

const MAX_RETRIES   = 8;
const BASE_DELAY_MS = 500; // doubles each attempt, caps at ~30s

export function useInterviewSocket(sessionId, handlers) {
  const wsRef          = useRef(null);
  const handlersRef    = useRef(handlers);
  handlersRef.current  = handlers;
  const retriesRef     = useRef(0);
  const retryTimerRef  = useRef(null);
  const shouldReconnect= useRef(true); // set to false on intentional close

  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    shouldReconnect.current = true;
    retriesRef.current = 0;

    async function connect() {
      const token = await getAuthToken();
      if (!shouldReconnect.current) return;
      const ws = new WebSocket(wsUrl(sessionId, token));
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        retriesRef.current = 0; // reset on successful connection
      };

      ws.onclose = () => {
        setConnected(false);
        if (!shouldReconnect.current) return;
        if (retriesRef.current >= MAX_RETRIES) {
          console.error('[useInterviewSocket] max reconnect attempts reached');
          return;
        }
        const delay = Math.min(BASE_DELAY_MS * 2 ** retriesRef.current, 30000);
        retriesRef.current += 1;
        console.warn(`[useInterviewSocket] disconnected, retrying in ${delay}ms (attempt ${retriesRef.current})`);
        retryTimerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = (e) => console.warn('[useInterviewSocket] error', e);

      ws.onmessage = (event) => {
        let msg;
        try { msg = JSON.parse(event.data); } catch { return; }
        const handler = handlersRef.current?.[msg.type];
        if (handler) handler(msg);
      };
    }

    connect();

    return () => {
      shouldReconnect.current = false;
      clearTimeout(retryTimerRef.current);
      wsRef.current?.close();
    };
  }, [sessionId]);

  const send = useCallback((payload) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  return { send, connected };
}
