'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import GuidedTour from '@/components/ui/GuidedTour';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
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
import FullPageLoader from '@/components/FullPageLoader';

type UploadIssuesResponse = {
  ok: boolean;
  eventId: string;
  since: string;
  counts: {
    tempDeletedPhotos: number;
    tempDeletedVideos: number;
    scanErrorPhotos: number;
    scanPendingPhotos: number;
    scanErrorVideos: number;
    scanPendingVideos: number;
    guestbookExpiredUploads: number;
  };
  items: {
    tempDeletedPhotos: Array<{ id: string; createdAt: string; deletedAt: string | null; uploadedBy: string | null }>;
    tempDeletedVideos: Array<{ id: string; createdAt: string; deletedAt: string | null; uploadedBy: string | null }>;
    scanErrorPhotos: Array<{ id: string; createdAt: string; uploadedBy: string | null; scanError?: string; scanUpdatedAt?: string }>;
    scanPendingPhotos: Array<{ id: string; createdAt: string; uploadedBy: string | null; scanUpdatedAt?: string }>;
    scanErrorVideos: Array<{ id: string; createdAt: string; uploadedBy: string | null; scanError?: string; scannedAt?: string }>;
    scanPendingVideos: Array<{ id: string; createdAt: string; uploadedBy: string | null; scannedAt?: string }>;
    guestbookExpiredUploads: Array<{ id: string; createdAt: string; claimedAt: string | null; expiresAt: string; storagePath: string; sizeBytes: string }>;
  };
};

type EventDetail = {
  id: string;
  title: string;
  slug: string;
  dateTime: string | null;
  featuresConfig?: any;
};

type CohostMember = {
  id: string;
  role: 'COHOST' | string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
  };
};

type AdminUserListItem = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
};

type InvitationShortLink = {
  id: string;
  invitationId: string;
  code: string;
  channel: string | null;
  createdAt: string;
  lastAccessedAt: string | null;
  url: string;
};

type InvitationListItem = {
  id: string;
  eventId: string;
  slug: string;
  name: string;
  config: any;
  visibility: 'UNLISTED' | 'PUBLIC' | string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  hasPassword: boolean;
  opens: number;
  shortLinks: InvitationShortLink[];
};

type InvitationTemplateListItem = {
  id: string;
  slug: string;
  title: string;
  isActive: boolean;
};

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const eventId = params.id;
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [cohosts, setCohosts] = useState<CohostMember[]>([]);
  const [loadingCohosts, setLoadingCohosts] = useState(true);
  const [errorCohosts, setErrorCohosts] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<AdminUserListItem[]>([]);
  const [loadingUserResults, setLoadingUserResults] = useState(false);
  const [addingCohostUserId, setAddingCohostUserId] = useState<string | null>(null);
  const [removingCohostUserId, setRemovingCohostUserId] = useState<string | null>(null);
  const [mintingInvite, setMintingInvite] = useState(false);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [issues, setIssues] = useState<UploadIssuesResponse | null>(null);
  const [sinceHours, setSinceHours] = useState(72);
  const [loading, setLoading] = useState(true);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorIssues, setErrorIssues] = useState<string | null>(null);
  const [savingLimits, setSavingLimits] = useState(false);
  const [photoIpMax, setPhotoIpMax] = useState<string>('');
  const [photoEventMax, setPhotoEventMax] = useState<string>('');
  const [videoIpMax, setVideoIpMax] = useState<string>('');
  const [videoEventMax, setVideoEventMax] = useState<string>('');
  const [savingDatePolicy, setSavingDatePolicy] = useState(false);
  const [uploadDateEnabled, setUploadDateEnabled] = useState(true);
  const [uploadDateToleranceDays, setUploadDateToleranceDays] = useState<string>('1');
  const [savingVirusScan, setSavingVirusScan] = useState(false);
  const [virusScanEnforce, setVirusScanEnforce] = useState(false);
  const [virusScanAutoClean, setVirusScanAutoClean] = useState(false);
  const [markingClean, setMarkingClean] = useState<string | null>(null);
  const [markingVideoClean, setMarkingVideoClean] = useState<string | null>(null);

  const [invitations, setInvitations] = useState<InvitationListItem[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [errorInvitations, setErrorInvitations] = useState<string | null>(null);

  const [invTemplates, setInvTemplates] = useState<InvitationTemplateListItem[]>([]);
  const [loadingInvTemplates, setLoadingInvTemplates] = useState(false);

  const [creatingInvitation, setCreatingInvitation] = useState(false);
  const [newInviteName, setNewInviteName] = useState('');
  const [newInviteSlug, setNewInviteSlug] = useState('');
  const [newInviteVisibility, setNewInviteVisibility] = useState<'UNLISTED' | 'PUBLIC'>('UNLISTED');
  const [newInvitePassword, setNewInvitePassword] = useState('');
  const [newInviteTemplateId, setNewInviteTemplateId] = useState<string>('');
  const [newInviteConfigJson, setNewInviteConfigJson] = useState('');

  const [editingInvitationId, setEditingInvitationId] = useState<string | null>(null);
  const [editInviteName, setEditInviteName] = useState('');
  const [editInviteVisibility, setEditInviteVisibility] = useState<'UNLISTED' | 'PUBLIC'>('UNLISTED');
  const [editInvitePassword, setEditInvitePassword] = useState('');
  const [editInviteConfigJson, setEditInviteConfigJson] = useState('');
  const [savingInvitation, setSavingInvitation] = useState(false);
  const [shortlinkChannel, setShortlinkChannel] = useState('');
  const [creatingShortlink, setCreatingShortlink] = useState(false);

  const [confirmCleanAction, setConfirmCleanAction] = useState<
    | null
    | {
        kind: 'photo' | 'video';
        id: string;
      }
  >(null);

  const totalIssues = useMemo(() => {
    if (!issues) return 0;
    return (
      issues.counts.tempDeletedPhotos +
      issues.counts.tempDeletedVideos +
      issues.counts.scanErrorPhotos +
      issues.counts.scanPendingPhotos +
      issues.counts.scanErrorVideos +
      issues.counts.scanPendingVideos +
      issues.counts.guestbookExpiredUploads
    );
  }, [issues]);

  const cohostTourSteps = useMemo(
    () => [
      {
        id: 'cohost-section',
        target: '[data-tour="cohost-section"]',
        title: 'Co-Hosts verwalten',
        body: 'Hier kannst du Co-Hosts hinzufügen/entfernen und einen Invite-Link erzeugen.',
        placement: 'top' as const,
      },
      {
        id: 'cohost-invite',
        target: '[data-tour="cohost-invite"]',
        title: 'Invite-Link erzeugen',
        body: 'Erzeugt einen Link. Der Link ist ein Bearer-Token (bis Ablauf) – nur an die richtige Person schicken.',
        placement: 'bottom' as const,
      },
      {
        id: 'cohost-search',
        target: '[data-tour="cohost-search"]',
        title: 'Co-Host hinzufügen',
        body: 'Suche nach einem User und füge ihn als Co-Host hinzu. Danach hat die Person Manage-Zugriff aufs Event.',
        placement: 'bottom' as const,
      },
    ],
    []
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/events/${eventId}`);
        const ev = res.data?.event as EventDetail | undefined;
        if (mounted) {
          setEvent(ev || null);
          const cfg = (ev as any)?.featuresConfig?.uploadRateLimits || {};
          setPhotoIpMax(cfg.photoIpMax !== undefined && cfg.photoIpMax !== null ? String(cfg.photoIpMax) : '');
          setPhotoEventMax(cfg.photoEventMax !== undefined && cfg.photoEventMax !== null ? String(cfg.photoEventMax) : '');
          setVideoIpMax(cfg.videoIpMax !== undefined && cfg.videoIpMax !== null ? String(cfg.videoIpMax) : '');
          setVideoEventMax(cfg.videoEventMax !== undefined && cfg.videoEventMax !== null ? String(cfg.videoEventMax) : '');

          const dp = (ev as any)?.featuresConfig?.uploadDatePolicy;
          setUploadDateEnabled(dp?.enabled !== false);
          setUploadDateToleranceDays(dp?.toleranceDays !== undefined && dp?.toleranceDays !== null ? String(dp.toleranceDays) : '1');

          const vs = (ev as any)?.featuresConfig?.virusScan;
          setVirusScanEnforce(vs?.enforce === true);
          setVirusScanAutoClean(vs?.autoClean === true);
        }
      } catch (e: any) {
        if (mounted) setError(e?.response?.data?.error || e?.message || 'Fehler beim Laden');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [eventId]);

  async function loadCohosts() {
    try {
      setLoadingCohosts(true);
      setErrorCohosts(null);
      const res = await api.get(`/events/${eventId}/cohosts`);
      const items = (res.data?.cohosts || []) as CohostMember[];
      setCohosts(items);
    } catch (e: any) {
      setErrorCohosts(e?.response?.data?.error || e?.message || 'Fehler beim Laden');
    } finally {
      setLoadingCohosts(false);
    }
  }

  useEffect(() => {
    loadCohosts();
  }, [eventId]);

  async function loadInvitations() {
    try {
      setLoadingInvitations(true);
      setErrorInvitations(null);
      const res = await api.get(`/events/${eventId}/invitations`);
      const list = (res.data?.invitations || []) as InvitationListItem[];
      setInvitations(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setErrorInvitations(e?.response?.data?.error || e?.message || 'Fehler beim Laden');
      setInvitations([]);
    } finally {
      setLoadingInvitations(false);
    }
  }

  async function loadInvitationTemplates() {
    try {
      setLoadingInvTemplates(true);
      const res = await api.get('/admin/invitation-templates');
      const list = (res.data?.templates || []) as InvitationTemplateListItem[];
      setInvTemplates(Array.isArray(list) ? list : []);
    } catch {
      setInvTemplates([]);
    } finally {
      setLoadingInvTemplates(false);
    }
  }

  useEffect(() => {
    loadInvitations();
    loadInvitationTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const selectedInvitation = useMemo(() => {
    if (!editingInvitationId) return null;
    return invitations.find((i) => i.id === editingInvitationId) || null;
  }, [editingInvitationId, invitations]);

  useEffect(() => {
    if (!selectedInvitation) return;
    setEditInviteName(selectedInvitation.name || '');
    setEditInviteVisibility((selectedInvitation.visibility as any) === 'PUBLIC' ? 'PUBLIC' : 'UNLISTED');
    setEditInvitePassword('');
    try {
      setEditInviteConfigJson(selectedInvitation.config ? JSON.stringify(selectedInvitation.config, null, 2) : '');
    } catch {
      setEditInviteConfigJson('');
    }
  }, [selectedInvitation?.id]);

  const parseConfigJson = (raw: string): { ok: true; value: any } | { ok: false; error: string } => {
    const trimmed = raw.trim();
    if (!trimmed) return { ok: true, value: undefined };
    try {
      return { ok: true, value: JSON.parse(trimmed) };
    } catch {
      return { ok: false, error: 'Config ist kein gültiges JSON' };
    }
  };

  async function createInvitation() {
    const name = newInviteName.trim();
    if (!name) {
      toast.error('Bitte Namen setzen');
      return;
    }

    const parsed = parseConfigJson(newInviteConfigJson);
    if (!parsed.ok) {
      toast.error(parsed.error);
      return;
    }

    setCreatingInvitation(true);
    try {
      const body: any = {
        name,
        visibility: newInviteVisibility,
      };
      if (newInviteSlug.trim()) body.slug = newInviteSlug.trim();
      if (newInviteTemplateId) body.templateId = newInviteTemplateId;
      if (typeof parsed.value !== 'undefined') body.config = parsed.value;
      if (newInvitePassword.trim()) body.password = newInvitePassword.trim();

      const res = await api.post(`/events/${eventId}/invitations`, body);
      const invitationUrl = (res.data?.invitationUrl as string | undefined) || '';
      await loadInvitations();
      toast.success('Einladung erstellt');
      if (invitationUrl) {
        try {
          await navigator.clipboard.writeText(invitationUrl);
          toast.success('Invitation URL kopiert');
        } catch {
          // ignore
        }
      }
      setNewInviteName('');
      setNewInviteSlug('');
      setNewInvitePassword('');
      setNewInviteTemplateId('');
      setNewInviteConfigJson('');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Erstellen fehlgeschlagen');
    } finally {
      setCreatingInvitation(false);
    }
  }

  async function saveInvitation() {
    if (!selectedInvitation) return;
    const name = editInviteName.trim();
    if (!name) {
      toast.error('Bitte Namen setzen');
      return;
    }

    const parsed = parseConfigJson(editInviteConfigJson);
    if (!parsed.ok) {
      toast.error(parsed.error);
      return;
    }

    setSavingInvitation(true);
    try {
      const body: any = {
        name,
        visibility: editInviteVisibility,
      };
      if (typeof parsed.value !== 'undefined') body.config = parsed.value;
      if (editInvitePassword.trim()) {
        body.password = editInvitePassword.trim();
      } else {
        body.password = null;
      }
      await api.put(`/events/${eventId}/invitations/${encodeURIComponent(selectedInvitation.id)}`, body);
      toast.success('Gespeichert');
      await loadInvitations();
      setEditInvitePassword('');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Speichern fehlgeschlagen');
    } finally {
      setSavingInvitation(false);
    }
  }

  async function deactivateInvitation(invitationId: string) {
    setSavingInvitation(true);
    try {
      await api.put(`/events/${eventId}/invitations/${encodeURIComponent(invitationId)}`, { isActive: false });
      toast.success('Deaktiviert');
      if (editingInvitationId === invitationId) setEditingInvitationId(null);
      await loadInvitations();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Aktion fehlgeschlagen');
    } finally {
      setSavingInvitation(false);
    }
  }

  async function createInvitationShortlink(invitationId: string) {
    setCreatingShortlink(true);
    try {
      const body: any = {};
      if (shortlinkChannel.trim()) body.channel = shortlinkChannel.trim();
      const res = await api.post(`/events/${eventId}/invitations/${encodeURIComponent(invitationId)}/shortlinks`, body);
      const url = (res.data?.shortLink?.url as string | undefined) || '';
      await loadInvitations();
      toast.success('Shortlink erstellt');
      if (url) {
        try {
          await navigator.clipboard.writeText(url);
          toast.success('Shortlink kopiert');
        } catch {
          // ignore
        }
      }
      setShortlinkChannel('');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Shortlink fehlgeschlagen');
    } finally {
      setCreatingShortlink(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const q = userSearch.trim();
    const handle = setTimeout(async () => {
      if (!q) {
        setUserResults([]);
        return;
      }
      try {
        setLoadingUserResults(true);
        const res = await api.get('/admin/users', {
          params: { search: q, limit: 10 },
        });
        const items = (res.data?.users || []) as AdminUserListItem[];
        if (!cancelled) setUserResults(items);
      } catch {
        if (!cancelled) setUserResults([]);
      } finally {
        if (!cancelled) setLoadingUserResults(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [userSearch]);

  const existingCohostUserIds = useMemo(() => new Set(cohosts.map((c) => c.user.id)), [cohosts]);

  async function addCohost(userId: string) {
    try {
      setAddingCohostUserId(userId);
      await api.post(`/events/${eventId}/cohosts`, { userId });
      toast.success('Co-Host hinzugefügt');
      setUserSearch('');
      setUserResults([]);
      await loadCohosts();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Aktion fehlgeschlagen');
    } finally {
      setAddingCohostUserId(null);
    }
  }

  async function removeCohost(userId: string) {
    try {
      setRemovingCohostUserId(userId);
      await api.delete(`/events/${eventId}/cohosts/${userId}`);
      toast.success('Co-Host entfernt');
      await loadCohosts();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Aktion fehlgeschlagen');
    } finally {
      setRemovingCohostUserId(null);
    }
  }

  async function mintInviteToken() {
    try {
      setMintingInvite(true);
      const res = await api.post(`/events/${eventId}/cohosts/invite-token`);
      const shareUrl = (res.data?.shareUrl as string | null) || null;
      const inviteToken = (res.data?.inviteToken as string | null) || null;

      const toCopy = shareUrl || inviteToken;
      setLastInviteUrl(shareUrl || null);

      if (toCopy) {
        try {
          await navigator.clipboard.writeText(toCopy);
          toast.success('Invite-Link kopiert');
        } catch {
          toast.success('Invite erstellt');
        }
      } else {
        toast.success('Invite erstellt');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Aktion fehlgeschlagen');
    } finally {
      setMintingInvite(false);
    }
  }

  async function loadUploadIssues(currentSinceHours: number) {
    try {
      setLoadingIssues(true);
      setErrorIssues(null);
      const res = await api.get(`/events/${eventId}/upload-issues`, {
        params: { sinceHours: currentSinceHours, limit: 50 },
      });
      setIssues(res.data as UploadIssuesResponse);
    } catch (e: any) {
      setErrorIssues(e?.response?.data?.error || e?.message || 'Fehler beim Laden');
    } finally {
      setLoadingIssues(false);
    }
  }

  useEffect(() => {
    loadUploadIssues(sinceHours);
  }, [eventId, sinceHours]);

  async function markPhotoClean(photoId: string) {
    try {
      setMarkingClean(photoId);
      await api.post(`/photos/${photoId}/scan/mark-clean`);
      toast.success('Foto freigegeben (CLEAN)');
      await loadUploadIssues(sinceHours);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Aktion fehlgeschlagen');
    } finally {
      setMarkingClean(null);
    }
  }

  async function markVideoClean(videoId: string) {
    try {
      setMarkingVideoClean(videoId);
      await api.post(`/videos/${videoId}/scan/mark-clean`);
      toast.success('Video freigegeben (CLEAN)');
      await loadUploadIssues(sinceHours);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Aktion fehlgeschlagen');
    } finally {
      setMarkingVideoClean(null);
    }
  }

  const confirmOpen = confirmCleanAction !== null;
  const confirmBusy =
    confirmCleanAction?.kind === 'photo'
      ? markingClean === confirmCleanAction.id
      : confirmCleanAction?.kind === 'video'
        ? markingVideoClean === confirmCleanAction.id
        : false;

  async function runConfirmCleanAction() {
    if (!confirmCleanAction) return;
    const action = confirmCleanAction;
    try {
      if (action.kind === 'photo') {
        await markPhotoClean(action.id);
      } else {
        await markVideoClean(action.id);
      }
    } finally {
      setConfirmCleanAction(null);
    }
  }

  async function saveUploadRateLimits() {
    if (!event) return;
    try {
      setSavingLimits(true);
      const toNumOrUndef = (raw: string) => {
        const trimmed = raw.trim();
        if (!trimmed) return undefined;
        const n = Number(trimmed);
        return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
      };

      const nextUploadRateLimits = {
        photoIpMax: toNumOrUndef(photoIpMax),
        photoEventMax: toNumOrUndef(photoEventMax),
        videoIpMax: toNumOrUndef(videoIpMax),
        videoEventMax: toNumOrUndef(videoEventMax),
      };

      const featuresConfig = (event as any)?.featuresConfig || {};
      const merged = {
        ...featuresConfig,
        uploadRateLimits: {
          ...((featuresConfig as any)?.uploadRateLimits || {}),
          ...nextUploadRateLimits,
        },
      };

      await api.put(`/events/${eventId}`, {
        featuresConfig: merged,
      });

      toast.success('Upload Limits gespeichert');
      setEvent({ ...event, featuresConfig: merged });
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Speichern fehlgeschlagen');
    } finally {
      setSavingLimits(false);
    }
  }

  async function saveUploadDatePolicy() {
    if (!event) return;
    try {
      setSavingDatePolicy(true);
      const tolRaw = Number(uploadDateToleranceDays.trim());
      const toleranceDays = Number.isFinite(tolRaw) && tolRaw >= 0 ? Math.min(7, Math.floor(tolRaw)) : 1;

      const featuresConfig = (event as any)?.featuresConfig || {};
      const merged = {
        ...featuresConfig,
        uploadDatePolicy: {
          ...((featuresConfig as any)?.uploadDatePolicy || {}),
          enabled: !!uploadDateEnabled,
          toleranceDays,
        },
      };

      await api.put(`/events/${eventId}`, {
        featuresConfig: merged,
      });

      toast.success('Upload Date Policy gespeichert');
      setEvent({ ...event, featuresConfig: merged });
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Speichern fehlgeschlagen');
    } finally {
      setSavingDatePolicy(false);
    }
  }

  async function saveVirusScanSettings() {
    if (!event) return;
    try {
      setSavingVirusScan(true);

      const featuresConfig = (event as any)?.featuresConfig || {};
      const merged = {
        ...featuresConfig,
        virusScan: {
          ...((featuresConfig as any)?.virusScan || {}),
          enforce: !!virusScanEnforce,
          autoClean: !!virusScanAutoClean,
        },
      };

      await api.put(`/events/${eventId}`, {
        featuresConfig: merged,
      });

      toast.success('Virus-Scan Einstellungen gespeichert');
      setEvent({ ...event, featuresConfig: merged });
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Speichern fehlgeschlagen');
    } finally {
      setSavingVirusScan(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-app-fg">{event?.title || 'Event'}</h1>
          <p className="mt-1 text-sm text-app-muted">
            {event?.dateTime ? new Date(event.dateTime).toLocaleString('de-DE') : 'Kein Datum gesetzt'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/events">Zurück</Link>
          </Button>
        </div>
      </div>

      {loading ? <FullPageLoader /> : null}

      {!loading && error && (
        <Card className="p-5">
          <p className="text-sm text-[var(--status-danger)]">{error}</p>
        </Card>
      )}

      {!loading && !error && (
        <div className="space-y-6">
          <AlertDialog open={confirmOpen} onOpenChange={(open: boolean) => (open ? null : setConfirmCleanAction(null))}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Freigeben (CLEAN) bestätigen</AlertDialogTitle>
                <AlertDialogDescription>
                  Diese Aktion gibt {confirmCleanAction?.kind === 'video' ? 'ein Video' : 'ein Foto'} frei. Fortfahren?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel asChild>
                  <Button variant="secondary" disabled={confirmBusy}>
                    Abbrechen
                  </Button>
                </AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button onClick={runConfirmCleanAction} disabled={confirmBusy} variant="primary">
                    {confirmBusy ? '…' : 'Freigeben'}
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-app-fg">Virus Scan</h2>
            <p className="mt-1 text-sm text-app-muted">
              Optional: Wenn aktiv, werden Fotos mit scanStatus != CLEAN nicht ausgeliefert (404). Standard ist AUS.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={virusScanEnforce}
                  onChange={(e) => setVirusScanEnforce(e.target.checked)}
                />
                <span className="text-sm text-app-fg">Enforce Quarantäne (pro Event)</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={virusScanAutoClean}
                  onChange={(e) => setVirusScanAutoClean(e.target.checked)}
                />
                <span className="text-sm text-app-fg">Auto-CLEAN (nur Monitoring, ohne echten Scanner)</span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <Button
                onClick={saveVirusScanSettings}
                disabled={savingVirusScan}
              >
                {savingVirusScan ? 'Speichern…' : 'Speichern'}
              </Button>
              <p className="text-sm text-app-muted">Speichert in: featuresConfig.virusScan.enforce</p>
            </div>
          </Card>

          <Card className="p-6" data-tour="cohost-section">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-app-fg">Co-Hosts</h2>
                <p className="mt-1 text-sm text-app-muted">Co-Hosts dürfen das Event verwalten (wie Host).</p>
              </div>
              <div className="flex items-center gap-3">
                <GuidedTour tourId="admin-event-cohosts" steps={cohostTourSteps} autoStart />
                <span data-tour="cohost-invite">
                  <Button onClick={mintInviteToken} disabled={mintingInvite} variant="outline" size="sm">
                    {mintingInvite ? 'Invite…' : 'Invite-Link erzeugen'}
                  </Button>
                </span>
              </div>
            </div>

            {lastInviteUrl ? (
              <div className="mt-4 rounded-lg border border-app-border bg-app-bg p-3" data-tour="cohost-link">
                <div className="text-xs text-app-muted">Letzter Invite-Link</div>
                <div className="mt-1 break-all text-sm text-app-fg">{lastInviteUrl}</div>
              </div>
            ) : null}

            <div className="mt-6">
              <label className="mb-1 block text-sm text-app-muted">User suchen</label>
              <Input
                className="px-3 py-2"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Name oder E-Mail…"
                data-tour="cohost-search"
              />

              {loadingUserResults ? <p className="mt-2 text-sm text-app-muted">Suche…</p> : null}
              {!loadingUserResults && userSearch.trim() && userResults.length === 0 ? (
                <p className="mt-2 text-sm text-app-muted">Keine Treffer</p>
              ) : null}

              {userResults.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {userResults.map((u) => {
                    const already = existingCohostUserIds.has(u.id);
                    const busy = addingCohostUserId === u.id;
                    return (
                      <div
                        key={u.id}
                        className="flex flex-col gap-2 rounded-lg border border-app-border bg-app-bg p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-app-fg">{u.name || '(ohne Namen)'}</div>
                          <div className="truncate text-xs text-app-muted">{u.email || '-'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => addCohost(u.id)}
                            disabled={already || busy}
                            size="sm"
                            variant="primary"
                          >
                            {already ? 'Schon Co-Host' : busy ? 'Hinzufügen…' : 'Als Co-Host hinzufügen'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="mt-6">
              <div className="text-sm font-medium text-app-fg">Aktuelle Co-Hosts</div>
              {loadingCohosts ? <p className="mt-2 text-sm text-app-muted">Lädt…</p> : null}
              {!loadingCohosts && errorCohosts ? <p className="mt-2 text-sm text-[var(--status-danger)]">{errorCohosts}</p> : null}
              {!loadingCohosts && !errorCohosts && cohosts.length === 0 ? (
                <p className="mt-2 text-sm text-app-muted">Keine Co-Hosts</p>
              ) : null}

              {!loadingCohosts && !errorCohosts && cohosts.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {cohosts.map((m) => {
                    const busy = removingCohostUserId === m.user.id;
                    return (
                      <div
                        key={m.id}
                        className="flex flex-col gap-2 rounded-lg border border-app-border bg-app-bg p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-app-fg">{m.user.name || '(ohne Namen)'}</div>
                          <div className="truncate text-xs text-app-muted">{m.user.email || '-'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => removeCohost(m.user.id)}
                            disabled={busy}
                            size="sm"
                            variant="outline"
                          >
                            {busy ? 'Entfernen…' : 'Entfernen'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-app-fg">Invitations</h2>
                <p className="mt-1 text-sm text-app-muted">Einladungsseiten (RSVP/ICS/Preview) pro Event – inkl. Shortlinks.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={loadInvitationTemplates} disabled={loadingInvTemplates}>
                  {loadingInvTemplates ? '…' : 'Templates'}
                </Button>
                <Button size="sm" variant="outline" onClick={loadInvitations} disabled={loadingInvitations}>
                  {loadingInvitations ? '…' : 'Reload'}
                </Button>
              </div>
            </div>

            {errorInvitations ? <div className="mt-4 text-sm text-[var(--status-danger)]">{errorInvitations}</div> : null}

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className="p-5">
                <div className="text-sm font-medium text-app-fg">Neue Einladung</div>
                <div className="mt-3 grid grid-cols-1 gap-3">
                  <div>
                    <div className="mb-1 text-xs text-app-muted">Name *</div>
                    <Input value={newInviteName} onChange={(e) => setNewInviteName(e.target.value)} placeholder="z.B. Hochzeit Abend" />
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-app-muted">Slug (optional)</div>
                    <Input value={newInviteSlug} onChange={(e) => setNewInviteSlug(e.target.value)} placeholder="z.B. abend" />
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-app-muted">Visibility</div>
                    <Select value={newInviteVisibility} onValueChange={(v) => setNewInviteVisibility(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UNLISTED">UNLISTED</SelectItem>
                        <SelectItem value="PUBLIC">PUBLIC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-app-muted">Template (optional)</div>
                    <Select value={newInviteTemplateId || '__none__'} onValueChange={(v) => setNewInviteTemplateId(v === '__none__' ? '' : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="(keins)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">(keins)</SelectItem>
                        {invTemplates
                          .filter((t) => t.isActive !== false)
                          .map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.slug}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-app-muted">Password (optional)</div>
                    <Input value={newInvitePassword} onChange={(e) => setNewInvitePassword(e.target.value)} placeholder="(leer = keines)" />
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-app-muted">Config JSON (optional)</div>
                    <Textarea
                      value={newInviteConfigJson}
                      onChange={(e) => setNewInviteConfigJson(e.target.value)}
                      placeholder='{"sections": {"rsvp": {"enabled": true}}}'
                      rows={7}
                    />
                  </div>
                  <Button variant="primary" onClick={createInvitation} disabled={creatingInvitation}>
                    {creatingInvitation ? 'Erstelle…' : 'Erstellen'}
                  </Button>
                </div>
              </Card>

              <Card className="p-5 lg:col-span-2">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-medium text-app-fg">Bestehende Einladungen</div>
                    <div className="mt-1 text-xs text-app-muted">
                      {loadingInvitations ? 'Lade…' : `${invitations.length} Einträge`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditingInvitationId(null)} disabled={!editingInvitationId}>
                      Editor schließen
                    </Button>
                  </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-lg border border-app-border">
                  <div className="grid grid-cols-12 gap-2 border-b border-app-border bg-app-bg px-3 py-2 text-xs font-medium text-app-muted">
                    <div className="col-span-4">Name</div>
                    <div className="col-span-3">Slug</div>
                    <div className="col-span-2">Visibility</div>
                    <div className="col-span-1">Opens</div>
                    <div className="col-span-2 text-right">Aktion</div>
                  </div>
                  <div className="divide-y divide-app-border">
                    {invitations.map((inv) => (
                      <div key={inv.id} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm">
                        <div className="col-span-4 min-w-0">
                          <div className="truncate text-sm font-medium text-app-fg">
                            {inv.isActive ? '' : '[inactive] '} {inv.name}
                          </div>
                          <div className="mt-0.5 text-xs text-app-muted">
                            {inv.hasPassword ? '🔒 password' : 'no password'} · {new Date(inv.updatedAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="col-span-3 font-mono text-xs text-app-fg break-all">{inv.slug}</div>
                        <div className="col-span-2">
                          <span className="rounded-md bg-app-bg px-2 py-1 text-xs text-app-fg">{inv.visibility}</span>
                        </div>
                        <div className="col-span-1 text-xs text-app-muted">{inv.opens ?? 0}</div>
                        <div className="col-span-2 flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(`${window.location.origin.replace(/^https?:\/\//, 'https://').replace('dash.', 'app.')}/i/${inv.slug}`);
                                toast.success('Invitation URL kopiert');
                              } catch {
                                toast.error('Kopieren fehlgeschlagen');
                              }
                            }}
                          >
                            Copy URL
                          </Button>
                          <Button size="sm" variant="primary" onClick={() => setEditingInvitationId(inv.id)}>
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))}
                    {!invitations.length && !loadingInvitations ? (
                      <div className="px-3 py-4 text-sm text-app-muted">Keine Einladungen</div>
                    ) : null}
                  </div>
                </div>

                {selectedInvitation ? (
                  <div className="mt-5 rounded-xl border border-app-border bg-app-bg p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-app-fg">Editor: {selectedInvitation.slug}</div>
                        <div className="mt-1 text-xs text-app-muted">id: {selectedInvitation.id}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => deactivateInvitation(selectedInvitation.id)} disabled={savingInvitation}>
                          {savingInvitation ? '…' : 'Deaktivieren'}
                        </Button>
                        <Button size="sm" variant="primary" onClick={saveInvitation} disabled={savingInvitation}>
                          {savingInvitation ? 'Speichere…' : 'Speichern'}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <div className="mb-1 text-xs text-app-muted">Name *</div>
                        <Input value={editInviteName} onChange={(e) => setEditInviteName(e.target.value)} />
                      </div>
                      <div>
                        <div className="mb-1 text-xs text-app-muted">Visibility</div>
                        <Select value={editInviteVisibility} onValueChange={(v) => setEditInviteVisibility(v as any)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UNLISTED">UNLISTED</SelectItem>
                            <SelectItem value="PUBLIC">PUBLIC</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2">
                        <div className="mb-1 text-xs text-app-muted">Password (leer = entfernen)</div>
                        <Input value={editInvitePassword} onChange={(e) => setEditInvitePassword(e.target.value)} placeholder="(leer = entfernen)" />
                      </div>
                      <div className="md:col-span-2">
                        <div className="mb-1 text-xs text-app-muted">Config JSON (leer = unverändert/leer)</div>
                        <Textarea value={editInviteConfigJson} onChange={(e) => setEditInviteConfigJson(e.target.value)} rows={10} />
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <div className="mb-1 text-xs text-app-muted">Shortlink channel (optional)</div>
                        <Input value={shortlinkChannel} onChange={(e) => setShortlinkChannel(e.target.value)} placeholder="default" />
                      </div>
                      <div className="flex items-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => createInvitationShortlink(selectedInvitation.id)}
                          disabled={creatingShortlink}
                          className="w-full"
                        >
                          {creatingShortlink ? 'Erstelle…' : 'Shortlink erstellen'}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-xs font-medium text-app-muted">Shortlinks</div>
                      <div className="mt-2 space-y-2">
                        {(selectedInvitation.shortLinks || []).slice(0, 8).map((sl) => (
                          <div
                            key={sl.id}
                            className="flex flex-col gap-1 rounded-lg border border-app-border bg-app-card p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-xs text-app-muted">{sl.channel || 'default'} · {new Date(sl.createdAt).toLocaleString()}</div>
                              <div className="break-all font-mono text-xs text-app-fg">{sl.url}</div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(sl.url);
                                  toast.success('Kopiert');
                                } catch {
                                  toast.error('Kopieren fehlgeschlagen');
                                }
                              }}
                            >
                              Copy
                            </Button>
                          </div>
                        ))}
                        {!selectedInvitation.shortLinks?.length ? (
                          <div className="text-sm text-app-muted">Noch keine Shortlinks.</div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </Card>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-app-fg">Upload Date Policy</h2>
            <p className="mt-1 text-sm text-app-muted">
              Steuert, ob Uploads gegen Event-/Album-Datum geprüft werden und welche Toleranz gilt.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={uploadDateEnabled}
                  onChange={(e) => setUploadDateEnabled(e.target.checked)}
                />
                <span className="text-sm text-app-fg">Aktiv (Datum prüfen)</span>
              </div>
              <div>
                <label className="mb-1 block text-sm text-app-muted">Toleranz (Tage)</label>
                <Input
                  className="px-3 py-2"
                  value={uploadDateToleranceDays}
                  onChange={(e) => setUploadDateToleranceDays(e.target.value)}
                  placeholder="Default: 1"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <Button
                onClick={saveUploadDatePolicy}
                variant="primary"
                disabled={savingDatePolicy}
              >
                {savingDatePolicy ? 'Speichern…' : 'Speichern'}
              </Button>
              <p className="text-sm text-app-muted">Speichert in: featuresConfig.uploadDatePolicy</p>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-app-fg">Upload Rate Limits</h2>
            <p className="mt-1 text-sm text-app-muted">
              Diese Werte überschreiben die Defaults pro Event. Leer lassen = Default.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div>
                <label className="mb-1 block text-sm text-app-muted">Photo Uploads pro IP (5 min)</label>
                <Input
                  className="px-3 py-2"
                  value={photoIpMax}
                  onChange={(e) => setPhotoIpMax(e.target.value)}
                  placeholder="Default: 120"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-app-muted">Photo Uploads pro Event (5 min)</label>
                <Input
                  className="px-3 py-2"
                  value={photoEventMax}
                  onChange={(e) => setPhotoEventMax(e.target.value)}
                  placeholder="Default: 1000"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-app-muted">Video Uploads pro IP (10 min)</label>
                <Input
                  className="px-3 py-2"
                  value={videoIpMax}
                  onChange={(e) => setVideoIpMax(e.target.value)}
                  placeholder="Default: 20"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-app-muted">Video Uploads pro Event (10 min)</label>
                <Input
                  className="px-3 py-2"
                  value={videoEventMax}
                  onChange={(e) => setVideoEventMax(e.target.value)}
                  placeholder="Default: 150"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <Button
                onClick={saveUploadRateLimits}
                variant="primary"
                disabled={savingLimits}
              >
                {savingLimits ? 'Speichern…' : 'Speichern'}
              </Button>
              <p className="text-sm text-app-muted">Speichert in: featuresConfig.uploadRateLimits</p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-app-fg">Upload Issues</h2>
                <p className="mt-1 text-sm text-app-muted">
                  Monitoring von abgebrochenen Uploads, Scan-Problemen und abgelaufenen Gästebuch-Foto-Uploads.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-app-muted">Zeitraum</label>
                <Select value={String(sinceHours)} onValueChange={(v) => setSinceHours(parseInt(v, 10))}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">24h</SelectItem>
                    <SelectItem value="72">72h</SelectItem>
                    <SelectItem value="168">7 Tage</SelectItem>
                    <SelectItem value="720">30 Tage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
              <div className="rounded-lg border border-app-border bg-app-bg p-4">
                <div className="text-xs text-app-muted">Temp Photos (DELETED)</div>
                <div className="text-2xl font-semibold text-app-fg">{issues?.counts.tempDeletedPhotos ?? '-'}</div>
              </div>
              <div className="rounded-lg border border-app-border bg-app-bg p-4">
                <div className="text-xs text-app-muted">Temp Videos (DELETED)</div>
                <div className="text-2xl font-semibold text-app-fg">{issues?.counts.tempDeletedVideos ?? '-'}</div>
              </div>
              <div className="rounded-lg border border-app-border bg-app-bg p-4">
                <div className="text-xs text-app-muted">Scan ERROR Photos</div>
                <div className="text-2xl font-semibold text-app-fg">{issues?.counts.scanErrorPhotos ?? '-'}</div>
              </div>
              <div className="rounded-lg border border-app-border bg-app-bg p-4">
                <div className="text-xs text-app-muted">Scan PENDING Photos</div>
                <div className="text-2xl font-semibold text-app-fg">{issues?.counts.scanPendingPhotos ?? '-'}</div>
              </div>
              <div className="rounded-lg border border-app-border bg-app-bg p-4">
                <div className="text-xs text-app-muted">Scan ERROR Videos</div>
                <div className="text-2xl font-semibold text-app-fg">{issues?.counts.scanErrorVideos ?? '-'}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
              <div className="rounded-lg border border-app-border bg-app-bg p-4">
                <div className="text-xs text-app-muted">Scan PENDING Videos</div>
                <div className="text-2xl font-semibold text-app-fg">{issues?.counts.scanPendingVideos ?? '-'}</div>
              </div>
              <div className="rounded-lg border border-app-border bg-app-bg p-4">
                <div className="text-xs text-app-muted">Expired Guestbook Uploads</div>
                <div className="text-2xl font-semibold text-app-fg">{issues?.counts.guestbookExpiredUploads ?? '-'}</div>
              </div>
            </div>

            <div className="mt-6">
              {loadingIssues && <p className="text-sm text-app-muted">Issues werden geladen...</p>}
              {!loadingIssues && errorIssues && <p className="text-sm text-[var(--status-danger)]">{errorIssues}</p>}
              {!loadingIssues && !errorIssues && issues && (
                <p className="text-sm text-app-muted">
                  Gesamt: <span className="font-medium text-app-fg">{totalIssues}</span>
                </p>
              )}
            </div>
          </Card>

          {!loadingIssues && !errorIssues && issues && (
            <div className="space-y-6">
              <Card className="overflow-hidden">
                <div className="px-6 py-4 border-b border-app-border">
                  <h3 className="text-lg font-semibold text-app-fg">Scan ERROR Videos</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-app-border">
                    <thead className="bg-app-bg">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Video ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Uploaded By</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Scan Error</th>
                        <th className="px-6 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border bg-app-card">
                      {issues.items.scanErrorVideos.map((v) => (
                        <tr key={v.id}>
                          <td className="px-6 py-4 text-sm text-app-fg font-mono">{v.id}</td>
                          <td className="px-6 py-4 text-sm text-app-muted font-mono">{new Date(v.createdAt).toLocaleString('de-DE')}</td>
                          <td className="px-6 py-4 text-sm text-app-muted font-mono">{v.uploadedBy || '-'}</td>
                          <td className="px-6 py-4 text-sm text-app-muted font-mono">{v.scanError || '-'}</td>
                          <td className="px-6 py-4 text-right text-sm">
                            <Button
                              size="sm"
                              onClick={() => setConfirmCleanAction({ kind: 'video', id: v.id })}
                              variant="primary"
                              disabled={markingVideoClean === v.id}
                            >
                              {markingVideoClean === v.id ? '…' : 'Freigeben'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {issues.items.scanErrorVideos.length === 0 && (
                        <tr>
                          <td className="px-6 py-6 text-sm text-app-muted" colSpan={5}>
                            Keine Einträge
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card className="overflow-hidden">
                <div className="px-6 py-4 border-b border-app-border">
                  <h3 className="text-lg font-semibold text-app-fg">Scan PENDING Videos</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-app-border">
                    <thead className="bg-app-bg">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Video ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Uploaded By</th>
                        <th className="px-6 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border bg-app-card">
                      {issues.items.scanPendingVideos.map((v) => (
                        <tr key={v.id}>
                          <td className="px-6 py-4 text-sm text-app-fg font-mono">{v.id}</td>
                          <td className="px-6 py-4 text-sm text-app-muted font-mono">{new Date(v.createdAt).toLocaleString('de-DE')}</td>
                          <td className="px-6 py-4 text-sm text-app-muted font-mono">{v.uploadedBy || '-'}</td>
                          <td className="px-6 py-4 text-right text-sm">
                            <Button
                              size="sm"
                              onClick={() => setConfirmCleanAction({ kind: 'video', id: v.id })}
                              variant="primary"
                              disabled={markingVideoClean === v.id}
                            >
                              {markingVideoClean === v.id ? '…' : 'Freigeben'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {issues.items.scanPendingVideos.length === 0 && (
                        <tr>
                          <td className="px-6 py-6 text-sm text-app-muted" colSpan={4}>
                            Keine Einträge
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card className="overflow-hidden">
                <div className="px-6 py-4 border-b border-app-border">
                  <h3 className="text-lg font-semibold text-app-fg">Scan ERROR Photos</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-app-border">
                    <thead className="bg-app-bg">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Photo ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Uploaded By</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Scan Error</th>
                        <th className="px-6 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border bg-app-card">
                      {issues.items.scanErrorPhotos.map((p) => (
                        <tr key={p.id}>
                          <td className="px-6 py-4 text-sm text-app-fg font-mono">{p.id}</td>
                          <td className="px-6 py-4 text-sm text-app-muted font-mono">{new Date(p.createdAt).toLocaleString('de-DE')}</td>
                          <td className="px-6 py-4 text-sm text-app-muted font-mono">{p.uploadedBy || '-'}</td>
                          <td className="px-6 py-4 text-sm text-app-muted font-mono">{p.scanError || '-'}</td>
                          <td className="px-6 py-4 text-right text-sm">
                            <Button
                              size="sm"
                              onClick={() => setConfirmCleanAction({ kind: 'photo', id: p.id })}
                              variant="primary"
                              disabled={markingClean === p.id}
                            >
                              {markingClean === p.id ? '…' : 'Freigeben'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {issues.items.scanErrorPhotos.length === 0 && (
                        <tr>
                          <td className="px-6 py-6 text-sm text-app-muted" colSpan={5}>
                            Keine Einträge
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card className="overflow-hidden">
                <div className="px-6 py-4 border-b border-app-border">
                  <h3 className="text-lg font-semibold text-app-fg">Scan PENDING Photos</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-app-border">
                    <thead className="bg-app-bg">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Photo ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Uploaded By</th>
                        <th className="px-6 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border bg-app-card">
                      {issues.items.scanPendingPhotos.map((p) => (
                        <tr key={p.id}>
                          <td className="px-6 py-4 text-sm text-app-fg font-mono">{p.id}</td>
                          <td className="px-6 py-4 text-sm text-app-muted font-mono">{new Date(p.createdAt).toLocaleString('de-DE')}</td>
                          <td className="px-6 py-4 text-sm text-app-muted font-mono">{p.uploadedBy || '-'}</td>
                          <td className="px-6 py-4 text-right text-sm">
                            <Button
                              size="sm"
                              onClick={() => setConfirmCleanAction({ kind: 'photo', id: p.id })}
                              variant="primary"
                              disabled={markingClean === p.id}
                            >
                              {markingClean === p.id ? '…' : 'Freigeben'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {issues.items.scanPendingPhotos.length === 0 && (
                        <tr>
                          <td className="px-6 py-6 text-sm text-app-muted" colSpan={4}>
                            Keine Einträge
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              <IssuesTable
                title="Temp Photos (DELETED)"
                columns={['Photo ID', 'Created', 'DeletedAt', 'Uploaded By']}
                rows={issues.items.tempDeletedPhotos.map((p) => [
                  p.id,
                  new Date(p.createdAt).toLocaleString('de-DE'),
                  p.deletedAt ? new Date(p.deletedAt).toLocaleString('de-DE') : '-',
                  p.uploadedBy || '-',
                ])}
              />

              <IssuesTable
                title="Temp Videos (DELETED)"
                columns={['Video ID', 'Created', 'DeletedAt', 'Uploaded By']}
                rows={issues.items.tempDeletedVideos.map((v) => [
                  v.id,
                  new Date(v.createdAt).toLocaleString('de-DE'),
                  v.deletedAt ? new Date(v.deletedAt).toLocaleString('de-DE') : '-',
                  v.uploadedBy || '-',
                ])}
              />

              <IssuesTable
                title="Expired Guestbook Uploads (invalidiert, Datei bleibt)"
                columns={['Upload ID', 'Created', 'ExpiresAt', 'SizeBytes']}
                rows={issues.items.guestbookExpiredUploads.map((u) => [
                  u.id,
                  new Date(u.createdAt).toLocaleString('de-DE'),
                  new Date(u.expiresAt).toLocaleString('de-DE'),
                  u.sizeBytes,
                ])}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IssuesTable(props: { title: string; columns: string[]; rows: string[][] }) {
  const { title, columns, rows } = props;

  return (
    <Card className="overflow-hidden">
      <div className="px-6 py-4 border-b border-app-border">
        <h3 className="text-lg font-semibold text-app-fg">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-app-border">
          <thead className="bg-app-bg">
            <tr>
              {columns.map((c) => (
                <th
                  key={c}
                  className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border bg-app-card">
            {rows.map((row, idx) => (
              <tr key={idx}>
                {row.map((cell, j) => (
                  <td key={j} className="px-6 py-4 text-sm text-app-muted font-mono">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-6 py-6 text-sm text-app-muted" colSpan={columns.length}>
                  Keine Einträge
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
