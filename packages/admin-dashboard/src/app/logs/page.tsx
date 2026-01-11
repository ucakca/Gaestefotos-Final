"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import api from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';

type QaLogLevel = 'IMPORTANT' | 'DEBUG';

type QaLogEvent = {
  id: string;
  level: QaLogLevel;
  type: string;
  message: string | null;
  data: any;
  userId: string | null;
  userRole: string | null;
  eventId: string | null;
  path: string | null;
  method: string | null;
  userAgent: string | null;
  ipHash: string | null;
  createdAt: string;
};

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function LogsPage() {
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [debugEnabled, setDebugEnabled] = useState(false);
  const [debugEnabledUntil, setDebugEnabledUntil] = useState<string | null>(null);
  const [duration, setDuration] = useState('30');

  const [level, setLevel] = useState<QaLogLevel | 'all'>('all');
  const [typeQuery, setTypeQuery] = useState('');
  const [eventId, setEventId] = useState('');

  const [events, setEvents] = useState<QaLogEvent[]>([]);
  const [total, setTotal] = useState(0);

  const pollRef = useRef<number | null>(null);

  const filters = useMemo(() => {
    return {
      level: level === 'all' ? undefined : level,
      type: typeQuery.trim() ? typeQuery.trim() : undefined,
      eventId: eventId.trim() ? eventId.trim() : undefined,
      limit: 50,
      offset: 0,
    };
  }, [level, typeQuery, eventId]);

  const loadConfig = async () => {
    const res = await api.get('/admin/qa-logs/config');
    const data = res.data || {};
    setDebugEnabled(Boolean(data.debugEnabled));
    setDebugEnabledUntil(typeof data.debugEnabledUntil === 'string' ? data.debugEnabledUntil : null);
  };

  const loadEvents = async () => {
    const res = await api.get('/admin/qa-logs/events', { params: filters });
    const data = res.data || {};
    setEvents(Array.isArray(data.events) ? data.events : []);
    setTotal(typeof data.total === 'number' ? data.total : 0);
  };

  const refreshAll = async () => {
    setErrMsg(null);
    setLoading(true);
    try {
      await Promise.all([loadConfig(), loadEvents()]);
    } catch (e: any) {
      setErrMsg(e?.response?.data?.error || e?.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }

    const poll = () => {
      // Skip polling when tab is not visible
      if (document.hidden) return;
      loadConfig().catch(() => null);
      loadEvents().catch(() => null);
    };

    // Poll every 10 seconds (reduced from 3s to lower server load)
    pollRef.current = window.setInterval(poll, 10000);

    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const enableDebug = async () => {
    setErrMsg(null);
    setLoading(true);
    try {
      const minutes = Number(duration);
      await api.put('/admin/qa-logs/config', {
        debugEnabled: true,
        debugDurationMinutes: Number.isFinite(minutes) ? minutes : 30,
      });
      await refreshAll();
    } catch (e: any) {
      setErrMsg(e?.response?.data?.error || e?.message || 'Fehler beim Aktivieren');
      setLoading(false);
    }
  };

  const disableDebug = async () => {
    setErrMsg(null);
    setLoading(true);
    try {
      await api.put('/admin/qa-logs/config', { debugEnabled: false });
      await refreshAll();
    } catch (e: any) {
      setErrMsg(e?.response?.data?.error || e?.message || 'Fehler beim Deaktivieren');
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-app-fg">Logs</h1>
        <p className="mt-1 text-sm text-app-muted">QA-Logs (UI/Flows) – Debug optional</p>
        <p className="mt-1 text-xs text-app-muted">
          Aufbewahrung: DEBUG wird automatisch nach 7 Tagen gelöscht. IMPORTANT wird automatisch nach 30 oder 90 Tagen gelöscht (Server-Konfiguration).
        </p>
      </div>

      <div className="grid gap-4">
        <Card className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-medium text-app-fg">Debug Logging</div>
              <div className="mt-1 text-xs text-app-muted">
                Status: {debugEnabled ? 'AKTIV' : 'aus'}
                {debugEnabledUntil ? ` (bis ${fmtDateTime(debugEnabledUntil)})` : ''}
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <div className="w-full sm:w-44">
                <Select value={duration} onValueChange={(v) => setDuration(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Dauer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button variant="primary" size="sm" onClick={enableDebug} disabled={loading}>
                Aktivieren
              </Button>
              <Button variant="secondary" size="sm" onClick={disableDebug} disabled={loading}>
                Deaktivieren
              </Button>
              <Button variant="outline" size="sm" onClick={refreshAll} disabled={loading}>
                Refresh
              </Button>
            </div>
          </div>

          {errMsg && <div className="mt-3 text-sm text-[var(--status-danger)]">{errMsg}</div>}
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm font-medium text-app-fg">Events</div>
              <div className="mt-1 text-xs text-app-muted">
                {events.length} angezeigt / {total} gesamt
              </div>
            </div>

            <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-3">
              <div className="w-full sm:w-44">
                <Select value={level} onValueChange={(v) => setLevel(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Level</SelectItem>
                    <SelectItem value="IMPORTANT">IMPORTANT</SelectItem>
                    <SelectItem value="DEBUG">DEBUG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input value={typeQuery} onChange={(e) => setTypeQuery(e.target.value)} placeholder="Type contains…" />
              <Input value={eventId} onChange={(e) => setEventId(e.target.value)} placeholder="eventId" />
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-app-border">
            <div className="grid grid-cols-12 gap-2 border-b border-app-border bg-app-bg px-3 py-2 text-xs font-medium text-app-muted">
              <div className="col-span-3">Zeit</div>
              <div className="col-span-2">Level</div>
              <div className="col-span-3">Type</div>
              <div className="col-span-4">Message</div>
            </div>

            <div className="divide-y divide-app-border">
              {events.map((e) => (
                <div key={e.id} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm">
                  <div className="col-span-3 text-xs text-app-muted">{fmtDateTime(e.createdAt)}</div>
                  <div className="col-span-2">
                    <span
                      className={
                        e.level === 'DEBUG'
                          ? 'rounded-md bg-app-bg px-2 py-1 text-xs text-app-muted'
                          : 'rounded-md bg-app-accent/10 px-2 py-1 text-xs text-app-fg'
                      }
                    >
                      {e.level}
                    </span>
                  </div>
                  <div className="col-span-3 font-mono text-xs text-app-fg">{e.type}</div>
                  <div className="col-span-4 text-xs text-app-muted">
                    {e.message || ''}
                    {e.eventId ? <div className="mt-1 font-mono text-[10px]">eventId: {e.eventId}</div> : null}
                    {e.path ? <div className="mt-1 font-mono text-[10px]">path: {e.path}</div> : null}
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <div className="px-3 py-6 text-sm text-app-muted">Keine Events gefunden</div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
