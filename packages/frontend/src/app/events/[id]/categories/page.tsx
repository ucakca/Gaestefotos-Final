'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { Event as EventType } from '@gaestefotos/shared';
import * as LucideIcons from 'lucide-react';
import { Plus, Trash2, Edit2, X, Eye, EyeOff, Lock, Unlock, Calendar, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useToastStore } from '@/store/toastStore';
import DashboardFooter from '@/components/DashboardFooter';
import AppLayout from '@/components/AppLayout';
import FaceSearch from '@/components/FaceSearch';
import { FullPageLoader } from '@/components/ui/FullPageLoader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { IconButton } from '@/components/ui/IconButton';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function isWizardMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('wizard') === '1';
  } catch {
    return false;
  }
}

interface Category {
  id: string;
  name: string;
  iconKey?: string | null;
  order: number;
  isVisible?: boolean;
  uploadLocked?: boolean;
  uploadLockUntil?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  _count?: {
    photos: number;
  };
}

const POPULAR_ICON_KEYS = [
  'Camera',
  'Heart',
  'Sparkles',
  'PartyPopper',
  'Music',
  'Users',
  'Baby',
  'Cake',
  'Gift',
  'Ring',
  'GlassWater',
  'MapPin',
  'Plane',
  'Briefcase',
  'Palette',
  'Smile',
] as const;

function getLucideIconComponent(iconKey?: string | null) {
  if (!iconKey) return null;
  const key = String(iconKey);
  const Comp = (LucideIcons as any)[key];
  return typeof Comp === 'function' ? Comp : null;
}

function getAllLucideIconKeys(): string[] {
  return Object.keys(LucideIcons)
    .filter((k) => {
      const v = (LucideIcons as any)[k];
      return typeof v === 'function' && /^[A-Z]/.test(k);
    })
    .sort((a, b) => a.localeCompare(b));
}

function toLocalDateTimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function CategoryManagementPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const { showToast } = useToastStore();

  const confirmResolveRef = useRef<((value: boolean) => void) | null>(null);
  const [confirmState, setConfirmState] = useState<null | {
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
  }>(null);

  const confirmOpen = confirmState !== null;

  function requestConfirm(opts: {
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
  }) {
    return new Promise<boolean>((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmState(opts);
    });
  }

  function closeConfirm(result: boolean) {
    const resolve = confirmResolveRef.current;
    confirmResolveRef.current = null;
    setConfirmState(null);
    resolve?.(result);
  }

  const wizardMode = isWizardMode();

  const [event, setEvent] = useState<EventType | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [canScheduleUploadLock, setCanScheduleUploadLock] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    iconKey: '' as string,
    order: 0,
    isVisible: true,
    uploadLocked: false,
    uploadLockUntil: '',
    startAt: '',
    endAt: '',
  });

  const [iconSearch, setIconSearch] = useState('');

  useEffect(() => {
    loadEvent();
    loadCategories();
    loadEntitlement();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}`);
      setEvent(data.event);
    } catch (err) {
      console.error('Fehler beim Laden des Events:', err);
    }
  };

  const loadCategories = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}/categories`);
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Fehler beim Laden der Kategorien:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEntitlement = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}/storage-limits`);
      const tierRaw = (data?.entitlement?.package?.resultingTier || data?.entitlement?.package?.name || '') as string;
      const tier = (tierRaw || '').toLowerCase();
      setCanScheduleUploadLock(tier.includes('unvergess'));
    } catch {
      setCanScheduleUploadLock(false);
    }
  };


  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Format data correctly for backend
      const submitData = {
        name: formData.name,
        iconKey: formData.iconKey?.trim() ? formData.iconKey.trim() : null,
        order: formData.order,
        isVisible: formData.isVisible,
        uploadLocked: formData.uploadLocked,
        uploadLockUntil: formData.uploadLockUntil && formData.uploadLockUntil.trim() 
          ? new Date(formData.uploadLockUntil).toISOString() 
          : null,
        startAt: formData.startAt && formData.startAt.trim() ? new Date(formData.startAt).toISOString() : null,
        endAt: formData.endAt && formData.endAt.trim() ? new Date(formData.endAt).toISOString() : null,
      };
      
      await api.post(`/events/${eventId}/categories`, submitData);
      showToast('Album hinzugefügt', 'success');
      setFormData({ 
        name: '', 
        iconKey: '',
        order: 0,
        isVisible: true,
        uploadLocked: false,
        uploadLockUntil: '',
        startAt: '',
        endAt: '',
      });
      setShowAddForm(false);
      loadCategories();
    } catch (err: any) {
      console.error('Fehler beim Hinzufügen:', err);
      const errorMessage = err.response?.data?.error || 'Fehler beim Hinzufügen';
      showToast(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage), 'error');
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    try {
      // Format data correctly for backend
      const submitData = {
        name: formData.name,
        iconKey: formData.iconKey?.trim() ? formData.iconKey.trim() : null,
        order: formData.order,
        isVisible: formData.isVisible,
        uploadLocked: formData.uploadLocked,
        uploadLockUntil: formData.uploadLockUntil && formData.uploadLockUntil.trim() 
          ? new Date(formData.uploadLockUntil).toISOString() 
          : null,
        startAt: formData.startAt && formData.startAt.trim() ? new Date(formData.startAt).toISOString() : null,
        endAt: formData.endAt && formData.endAt.trim() ? new Date(formData.endAt).toISOString() : null,
      };
      
      await api.put(`/events/${eventId}/categories/${editingCategory.id}`, submitData);
      showToast('Album aktualisiert', 'success');
      setEditingCategory(null);
      setFormData({ 
        name: '', 
        iconKey: '',
        order: 0,
        isVisible: true,
        uploadLocked: false,
        uploadLockUntil: '',
        startAt: '',
        endAt: '',
      });
      loadCategories();
    } catch (err: any) {
      console.error('Fehler beim Aktualisieren:', err);
      const errorMessage = err.response?.data?.error || 'Fehler beim Aktualisieren';
      showToast(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage), 'error');
    }
  };

  const handleDelete = async (categoryId: string) => {
    const ok = await requestConfirm({
      title: 'Album wirklich löschen?',
      description: 'Alle Inhalte bleiben erhalten, aber das Album wird entfernt.',
      confirmText: 'Löschen',
      cancelText: 'Abbrechen',
    });
    if (!ok) return;

    try {
      await api.delete(`/events/${eventId}/categories/${categoryId}`);
      showToast('Album gelöscht', 'success');
      loadCategories();
    } catch (err: any) {
      showToast('Fehler beim Löschen', 'error');
    }
  };

  const startEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      iconKey: category.iconKey || '',
      order: category.order,
      isVisible: category.isVisible ?? true,
      uploadLocked: category.uploadLocked ?? false,
      uploadLockUntil: category.uploadLockUntil 
        ? new Date(category.uploadLockUntil).toISOString().slice(0, 16)
        : '',
      startAt: category.startAt ? new Date(category.startAt).toISOString().slice(0, 16) : '',
      endAt: category.endAt ? new Date(category.endAt).toISOString().slice(0, 16) : '',
    });
    setShowAddForm(false);
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    setFormData({ 
      name: '', 
      iconKey: '',
      order: 0, 
      isVisible: true,
      uploadLocked: false,
      uploadLockUntil: '',
      startAt: '',
      endAt: '',
    });
  };


  if (loading) {
    return (
      <AppLayout showBackButton backUrl={wizardMode ? `/events/${eventId}/design?wizard=1` : `/events/${eventId}/dashboard`}>
        <FullPageLoader label="Laden..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout showBackButton backUrl={wizardMode ? `/events/${eventId}/design?wizard=1` : `/events/${eventId}/dashboard`}>
      <Dialog open={confirmOpen} onOpenChange={(open) => (open ? null : closeConfirm(false))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmState?.title}</DialogTitle>
            {confirmState?.description ? <DialogDescription>{confirmState.description}</DialogDescription> : null}
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" onClick={() => closeConfirm(false)}>
                {confirmState?.cancelText || 'Abbrechen'}
              </Button>
            </DialogClose>
            <Button variant="danger" onClick={() => closeConfirm(true)}>
              {confirmState?.confirmText || 'Bestätigen'}
            </Button>
          </DialogFooter>
        </DialogContent>

        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {wizardMode && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-app-border bg-app-card p-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-app-fg">Wizard</div>
              <div className="text-xs text-app-muted">2/2 Alben – Zeitfenster setzen & fertigstellen</div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <motion.div whileTap={{ scale: 0.95 }}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push(`/events/${eventId}/design?wizard=1`)}
                >
                  Zurück
                </Button>
              </motion.div>
              <motion.div whileTap={{ scale: 0.95 }}>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => router.push(`/events/${eventId}/dashboard`)}
                >
                  Fertig
                </Button>
              </motion.div>
            </div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex justify-between items-center">
            <div>
              <h1 className="mb-2 text-2xl font-bold text-app-fg">
                Alben
              </h1>
              <p className="text-app-muted">
                {event?.title} • {categories.length} Album{categories.length !== 1 ? 'e' : ''}
              </p>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  setEditingCategory(null);
                  setFormData({
                    name: '',
                    iconKey: '',
                    order: 0,
                    isVisible: true,
                    uploadLocked: false,
                    uploadLockUntil: '',
                    startAt: '',
                    endAt: '',
                  });
                }}
                className="gap-2"
              >
                <Plus className="w-5 h-5" />
                Album hinzufügen
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Add/Edit Form */}
        <AnimatePresence>
          {(showAddForm || editingCategory) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 rounded-lg border border-app-border bg-app-card p-6"
            >
              <h2 className="text-xl font-semibold mb-4">
                {editingCategory ? 'Album bearbeiten' : 'Neues Album'}
              </h2>
              <form onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory} className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-app-muted mb-1">
                      Name *
                    </label>
                    <Input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                {/* Smart Album Zeitfenster */}
                <div className="border-t border-app-border pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-app-muted" />
                    <div className="text-sm font-medium text-app-fg">Smart Album Zeitfenster (optional)</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-0">
                    <div>
                      <label className="block text-sm font-medium text-app-muted mb-1">Start</label>
                      <Input
                        type="datetime-local"
                        value={formData.startAt}
                        onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-app-muted mb-1">Ende</label>
                      <Input
                        type="datetime-local"
                        value={formData.endAt}
                        onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-app-muted">
                    Wenn gesetzt, werden Uploads ohne Album-Auswahl automatisch diesem Album zugeordnet (nach EXIF/Uploadzeit). Zeitfenster dürfen sich nicht überschneiden.
                  </p>
                </div>

                  <div>
                    <label className="block text-sm font-medium text-app-muted mb-1">
                      Icon
                    </label>
                    <div className="rounded-lg border border-app-border bg-app-card p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-app-bg flex items-center justify-center border border-app-border">
                          {(() => {
                            const IconComp = getLucideIconComponent(formData.iconKey);
                            if (!IconComp) {
                              const Fallback = (LucideIcons as any).Folder;
                              return <Fallback className="w-5 h-5 text-app-muted" />;
                            }
                            return <IconComp className="w-5 h-5 text-app-fg" />;
                          })()}
                        </div>

                        <div className="flex-1">
                          <div className="text-sm font-medium text-app-fg">
                            {formData.iconKey?.trim() ? formData.iconKey : 'Standard'}
                          </div>
                          <div className="text-xs text-app-muted">Lucide Icon Name</div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFormData({ ...formData, iconKey: '' })}
                          className="text-sm text-app-muted hover:text-app-fg"
                        >
                          Entfernen
                        </Button>
                      </div>

                      <div className="mt-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted" />
                          <Input
                            value={iconSearch}
                            onChange={(e) => setIconSearch(e.target.value)}
                            placeholder="Icon suchen… (z.B. Heart, Camera, Party)"
                            className="pl-9"
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="text-xs font-semibold text-app-fg mb-2">Beliebt</div>
                        <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
                          {POPULAR_ICON_KEYS.map((key) => {
                            const IconComp = getLucideIconComponent(key);
                            if (!IconComp) return null;
                            const isSelected = formData.iconKey === key;
                            return (
                              <IconButton
                                key={key}
                                type="button"
                                onClick={() => setFormData({ ...formData, iconKey: key })}
                                icon={<IconComp className="w-5 h-5 text-app-fg" />}
                                aria-label={key}
                                title={key}
                                variant="ghost"
                                size="sm"
                                className={`h-10 w-10 rounded-md border flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? 'border-app-fg bg-app-bg'
                                    : 'border-app-border bg-app-card hover:bg-app-bg'
                                }`}
                              />
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="text-xs font-semibold text-app-fg mb-2">Alle Icons</div>
                        <div className="max-h-56 overflow-auto rounded-lg border border-app-border bg-app-bg p-2">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {getAllLucideIconKeys()
                              .filter((k) => {
                                const q = iconSearch.trim().toLowerCase();
                                if (!q) return true;
                                return k.toLowerCase().includes(q);
                              })
                              .slice(0, 300)
                              .map((key) => {
                                const IconComp = getLucideIconComponent(key);
                                if (!IconComp) return null;
                                const isSelected = formData.iconKey === key;
                                return (
                                  <Button
                                    key={key}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, iconKey: key })}
                                    variant={isSelected ? 'primary' : 'ghost'}
                                    className={`flex items-center gap-2 rounded-md border px-2 py-2 text-left text-xs transition-colors ${
                                      isSelected
                                        ? 'border-app-fg bg-app-bg'
                                        : 'border-app-border bg-app-card hover:bg-app-bg'
                                    }`}
                                  >
                                    <IconComp className="w-4 h-4 text-app-fg" />
                                    <span className="truncate">{key}</span>
                                  </Button>
                                );
                              })}
                          </div>

                          {getAllLucideIconKeys().filter((k) => {
                            const q = iconSearch.trim().toLowerCase();
                            if (!q) return true;
                            return k.toLowerCase().includes(q);
                          }).length > 300 && (
                            <div className="mt-2 text-xs text-app-muted">
                              Anzeige limitiert auf 300 Treffer. Bitte Suche weiter eingrenzen.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-app-muted mb-1">
                      Reihenfolge
                    </label>
                    <Input
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                {/* Visibility */}
                <div className="border-t border-app-border pt-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={formData.isVisible}
                      onCheckedChange={(checked) => setFormData({ ...formData, isVisible: checked })}
                      className="h-5 w-5"
                    />
                    <div className="flex items-center gap-2">
                      {formData.isVisible ? (
                        <Eye className="w-5 h-5 text-app-fg" />
                      ) : (
                        <EyeOff className="w-5 h-5 text-app-muted" />
                      )}
                      <span className="text-sm font-medium text-app-fg">
                        Für Gäste sichtbar
                      </span>
                    </div>
                  </label>
                  <p className="text-xs text-app-muted mt-1 ml-8">
                    Wenn deaktiviert, können Gäste dieses Album nicht sehen
                  </p>
                </div>

                {/* Upload Lock */}
                <div className="border-t border-app-border pt-4 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={formData.uploadLocked}
                      onCheckedChange={(checked) => setFormData({ ...formData, uploadLocked: checked })}
                      className="h-5 w-5"
                    />
                    <div className="flex items-center gap-2">
                      {formData.uploadLocked ? (
                        <Lock className="w-5 h-5 text-[var(--status-danger)]" />
                      ) : (
                        <Unlock className="w-5 h-5 text-app-muted" />
                      )}
                      <span className="text-sm font-medium text-app-fg">
                        Upload sperren
                      </span>
                    </div>
                  </label>
                  {formData.uploadLocked && (
                    <div className="ml-8">
                      <label className="block text-sm font-medium text-app-muted mb-1">
                        Sperre bis (optional)
                      </label>
                      <Input
                        type="datetime-local"
                        value={formData.uploadLockUntil}
                        onChange={(e) => setFormData({ ...formData, uploadLockUntil: e.target.value })}
                        disabled={!canScheduleUploadLock}
                        className="disabled:opacity-60"
                      />

                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={!canScheduleUploadLock || !(event as any)?.dateTime}
                          onClick={() => {
                            const dtRaw = (event as any)?.dateTime as any;
                            if (!dtRaw) return;
                            const d = new Date(dtRaw);
                            if (Number.isNaN(d.getTime())) return;
                            d.setDate(d.getDate() + 1);
                            setFormData((prev) => ({ ...prev, uploadLockUntil: toLocalDateTimeInputValue(d) }));
                          }}
                        >
                          +1 Tag nach Event
                        </Button>
                        {!canScheduleUploadLock && (
                          <span className="text-xs text-app-muted">
                            Zeitplanung ist nur mit <strong>Unvergesslich</strong> verfügbar.
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-app-muted mt-1">
                        Wenn leer, bleibt die Sperre dauerhaft aktiv
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-4 pt-4 border-t border-app-border">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setShowAddForm(false);
                        cancelEdit();
                      }}
                      className="border border-app-border bg-app-bg text-app-fg hover:opacity-90"
                    >
                      Abbrechen
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button type="submit" variant="primary">
                      {editingCategory ? 'Speichern' : 'Hinzufügen'}
                    </Button>
                  </motion.div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>


        {/* Categories List */}
        <div className="overflow-hidden rounded-lg border border-app-border bg-app-card">
          <table className="min-w-full divide-y divide-app-border">
            <thead className="bg-app-bg">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">
                  Fotos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border bg-app-card">
              <AnimatePresence>
                {categories.map((category, index) => (
                  <motion.tr
                    key={category.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <IconButton
                          icon={
                            expandedCategory === category.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )
                          }
                          variant="ghost"
                          size="sm"
                          aria-label={expandedCategory === category.id ? 'Details schließen' : 'Details öffnen'}
                          title={expandedCategory === category.id ? 'Details schließen' : 'Details öffnen'}
                          onClick={() =>
                            setExpandedCategory(expandedCategory === category.id ? null : category.id)
                          }
                          className="text-app-muted hover:text-app-fg"
                        />
                        <div>
                          <div className="text-sm font-medium text-app-fg">
                            {category.name}
                          </div>
                          <div className="text-xs text-app-muted mt-1">
                            Reihenfolge: {category.order}
                          </div>
                        </div>
                      </div>
                      {expandedCategory === category.id && (
                        <div className="mt-4 ml-6 rounded-lg border border-app-border bg-app-bg p-3">
                          <p className="text-xs text-app-muted">
                            💡 Tipp: Challenges können in der separaten Challenge-Verwaltung erstellt und diesem Album zugewiesen werden.
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          {category.isVisible ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-app-bg text-app-fg border border-app-border">
                              <Eye className="w-3 h-3" />
                              Sichtbar
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-app-bg text-app-muted border border-app-border">
                              <EyeOff className="w-3 h-3" />
                              Versteckt
                            </span>
                          )}
                        </div>
                        {category.uploadLocked && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-app-bg text-[var(--status-danger)] border border-app-border">
                            <Lock className="w-3 h-3" />
                            Upload gesperrt
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-app-muted">
                        {category._count?.photos || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <IconButton
                          icon={<Edit2 className="h-5 w-5" />}
                          variant="ghost"
                          size="sm"
                          aria-label="Album bearbeiten"
                          title="Album bearbeiten"
                          onClick={() => startEdit(category)}
                          className="text-app-fg"
                        />
                        <IconButton
                          icon={<Trash2 className="h-5 w-5" />}
                          variant="ghost"
                          size="sm"
                          aria-label="Album löschen"
                          title="Album löschen"
                          onClick={() => handleDelete(category.id)}
                          className="text-[var(--status-danger)]"
                        />
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {categories.length === 0 && (
            <div className="text-center py-12">
              <p className="text-app-muted">Noch keine Alben hinzugefügt</p>
            </div>
          )}
        </div>
      </div>
      </Dialog>

      {/* Sticky Footer Navigation */}
      <DashboardFooter eventId={eventId} />
      
      {/* Padding for footer */}
      <div className="h-20" />
    </AppLayout>
  );
}











