'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
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
} from 'lucide-react';
import DashboardFooter from '@/components/DashboardFooter';
import AppLayout from '@/components/AppLayout';
import ActionButton from '@/components/ActionButton';
import DateTimePicker from '@/components/DateTimePicker';
import MapsLink from '@/components/MapsLink';
import { FullPageLoader } from '@/components/ui/FullPageLoader';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
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
      const { data } = await api.get(`/events/${eventId}`);
      setEvent(data.event);
    } catch (err: any) {
      console.error('Fehler beim Laden des Events:', err);
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

  const shareInvitation = (url: string, channel: 'whatsapp' | 'facebook' | 'x' | 'linkedin') => {
    const u = encodeURIComponent(url);
    if (channel === 'whatsapp') {
      window.open(`https://wa.me/?text=${u}`, '_blank', 'noopener,noreferrer');
      return;
    }
    if (channel === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${u}`, '_blank', 'noopener,noreferrer');
      return;
    }
    if (channel === 'x') {
      window.open(`https://twitter.com/intent/tweet?url=${u}`, '_blank', 'noopener,noreferrer');
      return;
    }
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${u}`, '_blank', 'noopener,noreferrer');
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
    } catch (err) {
      console.error('Fehler beim Laden der Statistiken:', err);
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
      console.error('Fehler beim Hochladen:', err);
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
      console.error('Fehler beim Aktualisieren:', err);
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
      console.error('Fehler beim Aktualisieren:', err);
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
      console.error('Fehler beim Aktualisieren:', err);
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
      console.error('Fehler beim Aktualisieren des Event-Status:', err);
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
        {/* Cover Image */}
        <div className="relative w-full h-48 md:h-64 bg-gradient-to-r from-tokens-brandGreen to-tokens-brandPeach rounded-lg mb-4 overflow-hidden group">
          {coverImage && coverImage !== '/default-cover.jpg' ? (
            <img
              src={coverImage}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-app-bg opacity-50">
              <ImageIcon className="w-12 h-12" />
            </div>
          )}

          <motion.div
            whileHover={{ opacity: 1 }}
            whileTap={{ scale: 0.95 }}
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Button
              asChild
              variant="ghost"
              className="h-full w-full bg-app-fg/0 hover:bg-app-fg/30 text-app-bg"
            >
              <button type="button" onClick={() => coverImageInputRef.current?.click()}>
                <span className="flex h-full w-full items-center justify-center">
                  {uploadingImage === 'cover' ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-bg"></div>
                  ) : (
                    <>
                      <Camera className="w-6 h-6 mr-2" />
                      <span className="text-sm font-medium">Titelbild ändern</span>
                    </>
                  )}
                </span>
              </button>
            </Button>
          </motion.div>
          <input
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

        <div className="mt-6 rounded-xl border border-app-border bg-app-card p-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-app-fg font-semibold">Speicher</div>
              <div className="text-sm text-app-muted">
                {usageLoading ? 'Lade…' : usageError ? 'Nicht verfügbar' : hasLimit ? 'Limit aktiv' : 'Kein Limit aktiv'}
              </div>
            </div>
            <button
              onClick={loadUsage}
              className="px-3 py-2 rounded-lg bg-tokens-brandGreen text-white text-sm font-medium hover:opacity-90"
            >
              Aktualisieren
            </button>
          </div>

          {usageError && <div className="mt-3 text-sm text-[var(--status-danger)]">{usageError}</div>}

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
                    className="h-2 rounded-full bg-tokens-brandPeach"
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

          <div className="mt-6 border-t border-app-border pt-4">
            <div className="text-app-fg font-semibold">Upgrade</div>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                value={upgradeSku}
                onChange={(e) => setUpgradeSku(e.target.value)}
                placeholder="SKU (optional)"
                className="w-full rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm text-app-fg"
              />
              <input
                value={upgradeProductId}
                onChange={(e) => setUpgradeProductId(e.target.value)}
                placeholder="ProductId (optional)"
                className="w-full rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm text-app-fg"
              />
            </div>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <button
                onClick={handleUpgrade}
                className="px-4 py-2 rounded-lg bg-tokens-brandGreen text-white text-sm font-semibold hover:opacity-90"
                disabled={upgradeLoading}
              >
                {upgradeLoading ? 'Erzeuge…' : 'Upgrade öffnen'}
              </button>
              {upgradeUrl && (
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(upgradeUrl);
                  }}
                  className="px-3 py-2 rounded-lg border border-app-border bg-app-bg text-app-fg text-sm font-medium hover:opacity-90"
                >
                  Link kopieren
                </button>
              )}
            </div>
            {upgradeError && <div className="mt-2 text-sm text-[var(--status-danger)]">{upgradeError}</div>}
            {upgradeUrl && (
              <div className="mt-2 text-xs text-app-muted break-all">{upgradeUrl}</div>
            )}
          </div>

          <div className="mt-6 border-t border-app-border pt-4">
            <div className="text-app-fg font-semibold">Share-Link</div>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <button
                onClick={handleGenerateShareLink}
                className="px-4 py-2 rounded-lg bg-tokens-brandGreen text-white text-sm font-semibold hover:opacity-90"
                disabled={shareLoading}
              >
                {shareLoading ? 'Erzeuge…' : 'Link erzeugen'}
              </button>
              {shareUrl && (
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(shareUrl);
                  }}
                  className="px-3 py-2 rounded-lg border border-app-border bg-app-bg text-app-fg text-sm font-medium hover:opacity-90"
                >
                  Link kopieren
                </button>
              )}
            </div>
            {shareError && <div className="mt-2 text-sm text-[var(--status-danger)]">{shareError}</div>}
            {shareUrl && (
              <div className="mt-2 text-xs text-app-muted break-all">{shareUrl}</div>
            )}
          </div>

          <div className="mt-6 border-t border-app-border pt-4">
            <div className="text-app-fg font-semibold">Einladungsseiten</div>
            <div className="mt-2 text-sm text-app-muted">
              Erstelle mehrere Einladungen (z.B. Familie, Freunde) und teile Shortlinks für WhatsApp & Social Media.
            </div>

            {copyFeedback && (
              <div className="mt-2 text-sm text-app-fg">{copyFeedback}</div>
            )}

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <input
                value={newInvitationName}
                onChange={(e) => setNewInvitationName(e.target.value)}
                placeholder="Name (z.B. Familie)"
                className="flex-1 min-w-[220px] rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm text-app-fg"
              />
              <button
                onClick={createInvitation}
                className="px-4 py-2 rounded-lg bg-tokens-brandGreen text-white text-sm font-semibold hover:opacity-90"
                disabled={creatingInvitation || newInvitationName.trim().length === 0}
              >
                {creatingInvitation ? 'Erstelle…' : 'Neu erstellen'}
              </button>
              <button
                onClick={loadInvitations}
                className="px-3 py-2 rounded-lg border border-app-border bg-app-bg text-app-fg text-sm font-medium hover:opacity-90"
                disabled={invitationsLoading}
              >
                Aktualisieren
              </button>
            </div>

            {invitationsError && <div className="mt-2 text-sm text-[var(--status-danger)]">{invitationsError}</div>}

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
                  <div key={inv.id} className="rounded-xl border border-app-border bg-app-card p-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              value={editingInvitationName}
                              onChange={(e) => setEditingInvitationName(e.target.value)}
                              data-testid={`invitation-edit-name-${inv.id}`}
                              className="w-full rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm text-app-fg"
                              placeholder="Name"
                            />
                            <label className="flex items-center gap-2 text-sm text-app-fg">
                              <input
                                type="checkbox"
                                checked={editingInvitationIsActive}
                                onChange={(e) => setEditingInvitationIsActive(e.target.checked)}
                                data-testid={`invitation-edit-active-${inv.id}`}
                              />
                              Aktiv
                            </label>

                            <label className="flex items-center justify-between gap-2 text-sm text-app-fg">
                              <span>Öffentlich</span>
                              <input
                                type="checkbox"
                                checked={editingInvitationVisibility === 'PUBLIC'}
                                onChange={(e) => setEditingInvitationVisibility(e.target.checked ? 'PUBLIC' : 'UNLISTED')}
                                data-testid={`invitation-edit-visibility-${inv.id}`}
                              />
                            </label>

                            <div>
                              <div className="text-xs text-app-muted">Passwort (optional)</div>
                              <input
                                type="password"
                                value={editingInvitationPassword}
                                onChange={(e) => setEditingInvitationPassword(e.target.value)}
                                data-testid={`invitation-edit-password-${inv.id}`}
                                className="mt-1 w-full rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm text-app-fg"
                                placeholder={editingInvitationHasPassword ? 'Neues Passwort setzen (leer = unverändert)' : 'Passwort setzen'}
                              />
                              {editingInvitationHasPassword && (
                                <button
                                  type="button"
                                  onClick={() => saveInvitation(inv.id, { removePassword: true })}
                                  disabled={isSaving}
                                  data-testid={`invitation-remove-password-${inv.id}`}
                                  className="mt-2 px-3 py-2 rounded-lg border border-[var(--status-danger)] text-[var(--status-danger)] text-sm font-medium disabled:opacity-50"
                                >
                                  {isSaving ? 'Speichere…' : 'Passwort entfernen'}
                                </button>
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
                            <button
                              onClick={() => saveInvitation(inv.id)}
                              data-testid={`invitation-save-${inv.id}`}
                              className="px-3 py-2 rounded-lg bg-tokens-brandGreen text-white text-sm font-semibold disabled:opacity-50 hover:opacity-90"
                              disabled={isSaving || editingInvitationName.trim().length === 0}
                            >
                              {isSaving ? 'Speichere…' : 'Speichern'}
                            </button>
                            <button
                              onClick={cancelEditInvitation}
                              data-testid={`invitation-cancel-${inv.id}`}
                              className="px-3 py-2 rounded-lg border border-app-border bg-app-bg text-app-fg text-sm font-medium hover:opacity-90"
                              disabled={isSaving}
                            >
                              Abbrechen
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startEditInvitation(inv)}
                            data-testid={`invitation-edit-${inv.id}`}
                            className="px-3 py-2 rounded-lg border border-app-border bg-app-bg text-app-fg text-sm font-medium hover:opacity-90"
                          >
                            Bearbeiten
                          </button>
                        )}
                        {shortUrl && (
                          <button
                            onClick={async () => {
                              await copyToClipboard(shortUrl);
                            }}
                            className="px-3 py-2 rounded-lg border border-app-border bg-app-bg text-app-fg text-sm font-medium hover:opacity-90"
                          >
                            Link kopieren
                          </button>
                        )}

                        <button
                          onClick={() => generateNewInvitationShortLink(inv.id)}
                          className="px-3 py-2 rounded-lg border border-app-border bg-app-bg text-app-fg text-sm font-medium disabled:opacity-50 hover:opacity-90"
                          disabled={isGeneratingShortLink}
                        >
                          {isGeneratingShortLink ? 'Erzeuge…' : 'Neuen Shortlink'}
                        </button>
                        {inv?.visibility === 'PUBLIC' && (
                          <button
                            onClick={async () => {
                              await copyToClipboard(publicUrl, 'Direkt-Link kopiert');
                            }}
                            className="px-3 py-2 rounded-lg border border-app-border bg-app-bg text-app-fg text-sm font-medium hover:opacity-90"
                          >
                            Direkt-Link kopieren
                          </button>
                        )}
                        {shortUrl && (
                          <button
                            onClick={() => shareInvitation(shortUrl, 'whatsapp')}
                            className="px-3 py-2 rounded-lg bg-tokens-brandPeach text-white text-sm font-semibold hover:opacity-90"
                          >
                            WhatsApp
                          </button>
                        )}
                        {shortUrl && (
                          <button
                            onClick={() => shareInvitation(shortUrl, 'facebook')}
                            className="px-3 py-2 rounded-lg border border-app-border bg-app-bg text-app-fg text-sm font-medium hover:opacity-90"
                          >
                            Facebook
                          </button>
                        )}
                        {shortUrl && (
                          <button
                            onClick={() => shareInvitation(shortUrl, 'x')}
                            className="px-3 py-2 rounded-lg border border-app-border bg-app-bg text-app-fg text-sm font-medium hover:opacity-90"
                          >
                            X
                          </button>
                        )}
                        {shortUrl && (
                          <button
                            onClick={() => shareInvitation(shortUrl, 'linkedin')}
                            className="px-3 py-2 rounded-lg border border-app-border bg-app-bg text-app-fg text-sm font-medium hover:opacity-90"
                          >
                            LinkedIn
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <div className="flex items-start gap-4 mb-6">
          {/* Profile Image */}
          <div className="relative">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-tokens-brandGreen to-tokens-brandPeach overflow-hidden border-4 border-app-card shadow-lg group">
              {profileImage && profileImage !== '/default-profile.png' ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-app-bg">
                  <Users className="w-10 h-10" />
                </div>
              )}
            </div>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="absolute bottom-0 right-0">
              <Button
                asChild
                variant="secondary"
                className="h-7 w-7 rounded-full p-0 bg-app-fg text-app-bg border-2 border-app-bg shadow-lg hover:opacity-90"
              >
                <button type="button" onClick={() => profileImageInputRef.current?.click()}>
                  {uploadingImage === 'profile' ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-app-bg"></div>
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
              </Button>
            </motion.div>
            <input
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

          {/* Event Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {editingField === 'title' ? (
                <input
                  type="text"
                  defaultValue={event.title}
                  onBlur={(e) => updateEventField('title', e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      updateEventField('title', (e.target as HTMLInputElement).value);
                    }
                  }}
                  className="text-xl font-semibold border-b-2 border-app-border focus:outline-none"
                  autoFocus
                />
              ) : (
                <h2
                  onClick={() => setEditingField('title')}
                  className="text-xl font-semibold cursor-pointer hover:opacity-70 transition-opacity"
                >
                  {event.title}
                </h2>
              )}
            </div>
            
            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-app-muted mb-4">
              <span><strong>{photoStats.total}</strong> Fotos</span>
              <span><strong>{photoStats.approved}</strong> Freigegeben</span>
              {photoStats.pending > 0 && (
                <span className="text-[var(--status-warning)]"><strong>{photoStats.pending}</strong> Ausstehend</span>
              )}
            </div>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="mb-6">
          {editingField === 'welcomeMessage' ? (
            <textarea
              defaultValue={welcomeMessage}
              onBlur={(e) => {
                updateDesignConfig({
                  welcomeMessage: e.target.value,
                });
              }}
              placeholder="Schreibe eine Willkommensnachricht..."
              className="w-full p-3 border-2 border-app-border rounded-lg focus:outline-none resize-none"
              rows={3}
              autoFocus
            />
          ) : (
            <div
              onClick={() => setEditingField('welcomeMessage')}
              className="p-4 bg-app-card border border-app-border rounded-lg cursor-pointer hover:opacity-90 transition-opacity min-h-[60px]"
            >
              {welcomeMessage ? (
                <p className="text-app-fg whitespace-pre-wrap">{welcomeMessage}</p>
              ) : (
                <p className="text-app-muted italic">Klicke hier, um eine Willkommensnachricht hinzuzufügen...</p>
              )}
            </div>
          )}
        </div>

        {/* Event Details */}
        <div className="mb-6 space-y-3">
          {/* Date - Required */}
          <div className="bg-app-card border border-app-border rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-tokens-brandGreen" />
              <label className="text-sm font-medium text-app-fg">
                Datum <span className="text-[var(--status-danger)]">*</span>
              </label>
            </div>
            {editingField === 'date' ? (
              <input
                type="date"
                required
                defaultValue={event.dateTime ? new Date(event.dateTime).toISOString().split('T')[0] : ''}
                onBlur={(e) => {
                  const dateValue = e.target.value;
                  const timeValue = event.dateTime ? new Date(event.dateTime).toTimeString().slice(0, 5) : '00:00';
                  if (dateValue) {
                    const combinedDateTime = new Date(`${dateValue}T${timeValue}`);
                    updateEventField('dateTime', combinedDateTime.toISOString());
                  }
                }}
                className="w-full px-3 py-2 border-2 border-app-border rounded-lg bg-app-card text-app-fg focus:outline-none focus:ring-2 focus:ring-tokens-brandGreen"
                autoFocus
              />
            ) : (
              <div
                onClick={() => setEditingField('date')}
                className="cursor-pointer hover:opacity-70 transition-opacity"
              >
                {event.dateTime ? (
                  <p className="text-app-fg">
                    {new Date(event.dateTime).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </p>
                ) : (
                  <p className="text-[var(--status-danger)] italic">Bitte Datum auswählen *</p>
                )}
              </div>
            )}
          </div>

          {/* Time - Required */}
          <div className="bg-app-card border border-app-border rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-tokens-brandGreen" />
              <label className="text-sm font-medium text-app-fg">
                Uhrzeit <span className="text-[var(--status-danger)]">*</span>
              </label>
            </div>
            {editingField === 'time' ? (
              <input
                type="time"
                required
                defaultValue={event.dateTime ? new Date(event.dateTime).toTimeString().slice(0, 5) : '00:00'}
                onBlur={(e) => {
                  const timeValue = e.target.value;
                  const dateValue = event.dateTime ? new Date(event.dateTime).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
                  if (timeValue) {
                    const combinedDateTime = new Date(`${dateValue}T${timeValue}`);
                    updateEventField('dateTime', combinedDateTime.toISOString());
                  }
                }}
                className="w-full px-3 py-2 border-2 border-app-border rounded-lg bg-app-card text-app-fg focus:outline-none focus:ring-2 focus:ring-tokens-brandGreen"
                autoFocus
              />
            ) : (
              <div
                onClick={() => setEditingField('time')}
                className="cursor-pointer hover:opacity-70 transition-opacity"
              >
                {event.dateTime ? (
                  <p className="text-app-fg">
                    {new Date(event.dateTime).toLocaleTimeString('de-DE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                ) : (
                  <p className="text-[var(--status-danger)] italic">Bitte Uhrzeit auswählen *</p>
                )}
              </div>
            )}
          </div>

          {/* Location */}
          <div className="bg-app-card border border-app-border rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="w-5 h-5 text-tokens-brandGreen" />
              <label className="text-sm font-medium text-app-fg">Veranstaltungsort</label>
            </div>
            {editingField === 'locationName' ? (
              <input
                type="text"
                defaultValue={event.locationName || ''}
                onBlur={(e) => {
                  updateEventField('locationName', e.target.value || null);
                }}
                placeholder="z.B. Musterstraße 123, 12345 Musterstadt"
                className="w-full px-3 py-2 border border-app-border rounded-lg bg-app-card text-app-fg focus:outline-none focus:ring-2 focus:ring-tokens-brandGreen"
                autoFocus
              />
            ) : (
              <div
                onClick={() => setEditingField('locationName')}
                className="cursor-pointer hover:opacity-70 transition-opacity"
              >
                {event.locationName ? (
                  <p className="text-app-fg">{event.locationName}</p>
                ) : (
                  <p className="text-app-muted italic">Klicke hier, um einen Ort hinzuzufügen...</p>
                )}
              </div>
            )}
          </div>

          {/* Event URL/Slug - Read-only */}
          <div className="bg-app-card border border-app-border rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Globe className="w-5 h-5 text-tokens-brandGreen" />
              <label className="text-sm font-medium text-app-fg">Event-URL</label>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-app-fg font-mono text-sm">/e2/{event.slug}</p>
                <p className="text-xs text-app-muted mt-1">Automatisch generiert, nicht bearbeitbar</p>
              </div>
              <button
                onClick={() => {
                  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/e2/${event.slug}`;
                  navigator.clipboard.writeText(url);
                  showToast('URL kopiert!', 'success');
                }}
                className="px-3 py-1 text-xs bg-tokens-brandGreen text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Kopieren
              </button>
            </div>
          </div>

          {/* Password */}
          <div className="bg-app-card border border-app-border rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Lock className="w-5 h-5 text-tokens-brandGreen" />
              <label className="text-sm font-medium text-app-fg">Event-Passwort</label>
            </div>
            {editingField === 'password' ? (
              <div className="space-y-2">
                <input
                  type="password"
                  placeholder="Neues Passwort eingeben (leer lassen zum Entfernen)"
                  onBlur={(e) => {
                    updateEventField('password', e.target.value || null);
                  }}
                  className="w-full px-3 py-2 border border-app-border rounded-lg bg-app-card text-app-fg focus:outline-none focus:ring-2 focus:ring-tokens-brandGreen"
                  autoFocus
                />
                <p className="text-xs text-app-muted">
                  {(event as any).password ? 'Leer lassen, um Passwort zu entfernen' : 'Passwort schützt den Event-Zugang'}
                </p>
              </div>
            ) : (
              <div
                onClick={() => setEditingField('password')}
                className="cursor-pointer hover:opacity-70 transition-opacity"
              >
                {(event as any).password ? (
                  <p className="text-app-fg">•••••••• (Passwort gesetzt)</p>
                ) : (
                  <p className="text-app-muted italic">Klicke hier, um ein Passwort hinzuzufügen...</p>
                )}
              </div>
            )}
          </div>
        </div>



        {/* Quick Actions - iOS Style */}
        <div className="space-y-2 mb-6">
          {/* Event-Modus Accordion */}
          <div className="bg-app-card border border-app-border rounded-xl overflow-hidden">
            <motion.div
              whileTap={{ scale: 0.98 }}
              className="p-4 flex items-center justify-between cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setShowEventMode(!showEventMode)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-tokens-brandGreen/10 rounded-full flex items-center justify-center">
                  <Settings className="w-5 h-5 text-tokens-brandGreen" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-app-fg">Event-Modus</p>
                  <p className="text-xs text-app-muted">Event-Verhalten konfigurieren</p>
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 text-app-muted transition-transform ${showEventMode ? 'rotate-90' : ''}`} />
            </motion.div>
            <AnimatePresence>
              {showEventMode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 pb-4"
                >
                  <div className="space-y-2 pt-2">
                    <label className="flex items-center justify-between px-1 py-2">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-app-muted" />
                        <span className="text-sm text-app-fg">Event aktiv</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={event ? (event as any).isActive !== false : true}
                        disabled={!event || togglingActive}
                        onChange={(e) => updateEventActive(e.target.checked)}
                        className="h-5 w-5 accent-tokens-brandGreen"
                      />
                    </label>

                    {['STANDARD', 'MODERATION', 'COLLECT', 'VIEW_ONLY'].map((mode) => (
                      <label
                        key={mode}
                        className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          featuresConfig.mode === mode
                            ? 'border-tokens-brandGreen bg-app-bg'
                            : 'border-app-border hover:opacity-90'
                        }`}
                      >
                        <input
                          type="radio"
                          name="mode"
                          value={mode}
                          checked={featuresConfig.mode === mode}
                          onChange={(e) => updateFeaturesConfig({ mode: e.target.value })}
                          className="mt-1 mr-3 accent-tokens-brandGreen"
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
                  
                  {/* Mystery Mode */}
                  <div className="pt-3 mt-3 border-t border-app-border space-y-3">
                    <label className="flex items-center justify-between px-1 py-2">
                      <div className="flex items-center gap-2">
                        <EyeIcon className="w-4 h-4 text-app-muted" />
                        <span className="text-sm text-app-fg">Mystery Mode <span className="text-app-muted font-normal">(Überschreibt die Sichtbarkeitsregeln der Event-Modi - Fotos werden erst nach dem Event sichtbar)</span></span>
                      </div>
                      <input
                        type="checkbox"
                        checked={featuresConfig.mysteryMode === true}
                        onChange={(e) => updateFeaturesConfig({ mysteryMode: e.target.checked })}
                        className="h-5 w-5 accent-tokens-brandGreen"
                      />
                    </label>
                    
                    {/* Foto-Uploads erlauben */}
                    <label className="flex items-center justify-between px-1 py-2">
                      <div className="flex items-center gap-2">
                        <Upload className="w-4 h-4 text-app-muted" />
                        <span className="text-sm text-app-fg">Foto-Uploads erlauben</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={featuresConfig.allowUploads !== false}
                        onChange={(e) => updateFeaturesConfig({ allowUploads: e.target.checked })}
                        disabled={isStorageLocked}
                        className="h-5 w-5 accent-tokens-brandGreen"
                      />
                    </label>
                    
                    {/* Downloads erlauben */}
                    <label className="flex items-center justify-between px-1 py-2">
                      <div className="flex items-center gap-2">
                        <Download className="w-4 h-4 text-app-muted" />
                        <span className="text-sm text-app-fg">Downloads erlauben</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={featuresConfig.allowDownloads !== false}
                        onChange={(e) => updateFeaturesConfig({ allowDownloads: e.target.checked })}
                        disabled={isStorageLocked}
                        className="h-5 w-5 accent-tokens-brandGreen"
                      />
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Gäste Section */}
          <div className="space-y-2">
            <Link href={`/events/${eventId}/qr-styler`}>
              <motion.div
                whileTap={{ scale: 0.98 }}
                className="bg-app-card border border-app-border rounded-xl p-4 flex items-center justify-between cursor-pointer hover:opacity-90 transition-opacity"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-tokens-brandGreen/10 rounded-full flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-tokens-brandGreen" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-app-fg">QR‑Aufsteller</p>
                    <p className="text-xs text-app-muted">Vorlagen gestalten und herunterladen</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-app-muted" />
              </motion.div>
            </Link>

            {/* Gäste Link */}
            {featuresConfig.showGuestlist === false ? (
              <div className="bg-app-card border border-app-border rounded-xl p-4 opacity-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-app-bg rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-app-muted" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-app-muted">Gäste</p>
                    <p className="text-xs text-app-muted">Gästelistenfunktion ist deaktiviert</p>
                  </div>
                </div>
              </div>
            ) : (
              <Link href={`/events/${eventId}/guests`}>
                <motion.div
                  whileTap={{ scale: 0.98 }}
                  className="bg-app-card border border-app-border rounded-xl p-4 flex items-center justify-between cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-tokens-brandGreen/10 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-tokens-brandGreen" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-app-fg">Gäste</p>
                      <p className="text-xs text-app-muted">Gäste verwalten und einladen</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-app-muted" />
                </motion.div>
              </Link>
            )}

            {/* Alben Link */}
            <Link href={`/events/${eventId}/categories`}>
              <motion.div
                whileTap={{ scale: 0.98 }}
                className="bg-app-card border border-app-border rounded-xl p-4 flex items-center justify-between cursor-pointer hover:opacity-90 transition-opacity"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-tokens-brandPeach/10 rounded-full flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-tokens-brandPeach" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-app-fg">Alben</p>
                    <p className="text-xs text-app-muted">Alben erstellen und verwalten</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-app-muted" />
              </motion.div>
            </Link>

            {/* Challenges Link */}
            {featuresConfig.challengesEnabled === false ? (
              <div className="bg-app-card border border-app-border rounded-xl p-4 opacity-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-app-bg rounded-full flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-app-muted" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-app-muted">Challenges</p>
                    <p className="text-xs text-app-muted">Challenges sind deaktiviert</p>
                  </div>
                </div>
              </div>
            ) : (
              <Link href={`/events/${eventId}/challenges`}>
                <motion.div
                  whileTap={{ scale: 0.98 }}
                  className="bg-app-card border border-app-border rounded-xl p-4 flex items-center justify-between cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-app-bg border border-[var(--status-warning)] rounded-full flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-[var(--status-warning)]" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-app-fg">Challenges</p>
                      <p className="text-xs text-app-muted">Challenges erstellen und verwalten</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-app-muted" />
                </motion.div>
              </Link>
            )}
          </div>

          <Link href={`/events/${eventId}/statistics`}>
            <motion.div
              whileTap={{ scale: 0.98 }}
              className="bg-app-card border border-app-border rounded-xl p-4 flex items-center justify-between cursor-pointer hover:opacity-90 transition-opacity"
            >
              <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-tokens-brandGreen/10 rounded-full flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-tokens-brandGreen" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-app-fg">Statistiken</p>
                  <p className="text-xs text-app-muted">Event-Übersicht und Analysen</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-app-muted" />
            </motion.div>
          </Link>

          {/* Erweiterte Einstellungen Accordion */}
          <div className="bg-app-card border border-app-border rounded-xl overflow-hidden">
            <motion.div
              whileTap={{ scale: 0.98 }}
              className="p-4 flex items-center justify-between cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-tokens-brandGreen/10 rounded-full flex items-center justify-center">
                  <Settings className="w-5 h-5 text-tokens-brandGreen" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-app-fg">Erweiterte Einstellungen</p>
                  <p className="text-xs text-app-muted">Weitere Features & Optionen</p>
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 text-app-muted transition-transform ${showAdvancedSettings ? 'rotate-90' : ''}`} />
            </motion.div>
            <AnimatePresence>
              {showAdvancedSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 pb-4"
                >
                  <div className="pt-4 space-y-3">
                    <label className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-app-muted" />
                        <span className="text-sm">Gästeliste anzeigen</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={featuresConfig.showGuestlist !== false}
                        onChange={(e) => updateFeaturesConfig({ showGuestlist: e.target.checked })}
                        className="h-5 w-5 accent-tokens-brandGreen"
                      />
                    </label>

                    <label className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-app-muted" />
                        <span className="text-sm">Challenges aktivieren</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={featuresConfig.challengesEnabled === true}
                        onChange={(e) => updateFeaturesConfig({ challengesEnabled: e.target.checked })}
                        className="h-5 w-5 accent-tokens-brandGreen"
                      />
                    </label>

                  </div>
                  
                  {/* Speichern Button */}
                  <motion.div whileTap={{ scale: 0.98 }} className="mt-4">
                    <Button
                      onClick={async () => {
                        try {
                          await loadEvent();
                          showToast('Änderungen gespeichert!', 'success');
                        } catch (err) {
                          console.error('Fehler beim Speichern:', err);
                          showToast('Fehler beim Speichern', 'error');
                        }
                      }}
                      className="w-full rounded-xl p-4 font-semibold"
                    >
                      <Check className="h-5 w-5" />
                      Speichern
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSettings(false)}
            className="fixed inset-0 bg-app-fg/50 z-50 flex items-end"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
              className="bg-app-card rounded-t-3xl w-full max-h-[80vh] overflow-hidden"
            >
              <div className="sticky top-0 bg-app-card border-b border-app-border px-4 py-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-app-fg">Einstellungen</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1 hover:opacity-80 rounded-full"
                >
                  <X className="w-5 h-5 text-app-fg" />
                </button>
              </div>
              <div className="overflow-y-auto max-h-[calc(80vh-60px)] p-4 space-y-2">
                <Link href={`/events/${eventId}`}>
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                    className="bg-app-bg rounded-xl p-4 flex items-center justify-between cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <div className="flex items-center gap-3">
                      <Eye className="w-5 h-5 text-app-muted" />
                      <span className="font-medium text-app-fg">Event ansehen</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-app-muted" />
                  </motion.div>
                </Link>

                <Link href={`/events/${eventId}/duplicates`}>
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                    className="bg-app-bg rounded-xl p-4 flex items-center justify-between cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <div className="flex items-center gap-3">
                      <ImageIcon className="w-5 h-5 text-app-muted" />
                      <span className="font-medium text-app-fg">Duplikate verwalten</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-app-muted" />
                  </motion.div>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Footer Navigation */}
      <DashboardFooter eventId={eventId} eventSlug={event.slug} />
      
      {/* Padding for footer */}
      <div className="h-20" />
    </AppLayout>
  );
}

