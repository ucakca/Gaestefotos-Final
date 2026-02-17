'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { useToastStore } from '@/store/toastStore';
import {
  BookOpen, Check, X, Trash2, Download, Loader2, MessageSquare,
  ArrowUpDown, ChevronDown, Edit3, Save, Image as ImageIcon,
  ChevronLeft, ChevronRight, Mic,
} from 'lucide-react';

type GuestbookFilter = 'all' | 'pending' | 'approved' | 'rejected';
type SortOrder = 'newest' | 'oldest';

interface GuestbookTabV2Props {
  eventId: string;
  hostMessage?: string | null;
}

export default function GuestbookTabV2({ eventId, hostMessage: initialHostMessage }: GuestbookTabV2Props) {
  const { showToast } = useToastStore();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<GuestbookFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  // Host message
  const [hostMessage, setHostMessage] = useState(initialHostMessage || '');
  const [editingMessage, setEditingMessage] = useState(false);
  const [savingMessage, setSavingMessage] = useState(false);
  const [draftMessage, setDraftMessage] = useState('');

  // Photo lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxEntries, setLightboxEntries] = useState<any[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    loadEntries();
  }, [eventId]);

  const loadEntries = async () => {
    try {
      const res = await api.get(`/events/${eventId}/guestbook`);
      const data = res.data?.entries || res.data || [];
      setEntries(Array.isArray(data) ? data : []);
      // Try to get host message from response
      if (res.data?.hostMessage !== undefined) {
        setHostMessage(res.data.hostMessage || '');
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const res = await api.get(`/events/${eventId}/guestbook/export-pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gaestebuch-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('PDF heruntergeladen', 'success');
    } catch {
      showToast('PDF-Export fehlgeschlagen', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleModerate = async (entryId: string, action: 'approve' | 'reject') => {
    try {
      await api.post(`/events/guestbook/${entryId}/${action}`);
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, status: action === 'approve' ? 'APPROVED' : 'REJECTED' } : e));
      showToast(action === 'approve' ? 'Eintrag freigegeben' : 'Eintrag abgelehnt', 'success');
    } catch {
      showToast('Aktion fehlgeschlagen', 'error');
    }
  };

  const handleDelete = async (entryId: string) => {
    try {
      await api.delete(`/events/guestbook/${entryId}`);
      setEntries(prev => prev.filter(e => e.id !== entryId));
      showToast('Eintrag gelöscht', 'success');
    } catch {
      showToast('Löschen fehlgeschlagen', 'error');
    }
  };

  const handleSaveHostMessage = async () => {
    setSavingMessage(true);
    try {
      await api.put(`/events/${eventId}/guestbook/host-message`, { message: draftMessage || null });
      setHostMessage(draftMessage);
      setEditingMessage(false);
      showToast('Willkommensnachricht gespeichert', 'success');
    } catch {
      showToast('Speichern fehlgeschlagen', 'error');
    } finally {
      setSavingMessage(false);
    }
  };

  // Filtering & sorting
  const filteredEntries = entries
    .filter(e => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'pending') return e.status === 'PENDING';
      if (statusFilter === 'approved') return e.status === 'APPROVED';
      if (statusFilter === 'rejected') return e.status === 'REJECTED';
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

  const counts = {
    all: entries.length,
    pending: entries.filter(e => e.status === 'PENDING').length,
    approved: entries.filter(e => e.status === 'APPROVED').length,
    rejected: entries.filter(e => e.status === 'REJECTED').length,
  };

  // Photo lightbox for guestbook entries with images
  const openImageLightbox = (entry: any) => {
    const url = entry.photoUrl || entry.imageUrl;
    if (!url) return;
    const entriesWithPhotos = filteredEntries.filter(e => e.photoUrl || e.imageUrl);
    const idx = entriesWithPhotos.findIndex(e => e.id === entry.id);
    setLightboxEntries(entriesWithPhotos);
    setLightboxIndex(idx >= 0 ? idx : 0);
    setLightboxUrl(url);
  };

  const lightboxPrev = () => {
    const newIdx = lightboxIndex > 0 ? lightboxIndex - 1 : lightboxEntries.length - 1;
    setLightboxIndex(newIdx);
    setLightboxUrl(lightboxEntries[newIdx]?.photoUrl || lightboxEntries[newIdx]?.imageUrl);
  };

  const lightboxNext = () => {
    const newIdx = lightboxIndex < lightboxEntries.length - 1 ? lightboxIndex + 1 : 0;
    setLightboxIndex(newIdx);
    setLightboxUrl(lightboxEntries[newIdx]?.photoUrl || lightboxEntries[newIdx]?.imageUrl);
  };

  const statusFilters: { id: GuestbookFilter; label: string; count: number }[] = [
    { id: 'all', label: 'Alle', count: counts.all },
    { id: 'pending', label: 'Ausstehend', count: counts.pending },
    { id: 'approved', label: 'Freigegeben', count: counts.approved },
    { id: 'rejected', label: 'Abgelehnt', count: counts.rejected },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="p-4"
    >
      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 text-muted-foreground mx-auto mb-3 animate-spin" />
          <p className="text-muted-foreground text-sm">Lade Gästebuch...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Host Welcome Message */}
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="font-semibold text-sm text-blue-900">Willkommensnachricht</div>
              </div>
              {!editingMessage && (
                <button onClick={() => { setDraftMessage(hostMessage); setEditingMessage(true); }}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors">
                  <Edit3 className="w-3 h-3" /> Bearbeiten
                </button>
              )}
            </div>
            {editingMessage ? (
              <div className="space-y-2">
                <textarea
                  value={draftMessage}
                  onChange={e => setDraftMessage(e.target.value)}
                  placeholder="Schreibe eine Willkommensnachricht für dein Gästebuch..."
                  rows={3}
                  maxLength={2000}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-blue-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
                <div className="flex items-center gap-2 justify-end">
                  <button onClick={() => setEditingMessage(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-white transition-colors">
                    Abbrechen
                  </button>
                  <button onClick={handleSaveHostMessage} disabled={savingMessage}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors">
                    {savingMessage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Speichern
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-blue-800">
                {hostMessage || <span className="italic text-blue-500">Keine Willkommensnachricht gesetzt. Gäste sehen das Gästebuch ohne Begrüßung.</span>}
              </p>
            )}
          </div>

          {/* Header with count, sort, export */}
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-foreground">{entries.length} Einträge</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => setSortOrder(s => s === 'newest' ? 'oldest' : 'newest')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-card border border-border text-muted-foreground hover:bg-muted/50 transition-colors">
                <ArrowUpDown className="w-3 h-3" />
                {sortOrder === 'newest' ? 'Neueste' : 'Älteste'}
              </button>
              <button onClick={handleExportPdf} disabled={exporting || entries.length === 0}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-card border border-border text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50">
                {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                PDF
              </button>
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 scrollbar-hide">
            {statusFilters.map(f => (
              <button key={f.id} onClick={() => setStatusFilter(f.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  statusFilter === f.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-card border border-border text-muted-foreground hover:border-blue-300'
                }`}
              >
                {f.label}
                {f.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    statusFilter === f.id ? 'bg-white/30' : f.id === 'pending' && f.count > 0 ? 'bg-orange-100 text-orange-600' : 'bg-muted'
                  }`}>{f.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Entries */}
          {filteredEntries.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium text-foreground mb-1">Gästebuch</h3>
              <p className="text-muted-foreground text-sm">
                {statusFilter === 'all' ? 'Noch keine Einträge vorhanden' :
                 statusFilter === 'pending' ? 'Keine ausstehenden Einträge' :
                 statusFilter === 'rejected' ? 'Keine abgelehnten Einträge' :
                 'Keine freigegebenen Einträge'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map((entry: any) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl border bg-card p-4 shadow-sm transition-colors ${
                    entry.status === 'PENDING' ? 'border-orange-300 bg-orange-50/30' :
                    entry.status === 'REJECTED' ? 'border-red-200 opacity-60' :
                    'border-border'
                  }`}
                >
                  {/* Entry header */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-sm font-bold shrink-0">
                      {(entry.authorName || entry.name || 'G').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground">{entry.authorName || entry.name || 'Gast'}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('de-DE', {
                          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        }) : ''}
                        {entry.status === 'PENDING' && (
                          <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 text-[10px] font-medium">Ausstehend</span>
                        )}
                        {entry.status === 'REJECTED' && (
                          <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-medium">Abgelehnt</span>
                        )}
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex gap-1 shrink-0">
                      {entry.status === 'PENDING' && (
                        <>
                          <button onClick={() => handleModerate(entry.id, 'approve')}
                            className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-600 transition-colors" title="Freigeben">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleModerate(entry.id, 'reject')}
                            className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors" title="Ablehnen">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {entry.status === 'REJECTED' && (
                        <button onClick={() => handleModerate(entry.id, 'approve')}
                          className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-600 transition-colors" title="Wiederherstellen">
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(entry.id)}
                        className="p-1.5 rounded-lg hover:bg-red-100 text-muted-foreground hover:text-red-500 transition-colors" title="Löschen">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Message */}
                  {entry.message && <p className="text-sm text-foreground leading-relaxed">{entry.message}</p>}

                  {/* Photo */}
                  {(entry.photoUrl || entry.imageUrl) && (
                    <button onClick={() => openImageLightbox(entry)} className="mt-2 block w-full">
                      <img
                        src={entry.photoUrl || entry.imageUrl}
                        alt=""
                        className="rounded-xl max-h-48 object-cover w-full hover:opacity-90 transition-opacity cursor-pointer"
                        loading="lazy"
                      />
                    </button>
                  )}

                  {/* Audio */}
                  {entry.audioUrl && (
                    <div className="mt-2 flex items-center gap-2 p-2 rounded-xl bg-muted/50">
                      <Mic className="w-4 h-4 text-muted-foreground shrink-0" />
                      <audio controls preload="none" className="w-full h-8">
                        <source src={entry.audioUrl} />
                      </audio>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Photo Lightbox */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex flex-col"
            onClick={() => setLightboxUrl(null)}
          >
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-3 z-10" onClick={e => e.stopPropagation()}>
              <span className="text-white/70 text-sm">
                {lightboxEntries.length > 1 && `${lightboxIndex + 1} / ${lightboxEntries.length}`}
              </span>
              <button onClick={() => setLightboxUrl(null)} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Image */}
            <div className="flex-1 flex items-center justify-center relative px-12" onClick={e => e.stopPropagation()}>
              {lightboxEntries.length > 1 && (
                <button onClick={lightboxPrev} className="absolute left-2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 z-10">
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
              <motion.img
                key={lightboxUrl}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                src={lightboxUrl}
                alt=""
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
              />
              {lightboxEntries.length > 1 && (
                <button onClick={lightboxNext} className="absolute right-2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 z-10">
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Bottom info */}
            {lightboxEntries[lightboxIndex] && (
              <div className="flex flex-col items-center gap-1 px-4 py-3 z-10" onClick={e => e.stopPropagation()}>
                <span className="text-white font-medium text-sm">
                  {lightboxEntries[lightboxIndex].authorName || lightboxEntries[lightboxIndex].name || 'Gast'}
                </span>
                {lightboxEntries[lightboxIndex].message && (
                  <p className="text-white/60 text-xs text-center max-w-md line-clamp-2">{lightboxEntries[lightboxIndex].message}</p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
