'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bug, Power, Trash2, Download, RefreshCw, Globe, Monitor, Smartphone, Clock, AlertCircle, CheckCircle, Info, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import api from '@/lib/api';

interface DebugLog {
  id: string;
  type: 'error' | 'warn' | 'info' | 'api' | 'click' | 'network';
  timestamp: string;
  message: string;
  details?: any;
  stack?: string;
  domain: string;
  userAgent?: string;
}

interface DebugState {
  enabled: boolean;
  enabledAt?: string;
  enabledBy?: string;
}

export default function DebugModePage() {
  const [debugState, setDebugState] = useState<DebugState>({ enabled: false });
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [domainFilter, setDomainFilter] = useState<string>('all');

  const loadDebugState = useCallback(async () => {
    try {
      const { data } = await api.get('/debug/state');
      setDebugState(data);
    } catch (err) {
      console.error('Failed to load debug state:', err);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      const { data } = await api.get('/debug/logs');
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to load debug logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDebugState();
    loadLogs();
    
    // Poll for new logs every 5 seconds when debug is enabled
    const interval = setInterval(() => {
      if (debugState.enabled) {
        loadLogs();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [loadDebugState, loadLogs, debugState.enabled]);

  const toggleDebugMode = async () => {
    try {
      const { data } = await api.post('/debug/toggle', { enabled: !debugState.enabled });
      setDebugState(data);
      toast.success(data.enabled ? 'Debug-Modus aktiviert' : 'Debug-Modus deaktiviert');
    } catch (err) {
      toast.error('Fehler beim Umschalten des Debug-Modus');
    }
  };

  const clearLogs = async () => {
    try {
      await api.delete('/debug/logs');
      setLogs([]);
      toast.success('Logs gelöscht');
    } catch (err) {
      toast.error('Fehler beim Löschen der Logs');
    }
  };

  const exportLogs = () => {
    const text = filteredLogs.map(l => 
      `[${l.timestamp}] [${l.domain}] [${l.type.toUpperCase()}] ${l.message}${l.stack ? '\n' + l.stack : ''}`
    ).join('\n\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter(l => {
    if (filter !== 'all' && l.type !== filter) return false;
    if (domainFilter !== 'all' && l.domain !== domainFilter) return false;
    return true;
  });

  const domains = [...new Set(logs.map(l => l.domain))];
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warn': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'api': return <Zap className="w-4 h-4 text-blue-500" />;
      case 'click': return <Monitor className="w-4 h-4 text-purple-500" />;
      case 'network': return <Globe className="w-4 h-4 text-orange-500" />;
      default: return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'error': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'warn': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'api': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'click': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'network': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const stats = {
    total: logs.length,
    errors: logs.filter(l => l.type === 'error').length,
    warnings: logs.filter(l => l.type === 'warn').length,
    api: logs.filter(l => l.type === 'api').length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${debugState.enabled ? 'bg-green-500/10' : 'bg-app-accent/10'}`}>
            <Bug className={`w-6 h-6 ${debugState.enabled ? 'text-green-500' : 'text-app-accent'}`} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Debug-Modus</h1>
            <p className="text-app-muted text-sm">System-weites Debugging für app. und dash.gästefotos.com</p>
          </div>
        </div>
        
        <Button
          onClick={toggleDebugMode}
          className={debugState.enabled ? 'bg-green-500 hover:bg-green-600' : ''}
        >
          <Power className="w-4 h-4 mr-2" />
          {debugState.enabled ? 'Aktiv' : 'Aktivieren'}
        </Button>
      </div>

      {/* Status Card */}
      <div className={`p-4 rounded-xl border ${debugState.enabled ? 'bg-green-500/5 border-green-500/20' : 'bg-app-card border-app-border'}`}>
        <div className="flex items-center gap-3">
          {debugState.enabled ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <Info className="w-5 h-5 text-app-muted" />
          )}
          <div>
            <p className="font-medium">
              {debugState.enabled ? 'Debug-Modus ist AKTIV' : 'Debug-Modus ist deaktiviert'}
            </p>
            <p className="text-sm text-app-muted">
              {debugState.enabled 
                ? `Aktiviert am ${new Date(debugState.enabledAt || '').toLocaleString('de-DE')} — Logs werden von allen Domains gesammelt`
                : 'Aktiviere den Debug-Modus um Fehler, API-Calls und Benutzerinteraktionen zu tracken'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-app-card border border-app-border">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-app-muted">Gesamt Logs</div>
        </div>
        <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
          <div className="text-2xl font-bold text-red-500">{stats.errors}</div>
          <div className="text-sm text-red-500/70">Fehler</div>
        </div>
        <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
          <div className="text-2xl font-bold text-yellow-500">{stats.warnings}</div>
          <div className="text-sm text-yellow-500/70">Warnungen</div>
        </div>
        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
          <div className="text-2xl font-bold text-blue-500">{stats.api}</div>
          <div className="text-sm text-blue-500/70">API Calls</div>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-app-card border border-app-border text-sm"
          >
            <option value="all">Alle Typen</option>
            <option value="error">Fehler</option>
            <option value="warn">Warnungen</option>
            <option value="api">API Calls</option>
            <option value="click">Clicks</option>
            <option value="network">Network</option>
          </select>
          
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-app-card border border-app-border text-sm"
          >
            <option value="all">Alle Domains</option>
            {domains.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadLogs}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Aktualisieren
          </Button>
          <Button variant="outline" size="sm" onClick={exportLogs}>
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={clearLogs} className="text-red-500 hover:bg-red-500/10">
            <Trash2 className="w-4 h-4 mr-1" />
            Löschen
          </Button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-xl border border-app-border overflow-hidden">
        <div className="max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-app-muted">Lade Logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-app-muted">
              {debugState.enabled 
                ? 'Noch keine Logs. Interagiere mit dem System um Logs zu sammeln.'
                : 'Debug-Modus ist deaktiviert. Aktiviere ihn um Logs zu sammeln.'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-app-bg sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-app-muted">Typ</th>
                  <th className="px-4 py-3 text-left font-medium text-app-muted">Zeit</th>
                  <th className="px-4 py-3 text-left font-medium text-app-muted">Domain</th>
                  <th className="px-4 py-3 text-left font-medium text-app-muted">Nachricht</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-app-bg/50">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${getTypeBadgeClass(log.type)}`}>
                        {getTypeIcon(log.type)}
                        {log.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-app-muted whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(log.timestamp).toLocaleTimeString('de-DE')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-app-bg text-xs">
                        <Globe className="w-3 h-3" />
                        {log.domain}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-md truncate" title={log.message}>
                        {log.message}
                      </div>
                      {log.stack && (
                        <pre className="mt-1 text-xs text-red-400/70 max-w-md truncate">
                          {log.stack.split('\n')[0]}
                        </pre>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
