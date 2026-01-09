'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import GuidedTour from '@/components/ui/GuidedTour';

type SnapshotItem = {
  id: string;
  kind: string;
  slug: string;
  title: string | null;
  createdAt: string;
  sourceUrl: string | null;
};

type SnapshotsResponse = {
  items: SnapshotItem[];
};

type PreviewResponse = {
  ok: boolean;
  kind: string;
  slug: string;
  title: string | null;
  html: string;
  meta?: any;
};

type WpItem = {
  kind: 'pages' | 'posts';
  id: string | number;
  slug: string;
  title: string;
  url?: string;
  modifiedAt?: string;
};

export default function CmsSyncPage() {
  const [kind, setKind] = useState<'pages' | 'posts'>('pages');
  const [slug, setSlug] = useState('faq');

  const [wpLoading, setWpLoading] = useState(false);
  const [wpError, setWpError] = useState<string | null>(null);
  const [wpItems, setWpItems] = useState<WpItem[]>([]);
  const [wpSearch, setWpSearch] = useState('');

  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [snapshotsError, setSnapshotsError] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotItem[]>([]);

  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<any | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const tourSteps = useMemo(
    () => [
      {
        id: 'cms-recent',
        target: '[data-tour="cms-recent"]',
        title: 'Recent WP Inhalte',
        body: 'Hier kannst du aktuelle WP Pages/Posts laden, um schnell zu prüfen, ob die Verbindung und Daten stimmen.',
        placement: 'bottom' as const,
      },
      {
        id: 'cms-sync',
        target: '[data-tour="cms-sync"]',
        title: 'Sync & Snapshot',
        body: 'Sync zieht Inhalte von WordPress und erstellt einen Snapshot. Nutze das für kontrollierte Releases und Debugging.',
        placement: 'bottom' as const,
      },
      {
        id: 'cms-preview',
        target: '[data-tour="cms-preview"]',
        title: 'Preview',
        body: 'Preview zeigt dir gerenderte CMS-Inhalte (z.B. FAQ) zur schnellen Kontrolle ohne Deployment.',
        placement: 'bottom' as const,
      },
    ],
    []
  );

  const filters = useMemo(() => {
    return {
      kind: kind,
      slug: slug.trim() ? slug.trim() : undefined,
      limit: 50,
    };
  }, [kind, slug]);

  const loadSnapshots = async () => {
    setLoadingSnapshots(true);
    setSnapshotsError(null);
    try {
      const res = await api.get<SnapshotsResponse>('/admin/cms/snapshots', { params: filters });
      setSnapshots(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch (e: any) {
      setSnapshotsError(e?.response?.data?.error || e?.message || 'Snapshots konnten nicht geladen werden');
      setSnapshots([]);
    } finally {
      setLoadingSnapshots(false);
    }
  };

  useEffect(() => {
    loadSnapshots().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const doSync = async () => {
    const s = slug.trim();
    if (!s) {
      toast.error('Bitte slug setzen');
      return;
    }

    setSyncing(true);
    setLastSync(null);
    try {
      const res = await api.post('/admin/cms/sync', { kind, slug: s });
      setLastSync(res.data || null);
      toast.success('Sync erfolgreich');
      await loadSnapshots();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Sync fehlgeschlagen');
    } finally {
      setSyncing(false);
    }
  };

  const doPreview = async () => {
    const s = slug.trim();
    if (!s) {
      toast.error('Bitte slug setzen');
      return;
    }

    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewHtml(null);
    try {
      const res = await api.get('/admin/cms/faq/preview', { params: { kind, slug: s } });
      setPreviewHtml(res.data.html);
    } catch (e: any) {
      setPreviewError(e?.response?.data?.error || e?.message || 'Preview fehlgeschlagen');
    } finally {
      setPreviewLoading(false);
    }
  };

  const presets: Array<{ label: string; kind: 'pages' | 'posts'; slug: string }> = [
    { label: 'FAQ', kind: 'pages', slug: 'faq' },
    { label: 'Impressum', kind: 'pages', slug: 'impressum' },
    { label: 'Datenschutz', kind: 'pages', slug: 'datenschutz' },
    { label: 'AGB', kind: 'pages', slug: 'agb' },
  ];

  const loadWpRecent = async () => {
    setWpLoading(true);
    setWpError(null);
    try {
      const res = await api.get(`/admin/cms/wp/${kind}/recent`);
      setWpItems(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch (e: any) {
      setWpError(e?.response?.data?.error || e?.message || 'Recent konnte nicht geladen werden');
      setWpItems([]);
    } finally {
      setWpLoading(false);
    }
  };

  const loadWpSearch = async () => {
    const q = wpSearch.trim();
    if (!q) {
      toast.error('Bitte Suchbegriff eingeben');
      return;
    }

    setWpLoading(true);
    setWpError(null);
    try {
      const res = await api.get(`/admin/cms/wp/${kind}/search`, { params: { q } });
      setWpItems(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch (e: any) {
      setWpError(e?.response?.data?.error || e?.message || 'Search fehlgeschlagen');
      setWpItems([]);
    } finally {
      setWpLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-app-fg">CMS Sync</h1>
            <p className="mt-1 text-sm text-app-muted">WordPress Recent/Search, Snapshots, Sync & Preview</p>
          </div>
          <GuidedTour tourId="admin-cms-sync" steps={tourSteps} autoStart />
        </div>
      </div>

      <div className="grid gap-4">
        <Card className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3" data-tour="cms-recent">
              <div>
                <div className="mb-1 text-xs text-app-muted">Kind</div>
                <Select value={kind} onValueChange={(v) => setKind(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pages">pages</SelectItem>
                    <SelectItem value="posts">posts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <div className="mb-1 text-xs text-app-muted">Slug</div>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="faq" />
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center" data-tour="cms-sync">
              <Button size="sm" variant="outline" onClick={doPreview} disabled={previewLoading} data-tour="cms-preview">
                Preview
              </Button>
              <Button size="sm" variant="primary" onClick={doSync} disabled={syncing}>
                {syncing ? 'Sync…' : 'Sync & Save'}
              </Button>
              <Button size="sm" variant="outline" onClick={loadSnapshots} disabled={loadingSnapshots}>
                Refresh
              </Button>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-app-border bg-app-bg p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs text-app-muted">Search (Title/Slug)</div>
                  <Input value={wpSearch} onChange={(e) => setWpSearch(e.target.value)} placeholder="z.B. Impressum" />
                </div>
                <div className="flex items-end gap-2">
                  <Button size="sm" variant="outline" onClick={loadWpRecent} disabled={wpLoading}>
                    {wpLoading ? '…' : 'Recent'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={loadWpSearch} disabled={wpLoading || !wpSearch.trim()}>
                    Search
                  </Button>
                </div>
              </div>
            </div>

            {wpError ? <div className="mt-2 text-sm text-[var(--status-danger)]">{wpError}</div> : null}

            <div className="mt-3 divide-y divide-app-border">
              {wpItems.slice(0, 10).map((it) => (
                <button
                  key={`${it.kind}:${it.id}`}
                  type="button"
                  onClick={() => setSlug(it.slug)}
                  className="flex w-full items-start justify-between gap-3 px-2 py-2 text-left hover:bg-app-card"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-app-fg">{it.title || it.slug}</div>
                    <div className="mt-0.5 truncate font-mono text-xs text-app-muted">{it.slug}</div>
                  </div>
                  <div className="shrink-0 rounded-md bg-app-card px-2 py-1 text-xs text-app-muted">set slug</div>
                </button>
              ))}
              {!wpItems.length && !wpLoading ? (
                <div className="px-2 py-3 text-sm text-app-muted">Keine Treffer</div>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {presets.map((p) => (
              <Button
                key={p.label}
                size="sm"
                variant="secondary"
                onClick={() => {
                  setKind(p.kind);
                  setSlug(p.slug);
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>

          {lastSync ? (
            <pre className="mt-4 whitespace-pre-wrap rounded-lg border border-app-border bg-app-bg p-3 text-xs text-app-fg">
              {JSON.stringify(lastSync, null, 2)}
            </pre>
          ) : null}
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-app-fg">Snapshots</div>
              <div className="mt-1 text-xs text-app-muted">Max 50, filterbar nach Kind/Slug</div>
            </div>
            <div className="text-xs text-app-muted">{loadingSnapshots ? 'Lade…' : `${snapshots.length} Einträge`}</div>
          </div>

          {snapshotsError ? <div className="mb-3 text-sm text-[var(--status-danger)]">{snapshotsError}</div> : null}

          <div className="overflow-hidden rounded-lg border border-app-border">
            <div className="grid grid-cols-12 gap-2 border-b border-app-border bg-app-bg px-3 py-2 text-xs font-medium text-app-muted">
              <div className="col-span-2">Kind</div>
              <div className="col-span-4">Slug</div>
              <div className="col-span-4">Titel</div>
              <div className="col-span-2">Zeit</div>
            </div>
            <div className="divide-y divide-app-border">
              {snapshots.map((s) => (
                <div key={s.id} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm">
                  <div className="col-span-2 font-mono text-xs text-app-fg">{s.kind}</div>
                  <div className="col-span-4 font-mono text-xs text-app-fg">{s.slug}</div>
                  <div className="col-span-4 text-xs text-app-muted truncate">{s.title || '-'}</div>
                  <div className="col-span-2 text-xs text-app-muted">{new Date(s.createdAt).toLocaleString()}</div>
                </div>
              ))}
              {!snapshots.length && !loadingSnapshots ? (
                <div className="px-3 py-4 text-sm text-app-muted">Keine Snapshots</div>
              ) : null}
            </div>
          </div>
        </Card>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-semibold text-app-fg">Preview</div>
              <div className="mt-1 text-xs text-app-muted">Zeigt den aktuellen WP-Inhalt (best-effort).</div>
            </div>
            <DialogClose asChild>
              <Button variant="secondary" size="sm">
                Schließen
              </Button>
            </DialogClose>
          </div>

          {previewLoading ? <div className="mt-3 text-sm text-app-muted">Lade…</div> : null}
          {previewError ? <div className="mt-3 text-sm text-[var(--status-danger)]">{previewError}</div> : null}

          {previewHtml ? (
            <div className="mt-4 max-h-[65vh] overflow-auto rounded-lg border border-app-border bg-app-bg p-3">
              <div className="text-xs text-app-muted">{`${kind}/${slug || '-'}`}</div>
              <div
                className="prose prose-sm max-w-none mt-3"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
