'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ErrorLog {
  id: string;
  level: string;
  message: string;
  stack: string | null;
  context: any;
  createdAt: string;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const limit = 50;

  const loadLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString(),
      });

      const res = await fetch(`/api/admin/logs/errors?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [page]);

  const cleanup = async () => {
    if (!confirm('Logs älter als 30 Tage löschen?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/admin/logs/errors/cleanup', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        loadLogs();
      }
    } catch (error) {
      console.error('Failed to cleanup logs:', error);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Logs</h1>
          <p className="mt-2 text-gray-600">Fehler und Warnungen überwachen</p>
        </div>
        <Button onClick={cleanup} variant="danger" size="sm">
          <Trash2 size={16} className="mr-2" />
          Cleanup (30+ Tage)
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="text-sm text-gray-600">
            {total} Logs gesamt
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Lädt Logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <AlertCircle size={48} className="mx-auto mb-4 text-gray-400" />
            <p>Keine Logs gefunden</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-200">
              {logs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-gray-50">
                  <div 
                    className="cursor-pointer"
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            log.level === 'error'
                              ? 'bg-red-100 text-red-800'
                              : log.level === 'warn'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {log.level.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 break-words">
                          {log.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(log.createdAt).toLocaleString('de-DE')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {expandedLog === log.id && (
                    <div className="mt-4 space-y-3">
                      {log.stack && (
                        <div>
                          <div className="text-xs font-medium text-gray-700 mb-1">Stack Trace:</div>
                          <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
                            {log.stack}
                          </pre>
                        </div>
                      )}
                      {log.context && Object.keys(log.context).length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-gray-700 mb-1">Context:</div>
                          <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                            {JSON.stringify(log.context, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Seite {page + 1} von {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    variant="secondary"
                    size="sm"
                  >
                    <ChevronLeft size={16} className="mr-1" />
                    Zurück
                  </Button>
                  <Button
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    variant="secondary"
                    size="sm"
                  >
                    Weiter
                    <ChevronRight size={16} className="ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
