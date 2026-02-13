'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Trash2,
  Filter,
  Loader2,
  Search,
  Grid3X3,
  Tag,
  Layers,
} from 'lucide-react';
import api from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import DashboardFooter from '@/components/DashboardFooter';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { useParams } from 'next/navigation';

interface Asset {
  id: string;
  name: string;
  type: string;
  category: string | null;
  storagePath: string;
  thumbnailPath: string | null;
  width: number | null;
  height: number | null;
  fileSize: number | null;
  mimeType: string | null;
  isPublic: boolean;
  tags: string[];
  sortOrder: number;
  createdAt: string;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  OVERLAY: { label: 'Overlay', color: 'bg-purple-100 text-purple-700' },
  FRAME: { label: 'Rahmen', color: 'bg-blue-100 text-blue-700' },
  PROP: { label: 'Prop', color: 'bg-amber-100 text-amber-700' },
  BACKGROUND: { label: 'Hintergrund', color: 'bg-emerald-100 text-emerald-700' },
  STICKER: { label: 'Sticker', color: 'bg-pink-100 text-pink-700' },
  FILTER: { label: 'Filter', color: 'bg-cyan-100 text-cyan-700' },
  MAGAZINE_COVER: { label: 'Magazin-Cover', color: 'bg-indigo-100 text-indigo-700' },
};

const ASSET_TYPES = Object.keys(TYPE_LABELS);

export default function AssetLibraryPage() {
  const params = useParams();
  const eventId = params?.id as string;
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload form state
  const [uploadName, setUploadName] = useState('');
  const [uploadType, setUploadType] = useState('OVERLAY');
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);

  const loadAssets = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 50 };
      if (typeFilter) params.type = typeFilter;
      if (searchQuery) params.search = searchQuery;

      const { data } = await api.get('/assets', { params });
      setAssets(data.assets || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to load assets', err);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, searchQuery]);

  useEffect(() => { loadAssets(); }, [loadAssets]);

  const handleUpload = async (file: File) => {
    if (!file || !uploadName || !uploadType) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', uploadName);
      formData.append('type', uploadType);
      if (uploadCategory) formData.append('category', uploadCategory);
      if (uploadTags) formData.append('tags', uploadTags);

      await api.post('/assets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setShowUploadForm(false);
      setUploadName('');
      setUploadCategory('');
      setUploadTags('');
      loadAssets();
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Asset wirklich löschen?')) return;
    try {
      await api.delete(`/assets/${id}`);
      loadAssets();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '–';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <ProtectedRoute>
      <AppLayout showBackButton backUrl={`/events/${eventId}/dashboard`}>
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-app-fg flex items-center gap-2">
                <Layers className="w-5 h-5" /> Asset Library
              </h1>
              <p className="text-sm text-app-muted mt-1">Overlays, Rahmen, Props und Sticker verwalten</p>
            </div>
            <Button onClick={() => setShowUploadForm(!showUploadForm)}>
              <Upload className="w-4 h-4 mr-2" />
              Asset hochladen
            </Button>
          </div>

          {/* Upload Form */}
          {showUploadForm && (
            <div className="bg-app-card rounded-xl border border-app-border p-6 space-y-4">
              <h3 className="font-semibold text-app-fg">Neues Asset hochladen</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-app-fg mb-1">Name *</label>
                  <input
                    type="text"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    placeholder="z.B. Goldener Rahmen"
                    className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-bg text-app-fg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-fg mb-1">Typ *</label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-bg text-app-fg text-sm"
                  >
                    {ASSET_TYPES.map(t => (
                      <option key={t} value={t}>{TYPE_LABELS[t]?.label || t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-fg mb-1">Kategorie</label>
                  <input
                    type="text"
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    placeholder="z.B. Hochzeit"
                    className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-bg text-app-fg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-app-fg mb-1">Tags (kommagetrennt)</label>
                <input
                  type="text"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  placeholder="gold, elegant, vintage"
                  className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-bg text-app-fg text-sm"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                  }}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!uploadName || uploading}
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                  Datei auswählen & hochladen
                </Button>
                <button onClick={() => setShowUploadForm(false)} className="text-sm text-app-muted hover:text-app-fg">
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                placeholder="Assets suchen..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-app-border bg-app-bg text-app-fg text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => { setTypeFilter(''); setPage(1); }}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  !typeFilter ? 'bg-app-accent text-white border-app-accent' : 'bg-app-card text-app-muted border-app-border'
                }`}
              >
                Alle
              </button>
              {ASSET_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => { setTypeFilter(t === typeFilter ? '' : t); setPage(1); }}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    typeFilter === t ? 'bg-app-accent text-white border-app-accent' : `${TYPE_LABELS[t]?.color || ''} border-transparent`
                  }`}
                >
                  {TYPE_LABELS[t]?.label || t}
                </button>
              ))}
            </div>
          </div>

          {/* Assets Grid */}
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-app-muted" />
            </div>
          ) : assets.length === 0 ? (
            <div className="bg-app-card rounded-xl border border-app-border p-12 text-center text-app-muted">
              <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Keine Assets gefunden</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {assets.map((asset) => {
                const info = TYPE_LABELS[asset.type] || { label: asset.type, color: 'bg-gray-100 text-gray-600' };
                return (
                  <div key={asset.id} className="bg-app-card rounded-xl border border-app-border overflow-hidden group">
                    <div className="aspect-square bg-app-hover flex items-center justify-center relative">
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_URL || ''}/api/assets/${asset.id}/file`}
                        alt={asset.name}
                        className="w-full h-full object-contain p-2"
                        loading="lazy"
                      />
                      <button
                        onClick={() => handleDelete(asset.id)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="p-3">
                      <div className="font-medium text-sm text-app-fg truncate">{asset.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${info.color}`}>{info.label}</span>
                        {asset.category && (
                          <span className="text-xs text-app-muted">{asset.category}</span>
                        )}
                      </div>
                      <div className="text-xs text-app-muted mt-1">
                        {asset.width && asset.height ? `${asset.width}×${asset.height}` : ''} · {formatSize(asset.fileSize)}
                      </div>
                      {asset.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {asset.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-xs bg-app-hover text-app-muted px-1.5 py-0.5 rounded">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {total > 50 && (
            <div className="flex items-center justify-between text-sm text-app-muted">
              <span>{total} Assets gesamt</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded border border-app-border disabled:opacity-50">Zurück</button>
                <span className="px-3 py-1">Seite {page}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={assets.length < 50} className="px-3 py-1 rounded border border-app-border disabled:opacity-50">Weiter</button>
              </div>
            </div>
          )}
        </div>
        <DashboardFooter eventId={eventId} />
      </AppLayout>
    </ProtectedRoute>
  );
}
