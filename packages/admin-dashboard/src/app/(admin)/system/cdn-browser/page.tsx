'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen, Folder, Download, Search, Filter, RefreshCw,
  Image, Video, Music, FileText, File,
  CheckSquare, Square, ArrowUpDown, ArrowUp, ArrowDown,
  AlertCircle, Copy, Check, ChevronLeft, ChevronRight, Home, X,
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CdnFolder {
  prefix: string;
  name: string;
  label: string;
  eventId: string | null;
}

interface CdnFile {
  key: string;
  name: string;
  size: number;
  sizeFormatted: string;
  lastModified: string;
  type: 'image' | 'video' | 'audio' | 'pdf' | 'other';
}

interface Breadcrumb {
  label: string;
  prefix: string;
}

interface BrowseResult {
  folders: CdnFolder[];
  files: CdnFile[];
  totalFiles: number;
  pageFiles: number;
  pagesFiles: number;
  breadcrumbs: Breadcrumb[];
  currentPrefix: string;
  isTruncated: boolean;
}

type SortKey = 'name' | 'size' | 'date';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, React.ReactNode> = {
  image: <Image className="w-4 h-4 text-blue-400" />,
  video: <Video className="w-4 h-4 text-purple-400" />,
  audio: <Music className="w-4 h-4 text-green-400" />,
  pdf:   <FileText className="w-4 h-4 text-red-400" />,
  other: <File className="w-4 h-4 text-gray-400" />,
};

const TYPE_LABELS: Record<string, string> = {
  all: 'Alle', image: 'Bilder', video: 'Videos',
  audio: 'Audio', pdf: 'PDF', other: 'Sonstige',
};

const TYPE_COLORS: Record<string, string> = {
  image: 'bg-blue-500/20 text-blue-300',
  video: 'bg-purple-500/20 text-purple-300',
  audio: 'bg-green-500/20 text-green-300',
  pdf:   'bg-red-500/20 text-red-300',
  other: 'bg-gray-500/20 text-gray-300',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function CdnBrowserPage() {
  const [data, setData] = useState<BrowseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [prefix, setPrefix] = useState('');

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sort, setSort] = useState<SortKey>('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // ─── Fetch ───────────────────────────────────────────────────────────────

  const load = useCallback(async (p = 1, pfx = prefix) => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/admin/cdn/browse', {
        params: { prefix: pfx, page: p, limit: 50, sort, order, type: typeFilter, search },
      });
      setData(res);
      setPage(p);
      setSelected(new Set());
    } catch {
      toast.error('Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, [prefix, sort, order, typeFilter, search]);

  useEffect(() => { load(1, prefix); }, [sort, order, typeFilter]);

  // Search mit Debounce
  useEffect(() => {
    const t = setTimeout(() => load(1, prefix), 400);
    return () => clearTimeout(t);
  }, [search]);

  // ─── Navigation ──────────────────────────────────────────────────────────

  const navigate = (newPrefix: string) => {
    setPrefix(newPrefix);
    setSearch('');
    setTypeFilter('all');
    setPage(1);
    load(1, newPrefix);
  };

  // ─── Actions ─────────────────────────────────────────────────────────────

  const signAndDownload = async (key: string, name: string) => {
    try {
      const { data: res } = await api.post('/admin/cdn/sign', { key });
      const a = document.createElement('a');
      a.href = res.url;
      a.download = name;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.click();
    } catch {
      toast.error('Fehler beim Download');
    }
  };

  const downloadSelected = async () => {
    if (selected.size === 0) return;
    try {
      const { data: res } = await api.post('/admin/cdn/bulk-sign', { keys: Array.from(selected) });
      toast(`${res.urls.length} Downloads gestartet`);
      for (const { url, key } of res.urls) {
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
      const { data: res } = await api.post('/admin/cdn/sign', { key });
      await navigator.clipboard.writeText(res.url);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
      toast.success('Link kopiert');
    } catch {
      toast.error('Fehler');
    }
  };

  const toggleSelect = (key: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const toggleAll = () =>
    setSelected(selected.size === (data?.files.length ?? 0) && (data?.files.length ?? 0) > 0
      ? new Set()
      : new Set(data?.files.map((f) => f.key) ?? []));

  const toggleSort = (k: SortKey) => {
    if (sort === k) setOrder((o) => o === 'asc' ? 'desc' : 'asc');
    else { setSort(k); setOrder('asc'); }
    load(1, prefix);
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sort !== k ? <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" /> :
    order === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 text-blue-400" /> :
    <ArrowDown className="w-3 h-3 ml-1 text-blue-400" />;

  const isInFolder = prefix !== '';
  const folders = data?.folders ?? [];
  const files = data?.files ?? [];
  const breadcrumbs = data?.breadcrumbs ?? [];

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <FolderOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">CDN File Browser</h1>
            <p className="text-xs text-gray-400">cdn.gästefotos.com — SeaweedFS</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={downloadSelected}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" /> {selected.size} herunterladen
            </button>
          )}
          <button
            onClick={() => load(page, prefix)}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm mb-4 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 overflow-x-auto">
        {breadcrumbs.map((crumb, i) => (
          <React.Fragment key={crumb.prefix}>
            {i > 0 && <span className="text-gray-600 mx-1">/</span>}
            <button
              onClick={() => navigate(crumb.prefix)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
                i === breadcrumbs.length - 1
                  ? 'text-white font-semibold cursor-default'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {i === 0 && <Home className="w-3 h-3" />}
              {crumb.label}
            </button>
          </React.Fragment>
        ))}
      </nav>

      {/* Filter-Toolbar — nur bei Dateien sichtbar */}
      {isInFolder && (
        <div className="flex flex-wrap items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 mb-4">
          <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 flex-1 min-w-40">
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
          <div className="flex items-center gap-1">
            <Filter className="w-4 h-4 text-gray-400 mr-1" />
            {['all', 'image', 'video', 'audio', 'pdf', 'other'].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  typeFilter === t ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Explorer-Bereich */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">

        {/* Zurück-Zeile */}
        {isInFolder && (
          <button
            onClick={() => {
              const parts = prefix.replace(/\/$/, '').split('/');
              parts.pop();
              navigate(parts.length ? parts.join('/') + '/' : '');
            }}
            className="flex items-center gap-3 w-full px-4 py-3 border-b border-gray-800 text-gray-400 hover:bg-gray-800/50 transition-colors text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="font-mono text-xs">..</span>
            <span className="text-gray-500">Übergeordneter Ordner</span>
          </button>
        )}

        {/* Ordner-Liste */}
        {folders.length > 0 && (
          <div className="border-b border-gray-800">
            <div className="px-4 py-2 text-xs text-gray-500 font-medium uppercase tracking-wider bg-gray-900/80">
              Ordner ({folders.length})
            </div>
            {folders.map((folder) => (
              <button
                key={folder.prefix}
                onClick={() => navigate(folder.prefix)}
                className="flex items-center gap-3 w-full px-4 py-3 border-b border-gray-800/60 hover:bg-gray-800/40 transition-colors text-left group"
              >
                <Folder className="w-5 h-5 text-yellow-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-gray-200 text-sm font-medium group-hover:text-white">
                    {folder.label}
                  </span>
                  {folder.eventId && (
                    <span className="ml-2 text-xs text-gray-500 font-mono">
                      {folder.eventId.slice(0, 12)}…
                    </span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-300" />
              </button>
            ))}
          </div>
        )}

        {/* Dateien — nur wenn in einem Ordner */}
        {isInFolder && (
          <>
            {/* Tabellen-Header */}
            <div className="px-4 py-2 text-xs text-gray-500 font-medium uppercase tracking-wider bg-gray-900/80">
              Dateien ({data?.totalFiles ?? 0})
            </div>
            <div className="grid grid-cols-[2rem_1fr_7rem_10rem_6rem_5rem] gap-2 px-4 py-2.5 border-b border-gray-800 text-xs text-gray-400 font-medium">
              <button onClick={toggleAll} className="flex items-center justify-center">
                {selected.size > 0 && selected.size === files.length
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

            {loading ? (
              <div className="flex items-center justify-center py-12 text-gray-500">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Laden…
              </div>
            ) : files.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <AlertCircle className="w-7 h-7 mb-2" />
                <p className="text-sm">Keine Dateien in diesem Ordner</p>
              </div>
            ) : (
              files.map((file) => (
                <div
                  key={file.key}
                  className={`grid grid-cols-[2rem_1fr_7rem_10rem_6rem_5rem] gap-2 px-4 py-2.5 border-b border-gray-800/50 hover:bg-gray-800/30 items-center transition-colors text-sm ${
                    selected.has(file.key) ? 'bg-blue-950/20' : ''
                  }`}
                >
                  <button onClick={() => toggleSelect(file.key)} className="flex items-center justify-center">
                    {selected.has(file.key)
                      ? <CheckSquare className="w-4 h-4 text-blue-400" />
                      : <Square className="w-4 h-4 text-gray-600" />}
                  </button>

                  <div className="flex items-center gap-2 min-w-0">
                    {TYPE_ICONS[file.type]}
                    <span className="truncate text-gray-200 font-mono text-xs" title={file.name}>
                      {file.name}
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
          </>
        )}

        {/* Root — keine Dateien direkt */}
        {!isInFolder && folders.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <AlertCircle className="w-8 h-8 mb-2" />
            <p>Keine Ordner gefunden</p>
          </div>
        )}
      </div>

      {/* Paginierung (nur für Dateien) */}
      {isInFolder && (data?.pagesFiles ?? 0) > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
          <span>{data?.totalFiles.toLocaleString()} Dateien</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => load(page - 1, prefix)}
              disabled={page <= 1}
              className="p-1.5 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono">Seite {page} / {data?.pagesFiles}</span>
            <button
              onClick={() => load(page + 1, prefix)}
              disabled={page >= (data?.pagesFiles ?? 1)}
              className="p-1.5 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {selected.size > 0 && <span className="text-blue-400">{selected.size} ausgewählt</span>}
        </div>
      )}
    </div>
  );
}
