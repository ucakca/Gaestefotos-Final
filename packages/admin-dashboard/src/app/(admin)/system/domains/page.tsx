'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe, CheckCircle2, XCircle, Clock, ExternalLink, RefreshCw,
  Shield, Server, Wifi, Database, Cloud, Lock, AlertTriangle
} from 'lucide-react';
import api from '@/lib/api';

// ─── Domain Registry (nur aktive nginx-konfigurierte Domains) ─────────────────
// Quellen: /etc/nginx/conf.d/*.conf — geprüft Feb 2026
// Entfernt: ws, ws2 (laufen via app/socket.io), staging.app/.dash (intern, Port 8101),
//           minio, cloud (keine nginx-Config vorhanden)

const DOMAINS = [
  {
    group: 'Haupt-App',
    color: 'blue',
    entries: [
      { label: 'App (Frontend)',  domain: 'app.gästefotos.com',    punycode: 'app.xn--gstefotos-v2a.com',    purpose: 'Next.js Frontend (Port 3000)', ssl: true, cdn: true,  type: 'app' },
      { label: 'API (Backend)',   domain: 'app.gästefotos.com/api', punycode: 'app.xn--gstefotos-v2a.com',   purpose: 'Express Backend (Port 8001)', ssl: true, cdn: true,  type: 'api' },
      { label: 'WebSocket',       domain: 'app.gästefotos.com/socket.io', punycode: 'app.xn--gstefotos-v2a.com', purpose: 'Socket.IO via app-Domain (kein eigener Subdomain)', ssl: true, cdn: true, type: 'ws' },
    ],
  },
  {
    group: 'Admin & Services',
    color: 'purple',
    entries: [
      { label: 'Dashboard',      domain: 'dash.gästefotos.com',   punycode: 'dash.xn--gstefotos-v2a.com',   purpose: 'Admin Dashboard (Next.js, Port 3001)', ssl: true, cdn: true,  type: 'app' },
      { label: 'Print Service',  domain: 'print.gästefotos.com',  punycode: 'print.xn--gstefotos-v2a.com',  purpose: 'Print Terminal Service',              ssl: true, cdn: false, type: 'app' },
    ],
  },
  {
    group: 'Medien & CDN',
    color: 'green',
    entries: [
      { label: 'CDN / Medien',   domain: 'cdn.gästefotos.com',    punycode: 'cdn.xn--gstefotos-v2a.com',    purpose: 'SeaweedFS Filer (Port 8888) — Auth via HMAC-SHA256', ssl: true, cdn: true, type: 'cdn' },
    ],
  },
  {
    group: 'Marketing & Public',
    color: 'orange',
    entries: [
      { label: 'Website',        domain: 'gästefotos.com',        punycode: 'xn--gstefotos-v2a.com',        purpose: 'WordPress Hauptseite (Plesk)', ssl: true, cdn: true, type: 'cms' },
    ],
  },
];

const COLOR_MAP: Record<string, string> = {
  blue:   'border-blue-800 bg-blue-950/20',
  purple: 'border-purple-800 bg-purple-950/20',
  green:  'border-green-800 bg-green-950/20',
  orange: 'border-orange-800 bg-orange-950/20',
};
const BADGE_MAP: Record<string, string> = {
  blue:   'bg-blue-600',
  purple: 'bg-purple-600',
  green:  'bg-green-600',
  orange: 'bg-orange-600',
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  app:     <Globe className="w-4 h-4" />,
  api:     <Server className="w-4 h-4" />,
  ws:      <Wifi className="w-4 h-4" />,
  cdn:     <Cloud className="w-4 h-4" />,
  storage: <Database className="w-4 h-4" />,
  cms:     <Globe className="w-4 h-4" />,
};

// ─── Status Check ─────────────────────────────────────────────────────────────

type StatusMap = Record<string, 'ok' | 'error' | 'checking'>;

export default function DomainsPage() {
  const [statusMap, setStatusMap] = useState<StatusMap>({});
  const [checking, setChecking] = useState(false);
  const [serverInfo, setServerInfo] = useState<any>(null);

  const checkDomain = async (punycode: string, path?: string) => {
    const key = punycode;
    setStatusMap((prev) => ({ ...prev, [key]: 'checking' }));
    try {
      const url = `https://${punycode.replace('/api', '')}${path ?? ''}`;
      await api.get(`/admin/ops/ping?url=${encodeURIComponent(url)}`);
      setStatusMap((prev) => ({ ...prev, [key]: 'ok' }));
    } catch {
      setStatusMap((prev) => ({ ...prev, [key]: 'error' }));
    }
  };

  const checkAll = async () => {
    setChecking(true);
    for (const group of DOMAINS) {
      for (const entry of group.entries) {
        await checkDomain(entry.punycode, entry.type === 'api' ? '/health' : undefined);
      }
    }
    setChecking(false);
  };

  useEffect(() => {
    api.get('/admin/ops/server-info').then((r) => setServerInfo(r.data)).catch(() => {});
  }, []);

  const allDomains = DOMAINS.flatMap((g) => g.entries);
  const okCount = Object.values(statusMap).filter((s) => s === 'ok').length;
  const errCount = Object.values(statusMap).filter((s) => s === 'error').length;
  const checkedCount = Object.values(statusMap).filter((s) => s !== 'checking').length;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-600 rounded-lg">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Domain-Übersicht</h1>
            <p className="text-sm text-gray-400">Alle gästefotos.com Subdomains</p>
          </div>
        </div>
        <button
          onClick={checkAll}
          disabled={checking}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Prüfe…' : 'Alle prüfen'}
        </button>
      </div>

      {/* Status Bar */}
      {checkedCount > 0 && (
        <div className="flex items-center gap-4 mb-6 p-4 bg-gray-900 border border-gray-800 rounded-xl text-sm">
          <span className="text-gray-400">Status-Check:</span>
          <span className="flex items-center gap-1 text-green-400">
            <CheckCircle2 className="w-4 h-4" /> {okCount} OK
          </span>
          {errCount > 0 && (
            <span className="flex items-center gap-1 text-red-400">
              <XCircle className="w-4 h-4" /> {errCount} Fehler
            </span>
          )}
          <span className="text-gray-500">{checkedCount}/{allDomains.length} geprüft</span>
        </div>
      )}

      {/* Server Info */}
      {serverInfo && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Server-IP',    value: serverInfo.ip,          icon: <Server className="w-4 h-4 text-blue-400" /> },
            { label: 'SSL',          value: serverInfo.sslProvider,  icon: <Lock className="w-4 h-4 text-green-400" /> },
            { label: 'CDN',          value: serverInfo.cdnProvider,  icon: <Cloud className="w-4 h-4 text-orange-400" /> },
            { label: 'Hosting',      value: serverInfo.hosting,      icon: <Database className="w-4 h-4 text-purple-400" /> },
            { label: 'Standort',     value: serverInfo.location,     icon: <Globe className="w-4 h-4 text-cyan-400" /> },
            { label: 'Uptime',       value: serverInfo.uptimeSeconds != null
                ? `${Math.floor(serverInfo.uptimeSeconds / 86400)}d ${Math.floor((serverInfo.uptimeSeconds % 86400) / 3600)}h`
                : '–',                                               icon: <Clock className="w-4 h-4 text-yellow-400" /> },
          ].map((item) => (
            <div key={item.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                {item.icon}
                <span className="text-xs text-gray-400">{item.label}</span>
              </div>
              <span className="text-sm font-semibold">{item.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Domain Groups */}
      {DOMAINS.map((group) => (
        <div key={group.group} className={`border rounded-xl p-4 mb-4 ${COLOR_MAP[group.color]}`}>
          <div className="flex items-center gap-2 mb-4">
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${BADGE_MAP[group.color]}`}>
              {group.group}
            </span>
          </div>

          <div className="space-y-2">
            {group.entries.map((entry) => {
              const status = statusMap[entry.punycode];
              return (
                <div
                  key={entry.punycode}
                  className="grid grid-cols-[1.5rem_1fr_auto] gap-3 items-center bg-gray-950/60 rounded-lg px-4 py-3"
                >
                  {/* Status Icon */}
                  <div className="flex items-center justify-center">
                    {!status && <div className="w-2 h-2 rounded-full bg-gray-600" />}
                    {status === 'checking' && <RefreshCw className="w-3 h-3 text-yellow-400 animate-spin" />}
                    {status === 'ok' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                    {status === 'error' && <XCircle className="w-4 h-4 text-red-400" />}
                  </div>

                  {/* Domain Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1 text-gray-300">
                        {TYPE_ICONS[entry.type]}
                        <span className="font-medium text-sm">{entry.label}</span>
                      </span>
                      <code className="text-xs font-mono text-blue-300 bg-blue-950/50 px-2 py-0.5 rounded">
                        {entry.domain}
                      </code>
                      {entry.punycode !== entry.domain && (
                        <code className="text-xs font-mono text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                          {entry.punycode}
                        </code>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{entry.purpose}</p>
                  </div>

                  {/* Badges + Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {entry.ssl && (
                      <span className="flex items-center gap-1 text-xs text-green-400 bg-green-950/40 px-2 py-0.5 rounded-full">
                        <Shield className="w-3 h-3" /> SSL
                      </span>
                    )}
                    {entry.cdn && (
                      <span className="flex items-center gap-1 text-xs text-orange-400 bg-orange-950/40 px-2 py-0.5 rounded-full">
                        <Cloud className="w-3 h-3" /> CF
                      </span>
                    )}
                    <a
                      href={`https://${entry.punycode.replace('/api', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* CDN Auth Note */}
      <div className="mt-4 p-4 bg-amber-950/30 border border-amber-800/50 rounded-xl flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-300">CDN Zugriffskontrolle aktiv</p>
          <p className="text-xs text-amber-400/80 mt-1">
            <code className="font-mono">cdn.gästefotos.com</code> ist durch nginx{' '}
            <code className="font-mono">auth_request</code> geschützt. Alle Dateien benötigen einen signierten Link (HMAC-SHA256, 6h TTL).
            Generiere Links im <a href="/admin/cdn-browser" className="underline hover:text-amber-300">CDN File Browser</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
