'use client';

import { useEffect, useState } from 'react';
import { Settings, Server, Shield, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SystemStatus {
  ok: boolean;
  checkedAt: string;
  targets: {
    appBaseUrl: string;
    dashBaseUrl: string;
  };
  checks: {
    appRoot: {
      url: string;
      status: number | null;
      ok: boolean;
      durationMs: number;
    };
    dashRoot: {
      url: string;
      status: number | null;
      ok: boolean;
      durationMs: number;
    };
    apiHealth: {
      url: string;
      status: number | null;
      ok: boolean;
      durationMs: number;
    };
  };
}

interface ServerInfo {
  ok: boolean;
  checkedAt: string;
  nodeEnv: string;
  startedAt: string;
  uptimeSeconds: number;
  loadAvg: number[];
  memory: {
    totalBytes: number;
    freeBytes: number;
  };
  diskRoot: {
    filesystem: string;
    sizeBytes: number;
    usedBytes: number;
    availableBytes: number;
    usedPercent: number;
    mount: string;
  } | null;
}

export default function AdminSettingsPage() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSystemStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/admin/ops/health', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setSystemStatus(data);
      }
    } catch (error) {
      console.error('Failed to load system status:', error);
    }
  };

  const loadServerInfo = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/admin/ops/server', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setServerInfo(data);
      }
    } catch (error) {
      console.error('Failed to load server info:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadSystemStatus(), loadServerInfo()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lädt System-Info...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
          <p className="mt-2 text-gray-600">Überwache System-Status und Server-Metriken</p>
        </div>
        <Button onClick={loadData} variant="secondary" size="sm">
          Aktualisieren
        </Button>
      </div>

      {/* System Health */}
      {systemStatus && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${systemStatus.ok ? 'bg-green-100' : 'bg-red-100'}`}>
                <Shield size={24} className={systemStatus.ok ? 'text-green-600' : 'text-red-600'} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">System Health</h2>
                <p className="text-sm text-gray-600">
                  Checked: {new Date(systemStatus.checkedAt).toLocaleString('de-DE')}
                </p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">App Root</div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">{systemStatus.checks.appRoot.url}</span>
                  <span
                    className={`text-sm font-semibold ${
                      systemStatus.checks.appRoot.ok ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {systemStatus.checks.appRoot.status || 'ERROR'}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Dashboard Root</div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">{systemStatus.checks.dashRoot.url}</span>
                  <span
                    className={`text-sm font-semibold ${
                      systemStatus.checks.dashRoot.ok ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {systemStatus.checks.dashRoot.status || 'ERROR'}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">API Health</div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">{systemStatus.checks.apiHealth.url}</span>
                  <span
                    className={`text-sm font-semibold ${
                      systemStatus.checks.apiHealth.ok ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {systemStatus.checks.apiHealth.status || 'ERROR'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Server Info */}
      {serverInfo && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Server size={24} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Server Info</h2>
                <p className="text-sm text-gray-600">
                  Environment: <span className="font-medium">{serverInfo.nodeEnv}</span>
                </p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Uptime</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatUptime(serverInfo.uptimeSeconds)}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Memory Usage</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatBytes(serverInfo.memory.totalBytes - serverInfo.memory.freeBytes)} /{' '}
                  {formatBytes(serverInfo.memory.totalBytes)}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Load Average</div>
                <div className="text-lg font-semibold text-gray-900">
                  {serverInfo.loadAvg.map((l) => l.toFixed(2)).join(' / ')}
                </div>
              </div>
            </div>

            {serverInfo.diskRoot && (
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Disk Usage ({serverInfo.diskRoot.mount})</div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>{formatBytes(serverInfo.diskRoot.usedBytes)} used</span>
                      <span>{formatBytes(serverInfo.diskRoot.availableBytes)} free</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          serverInfo.diskRoot.usedPercent > 90
                            ? 'bg-red-500'
                            : serverInfo.diskRoot.usedPercent > 75
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${serverInfo.diskRoot.usedPercent}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {serverInfo.diskRoot.usedPercent}%
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
