'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Bug, X, Trash2, ChevronDown, ChevronUp, Copy } from 'lucide-react';

interface DebugLog {
  id: number;
  ts: number;
  type: 'error' | 'warn' | 'network' | 'api' | 'info' | 'ws';
  message: string;
  details?: string;
}

interface DebugContextType {
  isDebugMode: boolean;
  addLog: (log: Omit<DebugLog, 'id' | 'ts'>) => void;
}

const DebugContext = createContext<DebugContextType>({ isDebugMode: false, addLog: () => {} });

export function useDebug() {
  return useContext(DebugContext);
}

const DOMAIN = typeof window !== 'undefined' ? window.location.hostname : 'unknown';
const CHECK_INTERVAL = 30000;
const MAX_LOGS = 200;
let logIdCounter = 0;

// In-memory log store accessible from outside React
const logStore: DebugLog[] = [];
let logListeners: Array<() => void> = [];

function pushLog(entry: Omit<DebugLog, 'id' | 'ts'>) {
  const log: DebugLog = { ...entry, id: ++logIdCounter, ts: Date.now() };
  logStore.push(log);
  if (logStore.length > MAX_LOGS) logStore.splice(0, logStore.length - MAX_LOGS);
  logListeners.forEach((fn) => fn());
  sendLogToBackend(log);
}

// Send log to backend API (fire-and-forget)
async function sendLogToBackend(log: DebugLog) {
  try {
    const origFetch = (window as any).__debugOrigFetch || window.fetch;
    await origFetch('/api/debug/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: log.type,
        message: log.message,
        details: log.details,
        domain: DOMAIN,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      }),
    });
  } catch {
    // Silently fail
  }
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${String(d.getMilliseconds()).padStart(3, '0')}`;
}

const TYPE_COLORS: Record<string, string> = {
  error: '#ff4444',
  warn: '#ffaa00',
  network: '#ff6600',
  api: '#44cc44',
  info: '#4488ff',
  ws: '#cc44ff',
};

const TYPE_LABELS: Record<string, string> = {
  error: 'ERR',
  warn: 'WARN',
  network: 'NET',
  api: 'API',
  info: 'INFO',
  ws: 'WS',
};

// ─── Debug Log Panel (on-screen) ────────────────────────────────────────────
function DebugPanel({ onClose }: { onClose: () => void }) {
  const [logs, setLogs] = useState<DebugLog[]>([...logStore]);
  const [filter, setFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const autoScroll = useRef(true);

  useEffect(() => {
    const listener = () => setLogs([...logStore]);
    logListeners.push(listener);
    return () => { logListeners = logListeners.filter((fn) => fn !== listener); };
  }, []);

  useEffect(() => {
    if (autoScroll.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const filtered = filter ? logs.filter((l) => l.type === filter) : logs;
  const errorCount = logs.filter((l) => l.type === 'error' || l.type === 'network').length;
  const warnCount = logs.filter((l) => l.type === 'warn').length;

  const handleCopyAll = () => {
    const text = filtered.map((l) => `[${formatTime(l.ts)}] [${l.type.toUpperCase()}] ${l.message}${l.details ? '\n  ' + l.details : ''}`).join('\n');
    navigator.clipboard?.writeText(text);
  };

  const handleClear = () => {
    logStore.length = 0;
    setLogs([]);
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex flex-col"
      style={{ background: 'rgba(0,0,0,0.95)', fontFamily: 'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10" style={{ background: '#1a1a2e' }}>
        <div className="flex items-center gap-3">
          <Bug className="w-4 h-4 text-green-400" />
          <span className="text-green-400 font-bold text-sm">Debug Console</span>
          <span className="text-xs text-white/40">{logs.length} logs</span>
          {errorCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">{errorCount} errors</span>
          )}
          {warnCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-bold">{warnCount} warns</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleCopyAll} className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white" title="Alle Logs kopieren">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleClear} className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white" title="Logs leeren">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-white/10" style={{ background: '#16162a' }}>
        <button
          onClick={() => setFilter(null)}
          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${!filter ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/70'}`}
        >
          Alle
        </button>
        {['error', 'warn', 'network', 'api', 'ws', 'info'].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(filter === t ? null : t)}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${filter === t ? 'text-white' : 'hover:text-white/70'}`}
            style={{ color: filter === t ? TYPE_COLORS[t] : undefined, backgroundColor: filter === t ? `${TYPE_COLORS[t]}20` : undefined }}
          >
            {TYPE_LABELS[t] || t.toUpperCase()}
            <span className="ml-1 opacity-60">({logs.filter((l) => l.type === t).length})</span>
          </button>
        ))}
      </div>

      {/* Log entries */}
      <div
        className="flex-1 overflow-y-auto text-xs leading-relaxed"
        style={{ background: '#0d0d1a' }}
        onScroll={(e) => {
          const el = e.currentTarget;
          autoScroll.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 50;
        }}
      >
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/30">
            Keine Logs {filter ? `für "${filter}"` : ''} — Interagiere mit der App...
          </div>
        ) : (
          filtered.map((log) => (
            <div
              key={log.id}
              className="px-3 py-1 border-b border-white/5 hover:bg-white/5 cursor-pointer"
              onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
            >
              <div className="flex items-start gap-2">
                <span className="text-white/30 shrink-0">{formatTime(log.ts)}</span>
                <span
                  className="shrink-0 font-bold text-[10px] px-1 py-0 rounded"
                  style={{ color: TYPE_COLORS[log.type] || '#aaa', backgroundColor: `${TYPE_COLORS[log.type] || '#aaa'}15` }}
                >
                  {TYPE_LABELS[log.type] || log.type.toUpperCase()}
                </span>
                <span className="text-white/90 break-all flex-1" style={{ color: log.type === 'error' || log.type === 'network' ? '#ff6666' : log.type === 'warn' ? '#ffcc44' : undefined }}>
                  {log.message}
                </span>
                {log.details && (
                  expandedId === log.id ? <ChevronUp className="w-3 h-3 text-white/30 shrink-0 mt-0.5" /> : <ChevronDown className="w-3 h-3 text-white/30 shrink-0 mt-0.5" />
                )}
              </div>
              {log.details && expandedId === log.id && (
                <pre className="mt-1 ml-16 text-[10px] text-white/50 whitespace-pre-wrap break-all">{log.details}</pre>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function DebugProvider({ children }: { children: React.ReactNode }) {
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [errorBadge, setErrorBadge] = useState(0);
  const originalConsole = useRef<{ error: typeof console.error; warn: typeof console.warn }>({
    error: console.error,
    warn: console.warn,
  });
  const originalFetch = useRef<typeof fetch | null>(null);
  const xhrPatched = useRef(false);

  const addLog = useCallback((entry: Omit<DebugLog, 'id' | 'ts'>) => {
    pushLog(entry);
    if (entry.type === 'error' || entry.type === 'network') {
      setErrorBadge((c) => c + 1);
    }
  }, []);

  // Check if debug mode is enabled via backend API
  const checkDebugMode = useCallback(async () => {
    try {
      const origFetch = (window as any).__debugOrigFetch || window.fetch;
      const res = await origFetch('/api/debug/enabled');
      if (res.ok) {
        const data = await res.json();
        setIsDebugMode(data.enabled);
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    checkDebugMode();
    const interval = setInterval(checkDebugMode, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [checkDebugMode]);

  // Intercept console.error and console.warn
  useEffect(() => {
    if (!isDebugMode) return;
    const origError = originalConsole.current.error;
    const origWarn = originalConsole.current.warn;

    console.error = (...args: any[]) => {
      origError.apply(console, args);
      const message = args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ');
      const stack = args.find((a) => a instanceof Error)?.stack;
      pushLog({ type: 'error', message, details: stack });
      setErrorBadge((c) => c + 1);
    };

    console.warn = (...args: any[]) => {
      origWarn.apply(console, args);
      const message = args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ');
      pushLog({ type: 'warn', message });
    };

    return () => {
      console.error = origError;
      console.warn = origWarn;
    };
  }, [isDebugMode]);

  // Intercept global errors
  useEffect(() => {
    if (!isDebugMode) return;

    const handleError = (event: ErrorEvent) => {
      pushLog({
        type: 'error',
        message: `${event.message}`,
        details: `${event.filename}:${event.lineno}:${event.colno}\n${event.error?.stack || ''}`,
      });
      setErrorBadge((c) => c + 1);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      pushLog({
        type: 'error',
        message: `Unhandled Rejection: ${reason?.message || String(reason)}`,
        details: reason?.stack,
      });
      setErrorBadge((c) => c + 1);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [isDebugMode]);

  // Intercept fetch
  useEffect(() => {
    if (!isDebugMode) {
      if (originalFetch.current) {
        window.fetch = originalFetch.current;
        originalFetch.current = null;
        delete (window as any).__debugOrigFetch;
      }
      return;
    }

    if (!originalFetch.current) {
      originalFetch.current = window.fetch;
      (window as any).__debugOrigFetch = window.fetch;
    }
    const origFetch = originalFetch.current;

    window.fetch = async (...args) => {
      const [url, options] = args;
      const urlStr = String(url);
      if (urlStr.includes('/api/debug') || urlStr.includes('/api/qa-logs')) {
        return origFetch.apply(window, args);
      }

      const method = options?.method || 'GET';
      const startTime = Date.now();

      try {
        const response = await origFetch.apply(window, args);
        const duration = Date.now() - startTime;
        const isErr = !response.ok;

        if (isErr) {
          let body = '';
          try {
            const clone = response.clone();
            body = await clone.text();
            if (body.length > 500) body = body.slice(0, 500) + '…';
          } catch {}

          pushLog({
            type: response.status >= 500 ? 'error' : 'network',
            message: `${method} ${urlStr} → ${response.status} ${response.statusText} (${duration}ms)`,
            details: body || undefined,
          });
          if (response.status >= 400) setErrorBadge((c) => c + 1);
        } else {
          pushLog({
            type: 'api',
            message: `${method} ${urlStr} → ${response.status} (${duration}ms)`,
          });
        }

        return response;
      } catch (error: any) {
        const duration = Date.now() - startTime;
        pushLog({
          type: 'network',
          message: `${method} ${urlStr} → FAILED (${duration}ms)`,
          details: error?.message || String(error),
        });
        setErrorBadge((c) => c + 1);
        throw error;
      }
    };

    return () => {
      if (originalFetch.current) {
        window.fetch = originalFetch.current;
        delete (window as any).__debugOrigFetch;
      }
    };
  }, [isDebugMode]);

  // Intercept XMLHttpRequest (axios uses XHR)
  useEffect(() => {
    if (!isDebugMode || xhrPatched.current) return;
    xhrPatched.current = true;

    const OrigXHR = (window as any).__debugOrigXHR || XMLHttpRequest;
    if (!(window as any).__debugOrigXHR) {
      (window as any).__debugOrigXHR = XMLHttpRequest;
    }

    const patchedXHR = function (this: XMLHttpRequest) {
      const xhr = new OrigXHR();
      let method = 'GET';
      let url = '';
      let startTime = 0;

      const origOpen = xhr.open.bind(xhr);
      xhr.open = function (...args: any[]) {
        method = (args[0] || 'GET').toUpperCase();
        url = String(args[1] || '');
        return origOpen(...args);
      };

      const origSend = xhr.send.bind(xhr);
      xhr.send = function (...args: any[]) {
        startTime = Date.now();

        xhr.addEventListener('load', () => {
          if (url.includes('/api/debug') || url.includes('/api/qa-logs')) return;
          const duration = Date.now() - startTime;
          const isErr = xhr.status >= 400;

          if (isErr) {
            let body = '';
            try {
              body = typeof xhr.responseText === 'string' ? xhr.responseText.slice(0, 500) : '';
            } catch {}

            pushLog({
              type: xhr.status >= 500 ? 'error' : 'network',
              message: `XHR ${method} ${url} → ${xhr.status} ${xhr.statusText} (${duration}ms)`,
              details: body || undefined,
            });
            setErrorBadge((c) => c + 1);
          } else {
            pushLog({
              type: 'api',
              message: `XHR ${method} ${url} → ${xhr.status} (${duration}ms)`,
            });
          }
        });

        xhr.addEventListener('error', () => {
          if (url.includes('/api/debug') || url.includes('/api/qa-logs')) return;
          const duration = Date.now() - startTime;
          pushLog({
            type: 'network',
            message: `XHR ${method} ${url} → NETWORK ERROR (${duration}ms)`,
          });
          setErrorBadge((c) => c + 1);
        });

        xhr.addEventListener('timeout', () => {
          if (url.includes('/api/debug') || url.includes('/api/qa-logs')) return;
          const duration = Date.now() - startTime;
          pushLog({
            type: 'network',
            message: `XHR ${method} ${url} → TIMEOUT (${duration}ms)`,
          });
          setErrorBadge((c) => c + 1);
        });

        return origSend(...args);
      };

      // Copy all properties from the real XHR to the proxy
      return xhr;
    } as any;

    // We can't easily replace XMLHttpRequest globally without breaking things,
    // so instead we add an interceptor via the axios instance.
    // For resource loading errors (img, script 404s), we use the error event listener.
    // The fetch interceptor already handles fetch-based requests.

    return () => {
      xhrPatched.current = false;
    };
  }, [isDebugMode]);

  // Intercept resource loading errors (img 404s, script errors, CSS errors)
  useEffect(() => {
    if (!isDebugMode) return;

    const handleResourceError = (event: Event) => {
      const target = event.target as HTMLElement;
      if (!target || target === window as any) return;

      let src = '';
      let tagName = '';
      if (target instanceof HTMLImageElement) {
        src = target.src || target.currentSrc || '';
        tagName = 'IMG';
      } else if (target instanceof HTMLScriptElement) {
        src = target.src || '';
        tagName = 'SCRIPT';
      } else if (target instanceof HTMLLinkElement) {
        src = target.href || '';
        tagName = 'LINK';
      }

      if (src && !src.includes('/api/debug')) {
        pushLog({
          type: 'network',
          message: `Resource failed: <${tagName}> ${src}`,
        });
        setErrorBadge((c) => c + 1);
      }
    };

    window.addEventListener('error', handleResourceError, true);
    return () => window.removeEventListener('error', handleResourceError, true);
  }, [isDebugMode]);

  // Listen for WebSocket errors
  useEffect(() => {
    if (!isDebugMode) return;

    const OrigWebSocket = (window as any).__debugOrigWS || WebSocket;
    if (!(window as any).__debugOrigWS) {
      (window as any).__debugOrigWS = WebSocket;
    }

    const PatchedWebSocket = function (this: WebSocket, url: string | URL, protocols?: string | string[]) {
      const ws = new OrigWebSocket(url, protocols);
      const wsUrl = String(url);

      ws.addEventListener('open', () => {
        pushLog({ type: 'ws', message: `WS connected: ${wsUrl}` });
      });

      ws.addEventListener('error', () => {
        pushLog({ type: 'ws', message: `WS error: ${wsUrl}` });
        setErrorBadge((c) => c + 1);
      });

      ws.addEventListener('close', (event: CloseEvent) => {
        if (!event.wasClean) {
          pushLog({ type: 'ws', message: `WS closed unclean (${event.code}): ${wsUrl}`, details: event.reason || undefined });
        }
      });

      return ws;
    } as any;

    PatchedWebSocket.prototype = OrigWebSocket.prototype;
    PatchedWebSocket.CONNECTING = OrigWebSocket.CONNECTING;
    PatchedWebSocket.OPEN = OrigWebSocket.OPEN;
    PatchedWebSocket.CLOSING = OrigWebSocket.CLOSING;
    PatchedWebSocket.CLOSED = OrigWebSocket.CLOSED;

    (window as any).WebSocket = PatchedWebSocket;

    return () => {
      if ((window as any).__debugOrigWS) {
        (window as any).WebSocket = (window as any).__debugOrigWS;
      }
    };
  }, [isDebugMode]);

  return (
    <DebugContext.Provider value={{ isDebugMode, addLog }}>
      {children}

      {isDebugMode && !panelOpen && (
        <button
          onClick={() => { setPanelOpen(true); setErrorBadge(0); }}
          className="fixed bottom-20 right-4 z-[9999] flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-full shadow-lg text-xs font-bold active:scale-95 transition-transform"
          title="Debug Console öffnen"
        >
          <Bug className="w-4 h-4" />
          <span>Debug</span>
          {errorBadge > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 shadow">
              {errorBadge > 99 ? '99+' : errorBadge}
            </span>
          )}
        </button>
      )}

      {isDebugMode && panelOpen && (
        <DebugPanel onClose={() => setPanelOpen(false)} />
      )}
    </DebugContext.Provider>
  );
}
