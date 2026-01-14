'use client';

import { useState, useEffect } from 'react';
import { HardDrive, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';

interface StorageSectionProps {
  eventId: string;
  photoStats: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
}

function formatBytes(input: string | number | null | undefined): string {
  const n = typeof input === 'string' ? Number(input) : typeof input === 'number' ? input : 0;
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

export function StorageSection({ eventId, photoStats }: StorageSectionProps) {
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsage = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get(`/events/${eventId}/usage`);
      setUsage(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const usedBytes = usage?.usage?.totalBytes ?? 0;
  const limitBytes = usage?.entitlement?.storageLimitBytes ?? null;
  const hasLimit = Number.isFinite(limitBytes) && limitBytes > 0;
  const percent = hasLimit ? Math.min(100, Math.max(0, (usedBytes / limitBytes) * 100)) : 0;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border px-4 py-3 flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground">Speicher</div>
          <div className="text-xs text-muted-foreground">
            {loading ? 'Lade...' : hasLimit ? 'Limit aktiv' : 'Unbegrenzt'}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={loadUsage} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="px-4 py-4">
        {error && <div className="text-sm text-destructive mb-2">{error}</div>}

        {!loading && usage && (
          <>
            {/* Success Message */}
            <div className="mb-4 p-3 rounded-lg bg-success/10 border border-success/20">
              <p className="text-sm font-semibold text-success flex items-center gap-2">
                🎉 {photoStats.total} Fotos gesammelt!
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatBytes(usedBytes)} Speicher genutzt
                {hasLimit && ` • ${formatBytes(limitBytes)} verfügbar`}
              </p>
            </div>

            {/* Progress Bar */}
            {hasLimit && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{formatBytes(usedBytes)}</span>
                  <span>{percent.toFixed(0)}%</span>
                  <span>{formatBytes(limitBytes)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-success rounded-full transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Details */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-success">✓</span>
                <span className="text-muted-foreground">Fotos:</span>
                <span className="text-foreground font-medium">{formatBytes(usage?.usage?.photosBytes)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-success">✓</span>
                <span className="text-muted-foreground">Videos:</span>
                <span className="text-foreground font-medium">{formatBytes(usage?.usage?.videosBytes)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-success">✓</span>
                <span className="text-muted-foreground">Gästebuch:</span>
                <span className="text-foreground font-medium">{formatBytes(usage?.usage?.guestbookBytes)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-success">✓</span>
                <span className="text-muted-foreground">Design:</span>
                <span className="text-foreground font-medium">{formatBytes(usage?.usage?.designBytes)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
