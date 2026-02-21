'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FolderOpen, Download, Search, Filter, RefreshCw, Image, Video,
  Music, FileText, File, Grid3X3, List, CheckSquare, Square,
  ArrowUpDown, ArrowUp, ArrowDown, Package, AlertCircle, Copy, Check,
  ChevronLeft, ChevronRight, X, Eye
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CdnFile {
  key: string;
  name: string;
  path: string;
  size: number;
  sizeFormatted: string;
  lastModified: string;
  type: 'image' | 'video' | 'audio' | 'pdf' | 'other';
  eventId: string | null;
}

interface CdnSummary {
  totalSize: number;
  totalSizeFormatted: string;
  byType: Record<string, number>;
}

type SortKey = 'name' | 'size' | 'date';
type ViewMode = 'list' | 'grid';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, React.ReactNode> = {
  image: <Image className="w-4 h-4 text-blue-400" />,
  video: <Video className="w-4 h-4 text-purple-400" />,
  audio: <Music className="w-4 h-4 text-green-400" />,
  pdf:   <FileText className="w-4 h-4 text-red-400" />,
  other: <File className="w-4 h-4 text-gray-400" />,
};

const TYPE_LABELS: Record<string, string> = {
  all: 'Alle Typen', image: 'Bilder', video: 'Videos',
  audio: 'Audio', pdf: 'PDF', other: 'Sonstige',
};

const TYPE_COLORS: Record<string, string> = {
  image: 'bg-blue-500/20 text-blue-300',
  video: 'bg-purple-500/20 text-purple-300',
  audio: 'bg-green-500/20 text-green-300',
  pdf:   'bg-red-500/20 text-red-300',
  other: 'bg-gray-500/20 text-gray-300',
};

function getImageThumbUrl(key: string): string {
  return `/api/cdn/preview?key=${encodeURIComponent(key)}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CdnBrowserPage() {
  const [files, setFiles] = useState<CdnFile[]>([]);
  const [summary, setSummary] = useState<CdnSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [prefix, setPrefix] = useState('events/');
  const [sort, setSort] = useState<SortKey>('date');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Fetch ───────────────────────────────────────────────────────────────

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/cdn/files', {
        params: { prefix, page: p, limit: 50, sort, order, type: typeFilter, search },
      });
      setFiles(data.files);
      setTotal(data.total);
      setPages(data.pages);
      setPage(p);
      setSelected(new Set());
    } catch {
      toast.error('Fehler beim Laden der Dateien');
    } finally {
      setLoading(false);
    }
  }, [prefix, sort, order, typeFilter, search]);

  const loadSummary = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/cdn/summary');
      setSummary(data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { load(1); loadSummary(); }, [sort, order, typeFilter, prefix]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(1), 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  // ─── Actions ─────────────────────────────────────────────────────────────

  const signAndDownload = async (key: string, name: string) => {
    try {
      const { data } = await api.post('/admin/cdn/sign', { key });
      const a = document.createElement('a');
      a.href = data.url;
      a.download = name;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.click();
    } catch {
      toast.error('Fehler beim Generieren des Download-Links');
    }
  };

  const downloadSelected = async () => {
    if (selected.size === 0) return;
    const keys = Array.from(selected);
    try {
      const { data } = await api.post('/admin/cdn/bulk-sign', { keys });
      toast.info(`${data.urls.length} Download-Links generiert`);
      // Download each file
      for (const { url, key } of data.urls) {
        const a = document.createElement('a');
        a.href = url;
        a.download = key.split('/').pop() ?? key;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.click();
        await new Promise((r) => setTimeout(r, 150));
      }
    } catch {
      toast.error('Fehler beim Bulk-Download');
    }
  };

  const copySignedUrl = async (key: string) => {
    try {
      const { data } = await api.post('/admin/cdn/sign', { key });
      await navigator.clipboard.writeText(data.url);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
      toast.success('Signierter Link kopiert');
    } catch {
      toast.error('Fehler beim Kopieren');
    }
  };

  const toggleSelect = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === files.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(files.map((f) => f.key)));
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sort === key) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSort(key); setOrder('desc'); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sort !== k ? <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" /> :
    order === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 text-blue-400" /> :
    <ArrowDown className="w-3 h-3 ml-1 text-blue-400" />;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <FolderOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">CDN File Browser</h1>
            <p className="text-sm text-gray-400">cdn.gästefotos.com — SeaweedFS</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={downloadSelected}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              {selected.size} herunterladen
            </button>
          )}
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            {viewMode === 'list' ? <Grid3X3 className="w-4 h-4" /> : <List className="w-4 h-4" />}
          </button>
          <button
            onClick={() => load(page)}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <div className="col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Gesamtgröße</p>
            <p className="text-2xl font-bold text-blue-400">{summary.totalSizeFormatted}</p>
          </div>
          {Object.entries(summary.byType).map(([type, count]) => (
            <div key={type} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                {TYPE_ICONS[type]}
                <p className="text-xs text-gray-400">{TYPE_LABELS[type] ?? type}</p>
              </div>
              <p className="text-xl font-bold">{count.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters — Explorer Toolbar */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Path bar */}
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg px-3 py-2 flex-1 min-w-48">
            <FolderOpen className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              className="bg-transparent text-sm text-gray-200 outline-none w-full"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="Pfad-Präfix (z.B. events/)"
            />
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 flex-1 min-w-48">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              className="bg-transparent text-sm text-gray-200 outline-none w-full"
              placeholder="Datei suchen…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')}>
                <X className="w-3 h-3 text-gray-400 hover:text-white" />
              </button>
            )}
          </div>

          {/* Type filter pills */}
          <div className="flex items-center gap-1">
            <Filter className="w-4 h-4 text-gray-400 mr-1" />
            {['all', 'image', 'video', 'audio', 'pdf', 'other'].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  typeFilter === t
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {t === 'all' ? 'Alle' : TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* File List */}
      {viewMode === 'list' ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[2rem_1fr_6rem_9rem_7rem_5rem] gap-2 px-4 py-3 border-b border-gray-800 text-xs text-gray-400 font-medium">
            <button onClick={toggleAll} className="flex items-center justify-center">
              {selected.size === files.length && files.length > 0
                ? <CheckSquare className="w-4 h-4 text-blue-400" />
                : <Square className="w-4 h-4" />}
            </button>
            <button className="flex items-center text-left" onClick={() => toggleSort('name')}>
              Name <SortIcon k="name" />
            </button>
            <button className="flex items-center" onClick={() => toggleSort('size')}>
              Größe <SortIcon k="size" />
            </button>
            <button className="flex items-center" onClick={() => toggleSort('date')}>
              Datum <SortIcon k="date" />
            </button>
            <span>Typ</span>
            <span className="text-right">Aktionen</span>
          </div>

          {/* Rows */}
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-500">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Laden…
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <AlertCircle className="w-8 h-8 mb-2" />
              <p>Keine Dateien gefunden</p>
            </div>
          ) : (
            files.map((file) => (
              <div
                key={file.key}
                className={`grid grid-cols-[2rem_1fr_6rem_9rem_7rem_5rem] gap-2 px-4 py-3 border-b border-gray-800/60 hover:bg-gray-800/40 transition-colors text-sm items-center ${
                  selected.has(file.key) ? 'bg-blue-950/30' : ''
                }`}
              >
                <button onClick={() => toggleSelect(file.key)} className="flex items-center justify-center">
                  {selected.has(file.key)
                    ? <CheckSquare className="w-4 h-4 text-blue-400" />
                    : <Square className="w-4 h-4 text-gray-600" />}
                </button>

                <div className="flex items-center gap-2 min-w-0">
                  {TYPE_ICONS[file.type]}
                  <span className="truncate text-gray-200 font-mono text-xs" title={file.key}>
                    {file.key}
                  </span>
                </div>

                <span className="text-gray-400 text-xs tabular-nums">{file.sizeFormatted}</span>

                <span className="text-gray-400 text-xs tabular-nums">
                  {new Date(file.lastModified).toLocaleString('de-AT', {
                    day: '2-digit', month: '2-digit', year: '2-digit',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>

                <span className={`px-2 py-0.5 rounded-full text-xs font-medium w-fit ${TYPE_COLORS[file.type]}`}>
                  {TYPE_LABELS[file.type]}
                </span>

                <div className="flex items-center justify-end gap-1">
                  <button
                    title="Signierten Link kopieren"
                    onClick={() => copySignedUrl(file.key)}
                    className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                  >
                    {copiedKey === file.key
                      ? <Check className="w-3 h-3 text-green-400" />
                      : <Copy className="w-3 h-3" />}
                  </button>
                  <button
                    title="Herunterladen"
                    onClick={() => signAndDownload(file.key, file.name)}
                    className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-green-400 transition-colors"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {files.map((file) => (
            <div
              key={file.key}
              onClick={() => toggleSelect(file.key)}
              className={`relative bg-gray-900 border rounded-xl p-3 cursor-pointer transition-all hover:border-blue-500 ${
                selected.has(file.key) ? 'border-blue-500 bg-blue-950/30' : 'border-gray-800'
              }`}
            >
              {selected.has(file.key) && (
                <div className="absolute top-2 right-2">
                  <CheckSquare className="w-4 h-4 text-blue-400" />
                </div>
              )}
              <div className="flex flex-col items-center gap-2">
                {file.type === 'image' ? (
                  <div className="w-full h-16 bg-gray-800 rounded-lg flex items-center justify-center overflow-hidden">
                    <img
                      src={getImageThumbUrl(file.key)}
                      alt={file.name}
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-16 bg-gray-800 rounded-lg flex items-center justify-center">
                    {TYPE_ICONS[file.type]}
                  </div>
                )}
                <span className="text-xs text-gray-300 truncate w-full text-center" title={file.name}>
                  {file.name}
                </span>
                <span className="text-xs text-gray-500">{file.sizeFormatted}</span>
              </div>
              <div className="absolute bottom-2 right-2 flex gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); signAndDownload(file.key, file.name); }}
                  className="p-1 rounded bg-gray-800 hover:bg-green-800 text-gray-400 hover:text-green-300 transition-colors"
                >
                  <Download className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
          <span>{total.toLocaleString()} Dateien gesamt</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => load(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono">Seite {page} / {pages}</span>
            <button
              onClick={() => load(page + 1)}
              disabled={page >= pages}
              className="p-1.5 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {selected.size > 0 && (
            <span className="text-blue-400">{selected.size} ausgewählt</span>
          )}
        </div>
      )}
    </div>
  );
}
