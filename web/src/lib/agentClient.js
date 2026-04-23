/**
 * Lightweight WebSocket client for the rock agent.
 *
 * Exposes a single `useRockAgent` hook returning the rock's current state, a
 * connection flag, a "rock is thinking" busy flag, an error message (set when
 * the server replies with `rate_limited`), and `feed`/`say` action functions.
 *
 * Reconnects on close with a fixed backoff. Accepts both our custom `state`
 * envelope and the agents-SDK's `cf_agent_state` envelope.
 */

import { useEffect, useRef, useState } from 'react';

const WORKER_URL = import.meta.env.VITE_ROCK_WORKER_URL || 'http://localhost:8787';
const RECONNECT_DELAY_MS = 2_500;
const BUSY_TIMEOUT_MS = 25_000;

const INITIAL_STATE = {
  age: 0,
  mood: 55,
  energy: 75,
  birthDate: null,
  lastFed: null,
  lastFedThing: null,
  currentThought: 'looking for the rock…',
  currentThoughtKind: 'idle',
  currentThoughtAt: new Date().toISOString(),
  memories: [],
};

function buildWsUrl(httpUrl) {
  try {
    const u = new URL(httpUrl);
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    u.pathname = '/agents/rock-agent/the-rock';
    u.search = '';
    u.hash = '';
    return u.toString();
  } catch {
    return null;
  }
}

export function useRockAgent() {
  const [state, setState] = useState(INITIAL_STATE);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const wsRef = useRef(null);

  // Open + maintain the websocket. One mount, one socket; reconnect on close.
  useEffect(() => {
    const url = buildWsUrl(WORKER_URL);
    if (!url) return undefined;
    let alive = true;
    let retryTimer = null;

    function open() {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (alive) setConnected(true);
      };
      ws.onmessage = (event) => {
        const msg = safeParse(event.data);
        if (!msg) return;
        if ((msg.type === 'state' || msg.type === 'cf_agent_state') && msg.state) {
          setState(msg.state);
          setBusy(false);
          setErrorMsg('');
        } else if (msg.type === 'rate_limited') {
          setErrorMsg(msg.reason || 'slow down a moment.');
          setBusy(false);
        }
      };
      ws.onclose = () => {
        if (!alive) return;
        setConnected(false);
        retryTimer = setTimeout(open, RECONNECT_DELAY_MS);
      };
      ws.onerror = () => {
        try { ws.close(); } catch { /* ignore */ }
      };
    }

    open();

    return () => {
      alive = false;
      if (retryTimer) clearTimeout(retryTimer);
      const ws = wsRef.current;
      if (ws) {
        try { ws.close(); } catch { /* ignore */ }
      }
    };
  }, []);

  // Safety net: if a request gets no reply, unstick the busy flag.
  useEffect(() => {
    if (!busy) return undefined;
    const t = setTimeout(() => setBusy(false), BUSY_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [busy]);

  function send(payload) {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify(payload));
    return true;
  }

  function feed(thing) {
    const trimmed = thing.trim();
    if (!trimmed || busy || !connected) return false;
    if (!send({ type: 'feed', thing: trimmed })) return false;
    setBusy(true);
    setErrorMsg('');
    return true;
  }

  function say(message) {
    const trimmed = message.trim();
    if (!trimmed || busy || !connected) return false;
    if (!send({ type: 'say', text: trimmed })) return false;
    setBusy(true);
    setErrorMsg('');
    return true;
  }

  return { state, connected, busy, errorMsg, feed, say };
}

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
