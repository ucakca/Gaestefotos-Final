'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  HardDrive,
  RefreshCw,
  Download,
  Trash2,
  Play,
  Loader2,
  Database,
  Archive,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Calendar,
  FileArchive,
  Server,
  ChevronDown,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { PageTransition, StaggerContainer, StaggerItem } from '@/components/ui/PageTransition';

interface BackupEntry {
  id: string;
  filename: string;
  type: 'full' | 'incremental' | 'db';
  category: 'daily' | 'weekly' | 'monthly' | 'manual';
  sizeBytes: number;
  sizeHuman: string;
  createdAt: string;
}

interface BackupStats {
  totalBackups: number;
  totalSize: string;
  totalSizeBytes: number;
  lastFullBackup: string | null;
  lastDbBackup: string | null;
  lastIncrementalBackup: string | null;
  diskFree: string;
  diskTotal: string;
  diskFreeBytes: number;
  diskTotalBytes: number;
}

interface BackupSchedule {
  daily: { enabled: boolean; time: string; retention: number };
  weekly: { enabled: boolean; dayOfWeek: number; time: string; retention: number };
  monthly: { enabled: boolean; dayOfMonth: number; time: string; retention: number };
}

type BackupType = 'full' | 'incremental' | 'db';
type FilterCategory = 'all' | 'daily' | 'weekly' | 'monthly' | 'manual';
type FilterType = 'all' | 'full' | 'incremental' | 'db';

export default function BackupsPage() {
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [schedule, setSchedule] = useState<BackupSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<BackupType | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [showSchedule, setShowSchedule] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadBackups = useCallback(async () => {
    try {
      const [backupRes, scheduleRes] = await Promise.all([
        api.get('/admin/backups'),
        api.get('/admin/backups/schedule'),
      ]);
      setBackups(backupRes.data.backups || []);
      setStats(backupRes.data.stats || null);
      setSchedule(scheduleRes.data.schedule || null);
    } catch (err: any) {
      showToast('Fehler beim Laden der Backups', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  const triggerBackup = async (type: BackupType) => {
    setRunning(type);
    try {
      const res = await api.post('/admin/backups/run', { type, includeDb: true });
      showToast(res.data.message || 'Backup gestartet');
      // Reload after a delay to show new backup
      setTimeout(() => loadBackups(), 5000);
    } catch {
      showToast('Backup fehlgeschlagen', 'error');
    } finally {
      setTimeout(() => setRunning(null), 3000);
    }
  };

  const verifyBackup = async (id: string) => {
    setVerifying(id);
    try {
      const res = await api.post('/admin/backups/verify', { id });
      if (res.data.valid) {
        showToast(`✓ ${res.data.filename} ist intakt (${res.data.fileCount} Dateien/Bytes)`);
      } else {
        showToast(`✗ ${res.data.filename} ist beschädigt!`, 'error');
      }
    } catch {
      showToast('Verifizierung fehlgeschlagen', 'error');
    } finally {
      setVerifying(null);
    }
  };

  const deleteBackup = async (id: string, filename: string) => {
    if (!confirm(`Backup "${filename}" wirklich löschen?`)) return;
    setDeleting(id);
    try {
      await api.delete(`/admin/backups/${id}`);
      showToast('Backup gelöscht');
      setBackups(prev => prev.filter(b => b.id !== id));
    } catch {
      showToast('Löschen fehlgeschlagen', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const downloadBackup = (id: string) => {
    const baseUrl = api.defaults.baseURL || '/api';
    const token = localStorage.getItem('admin-auth-storage');
    let authToken = '';
    if (token) {
      try {
        const parsed = JSON.parse(token);
        authToken = parsed.state?.token || '';
      } catch { /* ignore */ }
    }
    window.open(`${baseUrl}/admin/backups/${id}/download?token=${authToken}`, '_blank');
  };

  // Filtered backups
  const filteredBackups = backups.filter(b => {
    if (filterCategory !== 'all' && b.category !== filterCategory) return false;
    if (filterType !== 'all' && b.type !== filterType) return false;
    return true;
  });

  // Time ago helper
  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Nie';
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Vor wenigen Minuten';
    if (hours < 24) return `Vor ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Gestern';
    return `Vor ${days} Tagen`;
  };

  const typeConfig = {
    full: { icon: Archive, label: 'Voll', color: 'text-blue-600 bg-blue-50 border-blue-200' },
    incremental: { icon: FileArchive, label: 'Inkr.', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    db: { icon: Database, label: 'DB', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  };

  const categoryConfig = {
    daily: { label: 'Täglich', color: 'text-sky-700 bg-sky-50' },
    weekly: { label: 'Wöchentlich', color: 'text-indigo-700 bg-indigo-50' },
    monthly: { label: 'Monatlich', color: 'text-amber-700 bg-amber-50' },
    manual: { label: 'Manuell', color: 'text-gray-700 bg-gray-100' },
  };

  const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const diskUsagePercent = stats ? Math.round(((stats.diskTotalBytes - stats.diskFreeBytes) / stats.diskTotalBytes) * 100) : 0;

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-app-fg flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-blue-600" />
              </div>
              Backup-Verwaltung
            </h1>
            <p className="text-app-muted mt-1">Vollständige und inkrementelle Backups verwalten</p>
          </div>
          <Button variant="secondary" onClick={loadBackups} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Aktualisieren
          </Button>
        </div>

        {/* Stats Cards */}
        <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StaggerItem>
            <div className="bg-app-card rounded-xl border border-app-border p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Archive className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm text-app-muted">Letztes Voll-Backup</span>
              </div>
              <div className="font-semibold text-app-fg">{timeAgo(stats?.lastFullBackup ?? null)}</div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="bg-app-card rounded-xl border border-app-border p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Database className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-sm text-app-muted">Letztes DB-Backup</span>
              </div>
              <div className="font-semibold text-app-fg">{timeAgo(stats?.lastDbBackup ?? null)}</div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="bg-app-card rounded-xl border border-app-border p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <FileArchive className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-sm text-app-muted">Backups gesamt</span>
              </div>
              <div className="font-semibold text-app-fg">
                {stats?.totalBackups || 0} <span className="text-sm font-normal text-app-muted">({stats?.totalSize})</span>
              </div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="bg-app-card rounded-xl border border-app-border p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Server className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-sm text-app-muted">Speicherplatz</span>
              </div>
              <div className="font-semibold text-app-fg">{stats?.diskFree} frei</div>
              <div className="mt-1.5 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    diskUsagePercent > 90 ? 'bg-red-500' : diskUsagePercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${diskUsagePercent}%` }}
                />
              </div>
            </div>
          </StaggerItem>
        </StaggerContainer>

        {/* Quick Actions */}
        <div className="bg-app-card rounded-xl border border-app-border p-5 shadow-sm mb-6">
          <h2 className="font-semibold text-app-fg mb-4 flex items-center gap-2">
            <Play className="w-4 h-4" /> Backup jetzt erstellen
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => triggerBackup('full')}
              disabled={running !== null}
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors disabled:opacity-50 text-left"
            >
              {running === 'full' ? (
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              ) : (
                <Archive className="w-5 h-5 text-blue-600" />
              )}
              <div>
                <div className="font-medium text-blue-900">Voll-Backup</div>
                <div className="text-xs text-blue-700">App + DB + Nginx + SSL + S3-Metadaten</div>
              </div>
            </button>
            <button
              onClick={() => triggerBackup('incremental')}
              disabled={running !== null}
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-50 text-left"
            >
              {running === 'incremental' ? (
                <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
              ) : (
                <FileArchive className="w-5 h-5 text-emerald-600" />
              )}
              <div>
                <div className="font-medium text-emerald-900">Inkrementell</div>
                <div className="text-xs text-emerald-700">Nur geänderte Dateien seit letztem Backup</div>
              </div>
            </button>
            <button
              onClick={() => triggerBackup('db')}
              disabled={running !== null}
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 transition-colors disabled:opacity-50 text-left"
            >
              {running === 'db' ? (
                <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
              ) : (
                <Database className="w-5 h-5 text-purple-600" />
              )}
              <div>
                <div className="font-medium text-purple-900">Nur Datenbank</div>
                <div className="text-xs text-purple-700">PostgreSQL Dump (komprimiert)</div>
              </div>
            </button>
          </div>
        </div>

        {/* Schedule Section */}
        <div className="bg-app-card rounded-xl border border-app-border shadow-sm mb-6">
          <button
            onClick={() => setShowSchedule(!showSchedule)}
            className="w-full flex items-center justify-between p-5 text-left"
          >
            <h2 className="font-semibold text-app-fg flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Automatischer Zeitplan
            </h2>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showSchedule ? 'rotate-180' : ''}`} />
          </button>
          {showSchedule && schedule && (
            <div className="px-5 pb-5 border-t border-gray-100 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Daily */}
                <div className={`rounded-xl p-4 border ${schedule.daily.enabled ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">Täglich</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${schedule.daily.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-app-muted'}`}>
                      {schedule.daily.enabled ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </div>
                  {schedule.daily.enabled && (
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {schedule.daily.time} Uhr</div>
                      <div className="flex items-center gap-1.5"><Archive className="w-3 h-3" /> {schedule.daily.retention} Tage aufbewahren</div>
                    </div>
                  )}
                </div>
                {/* Weekly */}
                <div className={`rounded-xl p-4 border ${schedule.weekly.enabled ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">Wöchentlich</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${schedule.weekly.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-app-muted'}`}>
                      {schedule.weekly.enabled ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </div>
                  {schedule.weekly.enabled && (
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {dayNames[schedule.weekly.dayOfWeek]}</div>
                      <div className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {schedule.weekly.time} Uhr</div>
                      <div className="flex items-center gap-1.5"><Archive className="w-3 h-3" /> {schedule.weekly.retention} Wochen</div>
                    </div>
                  )}
                </div>
                {/* Monthly */}
                <div className={`rounded-xl p-4 border ${schedule.monthly.enabled ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">Monatlich</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${schedule.monthly.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-app-muted'}`}>
                      {schedule.monthly.enabled ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </div>
                  {schedule.monthly.enabled && (
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Am {schedule.monthly.dayOfMonth}. des Monats</div>
                      <div className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {schedule.monthly.time} Uhr</div>
                      <div className="flex items-center gap-1.5"><Archive className="w-3 h-3" /> {schedule.monthly.retention} Monate</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Backup List */}
        <div className="bg-app-card rounded-xl border border-app-border shadow-sm">
          <div className="p-5 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h2 className="font-semibold text-app-fg">Backup-Verlauf ({filteredBackups.length})</h2>
              <div className="flex gap-2 flex-wrap">
                {/* Category filter */}
                <select
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value as FilterCategory)}
                  className="text-sm border border-app-border rounded-lg px-3 py-1.5 bg-app-card text-app-fg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Alle Kategorien</option>
                  <option value="daily">Täglich</option>
                  <option value="weekly">Wöchentlich</option>
                  <option value="monthly">Monatlich</option>
                  <option value="manual">Manuell</option>
                </select>
                {/* Type filter */}
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value as FilterType)}
                  className="text-sm border border-app-border rounded-lg px-3 py-1.5 bg-app-card text-app-fg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Alle Typen</option>
                  <option value="full">Voll-Backup</option>
                  <option value="incremental">Inkrementell</option>
                  <option value="db">Datenbank</option>
                </select>
              </div>
            </div>
          </div>

          {filteredBackups.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <HardDrive className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Keine Backups gefunden</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredBackups.map((backup) => {
                const tc = typeConfig[backup.type];
                const cc = categoryConfig[backup.category];
                const TypeIcon = tc.icon;
                return (
                  <div
                    key={backup.id}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                  >
                    {/* Type icon */}
                    <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${tc.color}`}>
                      <TypeIcon className="w-4 h-4" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-app-fg truncate">{backup.filename}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${cc.color}`}>
                          {cc.label}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${tc.color}`}>
                          {tc.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                        <span>{new Date(backup.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        <span>{backup.sizeHuman}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => verifyBackup(backup.id)}
                        disabled={verifying === backup.id}
                        className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors disabled:opacity-50"
                        title="Integrität prüfen"
                      >
                        {verifying === backup.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => downloadBackup(backup.id)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Herunterladen"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteBackup(backup.id, backup.filename)}
                        disabled={deleting === backup.id}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                        title="Löschen"
                      >
                        {deleting === backup.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">Backup-Hinweise</p>
              <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                <li>Voll-Backups enthalten: App-Code, Nginx-Config, SSL-Zertifikate, S3-Metadaten, Env-Dateien</li>
                <li>Inkrementelle Backups speichern nur seit dem letzten Voll-Backup geänderte Dateien</li>
                <li>DB-Backups sind komprimierte PostgreSQL-Dumps (pg_dump + gzip)</li>
                <li>Automatische Backups laufen via Cron — Änderungen am Zeitplan erfordern Server-Zugang</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}
    </PageTransition>
  );
}
