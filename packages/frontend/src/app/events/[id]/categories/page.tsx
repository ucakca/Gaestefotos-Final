'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table';
import api from '@/lib/api';
import { Event as EventType } from '@gaestefotos/shared';
import { 
  Plus, Trash2, Edit2, X, Eye, EyeOff, Lock, Unlock, Calendar, Search, ChevronDown, ChevronUp,
  Camera, Heart, Star, Gift, Music, Coffee, Beer, Cake, Utensils, Home, User, Users,
  Image, Video, MessageCircle, FileText, MapPin, Clock, Award, Sparkles, ArrowUpDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useToastStore } from '@/store/toastStore';
import DashboardFooter from '@/components/DashboardFooter';
import AppLayout from '@/components/AppLayout';
import FaceSearch from '@/components/FaceSearch';
import { FullPageLoader } from '@/components/ui/FullPageLoader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { IconButton } from '@/components/ui/IconButton';
import DateTimePicker from '@/components/DateTimePicker';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const LucideIcons = {
  Camera, Heart, Star, Gift, Music, Coffee, Beer, Cake, Utensils, Home, User, Users,
  Image, Video, MessageCircle, FileText, MapPin, Clock, Award, Sparkles, Plus, Trash2,
  Edit2, X, Eye, EyeOff, Lock, Unlock, Calendar, Search
};

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

export default function CategoryManagementPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [eventId, setEventId] = React.useState<string | null>(null);

  React.useEffect(() => {
    params.then(p => setEventId(p.id));
  }, []);
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
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [searchQuery, setSearchQuery] = useState('');
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
    if (eventId) loadData();
  }, [eventId]);

  const loadData = async () => {
    await loadEvent();
    await loadCategories();
    await loadEntitlement();
  };

  const loadEvent = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}`);
      setEvent(data.event);
    } catch (err) {
      void err;
    }
  };

  const loadCategories = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}/categories`);
      setCategories(data.categories || []);
    } catch (err) {
      void err;
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

  // TanStack Table Column Definitions
  const columns: ColumnDef<Category>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-medium"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const category = row.original;
        const IconComp = getLucideIconComponent(category.iconKey);
        return (
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
              className="text-muted-foreground hover:text-foreground"
            />
            {IconComp && (
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center">
                <IconComp className="w-4 h-4 text-foreground" />
              </div>
            )}
            <div>
              <div className="text-sm font-medium text-foreground">{category.name}</div>
              <div className="text-xs text-muted-foreground mt-1">Reihenfolge: {category.order}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'isVisible',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-medium"
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const category = row.original;
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              {category.isVisible ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-background text-foreground border border-border">
                  <Eye className="w-3 h-3" />
                  Sichtbar
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-background text-muted-foreground border border-border">
                  <EyeOff className="w-3 h-3" />
                  Versteckt
                </span>
              )}
            </div>
            {category.uploadLocked && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-background text-destructive border border-border">
                <Lock className="w-3 h-3" />
                Upload gesperrt
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: '_count.photos',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-medium"
        >
          Fotos
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">{row.original._count?.photos || 0}</div>
      ),
      accessorFn: (row) => row._count?.photos || 0,
    },
    {
      id: 'actions',
      header: 'Aktionen',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <IconButton
            icon={<Edit2 className="h-5 w-5" />}
            variant="ghost"
            size="sm"
            aria-label="Album bearbeiten"
            title="Album bearbeiten"
            onClick={() => startEdit(row.original)}
            className="text-foreground"
          />
          <IconButton
            icon={<Trash2 className="h-4 w-4" />}
            variant="ghost"
            size="sm"
            aria-label="Album löschen"
            title="Album löschen"
            onClick={() => handleDelete(row.original.id)}
            className="text-destructive"
          />
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: categories,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
      globalFilter: searchQuery,
    },
    onGlobalFilterChange: setSearchQuery,
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  if (loading || !eventId) {
    return <FullPageLoader label="Lade..." />;
  }

  return (
    <AppLayout showBackButton backUrl={wizardMode ? `/events/${eventId}/qr-styler?wizard=1` : `/events/${eventId}/dashboard`}>
      <AlertDialog open={confirmOpen} onOpenChange={(open) => (open ? null : closeConfirm(false))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmState?.title}</AlertDialogTitle>
            {confirmState?.description ? (
              <AlertDialogDescription>{confirmState.description}</AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="secondary" onClick={() => closeConfirm(false)}>
                {confirmState?.cancelText || 'Abbrechen'}
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="danger" onClick={() => closeConfirm(true)}>
                {confirmState?.confirmText || 'Bestätigen'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {wizardMode && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">Wizard</div>
              <div className="text-xs text-muted-foreground">2/2 Alben – Zeitfenster setzen & fertigstellen</div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <motion.div whileTap={{ scale: 0.95 }}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push(`/events/${eventId}/qr-styler?wizard=1`)}
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
              <h1 className="mb-2 text-2xl font-bold text-foreground">
                Alben
              </h1>
              <p className="text-muted-foreground">
                {event?.title} • {categories.length} Album{categories.length !== 1 ? 'e' : ''}
              </p>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <IconButton
                onClick={() => {
                  setShowAddForm(true);
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
                icon={<Plus className="w-5 h-5" />}
                variant="ghost"
                size="lg"
                aria-label="Album hinzufügen"
                title="Album hinzufügen"
                className="bg-app-accent hover:bg-app-accent/90 text-app-bg"
              />
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
              className="mb-6 rounded-lg border border-border bg-card p-6"
            >
              <h2 className="text-xl font-semibold mb-4">
                {editingCategory ? 'Album bearbeiten' : 'Neues Album'}
              </h2>
              <form onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory} className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
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
                <div className="border-t border-border pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div className="text-sm font-medium text-foreground">Smart Album Zeitfenster (optional)</div>
                  </div>

                  <div className="rounded-lg bg-background border border-border p-3 mb-3">
                    <p className="text-xs text-foreground font-medium mb-1">💡 Was sind Smart Alben?</p>
                    <p className="text-xs text-muted-foreground">
                      Fotos werden automatisch dem richtigen Album zugeordnet, basierend auf dem Aufnahmezeitpunkt (EXIF-Daten).
                      <br/>
                      <strong>Beispiel:</strong> Album "Trauung" (14:00-15:00), Album "Feier" (18:00-23:00)
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-0">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Start</label>
                      <DateTimePicker
                        value={formData.startAt}
                        onChange={(value) => setFormData({ ...formData, startAt: value })}
                        minDate={new Date(0)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Ende</label>
                      <DateTimePicker
                        value={formData.endAt}
                        onChange={(value) => setFormData({ ...formData, endAt: value })}
                        minDate={new Date(0)}
                      />
                    </div>
                  </div>

                  <div className="rounded-lg bg-status-warning/10 border border-status-warning/30 p-3">
                    <p className="text-xs text-status-warning font-semibold mb-1">⚠️ Wichtig: Zeitfenster dürfen sich nicht überschneiden!</p>
                    <p className="text-xs text-muted-foreground">
                      Sonst werden Fotos mehreren Alben zugeordnet. Lasse Lücken zwischen den Zeitfenstern oder nutze kein Smart Album für bestimmte Bereiche.
                    </p>
                  </div>
                </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Icon
                    </label>
                    <div className="rounded-lg border border-border bg-card p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center border border-border">
                          {(() => {
                            const IconComp = getLucideIconComponent(formData.iconKey);
                            if (!IconComp) {
                              const Fallback = (LucideIcons as any).Folder;
                              return <Fallback className="w-5 h-5 text-muted-foreground" />;
                            }
                            return <IconComp className="w-5 h-5 text-foreground" />;
                          })()}
                        </div>

                        <div className="flex-1">
                          <div className="text-sm font-medium text-foreground">
                            {formData.iconKey?.trim() ? formData.iconKey : 'Standard'}
                          </div>
                          <div className="text-xs text-muted-foreground">Lucide Icon Name</div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFormData({ ...formData, iconKey: '' })}
                          className="text-sm text-muted-foreground hover:text-foreground"
                        >
                          Entfernen
                        </Button>
                      </div>

                      <div className="mt-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            value={iconSearch}
                            onChange={(e) => setIconSearch(e.target.value)}
                            placeholder="Icon suchen… (z.B. Heart, Camera, Party)"
                            className="pl-9"
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="text-xs font-semibold text-foreground mb-2">Beliebt</div>
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
                                icon={<IconComp className="w-5 h-5 text-foreground" />}
                                aria-label={key}
                                title={key}
                                variant="ghost"
                                size="sm"
                                className={`h-10 w-10 rounded-md border flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? 'border-app-fg bg-background'
                                    : 'border-border bg-card hover:bg-background'
                                }`}
                              />
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="text-xs font-semibold text-foreground mb-2">Alle Icons</div>
                        <div className="max-h-56 overflow-auto rounded-lg border border-border bg-background p-2">
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
                                        ? 'border-app-fg bg-background'
                                        : 'border-border bg-card hover:bg-background'
                                    }`}
                                  >
                                    <IconComp className="w-4 h-4 text-foreground" />
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
                            <div className="mt-2 text-xs text-muted-foreground">
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
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
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
                <div className="border-t border-border pt-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={formData.isVisible}
                      onCheckedChange={(checked) => setFormData({ ...formData, isVisible: checked })}
                      className="h-5 w-5"
                    />
                    <div className="flex items-center gap-2">
                      {formData.isVisible ? (
                        <Eye className="w-5 h-5 text-foreground" />
                      ) : (
                        <EyeOff className="w-5 h-5 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium text-foreground">
                        Für Gäste sichtbar
                      </span>
                    </div>
                  </label>
                  <p className="text-xs text-muted-foreground mt-1 ml-8">
                    Wenn deaktiviert, können Gäste dieses Album nicht sehen
                  </p>
                </div>

                {/* Upload Lock */}
                <div className="border-t border-border pt-4 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={formData.uploadLocked}
                      onCheckedChange={(checked) => setFormData({ ...formData, uploadLocked: checked })}
                      className="h-5 w-5"
                    />
                    <div className="flex items-center gap-2">
                      {formData.uploadLocked ? (
                        <Lock className="w-5 h-5 text-destructive" />
                      ) : (
                        <Unlock className="w-5 h-5 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium text-foreground">
                        Upload sperren
                      </span>
                    </div>
                  </label>
                  {formData.uploadLocked && (
                    <div className="ml-8">
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Sperre bis (optional)
                      </label>
                      <DateTimePicker
                        value={formData.uploadLockUntil}
                        onChange={(value) => setFormData({ ...formData, uploadLockUntil: value })}
                        disabled={!canScheduleUploadLock}
                        minDate={new Date(0)}
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
                            setFormData((prev) => ({ ...prev, uploadLockUntil: d.toISOString() }));
                          }}
                        >
                          +1 Tag nach Event
                        </Button>
                        {!canScheduleUploadLock && (
                          <span className="text-xs text-muted-foreground">
                            Zeitplanung ist nur mit <strong>Unvergesslich</strong> verfügbar.
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground mt-1">
                        Wenn leer, bleibt die Sperre dauerhaft aktiv
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-4 pt-4 border-t border-border">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setShowAddForm(false);
                        cancelEdit();
                      }}
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

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <Input
            placeholder="Alben durchsuchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </motion.div>

        {/* Categories Table with TanStack */}
        <div className="bg-card border border-border rounded-lg shadow overflow-hidden">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="bg-background">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row, index) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-border"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        {expandedCategory === row.original.id && cell.column.id === 'name' && (
                          <div className="mt-4 ml-6 rounded-lg border border-border bg-background p-3">
                            <p className="text-xs text-muted-foreground">
                              💡 Tipp: Challenges können in der separaten Challenge-Verwaltung erstellt und diesem Album zugewiesen werden.
                            </p>
                          </div>
                        )}
                      </TableCell>
                    ))}
                  </motion.tr>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                    {searchQuery ? 'Keine Alben gefunden.' : 'Noch keine Alben vorhanden.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {table.getPageCount() > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-background border-t border-border">
              <div className="text-sm text-muted-foreground">
                Seite {table.getState().pagination.pageIndex + 1} von {table.getPageCount()}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Zurück
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Weiter
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Card View - keep old implementation */}
        <div className="md:hidden space-y-3 mt-4">
          <AnimatePresence>
            {categories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card border border-border rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const IconComp = getLucideIconComponent(category.iconKey);
                      return IconComp ? (
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center">
                          <IconComp className="w-4 h-4 text-foreground" />
                        </div>
                      ) : null;
                    })()}
                    <div>
                      <div className="text-sm font-medium text-foreground">{category.name}</div>
                      <div className="text-xs text-muted-foreground">Reihenfolge: {category.order}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <IconButton
                      icon={<Edit2 className="h-4 w-4" />}
                      variant="ghost"
                      size="sm"
                      aria-label="Bearbeiten"
                      title="Bearbeiten"
                      onClick={() => startEdit(category)}
                    />
                    <IconButton
                      icon={<Trash2 className="h-4 w-4" />}
                      variant="ghost"
                      size="sm"
                      aria-label="Löschen"
                      title="Löschen"
                      onClick={() => handleDelete(category.id)}
                      className="text-destructive"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {category.isVisible ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-background text-foreground border border-border">
                      <Eye className="w-3 h-3" />
                      Sichtbar
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-background text-muted-foreground border border-border">
                      <EyeOff className="w-3 h-3" />
                      Versteckt
                    </span>
                  )}
                  {category.uploadLocked && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-background text-destructive border border-border">
                      <Lock className="w-3 h-3" />
                      Upload gesperrt
                    </span>
                  )}
                </div>

                {expandedCategory === category.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 rounded-lg border border-border bg-background p-3"
                  >
                    <p className="text-xs text-muted-foreground">
                      💡 Tipp: Challenges können in der separaten Challenge-Verwaltung erstellt und diesem Album zugewiesen werden.
                    </p>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {categories.length === 0 && (
            <div className="text-center py-12 rounded-lg border border-border bg-card">
              <p className="text-muted-foreground">Noch keine Alben hinzugefügt</p>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Footer Navigation */}
      <DashboardFooter eventId={eventId!} />
      
      {/* Padding for footer */}
      <div className="h-20" />
    </AppLayout>
  );
}











