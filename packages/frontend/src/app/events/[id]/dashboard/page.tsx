'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Event as EventType } from '@gaestefotos/shared';
import {
  Settings,
  Camera,
  Image as ImageIcon,
  Users,
  BarChart3,
  Eye,
  EyeOff,
  Check,
  X,
  Upload,
  Info,
  ChevronRight,
  Sparkles,
  Trophy,
  Calendar,
  MapPin,
  Lock,
  Globe,
  Download,
  UserCheck,
  Eye as EyeIcon,
  Clock,
  Mail,
  Pencil,
  MoreVertical,
} from 'lucide-react';
import DashboardFooter from '@/components/DashboardFooter';
import AppLayout from '@/components/AppLayout';
import DateTimePicker from '@/components/DateTimePicker';
import MapsLink from '@/components/MapsLink';
import { FullPageLoader } from '@/components/ui/FullPageLoader';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Radio } from '@/components/ui/Radio';
import { Textarea } from '@/components/ui/Textarea';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToastStore } from '@/store/toastStore';

interface PhotoStats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
}

function formatBytes(input: string | number | null | undefined): string {
  const n = typeof input === 'string' ? Number(input) : typeof input === 'number' ? input : 0;
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

export default function EventDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const { showToast } = useToastStore();
  
  const [event, setEvent] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<any[]>([]);
  const [photoStats, setPhotoStats] = useState<PhotoStats>({ total: 0, approved: 0, pending: 0, rejected: 0 });
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showEventMode, setShowEventMode] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);

  const [usage, setUsage] = useState<any | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);

  const [upgradeSku, setUpgradeSku] = useState('');
  const [upgradeProductId, setUpgradeProductId] = useState('');
  const [upgradeUrl, setUpgradeUrl] = useState<string | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const [invitations, setInvitations] = useState<any[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [invitationsError, setInvitationsError] = useState<string | null>(null);
  const [creatingInvitation, setCreatingInvitation] = useState(false);
  const [newInvitationName, setNewInvitationName] = useState('');

  const [editingInvitationId, setEditingInvitationId] = useState<string | null>(null);
  const [editingInvitationName, setEditingInvitationName] = useState('');
  const [editingInvitationIsActive, setEditingInvitationIsActive] = useState(true);
  const [editingInvitationPassword, setEditingInvitationPassword] = useState('');
  const [editingInvitationHasPassword, setEditingInvitationHasPassword] = useState(false);
  const [editingInvitationVisibility, setEditingInvitationVisibility] = useState<'UNLISTED' | 'PUBLIC'>('UNLISTED');
  const [savingInvitationId, setSavingInvitationId] = useState<string | null>(null);
  const [generatingShortLinkInvitationId, setGeneratingShortLinkInvitationId] = useState<string | null>(null);
  
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  useEffect(() => {
    if (event) {
      loadStats();
      loadUsage();
      loadInvitations();
    }
  }, [event]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/events/${eventId}`);
      setEvent(data.event);
    } catch (err: any) {
      void err;
    } finally {
      setLoading(false);
    }
  };

  const generateNewInvitationShortLink = async (invId: string) => {
    try {
      setGeneratingShortLinkInvitationId(invId);
      setInvitationsError(null);
      await api.post(`/events/${eventId}/invitations/${invId}/shortlinks`, { channel: 'default' });
      await loadInvitations();
      setCopyFeedback('Neuer Shortlink erzeugt');
      window.setTimeout(() => setCopyFeedback(null), 1500);
    } catch (err: any) {
      setInvitationsError(err.response?.data?.error || 'Fehler beim Erzeugen des Shortlinks');
    } finally {
      setGeneratingShortLinkInvitationId(null);
    }
  };

  const copyToClipboard = async (text: string, message = 'Link kopiert') => {
    await navigator.clipboard.writeText(text);
    setCopyFeedback(message);
    window.setTimeout(() => setCopyFeedback(null), 1500);
  };

  const loadInvitations = async () => {
    try {
      setInvitationsLoading(true);
      setInvitationsError(null);
      const { data } = await api.get(`/events/${eventId}/invitations`);
      setInvitations(Array.isArray(data?.invitations) ? data.invitations : []);
    } catch (err: any) {
      setInvitationsError(err.response?.data?.error || 'Fehler beim Laden der Einladungen');
      setInvitations([]);
    } finally {
      setInvitationsLoading(false);
    }
  };

  const createInvitation = async () => {
    const name = newInvitationName.trim();
    if (!name) return;
    try {
      setCreatingInvitation(true);
      setInvitationsError(null);
      await api.post(`/events/${eventId}/invitations`, { name });
      setNewInvitationName('');
      await loadInvitations();
    } catch (err: any) {
      setInvitationsError(err.response?.data?.error || 'Fehler beim Erstellen der Einladung');
    } finally {
      setCreatingInvitation(false);
    }
  };

  const startEditInvitation = (inv: any) => {
    setInvitationsError(null);
    setEditingInvitationId(inv.id);
    setEditingInvitationName(String(inv?.name || ''));
    setEditingInvitationIsActive(Boolean(inv?.isActive ?? true));
    setEditingInvitationHasPassword(Boolean(inv?.hasPassword));
    setEditingInvitationVisibility((inv?.visibility === 'PUBLIC' ? 'PUBLIC' : 'UNLISTED') as any);
    setEditingInvitationPassword('');
  };

  const cancelEditInvitation = () => {
    setEditingInvitationId(null);
    setEditingInvitationName('');
    setEditingInvitationIsActive(true);
    setEditingInvitationPassword('');
    setEditingInvitationHasPassword(false);
    setEditingInvitationVisibility('UNLISTED');
    setSavingInvitationId(null);
  };

  const saveInvitation = async (invId: string, opts?: { removePassword?: boolean }) => {
    try {
      setSavingInvitationId(invId);
      setInvitationsError(null);

      const body: any = {
        name: editingInvitationName.trim() || undefined,
        isActive: editingInvitationIsActive,
        visibility: editingInvitationVisibility,
      };

      if (opts?.removePassword) {
        body.password = null;
      } else if (editingInvitationPassword.trim().length > 0) {
        body.password = editingInvitationPassword.trim();
      }

      await api.put(`/events/${eventId}/invitations/${invId}`, body);
      await loadInvitations();
      cancelEditInvitation();
    } catch (err: any) {
      setInvitationsError(err.response?.data?.error || 'Fehler beim Speichern der Einladung');
    } finally {
      setSavingInvitationId(null);
    }
  };

  const shareLink = async (url: string, title = 'Einladung') => {
    try {
      if (typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function') {
        await (navigator as any).share({ title, url });
        return;
      }
    } catch (err) {
      void err;
    }

    await copyToClipboard(url, 'Link kopiert');
  };

  const handleGenerateShareLink = async () => {
    try {
      setShareError(null);
      setShareLoading(true);
      const { data } = await api.post(`/events/${eventId}/invite-token`);
      const url = data?.shareUrl;
      if (typeof url === 'string' && url.length > 0) {
        setShareUrl(url);
      } else {
        setShareError('Share-Link konnte nicht erzeugt werden');
      }
    } catch (err: any) {
      setShareError(err.response?.data?.error || 'Fehler beim Erzeugen des Share-Links');
    } finally {
      setShareLoading(false);
    }
  };

  const loadUsage = async () => {
    try {
      setUsageLoading(true);
      setUsageError(null);
      const { data } = await api.get(`/events/${eventId}/usage`);
      setUsage(data);
    } catch (err: any) {
      setUsageError(err.response?.data?.error || 'Fehler beim Abrufen der Speicher-Nutzung');
      setUsage(null);
    } finally {
      setUsageLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setUpgradeError(null);
    setUpgradeUrl(null);
    const sku = upgradeSku.trim();
    const productId = upgradeProductId.trim();
    if (!sku && !productId) {
      setUpgradeError('Bitte SKU oder ProductId angeben');
      return;
    }
    try {
      setUpgradeLoading(true);
      const qs = new URLSearchParams();
      if (sku) qs.set('sku', sku);
      if (productId) qs.set('productId', productId);
      const { data } = await api.get(`/events/${eventId}/upgrade-link?${qs.toString()}`);
      const url = data?.url;
      if (typeof url === 'string' && url.length > 0) {
        setUpgradeUrl(url);
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        setUpgradeError('Upgrade-Link konnte nicht erzeugt werden');
      }
    } catch (err: any) {
      setUpgradeError(err.response?.data?.error || 'Fehler beim Erstellen des Upgrade-Links');
    } finally {
      setUpgradeLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}/photos?status=all`);
      const loadedPhotos = data.photos || [];
      setPhotos(loadedPhotos);
      setPhotoStats({
        total: loadedPhotos.length,
        approved: loadedPhotos.filter((p: any) => p.status === 'APPROVED').length,
        pending: loadedPhotos.filter((p: any) => p.status === 'PENDING').length,
        rejected: loadedPhotos.filter((p: any) => p.status === 'REJECTED').length,
      });
    } catch (err: any) {
      showToast('Fehler beim Laden der Statistiken', 'error');
    }
  };

  const handleImageUpload = async (type: 'profile' | 'cover', file: File) => {
    try {
      setUploadingImage(type);
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post(`/events/${eventId}/upload-${type}-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Update event with new image URL
      await loadEvent();
      setUploadingImage(null);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Fehler beim Hochladen des Bildes';
      showToast(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage), 'error');
      setUploadingImage(null);
    }
  };

  const updateEventField = async (field: string, value: any) => {
    try {
      await api.put(`/events/${eventId}`, { [field]: value });
      await loadEvent();
      setEditingField(null);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Fehler beim Aktualisieren';
      showToast(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage), 'error');
    }
  };

  const updateDesignConfig = async (updates: any) => {
    try {
      const currentDesignConfig = (event?.designConfig as any) || {};
      await api.put(`/events/${eventId}`, {
        designConfig: {
          ...currentDesignConfig,
          ...updates,
        },
      });
      await loadEvent();
      setEditingField(null);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Fehler beim Aktualisieren';
      showToast(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage), 'error');
    }
  };

  const updateFeaturesConfig = async (updates: any) => {
    try {
      const currentFeaturesConfig = (event?.featuresConfig as any) || {};
      await api.put(`/events/${eventId}`, {
        featuresConfig: {
          ...currentFeaturesConfig,
          ...updates,
        },
      });
      await loadEvent();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Fehler beim Aktualisieren';
      showToast(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage), 'error');
    }
  };

  const updateEventActive = async (isActive: boolean) => {
    try {
      setTogglingActive(true);
      await api.put(`/events/${eventId}/active`, { isActive });
      await loadEvent();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Fehler beim Aktualisieren des Event-Status';
      showToast(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage), 'error');
    } finally {
      setTogglingActive(false);
    }
  };



  if (loading) {
    return (
      <AppLayout showBackButton backUrl="/dashboard">
        <FullPageLoader label="Laden..." />
      </AppLayout>
    );
  }

  if (!event) {
    return (
      <AppLayout showBackButton backUrl="/dashboard">
        <ErrorState message="Event nicht gefunden" />
      </AppLayout>
    );
  }

  const designConfig = (event.designConfig as any) || {};
  const featuresConfig = (event.featuresConfig as any) || {};
  
  // Get image URLs - use storage path if available, otherwise use direct URL
  const profileImageStoragePath = designConfig.profileImageStoragePath;
  const coverImageStoragePath = designConfig.coverImageStoragePath;
  const profileImage = profileImageStoragePath 
    ? `/api/events/${eventId}/design-image/profile/${profileImageStoragePath}`
    : (designConfig.profileImage || '/default-profile.png');
  const coverImage = coverImageStoragePath
    ? `/api/events/${eventId}/design-image/cover/${coverImageStoragePath}`
    : (designConfig.coverImage || '/default-cover.jpg');
  const welcomeMessage = designConfig.welcomeMessage || '';
  const limitBytes = usage?.entitlement?.storageLimitBytes ?? null;
  const usedBytes = usage?.usage?.totalBytes ?? null;
  const usedNum = typeof usedBytes === 'string' ? Number(usedBytes) : 0;
  const limitNum = typeof limitBytes === 'string' ? Number(limitBytes) : 0;
  const hasLimit = Number.isFinite(limitNum) && limitNum > 0;
  const percent = hasLimit && Number.isFinite(usedNum) ? Math.min(100, Math.max(0, (usedNum / limitNum) * 100)) : 0;

  const isStorageLocked = (() => {
    const e: any = event as any;
    if (!e) return false;
    if (typeof e.isStorageLocked === 'boolean') return e.isStorageLocked;
    const endsAt = e.storageEndsAt ? new Date(e.storageEndsAt).getTime() : null;
    if (!endsAt || Number.isNaN(endsAt)) return false;
    return Date.now() > endsAt;
  })();

  const withinUploadWindow = (() => {
    const e: any = event as any;
    if (!e?.dateTime) return true;
    const eventTime = new Date(e.dateTime).getTime();
    if (!Number.isFinite(eventTime)) return true;
    const windowMs = 24 * 60 * 60 * 1000;
    const now = Date.now();
    return now >= eventTime - windowMs && now <= eventTime + windowMs;
  })();

  return (
    <AppLayout showBackButton backUrl="/dashboard">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {editingField === 'title' ? (
              <Input
                type="text"
                defaultValue={event.title}
                onBlur={(e) => updateEventField('title', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateEventField('title', (e.target as HTMLInputElement).value);
                  }
                }}
                className="h-auto border-x-0 border-t-0 border-b-2 border-app-border bg-transparent px-0 py-0 text-2xl font-semibold shadow-none focus-visible:ring-0"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="truncate text-2xl font-semibold text-app-fg">{event.title}</h1>
                <IconButton
                  onClick={() => setEditingField('title')}
                  icon={<Pencil className="h-4 w-4" />}
                  variant="ghost"
                  size="sm"
                  aria-label="Titel bearbeiten"
                  title="Titel bearbeiten"
                />
              </div>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-app-muted">
              <span>{photoStats.total} Fotos</span>
              {photoStats.pending > 0 ? (
                <span className="text-status-warning">{photoStats.pending} ausstehend</span>
              ) : null}
              {(event as any).isActive === false ? (
                <span className="text-status-danger">deaktiviert</span>
              ) : (
                <span className="text-status-success">aktiv</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href={`/events/${eventId}/photos`}>Fotos</Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link href={`/events/${eventId}/videos`}>Videos</Link>
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowSettings(true)} className="gap-2">
              <Settings className="h-4 w-4" />
              Einstellungen
            </Button>
          </div>
        </div>

        {event && (event as any).isActive === false && (
          <div className="mb-4 rounded-xl border border-app-border bg-app-card p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-app-muted mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-app-fg">Event ist deaktiviert</p>
                <p className="text-xs text-app-muted mt-1">
                  Gäste können aktuell keine Inhalte sehen. Du kannst das Event jederzeit wieder aktivieren.
                </p>
              </div>
            </div>
          </div>
        )}

        {isStorageLocked && (
          <div className="mb-4 rounded-xl border border-app-border bg-app-card p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-app-muted mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-app-fg">Speicherperiode beendet</p>
                <p className="text-xs text-app-muted mt-1">
                  Uploads und Downloads sind deaktiviert. Bitte verlängere das Paket, um wieder Zugriff zu erhalten.
                </p>
              </div>
            </div>
          </div>
        )}

        {!isStorageLocked && featuresConfig?.allowUploads !== false && !withinUploadWindow && (
          <div className="mb-4 rounded-xl border border-app-border bg-app-card p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-app-muted mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-app-fg">Upload-Fenster ist aktuell geschlossen</p>
                <p className="text-xs text-app-muted mt-1">
                  Uploads sind nur 1 Tag vor/nach dem Event möglich.
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="mb-6 overflow-hidden rounded-xl border border-app-border bg-app-card">
          <div className="border-b border-app-border px-4 py-3">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="text-sm font-semibold text-app-fg">Titelbild</div>
                <div className="text-xs text-app-muted">Wird oben im Event angezeigt</div>
              </div>
              <Button
                type="button"
                onClick={() => coverImageInputRef.current?.click()}
                variant="secondary"
                size="sm"
                disabled={uploadingImage === 'cover'}
              >
                {uploadingImage === 'cover' ? 'Lädt…' : 'Titelbild ändern'}
              </Button>
            </div>
          </div>

          <div className="relative h-48 md:h-64 w-full bg-app-bg">
            {coverImage && coverImage !== '/default-cover.jpg' ? (
              <img
                src={coverImage}
                alt="Cover"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-app-muted">
                <ImageIcon className="h-12 w-12" />
              </div>
            )}
          </div>

          <Input
            ref={coverImageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload('cover', file);
            }}
          />
        </div>

        <div className="mt-6 grid gap-4">
          <div className="overflow-hidden rounded-xl border border-app-border bg-app-card">
            <div className="border-b border-app-border px-4 py-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-sm font-semibold text-app-fg">Speicher</div>
                  <div className="text-xs text-app-muted">
                    {usageLoading
                      ? 'Lade…'
                      : usageError
                        ? 'Nicht verfügbar'
                        : hasLimit
                          ? 'Limit aktiv'
                          : 'Kein Limit aktiv'}
                  </div>
                </div>
                <Button type="button" onClick={loadUsage} size="sm" variant="secondary" disabled={usageLoading}>
                  Aktualisieren
                </Button>
              </div>
            </div>

            <div className="px-4 py-4">
              {usageError && <div className="mt-3 text-sm text-status-danger">{usageError}</div>}

              {!usageLoading && usage && (
                <div className="mt-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="text-sm text-app-fg">
                      {formatBytes(usedBytes)} {hasLimit ? `von ${formatBytes(limitBytes)}` : ''}
                    </div>
                    {hasLimit && (
                      <div className="text-sm text-app-muted">{percent.toFixed(0)}%</div>
                    )}
                  </div>
                  {hasLimit && (
                    <div className="mt-2 h-2 w-full rounded-full bg-app-bg">
                      <div
                        className="h-2 rounded-full bg-app-fg/30"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-app-muted">
                    <div>Fotos: {formatBytes(usage?.usage?.photosBytes)}</div>
                    <div>Videos: {formatBytes(usage?.usage?.videosBytes)}</div>
                    <div>Gästebuch: {formatBytes(usage?.usage?.guestbookBytes)}</div>
                    <div>Design: {formatBytes(usage?.usage?.designBytes)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-app-border bg-app-card">
            <div className="border-b border-app-border px-4 py-3">
              <div className="text-sm font-semibold text-app-fg">Upgrade</div>
              <div className="text-xs text-app-muted">
                Optional – nur nötig, wenn du einen spezifischen Checkout-Link erzeugen willst.
              </div>
            </div>

            <div className="px-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <div className="text-xs font-medium text-app-muted">SKU (optional)</div>
                  <Input
                    value={upgradeSku}
                    onChange={(e) => setUpgradeSku(e.target.value)}
                    placeholder="z.B. premium_1000"
                  />
                </div>
                <div>
                  <div className="text-xs font-medium text-app-muted">Product ID (optional)</div>
                  <Input
                    value={upgradeProductId}
                    onChange={(e) => setUpgradeProductId(e.target.value)}
                    placeholder="z.B. prod_..."
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  onClick={handleUpgrade}
                  variant="primary"
                  disabled={upgradeLoading}
                >
                  {upgradeLoading ? 'Erzeuge…' : 'Upgrade öffnen'}
                </Button>
                {upgradeUrl && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={async () => {
                      await copyToClipboard(upgradeUrl);
                    }}
                  >
                    Link kopieren
                  </Button>
                )}
              </div>
              {upgradeError && <div className="mt-2 text-sm text-status-danger">{upgradeError}</div>}
              {upgradeUrl && (
                <div className="mt-2 text-xs text-app-muted break-all">{upgradeUrl}</div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-app-border bg-app-card">
            <div className="border-b border-app-border px-4 py-3">
              <div className="text-sm font-semibold text-app-fg">Share-Link</div>
              <div className="text-xs text-app-muted">Einladung erzeugen und teilen</div>
            </div>

            <div className="px-4 py-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  onClick={handleGenerateShareLink}
                  variant="primary"
                  disabled={shareLoading}
                >
                  {shareLoading ? 'Erzeuge…' : 'Link erzeugen'}
                </Button>
                {shareUrl && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={async () => {
                      await copyToClipboard(shareUrl);
                    }}
                  >
                    Link kopieren
                  </Button>
                )}
                {shareUrl && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={async () => {
                      await shareLink(shareUrl, 'Share-Link');
                    }}
                  >
                    Teilen
                  </Button>
                )}
              </div>
              {shareError && <div className="mt-2 text-sm text-status-danger">{shareError}</div>}
              {shareUrl && (
                <div className="mt-2 text-xs text-app-muted break-all">{shareUrl}</div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-app-border bg-app-card">
            <div className="border-b border-app-border px-4 py-3">
              <div className="text-sm font-semibold text-app-fg">Einladungsseiten</div>
              <div className="text-xs text-app-muted">
                Erstelle mehrere Einladungen (z.B. Familie, Freunde) und teile Shortlinks.
              </div>
            </div>

            <div className="px-4 py-4">
              {copyFeedback && (
                <div className="mb-2 text-sm text-app-fg">{copyFeedback}</div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  value={newInvitationName}
                  onChange={(e) => setNewInvitationName(e.target.value)}
                  placeholder="Name (z.B. Familie)"
                  className="flex-1 min-w-[220px]"
                />
                <Button
                  type="button"
                  onClick={createInvitation}
                  variant="primary"
                  disabled={creatingInvitation || newInvitationName.trim().length === 0}
                >
                  {creatingInvitation ? 'Erstelle…' : 'Neu erstellen'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={loadInvitations}
                  disabled={invitationsLoading}
                >
                  Aktualisieren
                </Button>
              </div>

              {invitationsError && <div className="mt-2 text-sm text-status-danger">{invitationsError}</div>}

              <div className="mt-4 space-y-3">
                {invitationsLoading && (
                  <div className="text-sm text-app-muted">Lade Einladungen…</div>
                )}

                {!invitationsLoading && invitations.length === 0 && (
                  <div className="text-sm text-app-muted">Noch keine Einladungen erstellt.</div>
                )}

                {invitations.map((inv: any) => {
                  const shortUrl = inv?.shortLinks?.[0]?.url as string | undefined;
                  const publicUrl = typeof window !== 'undefined'
                    ? `${window.location.origin}/i/${inv.slug}`
                    : `/i/${inv.slug}`;
                  const isEditing = editingInvitationId === inv.id;
                  const isSaving = savingInvitationId === inv.id;
                  const isGeneratingShortLink = generatingShortLinkInvitationId === inv.id;
                  return (
                    <div key={inv.id} className="rounded-xl border border-app-border bg-app-bg p-3">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          {isEditing ? (
                            <div className="space-y-2">
                              <Input
                                value={editingInvitationName}
                                onChange={(e) => setEditingInvitationName(e.target.value)}
                                data-testid={`invitation-edit-name-${inv.id}`}
                                placeholder="Name"
                              />
                              <label className="flex items-center gap-2 text-sm text-app-fg">
                                <Checkbox
                                  checked={editingInvitationIsActive}
                                  onCheckedChange={(checked) => setEditingInvitationIsActive(checked)}
                                  data-testid={`invitation-edit-active-${inv.id}`}
                                />
                                Aktiv
                              </label>

                              <label className="flex items-center justify-between gap-2 text-sm text-app-fg">
                                <span>Öffentlich</span>
                                <Checkbox
                                  checked={editingInvitationVisibility === 'PUBLIC'}
                                  onCheckedChange={(checked) =>
                                    setEditingInvitationVisibility(checked ? 'PUBLIC' : 'UNLISTED')
                                  }
                                  data-testid={`invitation-edit-visibility-${inv.id}`}
                                />
                              </label>

                              <div>
                                <div className="text-xs text-app-muted">Passwort (optional)</div>
                                <Input
                                  type="password"
                                  value={editingInvitationPassword}
                                  onChange={(e) => setEditingInvitationPassword(e.target.value)}
                                  data-testid={`invitation-edit-password-${inv.id}`}
                                  className="mt-1"
                                  placeholder={
                                    editingInvitationHasPassword
                                      ? 'Neues Passwort setzen (leer = unverändert)'
                                      : 'Passwort setzen'
                                  }
                                />
                                {editingInvitationHasPassword && (
                                  <Button
                                    type="button"
                                    onClick={() => saveInvitation(inv.id, { removePassword: true })}
                                    disabled={isSaving}
                                    data-testid={`invitation-remove-password-${inv.id}`}
                                    variant="danger"
                                    className="mt-2 disabled:opacity-50"
                                  >
                                    {isSaving ? 'Speichere…' : 'Passwort entfernen'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm font-semibold text-app-fg">{inv.name}</div>
                          )}
                          <div className="text-xs text-app-muted">Opens: {typeof inv.opens === 'number' ? inv.opens : 0}</div>
                          <div className="text-xs text-app-muted">
                            RSVP: {inv?.rsvp?.yes ?? 0}/{inv?.rsvp?.no ?? 0}/{inv?.rsvp?.maybe ?? 0}
                            {inv?.hasPassword ? ' · Passwort: ja' : ''}
                            {inv?.isActive === false ? ' · inaktiv' : ''}
                            {inv?.visibility === 'PUBLIC' ? ' · öffentlich' : ' · unlisted'}
                          </div>

                          {inv?.visibility === 'PUBLIC' && (
                            <div className="mt-1">
                              <div className="text-xs text-app-muted">Direkt-Link</div>
                              <div className="text-xs text-app-muted break-all">{publicUrl}</div>
                            </div>
                          )}

                          {shortUrl && (
                            <div className="mt-1">
                              <div className="text-xs text-app-muted break-all">{shortUrl}</div>
                              {inv?.visibility !== 'PUBLIC' && (
                                <div className="mt-1 text-xs text-app-muted">
                                  Hinweis: UNLISTED-Einladungen sind nur über den Shortlink erreichbar.
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {isEditing ? (
                            <>
                              <Button
                                type="button"
                                onClick={() => saveInvitation(inv.id)}
                                data-testid={`invitation-save-${inv.id}`}
                                variant="primary"
                                disabled={isSaving || editingInvitationName.trim().length === 0}
                                size="sm"
                              >
                                {isSaving ? 'Speichere…' : 'Speichern'}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={cancelEditInvitation}
                                data-testid={`invitation-cancel-${inv.id}`}
                                disabled={isSaving}
                                size="sm"
                              >
                                Abbrechen
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => startEditInvitation(inv)}
                                data-testid={`invitation-edit-${inv.id}`}
                                size="sm"
                              >
                                Bearbeiten
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <IconButton
                                    type="button"
                                    icon={<MoreVertical className="h-4 w-4" />}
                                    variant="ghost"
                                    size="sm"
                                    aria-label="Mehr"
                                    title="Mehr"
                                  />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="min-w-[220px]">
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      void generateNewInvitationShortLink(inv.id);
                                    }}
                                    disabled={isGeneratingShortLink}
                                  >
                                    {isGeneratingShortLink ? 'Erzeuge…' : 'Neuen Shortlink'}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      if (shortUrl) void copyToClipboard(shortUrl);
                                    }}
                                    disabled={!shortUrl}
                                  >
                                    Link kopieren
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      if (shortUrl) void shareLink(shortUrl, `Einladung: ${inv.name}`);
                                    }}
                                    disabled={!shortUrl}
                                  >
                                    Teilen
                                  </DropdownMenuItem>
                                  {inv?.visibility === 'PUBLIC' && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onSelect={(e) => {
                                          e.preventDefault();
                                          void copyToClipboard(publicUrl, 'Direkt-Link kopiert');
                                        }}
                                      >
                                        Direkt-Link kopieren
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 overflow-hidden rounded-xl border border-app-border bg-app-card">
          <div className="border-b border-app-border px-4 py-3">
            <div className="text-sm font-semibold text-app-fg">Event Profil</div>
            <div className="text-xs text-app-muted">Profilbild und Willkommensnachricht</div>
          </div>

          <div className="px-4 py-4">
            <div className="flex items-start gap-4">
              <div className="relative">
                <div className="h-20 w-20 overflow-hidden rounded-full border border-app-border bg-app-bg shadow-sm">
                  {profileImage && profileImage !== '/default-profile.png' ? (
                    <img src={profileImage} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-app-muted">
                      <Users className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 right-0">
                  <IconButton
                    onClick={() => profileImageInputRef.current?.click()}
                    icon={
                      uploadingImage === 'profile' ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-app-bg"></div>
                      ) : (
                        <Camera className="w-4 h-4" />
                      )
                    }
                    variant="glass"
                    size="sm"
                    aria-label="Profilbild ändern"
                    title="Profilbild ändern"
                    className="h-7 w-7 rounded-full p-0 shadow-lg"
                  />
                </div>
                <Input
                  ref={profileImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload('profile', file);
                  }}
                />
              </div>

              <div className="flex-1">
                <div className="text-sm font-medium text-app-fg">Willkommensnachricht</div>
                <div className="mt-2">
                  {editingField === 'welcomeMessage' ? (
                    <Textarea
                      defaultValue={welcomeMessage}
                      onBlur={(e) => {
                        updateDesignConfig({
                          welcomeMessage: e.target.value,
                        });
                      }}
                      placeholder="Schreibe eine Willkommensnachricht..."
                      className="resize-none"
                      rows={3}
                      autoFocus
                    />
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full h-auto justify-start text-left"
                      onClick={() => setEditingField('welcomeMessage')}
                    >
                      {welcomeMessage ? (
                        <span className="whitespace-pre-wrap text-app-fg">{welcomeMessage}</span>
                      ) : (
                        <span className="italic text-app-muted">Klicke hier, um eine Willkommensnachricht hinzuzufügen...</span>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 overflow-hidden rounded-xl border border-app-border bg-app-card">
          <div className="border-b border-app-border px-4 py-3">
            <div className="text-sm font-semibold text-app-fg">Event Details</div>
            <div className="text-xs text-app-muted">Datum, Uhrzeit, Ort, URL und Passwort</div>
          </div>

          <div className="divide-y divide-app-border">
          {/* Date - Required */}
          <div className="px-4 py-4">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-app-fg" />
              <label className="text-sm font-medium text-app-fg">
                Datum <span className="text-status-danger">*</span>
              </label>
            </div>
            {editingField === 'date' ? (
              <DateTimePicker
                value={event.dateTime ? new Date(event.dateTime as any).toISOString() : ''}
                onChange={(value) => {
                  if (!value) return;
                  updateEventField('dateTime', value);
                  setEditingField(null);
                }}
                minDate={new Date(0)}
              />
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingField('date')}
                className="h-auto p-0 justify-start text-left"
              >
                {event.dateTime ? (
                  <span className="text-app-fg">
                    {new Date(event.dateTime).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </span>
                ) : (
                  <span className="text-status-danger italic">Bitte Datum auswählen *</span>
                )}
              </Button>
            )}
          </div>

          {/* Time - Required */}
          <div className="px-4 py-4">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-app-fg" />
              <label className="text-sm font-medium text-app-fg">
                Uhrzeit <span className="text-status-danger">*</span>
              </label>
            </div>
            {editingField === 'time' ? (
              <DateTimePicker
                value={event.dateTime ? new Date(event.dateTime as any).toISOString() : ''}
                onChange={(value) => {
                  if (!value) return;
                  updateEventField('dateTime', value);
                  setEditingField(null);
                }}
                minDate={new Date(0)}
              />
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingField('time')}
                className="h-auto p-0 justify-start text-left"
              >
                {event.dateTime ? (
                  <span className="text-app-fg">
                    {new Date(event.dateTime).toLocaleTimeString('de-DE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                ) : (
                  <span className="text-status-danger italic">Bitte Uhrzeit auswählen *</span>
                )}
              </Button>
            )}
          </div>

          {/* Location */}
          <div className="px-4 py-4">
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="w-5 h-5 text-app-fg" />
              <label className="text-sm font-medium text-app-fg">Veranstaltungsort</label>
            </div>
            {editingField === 'locationName' ? (
              <Input
                type="text"
                defaultValue={event.locationName || ''}
                onBlur={(e) => {
                  updateEventField('locationName', e.target.value || null);
                }}
                placeholder="z.B. Musterstraße 123, 12345 Musterstadt"
                className="w-full px-3 py-2"
                autoFocus
              />
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingField('locationName')}
                className="h-auto p-0 justify-start text-left"
              >
                {event.locationName ? (
                  <span className="text-app-fg">{event.locationName}</span>
                ) : (
                  <span className="text-app-muted italic">Klicke hier, um einen Ort hinzuzufügen...</span>
                )}
              </Button>
            )}
          </div>

          {/* Event URL/Slug - Read-only */}
          <div className="px-4 py-4">
            <div className="flex items-center gap-3 mb-2">
              <Globe className="w-5 h-5 text-app-fg" />
              <label className="text-sm font-medium text-app-fg">Event-URL</label>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-app-fg font-mono text-sm">/e2/{event.slug}</p>
                <p className="text-xs text-app-muted mt-1">Automatisch generiert, nicht bearbeitbar</p>
              </div>
              <Button
                type="button"
                onClick={() => {
                  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/e2/${event.slug}`;
                  void copyToClipboard(url, 'URL kopiert');
                }}
                size="sm"
                variant="primary"
                className="h-7 px-3 text-xs"
              >
                Kopieren
              </Button>
            </div>
          </div>

          {/* Password */}
          <div className="px-4 py-4">
            <div className="flex items-center gap-3 mb-2">
              <Lock className="w-5 h-5 text-app-fg" />
              <label className="text-sm font-medium text-app-fg">Event-Passwort</label>
            </div>
            {editingField === 'password' ? (
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Neues Passwort eingeben (leer lassen zum Entfernen)"
                  onBlur={(e) => {
                    updateEventField('password', e.target.value || null);
                  }}
                  className="w-full px-3 py-2"
                  autoFocus
                />
                <p className="text-xs text-app-muted">
                  {(event as any).password ? 'Leer lassen, um Passwort zu entfernen' : 'Passwort schützt den Event-Zugang'}
                </p>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingField('password')}
                className="h-auto p-0 justify-start text-left"
              >
                {(event as any).password ? (
                  <span className="text-app-fg">•••••••• (Passwort gesetzt)</span>
                ) : (
                  <span className="text-app-muted italic">Klicke hier, um ein Passwort hinzuzufügen...</span>
                )}
              </Button>
            )}
          </div>
          </div>
        </div>



        <div className="mb-6 grid gap-4">
          <div className="overflow-hidden rounded-xl border border-app-border bg-app-card">
            <div className="border-b border-app-border px-4 py-3">
              <div className="text-sm font-semibold text-app-fg">Tools</div>
              <div className="text-xs text-app-muted">Schnellzugriff auf die wichtigsten Bereiche</div>
            </div>

            <div className="divide-y divide-app-border">
              <Button asChild variant="ghost" className="w-full justify-between rounded-none px-4 py-4">
                <Link href={`/events/${eventId}/qr-styler`}>
                  <span className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-app-muted" />
                    <span className="text-left">
                      <span className="block text-sm font-medium text-app-fg">QR‑Aufsteller</span>
                      <span className="block text-xs text-app-muted">Vorlagen gestalten und herunterladen</span>
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 text-app-muted" />
                </Link>
              </Button>

              {featuresConfig.showGuestlist === false ? (
                <div className="px-4 py-4 opacity-50">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-app-muted" />
                      <span className="text-left">
                        <span className="block text-sm font-medium text-app-muted">Gäste</span>
                        <span className="block text-xs text-app-muted">Gästelistenfunktion ist deaktiviert</span>
                      </span>
                    </span>
                  </div>
                </div>
              ) : (
                <Button asChild variant="ghost" className="w-full justify-between rounded-none px-4 py-4">
                  <Link href={`/events/${eventId}/guests`}>
                    <span className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-app-muted" />
                      <span className="text-left">
                        <span className="block text-sm font-medium text-app-fg">Gäste</span>
                        <span className="block text-xs text-app-muted">Gäste verwalten und einladen</span>
                      </span>
                    </span>
                    <ChevronRight className="h-5 w-5 text-app-muted" />
                  </Link>
                </Button>
              )}

              <Button asChild variant="ghost" className="w-full justify-between rounded-none px-4 py-4">
                <Link href={`/events/${eventId}/categories`}>
                  <span className="flex items-center gap-3">
                    <ImageIcon className="h-5 w-5 text-app-muted" />
                    <span className="text-left">
                      <span className="block text-sm font-medium text-app-fg">Alben</span>
                      <span className="block text-xs text-app-muted">Alben erstellen und verwalten</span>
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 text-app-muted" />
                </Link>
              </Button>

              {featuresConfig.challengesEnabled === false ? (
                <div className="px-4 py-4 opacity-50">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-3">
                      <Trophy className="h-5 w-5 text-app-muted" />
                      <span className="text-left">
                        <span className="block text-sm font-medium text-app-muted">Challenges</span>
                        <span className="block text-xs text-app-muted">Challenges sind deaktiviert</span>
                      </span>
                    </span>
                  </div>
                </div>
              ) : (
                <Button asChild variant="ghost" className="w-full justify-between rounded-none px-4 py-4">
                  <Link href={`/events/${eventId}/challenges`}>
                    <span className="flex items-center gap-3">
                      <Trophy className="h-5 w-5 text-app-muted" />
                      <span className="text-left">
                        <span className="block text-sm font-medium text-app-fg">Challenges</span>
                        <span className="block text-xs text-app-muted">Challenges erstellen und verwalten</span>
                      </span>
                    </span>
                    <ChevronRight className="h-5 w-5 text-app-muted" />
                  </Link>
                </Button>
              )}

              <Button asChild variant="ghost" className="w-full justify-between rounded-none px-4 py-4">
                <Link href={`/events/${eventId}/statistics`}>
                  <span className="flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 text-app-muted" />
                    <span className="text-left">
                      <span className="block text-sm font-medium text-app-fg">Statistiken</span>
                      <span className="block text-xs text-app-muted">Event-Übersicht und Analysen</span>
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 text-app-muted" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-app-border bg-app-card">
            <div className="border-b border-app-border px-4 py-3">
              <div className="text-sm font-semibold text-app-fg">Event Einstellungen</div>
              <div className="text-xs text-app-muted">Verhalten und Features konfigurieren</div>
            </div>

            <div className="divide-y divide-app-border">
              <button
                type="button"
                onClick={() => setShowEventMode(!showEventMode)}
                className="flex w-full items-center justify-between px-4 py-4 text-left"
              >
                <span>
                  <span className="block text-sm font-medium text-app-fg">Event-Modus</span>
                  <span className="block text-xs text-app-muted">Event-Verhalten konfigurieren</span>
                </span>
                <ChevronRight
                  className={`h-5 w-5 text-app-muted transition-transform ${showEventMode ? 'rotate-90' : ''}`}
                />
              </button>

              {showEventMode && (
                <div className="px-4 py-4">
                  <div className="space-y-2">
                    <label className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-app-muted" />
                        <span className="text-sm text-app-fg">Event aktiv</span>
                      </div>
                      <Checkbox
                        checked={event ? (event as any).isActive !== false : true}
                        disabled={!event || togglingActive}
                        onCheckedChange={(checked) => updateEventActive(checked)}
                        className="h-5 w-5"
                      />
                    </label>

                    {['STANDARD', 'MODERATION', 'COLLECT', 'VIEW_ONLY'].map((mode) => (
                      <label
                        key={mode}
                        className={`flex items-start rounded-lg border border-app-border p-3 transition-colors ${
                          featuresConfig.mode === mode ? 'bg-app-bg' : 'hover:bg-app-bg'
                        }`}
                      >
                        <Radio
                          name="mode"
                          value={mode}
                          checked={featuresConfig.mode === mode}
                          onChange={(e) => updateFeaturesConfig({ mode: e.target.value })}
                          className="mt-1 mr-3"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {mode === 'STANDARD' && 'Standard'}
                            {mode === 'MODERATION' && 'Moderation'}
                            {mode === 'COLLECT' && 'Foto Sammeln'}
                            {mode === 'VIEW_ONLY' && 'Nur Ansicht'}
                          </div>
                          <div className="text-xs text-app-muted mt-1">
                            {mode === 'STANDARD' && 'Gäste können Fotos hochladen und alle Fotos sehen'}
                            {mode === 'MODERATION' && 'Uploads müssen erst freigegeben werden'}
                            {mode === 'COLLECT' && 'Gäste sehen nur eigene Fotos, du siehst alle'}
                            {mode === 'VIEW_ONLY' && 'Gäste können keine Fotos hochladen, nur ansehen'}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="mt-4 border-t border-app-border pt-4 space-y-3">
                    <label className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <EyeIcon className="w-4 h-4 text-app-muted" />
                        <span className="text-sm text-app-fg">Mystery Mode</span>
                      </div>
                      <Checkbox
                        checked={featuresConfig.mysteryMode === true}
                        onCheckedChange={(checked) => updateFeaturesConfig({ mysteryMode: checked })}
                        className="h-5 w-5"
                      />
                    </label>

                    <label className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <Upload className="w-4 h-4 text-app-muted" />
                        <span className="text-sm text-app-fg">Foto-Uploads erlauben</span>
                      </div>
                      <Checkbox
                        checked={featuresConfig.allowUploads !== false}
                        onCheckedChange={(checked) => updateFeaturesConfig({ allowUploads: checked })}
                        disabled={isStorageLocked}
                        className="h-5 w-5"
                      />
                    </label>

                    <label className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <Download className="w-4 h-4 text-app-muted" />
                        <span className="text-sm text-app-fg">Downloads erlauben</span>
                      </div>
                      <Checkbox
                        checked={featuresConfig.allowDownloads !== false}
                        onCheckedChange={(checked) => updateFeaturesConfig({ allowDownloads: checked })}
                        disabled={isStorageLocked}
                        className="h-5 w-5"
                      />
                    </label>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="flex w-full items-center justify-between px-4 py-4 text-left"
              >
                <span>
                  <span className="block text-sm font-medium text-app-fg">Erweiterte Einstellungen</span>
                  <span className="block text-xs text-app-muted">Weitere Features & Optionen</span>
                </span>
                <ChevronRight
                  className={`h-5 w-5 text-app-muted transition-transform ${showAdvancedSettings ? 'rotate-90' : ''}`}
                />
              </button>

              {showAdvancedSettings && (
                <div className="px-4 py-4">
                  <div className="space-y-3">
                    <label className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-app-muted" />
                        <span className="text-sm">Gästeliste anzeigen</span>
                      </div>
                      <Checkbox
                        checked={featuresConfig.showGuestlist !== false}
                        onCheckedChange={(checked) => updateFeaturesConfig({ showGuestlist: checked })}
                        className="h-5 w-5"
                      />
                    </label>

                    <label className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-app-muted" />
                        <span className="text-sm">Challenges aktivieren</span>
                      </div>
                      <Checkbox
                        checked={featuresConfig.challengesEnabled === true}
                        onCheckedChange={(checked) => updateFeaturesConfig({ challengesEnabled: checked })}
                        className="h-5 w-5"
                      />
                    </label>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    onClick={async () => {
                      try {
                        await loadEvent();
                        showToast('Änderungen gespeichert!', 'success');
                      } catch (err) {
                        showToast('Fehler beim Speichern', 'error');
                      }
                    }}
                    className="w-full mt-4 gap-2"
                  >
                    <Check className="w-5 h-5" />
                    Speichern
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Settings Modal */}
      <Dialog open={showSettings} onOpenChange={(open) => (open ? null : setShowSettings(false))}>
        <DialogContent
          className="bottom-0 top-auto left-0 right-0 translate-x-0 translate-y-0 rounded-t-3xl w-full max-w-none max-h-[80vh] overflow-hidden p-0"
        >
          <div className="sticky top-0 bg-app-card border-b border-app-border px-4 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-app-fg">Einstellungen</h2>
            <DialogClose asChild>
              <IconButton
                onClick={() => setShowSettings(false)}
                icon={<X className="w-5 h-5" />}
                variant="ghost"
                size="sm"
                aria-label="Schließen"
                title="Schließen"
                className="p-1 rounded-full"
              />
            </DialogClose>
          </div>
          <div className="overflow-y-auto max-h-[calc(80vh-60px)] p-4 space-y-2">
            <Button
              asChild
              variant="secondary"
              className="w-full h-auto px-3 py-3 rounded-lg flex items-center justify-between"
            >
              <Link href={`/events/${eventId}`}>
                <span className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-app-bg flex items-center justify-center">
                    <Eye className="w-5 h-5 text-app-muted" />
                  </span>
                  <span className="font-medium">Event ansehen</span>
                </span>
                <ChevronRight className="w-5 h-5 text-app-muted" />
              </Link>
            </Button>

            <Button
              asChild
              variant="secondary"
              className="w-full h-auto px-3 py-3 rounded-lg flex items-center justify-between"
            >
              <Link href={`/events/${eventId}/duplicates`}>
                <span className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-app-bg flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-app-muted" />
                  </span>
                  <span className="font-medium">Duplikate verwalten</span>
                </span>
                <ChevronRight className="w-5 h-5 text-app-muted" />
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sticky Footer Navigation */}
      <DashboardFooter eventId={eventId} eventSlug={event.slug} />
      
      {/* Padding for footer */}
      <div className="h-20" />
    </AppLayout>
  );
}

