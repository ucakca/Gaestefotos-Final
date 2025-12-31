'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import FullPageLoader from '@/components/FullPageLoader';

type UploadIssuesResponse = {
  ok: boolean;
  eventId: string;
  since: string;
  counts: {
    tempDeletedPhotos: number;
    tempDeletedVideos: number;
    scanErrorPhotos: number;
    scanPendingPhotos: number;
    scanErrorVideos: number;
    scanPendingVideos: number;
    guestbookExpiredUploads: number;
  };
  items: {
    tempDeletedPhotos: Array<{ id: string; createdAt: string; deletedAt: string | null; uploadedBy: string | null }>;
    tempDeletedVideos: Array<{ id: string; createdAt: string; deletedAt: string | null; uploadedBy: string | null }>;
    scanErrorPhotos: Array<{ id: string; createdAt: string; uploadedBy: string | null; scanError?: string; scanUpdatedAt?: string }>;
    scanPendingPhotos: Array<{ id: string; createdAt: string; uploadedBy: string | null; scanUpdatedAt?: string }>;
    scanErrorVideos: Array<{ id: string; createdAt: string; uploadedBy: string | null; scanError?: string; scannedAt?: string }>;
    scanPendingVideos: Array<{ id: string; createdAt: string; uploadedBy: string | null; scannedAt?: string }>;
    guestbookExpiredUploads: Array<{ id: string; createdAt: string; claimedAt: string | null; expiresAt: string; storagePath: string; sizeBytes: string }>;
  };
};

type EventDetail = {
  id: string;
  title: string;
  slug: string;
  dateTime: string | null;
  featuresConfig?: any;
};

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const eventId = params.id;
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [issues, setIssues] = useState<UploadIssuesResponse | null>(null);
  const [sinceHours, setSinceHours] = useState(72);
  const [loading, setLoading] = useState(true);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorIssues, setErrorIssues] = useState<string | null>(null);
  const [savingLimits, setSavingLimits] = useState(false);
  const [photoIpMax, setPhotoIpMax] = useState<string>('');
  const [photoEventMax, setPhotoEventMax] = useState<string>('');
  const [videoIpMax, setVideoIpMax] = useState<string>('');
  const [videoEventMax, setVideoEventMax] = useState<string>('');
  const [savingDatePolicy, setSavingDatePolicy] = useState(false);
  const [uploadDateEnabled, setUploadDateEnabled] = useState(true);
  const [uploadDateToleranceDays, setUploadDateToleranceDays] = useState<string>('1');
  const [savingVirusScan, setSavingVirusScan] = useState(false);
  const [virusScanEnforce, setVirusScanEnforce] = useState(false);
  const [virusScanAutoClean, setVirusScanAutoClean] = useState(false);
  const [markingClean, setMarkingClean] = useState<string | null>(null);
  const [markingVideoClean, setMarkingVideoClean] = useState<string | null>(null);

  const totalIssues = useMemo(() => {
    if (!issues) return 0;
    return (
      issues.counts.tempDeletedPhotos +
      issues.counts.tempDeletedVideos +
      issues.counts.scanErrorPhotos +
      issues.counts.scanPendingPhotos +
      issues.counts.scanErrorVideos +
      issues.counts.scanPendingVideos +
      issues.counts.guestbookExpiredUploads
    );
  }, [issues]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/events/${eventId}`);
        const ev = res.data?.event as EventDetail | undefined;
        if (mounted) {
          setEvent(ev || null);
          const cfg = (ev as any)?.featuresConfig?.uploadRateLimits || {};
          setPhotoIpMax(cfg.photoIpMax !== undefined && cfg.photoIpMax !== null ? String(cfg.photoIpMax) : '');
          setPhotoEventMax(cfg.photoEventMax !== undefined && cfg.photoEventMax !== null ? String(cfg.photoEventMax) : '');
          setVideoIpMax(cfg.videoIpMax !== undefined && cfg.videoIpMax !== null ? String(cfg.videoIpMax) : '');
          setVideoEventMax(cfg.videoEventMax !== undefined && cfg.videoEventMax !== null ? String(cfg.videoEventMax) : '');

          const dp = (ev as any)?.featuresConfig?.uploadDatePolicy;
          setUploadDateEnabled(dp?.enabled !== false);
          setUploadDateToleranceDays(dp?.toleranceDays !== undefined && dp?.toleranceDays !== null ? String(dp.toleranceDays) : '1');

          const vs = (ev as any)?.featuresConfig?.virusScan;
          setVirusScanEnforce(vs?.enforce === true);
          setVirusScanAutoClean(vs?.autoClean === true);
        }
      } catch (e: any) {
        if (mounted) setError(e?.response?.data?.error || e?.message || 'Fehler beim Laden');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [eventId]);

  async function loadUploadIssues(currentSinceHours: number) {
    try {
      setLoadingIssues(true);
      setErrorIssues(null);
      const res = await api.get(`/events/${eventId}/upload-issues`, {
        params: { sinceHours: currentSinceHours, limit: 50 },
      });
      setIssues(res.data as UploadIssuesResponse);
    } catch (e: any) {
      setErrorIssues(e?.response?.data?.error || e?.message || 'Fehler beim Laden');
    } finally {
      setLoadingIssues(false);
    }
  }

  useEffect(() => {
    loadUploadIssues(sinceHours);
  }, [eventId, sinceHours]);

  async function markPhotoClean(photoId: string) {
    try {
      setMarkingClean(photoId);
      await api.post(`/photos/${photoId}/scan/mark-clean`);
      toast.success('Foto freigegeben (CLEAN)');
      await loadUploadIssues(sinceHours);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Aktion fehlgeschlagen');
    } finally {
      setMarkingClean(null);
    }
  }

  async function markVideoClean(videoId: string) {
    try {
      setMarkingVideoClean(videoId);
      await api.post(`/videos/${videoId}/scan/mark-clean`);
      toast.success('Video freigegeben (CLEAN)');
      await loadUploadIssues(sinceHours);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Aktion fehlgeschlagen');
    } finally {
      setMarkingVideoClean(null);
    }
  }

  async function saveUploadRateLimits() {
    if (!event) return;
    try {
      setSavingLimits(true);
      const toNumOrUndef = (raw: string) => {
        const trimmed = raw.trim();
        if (!trimmed) return undefined;
        const n = Number(trimmed);
        return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
      };

      const nextUploadRateLimits = {
        photoIpMax: toNumOrUndef(photoIpMax),
        photoEventMax: toNumOrUndef(photoEventMax),
        videoIpMax: toNumOrUndef(videoIpMax),
        videoEventMax: toNumOrUndef(videoEventMax),
      };

      const featuresConfig = (event as any)?.featuresConfig || {};
      const merged = {
        ...featuresConfig,
        uploadRateLimits: {
          ...((featuresConfig as any)?.uploadRateLimits || {}),
          ...nextUploadRateLimits,
        },
      };

      await api.put(`/events/${eventId}`, {
        featuresConfig: merged,
      });

      toast.success('Upload Limits gespeichert');
      setEvent({ ...event, featuresConfig: merged });
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Speichern fehlgeschlagen');
    } finally {
      setSavingLimits(false);
    }
  }

  async function saveUploadDatePolicy() {
    if (!event) return;
    try {
      setSavingDatePolicy(true);
      const tolRaw = Number(uploadDateToleranceDays.trim());
      const toleranceDays = Number.isFinite(tolRaw) && tolRaw >= 0 ? Math.min(7, Math.floor(tolRaw)) : 1;

      const featuresConfig = (event as any)?.featuresConfig || {};
      const merged = {
        ...featuresConfig,
        uploadDatePolicy: {
          ...((featuresConfig as any)?.uploadDatePolicy || {}),
          enabled: !!uploadDateEnabled,
          toleranceDays,
        },
      };

      await api.put(`/events/${eventId}`, {
        featuresConfig: merged,
      });

      toast.success('Upload Date Policy gespeichert');
      setEvent({ ...event, featuresConfig: merged });
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Speichern fehlgeschlagen');
    } finally {
      setSavingDatePolicy(false);
    }
  }

  async function saveVirusScanSettings() {
    if (!event) return;
    try {
      setSavingVirusScan(true);

      const featuresConfig = (event as any)?.featuresConfig || {};
      const merged = {
        ...featuresConfig,
        virusScan: {
          ...((featuresConfig as any)?.virusScan || {}),
          enforce: !!virusScanEnforce,
          autoClean: !!virusScanAutoClean,
        },
      };

      await api.put(`/events/${eventId}`, {
        featuresConfig: merged,
      });

      toast.success('Virus-Scan Einstellungen gespeichert');
      setEvent({ ...event, featuresConfig: merged });
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Speichern fehlgeschlagen');
    } finally {
      setSavingVirusScan(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-app-fg">{event?.title || 'Event'}</h1>
          <p className="mt-1 text-sm text-app-muted">
            {event?.dateTime ? new Date(event.dateTime).toLocaleString('de-DE') : 'Kein Datum gesetzt'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/events"
            className="rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm font-medium text-app-fg"
          >
            Zurück
          </Link>
        </div>
      </div>

      {loading ? <FullPageLoader /> : null}

      {!loading && error && (
        <Card className="p-5">
          <p className="text-sm text-[var(--status-danger)]">{error}</p>
        </Card>
      )}

      {!loading && !error && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-app-fg">Virus Scan</h2>
            <p className="mt-1 text-sm text-app-muted">
              Optional: Wenn aktiv, werden Fotos mit scanStatus != CLEAN nicht ausgeliefert (404). Standard ist AUS.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={virusScanEnforce}
                  onChange={(e) => setVirusScanEnforce(e.target.checked)}
                />
                <span className="text-sm text-app-fg">Enforce Quarantäne (pro Event)</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={virusScanAutoClean}
                  onChange={(e) => setVirusScanAutoClean(e.target.checked)}
                />
                <span className="text-sm text-app-fg">Auto-CLEAN (nur Monitoring, ohne echten Scanner)</span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <Button
                onClick={saveVirusScanSettings}
                disabled={savingVirusScan}
                className={savingVirusScan ? 'bg-black/30 text-white hover:opacity-100' : 'bg-tokens-brandGreen text-white hover:opacity-90'}
              >
                {savingVirusScan ? 'Speichern…' : 'Speichern'}
              </Button>
              <p className="text-sm text-app-muted">Speichert in: featuresConfig.virusScan.enforce</p>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-app-fg">Upload Date Policy</h2>
            <p className="mt-1 text-sm text-app-muted">
              Steuert, ob Uploads gegen Event-/Album-Datum geprüft werden und welche Toleranz gilt.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={uploadDateEnabled}
                  onChange={(e) => setUploadDateEnabled(e.target.checked)}
                />
                <span className="text-sm text-app-fg">Aktiv (Datum prüfen)</span>
              </div>
              <div>
                <label className="mb-1 block text-sm text-app-muted">Toleranz (Tage)</label>
                <Input
                  className="px-3 py-2"
                  value={uploadDateToleranceDays}
                  onChange={(e) => setUploadDateToleranceDays(e.target.value)}
                  placeholder="Default: 1"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <Button
                onClick={saveUploadDatePolicy}
                disabled={savingDatePolicy}
                className={savingDatePolicy ? 'bg-black/30 text-white hover:opacity-100' : 'bg-tokens-brandGreen text-white hover:opacity-90'}
              >
                {savingDatePolicy ? 'Speichern…' : 'Speichern'}
              </Button>
              <p className="text-sm text-app-muted">Speichert in: featuresConfig.uploadDatePolicy</p>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-app-fg">Upload Rate Limits</h2>
            <p className="mt-1 text-sm text-app-muted">
              Diese Werte überschreiben die Defaults pro Event. Leer lassen = Default.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div>
                <label className="mb-1 block text-sm text-app-muted">Photo Uploads pro IP (5 min)</label>
                <Input
                  className="px-3 py-2"
                  value={photoIpMax}
                  onChange={(e) => setPhotoIpMax(e.target.value)}
                  placeholder="Default: 120"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-app-muted">Photo Uploads pro Event (5 min)</label>
                <Input
                  className="px-3 py-2"
                  value={photoEventMax}
                  onChange={(e) => setPhotoEventMax(e.target.value)}
                  placeholder="Default: 1000"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-app-muted">Video Uploads pro IP (10 min)</label>
                <Input
                  className="px-3 py-2"
                  value={videoIpMax}
                  onChange={(e) => setVideoIpMax(e.target.value)}
                  placeholder="Default: 20"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-app-muted">Video Uploads pro Event (10 min)</label>
                <Input
                  className="px-3 py-2"
                  value={videoEventMax}
                  onChange={(e) => setVideoEventMax(e.target.value)}
                  placeholder="Default: 150"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <Button
                onClick={saveUploadRateLimits}
                disabled={savingLimits}
                className={savingLimits ? 'bg-black/30 text-white hover:opacity-100' : 'bg-tokens-brandGreen text-white hover:opacity-90'}
              >
                {savingLimits ? 'Speichern…' : 'Speichern'}
              </Button>
              <p className="text-sm text-app-muted">Speichert in: featuresConfig.uploadRateLimits</p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-app-fg">Upload Issues</h2>
                <p className="mt-1 text-sm text-app-muted">
                  Monitoring von abgebrochenen Uploads, Scan-Problemen und abgelaufenen Gästebuch-Foto-Uploads.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-app-muted">Zeitraum</label>
                <select
                  className="rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm text-app-fg"
                  value={sinceHours}
                  onChange={(e) => setSinceHours(parseInt(e.target.value, 10))}
                >
                  <option value={24}>24h</option>
                  <option value={72}>72h</option>
                  <option value={168}>7 Tage</option>
                  <option value={720}>30 Tage</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
              <div className="rounded-lg border border-app-border bg-app-bg p-4">
                <div className="text-xs text-app-muted">Temp Photos (DELETED)</div>
                <div className="text-2xl font-semibold text-app-fg">{issues?.counts.tempDeletedPhotos ?? '-'}</div>
              </div>
              <div className="rounded-lg border border-app-border bg-app-bg p-4">
                <div className="text-xs text-app-muted">Temp Videos (DELETED)</div>
                <div className="text-2xl font-semibold text-app-fg">{issues?.counts.tempDeletedVideos ?? '-'}</div>
              </div>
              <div className="rounded-lg border border-app-border bg-app-bg p-4">
                <div className="text-xs text-app-muted">Scan ERROR Photos</div>
                <div className="text-2xl font-semibold text-app-fg">{issues?.counts.scanErrorPhotos ?? '-'}</div>
              </div>
              <div className="rounded-lg border border-app-border bg-app-bg p-4">
                <div className="text-xs text-app-muted">Scan PENDING Photos</div>
                <div className="text-2xl font-semibold text-app-fg">{issues?.counts.scanPendingPhotos ?? '-'}</div>
              </div>
              <div className="rounded-lg border border-app-border bg-app-bg p-4">
                <div className="text-xs text-app-muted">Scan ERROR Videos</div>
                <div className="text-2xl font-semibold text-app-fg">{issues?.counts.scanErrorVideos ?? '-'}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
              <div className="rounded-lg border border-app-border bg-app-bg p-4">
                <div className="text-xs text-app-muted">Scan PENDING Videos</div>
                <div className="text-2xl font-semibold text-app-fg">{issues?.counts.scanPendingVideos ?? '-'}</div>
              </div>
              <div className="rounded-lg border border-app-border bg-app-bg p-4">
                <div className="text-xs text-app-muted">Expired Guestbook Uploads</div>
                <div className="text-2xl font-semibold text-app-fg">{issues?.counts.guestbookExpiredUploads ?? '-'}</div>
              </div>
            </div>

            <div className="mt-6">
              {loadingIssues && <p className="text-sm text-app-muted">Issues werden geladen...</p>}
              {!loadingIssues && errorIssues && <p className="text-sm text-[var(--status-danger)]">{errorIssues}</p>}
              {!loadingIssues && !errorIssues && issues && (
                <p className="text-sm text-app-muted">
                  Gesamt: <span className="font-medium text-app-fg">{totalIssues}</span>
                </p>
              )}
            </div>
          </Card>

          {!loadingIssues && !errorIssues && issues && (
            <div className="space-y-6">
              <Card className="overflow-hidden">
                <div className="px-6 py-4 border-b border-app-border">
                  <h3 className="text-lg font-semibold text-app-fg">Scan ERROR Videos</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-app-border">
                    <thead className="bg-app-bg">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Video ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Uploaded By</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Scan Error</th>
                        <th className="px-6 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border bg-app-card">
                      {issues.items.scanErrorVideos.map((v) => (
                        <tr key={v.id}>
                          <td className="px-6 py-4 text-sm text-app-fg font-mono">{v.id}</td>
                          <td className="px-6 py-4 text-sm text-app-muted font-mono">{new Date(v.createdAt).toLocaleString('de-DE')}</td>
                          <td className="px-6 py-4 text-sm text-app-muted font-mono">{v.uploadedBy || '-'}</td>
                          <td className="px-6 py-4 text-sm text-app-muted font-mono">{v.scanError || '-'}</td>
                          <td className="px-6 py-4 text-right text-sm">
                            <button
                              onClick={() => markVideoClean(v.id)}
                              disabled={markingVideoClean === v.id}
                              className={`rounded-lg px-3 py-2 text-xs font-medium text-white ${
                                markingVideoClean === v.id ? 'bg-black/30' : 'bg-tokens-brandGreen hover:opacity-90'
                              }`}
                            >
                              {markingVideoClean === v.id ? '…' : 'Freigeben'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {issues.items.scanErrorVideos.length === 0 && (
                        <tr>
                          <td className="px-6 py-6 text-sm text-app-muted" colSpan={5}>
                            Keine Einträge
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card className="overflow-hidden">
                <div className="px-6 py-4 border-b border-app-border">
                  <h3 className="text-lg font-semibold text-app-fg">Scan PENDING Videos</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-app-border">
                    <thead className="bg-app-bg">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Video ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Uploaded By</th>
                        <th className="px-6 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border bg-app-card">
                      {issues.items.scanPendingVideos.map((v) => (
                        <tr key={v.id}>
                          <td className="px-6 py-4 text-sm text-app-fg font-mono">{v.id}</td>
                          <td className="px-6 py-4 text-sm text-app-muted font-mono">{new Date(v.createdAt).toLocaleString('de-DE')}</td>
                          <td className="px-6 py-4 text-sm text-app-muted font-mono">{v.uploadedBy || '-'}</td>
                          <td className="px-6 py-4 text-right text-sm">
                            <button
                              onClick={() => markVideoClean(v.id)}
                              disabled={markingVideoClean === v.id}
                              className={`rounded-lg px-3 py-2 text-xs font-medium text-white ${
                                markingVideoClean === v.id ? 'bg-black/30' : 'bg-tokens-brandGreen hover:opacity-90'
                              }`}
                            >
                              {markingVideoClean === v.id ? '…' : 'Freigeben'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {issues.items.scanPendingVideos.length === 0 && (
                        <tr>
                          <td className="px-6 py-6 text-sm text-app-muted" colSpan={4}>
                            Keine Einträge
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card className="overflow-hidden">
                <div className="px-6 py-4 border-b border-app-border">
                  <h3 className="text-lg font-semibold text-app-fg">Scan ERROR Photos</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-app-border">
                    <thead className="bg-app-bg">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Photo ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Uploaded By</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Scan Error</th>
                        <th className="px-6 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border bg-app-card">
                      {issues.items.scanErrorPhotos.map((p) => (
                        <tr key={p.id}>
                          <td className="px-6 py-4 text-sm text-app-fg font-mono">{p.id}</td>
                          <td className="px-6 py-4 text-sm text-app-muted font-mono">{new Date(p.createdAt).toLocaleString('de-DE')}</td>
                          <td className="px-6 py-4 text-sm text-app-muted font-mono">{p.uploadedBy || '-'}</td>
                          <td className="px-6 py-4 text-sm text-app-muted font-mono">{p.scanError || '-'}</td>
                          <td className="px-6 py-4 text-right text-sm">
                            <button
                              onClick={() => markPhotoClean(p.id)}
                              disabled={markingClean === p.id}
                              className={`rounded-lg px-3 py-2 text-xs font-medium text-white ${
                                markingClean === p.id ? 'bg-black/30' : 'bg-tokens-brandGreen hover:opacity-90'
                              }`}
                            >
                              {markingClean === p.id ? '…' : 'Freigeben'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {issues.items.scanErrorPhotos.length === 0 && (
                        <tr>
                          <td className="px-6 py-6 text-sm text-app-muted" colSpan={5}>
                            Keine Einträge
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card className="overflow-hidden">
                <div className="px-6 py-4 border-b border-app-border">
                  <h3 className="text-lg font-semibold text-app-fg">Scan PENDING Photos</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-app-border">
                    <thead className="bg-app-bg">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Photo ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Uploaded By</th>
                        <th className="px-6 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border bg-app-card">
                      {issues.items.scanPendingPhotos.map((p) => (
                        <tr key={p.id}>
                          <td className="px-6 py-4 text-sm text-app-fg font-mono">{p.id}</td>
                          <td className="px-6 py-4 text-sm text-app-muted font-mono">{new Date(p.createdAt).toLocaleString('de-DE')}</td>
                          <td className="px-6 py-4 text-sm text-app-muted font-mono">{p.uploadedBy || '-'}</td>
                          <td className="px-6 py-4 text-right text-sm">
                            <button
                              onClick={() => markPhotoClean(p.id)}
                              disabled={markingClean === p.id}
                              className={`rounded-lg px-3 py-2 text-xs font-medium text-white ${
                                markingClean === p.id ? 'bg-black/30' : 'bg-tokens-brandGreen hover:opacity-90'
                              }`}
                            >
                              {markingClean === p.id ? '…' : 'Freigeben'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {issues.items.scanPendingPhotos.length === 0 && (
                        <tr>
                          <td className="px-6 py-6 text-sm text-app-muted" colSpan={4}>
                            Keine Einträge
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              <IssuesTable
                title="Temp Photos (DELETED)"
                columns={['Photo ID', 'Created', 'DeletedAt', 'Uploaded By']}
                rows={issues.items.tempDeletedPhotos.map((p) => [
                  p.id,
                  new Date(p.createdAt).toLocaleString('de-DE'),
                  p.deletedAt ? new Date(p.deletedAt).toLocaleString('de-DE') : '-',
                  p.uploadedBy || '-',
                ])}
              />

              <IssuesTable
                title="Temp Videos (DELETED)"
                columns={['Video ID', 'Created', 'DeletedAt', 'Uploaded By']}
                rows={issues.items.tempDeletedVideos.map((v) => [
                  v.id,
                  new Date(v.createdAt).toLocaleString('de-DE'),
                  v.deletedAt ? new Date(v.deletedAt).toLocaleString('de-DE') : '-',
                  v.uploadedBy || '-',
                ])}
              />

              <IssuesTable
                title="Expired Guestbook Uploads (invalidiert, Datei bleibt)"
                columns={['Upload ID', 'Created', 'ExpiresAt', 'SizeBytes']}
                rows={issues.items.guestbookExpiredUploads.map((u) => [
                  u.id,
                  new Date(u.createdAt).toLocaleString('de-DE'),
                  new Date(u.expiresAt).toLocaleString('de-DE'),
                  u.sizeBytes,
                ])}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IssuesTable(props: { title: string; columns: string[]; rows: string[][] }) {
  const { title, columns, rows } = props;

  return (
    <Card className="overflow-hidden">
      <div className="px-6 py-4 border-b border-app-border">
        <h3 className="text-lg font-semibold text-app-fg">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-app-border">
          <thead className="bg-app-bg">
            <tr>
              {columns.map((c) => (
                <th
                  key={c}
                  className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border bg-app-card">
            {rows.map((row, idx) => (
              <tr key={idx}>
                {row.map((cell, j) => (
                  <td key={j} className="px-6 py-4 text-sm text-app-muted font-mono">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-6 py-6 text-sm text-app-muted" colSpan={columns.length}>
                  Keine Einträge
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
