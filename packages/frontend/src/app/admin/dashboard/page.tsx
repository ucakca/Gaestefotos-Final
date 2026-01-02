'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { authApi } from '@/lib/auth';
import api from '@/lib/api';
import { User } from '@gaestefotos/shared';
import HelpTooltip from '@/components/ui/HelpTooltip';
import { Checkbox } from '@/components/ui/Checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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

  const sectionCardClass = 'bg-app-card rounded-2xl border border-app-border shadow-sm p-6';

  const [activeSection, setActiveSection] = useState<'packages' | 'cms' | 'apiKeys' | 'emailTemplates' | 'maintenance' | 'more'>('packages');

  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({
    packages: true,
    cms: true,
    apiKeys: true,
    emailTemplates: true,
    maintenance: true,
  });

  const togglePanel = (key: string) => {
    setOpenPanels((prev) => ({ ...prev, [key]: prev[key] === false }));
  };

  const ActionButton = ({
    children,
    onClick,
    variant = 'primary',
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
  }) => {
    const mappedVariant: 'primary' | 'secondary' | 'danger' =
      variant === 'danger' ? 'danger' : variant === 'secondary' ? 'secondary' : 'primary';
    return (
      <Button
        type="button"
        onClick={onClick}
        disabled={disabled}
        variant={mappedVariant}
        size="sm"
        className="font-semibold"
      >
        {children}
      </Button>
    );
  };

  const SectionHeader = ({
    title,
    helpTitle,
    helpContent,
    actions,
  }: {
    title: string;
    helpTitle?: string;
    helpContent: string;
    actions?: React.ReactNode;
  }) => (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="text-lg font-semibold text-app-fg">{title}</h2>
        <HelpTooltip title={helpTitle || title} content={helpContent} />
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );

  const [packages, setPackages] = useState<any[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [packagesError, setPackagesError] = useState<string | null>(null);

  const [newPkg, setNewPkg] = useState({
    sku: '',
    name: '',
    type: 'BASE',
    resultingTier: 'SMART',
    upgradeFromTier: '',
    storageLimitBytes: '',
    storageDurationDays: '',
    isActive: true,
  });

  const [editingPkg, setEditingPkg] = useState<any | null>(null);

  const [usageEventId, setUsageEventId] = useState('');
  const [usageResult, setUsageResult] = useState<any | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);

  const [upgradeEventId, setUpgradeEventId] = useState('');
  const [upgradeSku, setUpgradeSku] = useState('');
  const [upgradeProductId, setUpgradeProductId] = useState('');
  const [upgradeUrl, setUpgradeUrl] = useState<string | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  const [qrEventId, setQrEventId] = useState('');
  const [qrEventSlug, setQrEventSlug] = useState<string>('');
  const [qrEventTitle, setQrEventTitle] = useState<string>('');
  const [qrEventLoading, setQrEventLoading] = useState(false);
  const [qrEventError, setQrEventError] = useState<string | null>(null);

  const [qrFormat, setQrFormat] = useState<'A6' | 'A5'>('A6');
  const [qrBleedMm, setQrBleedMm] = useState('3');
  const [qrCropMarks, setQrCropMarks] = useState(true);
  const [qrExporting, setQrExporting] = useState(false);
  const [qrExportError, setQrExportError] = useState<string | null>(null);

  const [qrTrafficLoading, setQrTrafficLoading] = useState(false);
  const [qrTrafficError, setQrTrafficError] = useState<string | null>(null);
  const [qrTrafficStats, setQrTrafficStats] = useState<any[] | null>(null);

  const [wooLogs, setWooLogs] = useState<any[]>([]);
  const [wooLogsLoading, setWooLogsLoading] = useState(false);
  const [wooLogsError, setWooLogsError] = useState<string | null>(null);
  const [wooFilterStatus, setWooFilterStatus] = useState('');
  const [wooFilterOrderId, setWooFilterOrderId] = useState('');
  const [wooFilterEventId, setWooFilterEventId] = useState('');

  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [apiKeysError, setApiKeysError] = useState<string | null>(null);
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [newApiKeyScopes, setNewApiKeyScopes] = useState('');
  const [newApiKeyExpiresAt, setNewApiKeyExpiresAt] = useState('');
  const [createApiKeyLoading, setCreateApiKeyLoading] = useState(false);
  const [createdApiKeyRaw, setCreatedApiKeyRaw] = useState<string | null>(null);
  const [createdApiKeyMeta, setCreatedApiKeyMeta] = useState<any | null>(null);

  const [invoiceStatus, setInvoiceStatus] = useState('');
  const [invoiceEventId, setInvoiceEventId] = useState('');
  const [invoiceWcOrderId, setInvoiceWcOrderId] = useState('');
  const [invoiceWpUserId, setInvoiceWpUserId] = useState('');

  const [impersonateUserId, setImpersonateUserId] = useState('');
  const [impersonateReason, setImpersonateReason] = useState('Support');
  const [impersonateLoading, setImpersonateLoading] = useState(false);
  const [impersonateError, setImpersonateError] = useState<string | null>(null);
  const [impersonateResult, setImpersonateResult] = useState<any | null>(null);
  const [invoiceExporting, setInvoiceExporting] = useState(false);
  const [invoiceExportError, setInvoiceExportError] = useState<string | null>(null);

  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);
  const [maintenanceError, setMaintenanceError] = useState<string | null>(null);

  const [emailTplKind, setEmailTplKind] = useState<'INVITATION' | 'STORAGE_ENDS_REMINDER' | 'PHOTO_NOTIFICATION'>('INVITATION');
  const [emailTplLoading, setEmailTplLoading] = useState(false);
  const [emailTplSaving, setEmailTplSaving] = useState(false);
  const [emailTplError, setEmailTplError] = useState<string | null>(null);
  const [emailTplName, setEmailTplName] = useState('');
  const [emailTplSubject, setEmailTplSubject] = useState('');
  const [emailTplHtml, setEmailTplHtml] = useState('');
  const [emailTplText, setEmailTplText] = useState('');
  const [emailTplIsActive, setEmailTplIsActive] = useState(true);

  const [emailTplVarsJson, setEmailTplVarsJson] = useState('{\n  "eventTitle": "Demo Event",\n  "eventSlug": "demo",\n  "guestName": "Max Mustermann",\n  "eventUrl": "https://app.gästefotos.com/e2/demo/invitation",\n  "hostName": "Host",\n  "dashboardUrl": "https://app.gästefotos.com/events/demo/dashboard",\n  "photoCount": 1,\n  "status": "approved",\n  "message": "Dein Foto wurde freigegeben!",\n  "subjectPrefix": "Morgen",\n  "storageEndsAt": "01.01.2030",\n  "daysBefore": 1\n}');
  const [emailTplPreviewLoading, setEmailTplPreviewLoading] = useState(false);
  const [emailTplPreview, setEmailTplPreview] = useState<any | null>(null);

  const [emailTplTestTo, setEmailTplTestTo] = useState('');
  const [emailTplTestSending, setEmailTplTestSending] = useState(false);

  const [cmsFaqKind, setCmsFaqKind] = useState<'pages' | 'posts'>('pages');
  const [cmsFaqSlug, setCmsFaqSlug] = useState('faq');
  const [cmsFaqLoading, setCmsFaqLoading] = useState(false);
  const [cmsFaqError, setCmsFaqError] = useState<string | null>(null);
  const [cmsFaqResult, setCmsFaqResult] = useState<any | null>(null);

  const [cmsSearchQuery, setCmsSearchQuery] = useState('faq');
  const [cmsSearchLoading, setCmsSearchLoading] = useState(false);
  const [cmsSearchError, setCmsSearchError] = useState<string | null>(null);
  const [cmsSearchResult, setCmsSearchResult] = useState<any | null>(null);

  const [cmsSyncSaving, setCmsSyncSaving] = useState(false);
  const [cmsSnapshotsLoading, setCmsSnapshotsLoading] = useState(false);
  const [cmsSnapshots, setCmsSnapshots] = useState<any[]>([]);
  const [cmsLastSync, setCmsLastSync] = useState<any | null>(null);

  useEffect(() => {
    // Check if user is authenticated and is admin
    const checkAuth = async () => {
      try {
        const response = await authApi.getMe();
        if (response.user) {
          const role = response.user.role?.toUpperCase();
          if (role !== 'ADMIN') {
            // Not an admin, redirect to regular dashboard
            router.push('/dashboard');
            return;
          }
          setUser(response.user);
        } else {
          router.push('/login');
        }
      } catch (error) {
        void error;
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  const loadCmsSnapshots = async () => {
    try {
      setCmsFaqError(null);
      setCmsSnapshotsLoading(true);
      const { data } = await api.get('/admin/cms/snapshots');
      setCmsSnapshots(Array.isArray(data?.items) ? data.items : []);
    } catch (err: any) {
      setCmsFaqError(err?.response?.data?.error || err?.message || 'Snapshots konnten nicht geladen werden');
    } finally {
      setCmsSnapshotsLoading(false);
    }
  };

  const syncAndSaveCms = async () => {
    try {
      setCmsFaqError(null);
      setCmsSyncSaving(true);
      setCmsLastSync(null);
      const slug = cmsFaqSlug.trim();
      if (!slug) {
        setCmsFaqError('Bitte slug setzen');
        return;
      }
      const { data } = await api.post('/admin/cms/sync', { kind: cmsFaqKind, slug });
      setCmsLastSync(data || null);
      await loadCmsSnapshots();
    } catch (err: any) {
      setCmsFaqError(err?.response?.data?.error || err?.message || 'Sync fehlgeschlagen');
    } finally {
      setCmsSyncSaving(false);
    }
  };

  const loadEmailTemplate = async (kind: 'INVITATION' | 'STORAGE_ENDS_REMINDER' | 'PHOTO_NOTIFICATION') => {
    try {
      setEmailTplError(null);
      setEmailTplLoading(true);
      setEmailTplPreview(null);
      const { data } = await api.get(`/admin/email-templates/${kind}`);
      const t = data?.template;
      if (!t) {
        setEmailTplName(kind);
        setEmailTplSubject('');
        setEmailTplHtml('');
        setEmailTplText('');
        setEmailTplIsActive(true);
        return;
      }
      setEmailTplName(typeof t?.name === 'string' ? t.name : kind);
      setEmailTplSubject(typeof t?.subject === 'string' ? t.subject : '');
      setEmailTplHtml(typeof t?.html === 'string' ? t.html : '');
      setEmailTplText(typeof t?.text === 'string' ? t.text : '');
      setEmailTplIsActive(t?.isActive !== false);
    } catch (err: any) {
      setEmailTplError(err?.response?.data?.error || err?.message || 'Fehler beim Laden des Email-Templates');
    } finally {
      setEmailTplLoading(false);
    }
  };

  const baseOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const hostEventUrl = qrEventId && baseOrigin ? `${baseOrigin}/events/${qrEventId}` : '';
  const guestEventUrl = qrEventSlug && baseOrigin ? `${baseOrigin}/e/${qrEventSlug}?source=qr` : '';

  const loadQrTraffic = async () => {
    try {
      setQrTrafficError(null);
      setQrTrafficStats(null);

      const eventId = qrEventId.trim();
      if (!eventId) {
        setQrTrafficError('Bitte eventId eingeben');
        return;
      }

      setQrTrafficLoading(true);
      const { data } = await api.get(`/events/${eventId}/traffic`);
      setQrTrafficStats(Array.isArray(data?.stats) ? data.stats : []);
    } catch (err: any) {
      setQrTrafficError(err?.response?.data?.error || err?.message || 'Traffic konnte nicht geladen werden');
    } finally {
      setQrTrafficLoading(false);
    }
  };

  const loadQrEvent = async () => {
    try {
      setQrEventError(null);
      setQrEventSlug('');
      setQrEventTitle('');
      const eventId = qrEventId.trim();
      if (!eventId) {
        setQrEventError('Bitte eventId eingeben');
        return;
      }
      setQrEventLoading(true);
      const { data } = await api.get(`/events/${eventId}`);
      const ev = data?.event;
      setQrEventSlug(typeof ev?.slug === 'string' ? ev.slug : '');
      setQrEventTitle(typeof ev?.title === 'string' ? ev.title : '');
    } catch (err: any) {
      setQrEventError(err?.response?.data?.error || err?.message || 'Fehler beim Laden des Events');
    } finally {
      setQrEventLoading(false);
    }
  };

  const downloadBlob = async (res: Response, filename: string) => {
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportProviderPdf = async () => {
    try {
      setQrExportError(null);
      const eventId = qrEventId.trim();
      if (!eventId) {
        setQrExportError('Bitte eventId eingeben');
        return;
      }
      if (!guestEventUrl) {
        setQrExportError('Bitte zuerst Event laden (Slug fehlt)');
        return;
      }

      const resolveRootCssVar = (name: string, fallback: string) => {
        if (typeof window === 'undefined') return fallback;
        const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return v || fallback;
      };

      const svgBg = resolveRootCssVar('--app-card', '#ffffff');
      const svgFg = resolveRootCssVar('--app-fg', '#111827');
      const svgMuted = resolveRootCssVar('--app-muted', '#6B7280');

      setQrExporting(true);

      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="105mm" height="148mm" viewBox="0 0 1050 1480">
  <rect x="0" y="0" width="1050" height="1480" fill="${svgBg}"/>
  <text x="525" y="220" text-anchor="middle" font-size="52" fill="${svgFg}">QR Aufsteller</text>
  <text x="525" y="290" text-anchor="middle" font-size="28" fill="${svgFg}">${(qrEventTitle || qrEventSlug || '').replace(/</g, '').replace(/>/g, '')}</text>
  <text x="525" y="360" text-anchor="middle" font-size="24" fill="${svgMuted}">${guestEventUrl.replace(/</g, '').replace(/>/g, '')}</text>
  <rect id="gf:qr" x="350" y="470" width="350" height="350" rx="18" fill="${svgBg}" stroke="${svgFg}"/>
</svg>`;

      const bleedMm = Number(qrBleedMm);
      const res = await fetch(`/api/events/${eventId}/qr/export.pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: qrFormat,
          svg,
          bleedMm: Number.isFinite(bleedMm) ? bleedMm : 3,
          cropMarks: !!qrCropMarks,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Export fehlgeschlagen (${res.status})`);
      }

      await downloadBlob(res, `qr-printservice-${eventId}-${qrFormat}-bleed${Number.isFinite(bleedMm) ? bleedMm : 3}-crops${qrCropMarks ? '1' : '0'}.pdf`);
    } catch (err: any) {
      setQrExportError(err?.message || 'Export fehlgeschlagen');
    } finally {
      setQrExporting(false);
    }
  };

  const loadPackages = async () => {
    try {
      setPackagesLoading(true);
      setPackagesError(null);
      const { data } = await api.get('/admin/package-definitions');
      setPackages(Array.isArray(data.packages) ? data.packages : []);
    } catch (err: any) {
      setPackagesError(err.response?.data?.error || 'Fehler beim Laden der Pakete');
    } finally {
      setPackagesLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadApiKeys = async () => {
    try {
      setApiKeysError(null);
      setApiKeysLoading(true);
      const { data } = await api.get('/admin/api-keys');
      setApiKeys(Array.isArray(data?.apiKeys) ? data.apiKeys : []);
    } catch (err: any) {
      setApiKeysError(err?.response?.data?.error || err?.message || 'Fehler beim Laden der API Keys');
    } finally {
      setApiKeysLoading(false);
    }
  };

  const loadMaintenance = async () => {
    try {
      setMaintenanceError(null);
      setMaintenanceLoading(true);
      const { data } = await api.get('/admin/maintenance');
      setMaintenanceEnabled(data?.enabled === true);
      setMaintenanceMessage(typeof data?.message === 'string' ? data.message : '');
    } catch (err: any) {
      setMaintenanceError(err?.response?.data?.error || err?.message || 'Fehler beim Laden des Maintenance Mode');
    } finally {
      setMaintenanceLoading(false);
    }
  };

  useEffect(() => {
    loadApiKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadMaintenance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadEmailTemplate(emailTplKind);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailTplKind]);

  const saveEmailTemplate = async () => {
    try {
      setEmailTplError(null);
      setEmailTplSaving(true);
      await api.put(`/admin/email-templates/${emailTplKind}`, {
        name: (emailTplName || emailTplKind).trim() || emailTplKind,
        subject: emailTplSubject,
        html: emailTplHtml.trim() ? emailTplHtml : null,
        text: emailTplText.trim() ? emailTplText : null,
        isActive: !!emailTplIsActive,
      });
      await loadEmailTemplate(emailTplKind);
    } catch (err: any) {
      setEmailTplError(err?.response?.data?.error || err?.message || 'Fehler beim Speichern');
    } finally {
      setEmailTplSaving(false);
    }
  };

  const previewEmailTemplate = async () => {
    try {
      setEmailTplError(null);
      setEmailTplPreviewLoading(true);
      setEmailTplPreview(null);

      let variables: any = {};
      try {
        variables = JSON.parse(emailTplVarsJson || '{}');
      } catch {
        throw new Error('Variables JSON ist ungültig');
      }

      const { data } = await api.post(`/admin/email-templates/${emailTplKind}/preview`, { variables });
      setEmailTplPreview(data?.rendered || null);
    } catch (err: any) {
      setEmailTplError(err?.response?.data?.error || err?.message || 'Preview fehlgeschlagen');
    } finally {
      setEmailTplPreviewLoading(false);
    }
  };

  const testSendEmailTemplate = async () => {
    try {
      setEmailTplError(null);
      setEmailTplTestSending(true);

      const to = emailTplTestTo.trim();
      if (!to) {
        setEmailTplError('Bitte Test-E-Mail Empfänger eingeben');
        return;
      }

      let variables: any = {};
      try {
        variables = JSON.parse(emailTplVarsJson || '{}');
      } catch {
        throw new Error('Variables JSON ist ungültig');
      }

      await api.post(`/admin/email-templates/${emailTplKind}/test-send`, { to, variables });
    } catch (err: any) {
      setEmailTplError(err?.response?.data?.error || err?.message || 'Test-Send fehlgeschlagen');
    } finally {
      setEmailTplTestSending(false);
    }
  };

  const fetchCmsFaqPreview = async () => {
    try {
      setCmsFaqError(null);
      setCmsFaqLoading(true);
      setCmsFaqResult(null);

      const slug = cmsFaqSlug.trim() || 'faq';
      const kind = cmsFaqKind;
      const { data } = await api.get(`/admin/cms/faq/preview?kind=${encodeURIComponent(kind)}&slug=${encodeURIComponent(slug)}`);
      setCmsFaqResult(data || null);
    } catch (err: any) {
      setCmsFaqError(err?.response?.data?.error || err?.message || 'CMS Preview fehlgeschlagen');
    } finally {
      setCmsFaqLoading(false);
    }
  };

  const searchCmsWp = async () => {
    try {
      setCmsSearchError(null);
      setCmsSearchLoading(true);
      setCmsSearchResult(null);

      const q = cmsSearchQuery.trim();
      if (!q) {
        setCmsSearchError('Bitte Suchbegriff eingeben');
        return;
      }

      const { data } = await api.get(`/admin/cms/wp/${cmsFaqKind}/search?query=${encodeURIComponent(q)}`);
      setCmsSearchResult(data || null);
    } catch (err: any) {
      setCmsSearchError(err?.response?.data?.error || err?.message || 'CMS Search fehlgeschlagen');
    } finally {
      setCmsSearchLoading(false);
    }
  };

  const loadCmsWpRecent = async () => {
    try {
      setCmsSearchError(null);
      setCmsSearchLoading(true);
      setCmsSearchResult(null);
      const { data } = await api.get(`/admin/cms/wp/${cmsFaqKind}/recent?perPage=20`);
      setCmsSearchResult(data || null);
    } catch (err: any) {
      setCmsSearchError(err?.response?.data?.error || err?.message || 'CMS Recent fehlgeschlagen');
    } finally {
      setCmsSearchLoading(false);
    }
  };

  const saveMaintenance = async () => {
    try {
      setMaintenanceError(null);
      setMaintenanceSaving(true);
      await api.put('/admin/maintenance', {
        enabled: maintenanceEnabled,
        message: maintenanceMessage.trim() || null,
      });
      await loadMaintenance();
    } catch (err: any) {
      setMaintenanceError(err?.response?.data?.error || err?.message || 'Fehler beim Speichern');
    } finally {
      setMaintenanceSaving(false);
    }
  };

  const createApiKey = async () => {
    try {
      setCreatedApiKeyRaw(null);
      setCreatedApiKeyMeta(null);
      setApiKeysError(null);
      setCreateApiKeyLoading(true);

      const name = newApiKeyName.trim();
      if (!name) {
        setApiKeysError('Bitte Name eingeben');
        return;
      }

      const scopes = newApiKeyScopes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const expiresAt = newApiKeyExpiresAt.trim() ? new Date(newApiKeyExpiresAt.trim()).toISOString() : null;

      const { data } = await api.post('/admin/api-keys', {
        name,
        scopes,
        expiresAt,
      });

      setCreatedApiKeyRaw(typeof data?.rawKey === 'string' ? data.rawKey : null);
      setCreatedApiKeyMeta(data?.apiKey || null);
      setNewApiKeyName('');
      setNewApiKeyScopes('');
      setNewApiKeyExpiresAt('');
      await loadApiKeys();
    } catch (err: any) {
      setApiKeysError(err?.response?.data?.error || err?.message || 'Fehler beim Erstellen des API Keys');
    } finally {
      setCreateApiKeyLoading(false);
    }
  };

  const revokeApiKey = async (id: string) => {
    try {
      setApiKeysError(null);
      await api.post(`/admin/api-keys/${id}/revoke`);
      await loadApiKeys();
    } catch (err: any) {
      setApiKeysError(err?.response?.data?.error || err?.message || 'Fehler beim Revoken des API Keys');
    }
  };

  const exportInvoicesCsv = async () => {
    try {
      setInvoiceExportError(null);
      setInvoiceExporting(true);
      const qs = new URLSearchParams();
      if (invoiceStatus.trim()) qs.set('status', invoiceStatus.trim());
      if (invoiceEventId.trim()) qs.set('eventId', invoiceEventId.trim());
      if (invoiceWcOrderId.trim()) qs.set('wcOrderId', invoiceWcOrderId.trim());
      if (invoiceWpUserId.trim()) qs.set('wpUserId', invoiceWpUserId.trim());

      const url = `/api/admin/invoices/export.csv?${qs.toString()}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Export fehlgeschlagen (${res.status})`);
      }
      await downloadBlob(res, 'invoices.csv');
    } catch (err: any) {
      setInvoiceExportError(err?.message || 'Export fehlgeschlagen');
    } finally {
      setInvoiceExporting(false);
    }
  };

  const issueImpersonationToken = async () => {
    try {
      setImpersonateError(null);
      setImpersonateResult(null);
      setImpersonateLoading(true);

      const userId = impersonateUserId.trim();
      if (!userId) {
        setImpersonateError('Bitte userId eingeben');
        return;
      }

      const { data } = await api.post('/admin/impersonation/token', {
        userId,
        reason: impersonateReason.trim() || undefined,
      });

      setImpersonateResult(data || null);

      const token = String(data?.token || '');
      if (token) {
        window.open(`/dashboard?token=${encodeURIComponent(token)}`, '_blank', 'noreferrer');
      }
    } catch (err: any) {
      setImpersonateError(err?.response?.data?.error || err?.message || 'Impersonation fehlgeschlagen');
    } finally {
      setImpersonateLoading(false);
    }
  };

  const loadWooLogs = async () => {
    try {
      setWooLogsError(null);
      setWooLogsLoading(true);
      const qs = new URLSearchParams();
      if (wooFilterStatus.trim()) qs.set('status', wooFilterStatus.trim());
      if (wooFilterOrderId.trim()) qs.set('wcOrderId', wooFilterOrderId.trim());
      if (wooFilterEventId.trim()) qs.set('eventId', wooFilterEventId.trim());
      qs.set('limit', '50');
      const { data } = await api.get(`/admin/webhooks/woocommerce/logs?${qs.toString()}`);
      setWooLogs(Array.isArray(data?.logs) ? data.logs : []);
    } catch (err: any) {
      setWooLogsError(err?.response?.data?.error || err?.message || 'Fehler beim Laden der Webhook Logs');
    } finally {
      setWooLogsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-app-border border-t-tokens-brandGreen" />
          <p className="mt-4 text-sm font-medium text-app-fg">Lade Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
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

      <div className="min-h-screen bg-app-bg">
        <header className="sticky top-0 z-10 border-b border-app-border bg-app-card/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-4">
            <Logo width={150} height={60} />
            <div className="flex items-center gap-4">
              <span className="hidden text-sm font-semibold text-app-fg sm:inline">Admin Dashboard</span>
              <span className="text-sm text-app-muted">
                {user.name} ({user.email})
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  authApi.logout();
                  router.push('/login');
                }}
              >
                Abmelden
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] px-6 py-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <aside className="w-full shrink-0 rounded-2xl border border-app-border bg-app-card p-4 lg:sticky lg:top-24 lg:w-[300px]">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-app-fg">Admin Navigation</div>
              <HelpTooltip
                title="Navigation"
                content={'Links springst du direkt zu den Admin-Bereichen.\n\nTipp: So bleibt das Dashboard übersichtlich, auch wenn es viele Tools gibt.'}
              />
            </div>
              <div className="mt-2 text-xs text-app-muted">{user.email}</div>

              <div className="mt-4 grid gap-2">
                <Button
                  type="button"
                  onClick={() => setActiveSection('packages')}
                  variant={activeSection === 'packages' ? 'primary' : 'secondary'}
                  size="sm"
                  className="w-full justify-start font-semibold"
                >
                  Commerce (Pakete)
                </Button>
                <Button
                  type="button"
                  onClick={() => setActiveSection('cms')}
                  variant={activeSection === 'cms' ? 'primary' : 'secondary'}
                  size="sm"
                  className="w-full justify-start font-semibold"
                >
                  CMS (WordPress)
                </Button>
                <Button
                  type="button"
                  onClick={() => setActiveSection('apiKeys')}
                  variant={activeSection === 'apiKeys' ? 'primary' : 'secondary'}
                  size="sm"
                  className="w-full justify-start font-semibold"
                >
                  API Keys
                </Button>
                <Button
                  type="button"
                  onClick={() => setActiveSection('emailTemplates')}
                  variant={activeSection === 'emailTemplates' ? 'primary' : 'secondary'}
                  size="sm"
                  className="w-full justify-start font-semibold"
                >
                  E-Mail Templates
                </Button>
                <Button
                  type="button"
                  onClick={() => setActiveSection('maintenance')}
                  variant={activeSection === 'maintenance' ? 'primary' : 'secondary'}
                  size="sm"
                  className="w-full justify-start font-semibold"
                >
                  Maintenance
                </Button>
                <Button
                  type="button"
                  onClick={() => setActiveSection('more')}
                  variant={activeSection === 'more' ? 'primary' : 'secondary'}
                  size="sm"
                  className="w-full justify-start font-semibold"
                >
                  Weitere Tools
                </Button>
              </div>
            </aside>

            <div className="min-w-0 flex-1">
              <h1 className="mb-2 text-2xl font-semibold tracking-tight text-app-fg">Admin Dashboard</h1>
              <p className="mb-6 text-sm text-app-muted">
                Aufgeräumt: Nutze links die Navigation, um schnell zum richtigen Bereich zu springen.
              </p>

              <div className="grid gap-6">
            {activeSection === 'packages' && (
            <section id="admin-packages" className={sectionCardClass}>
              <SectionHeader
                title="Pakete / Upgrades (SKU → Limits)"
                helpTitle="Pakete / Upgrades"
                helpContent={'Hier pflegst du die Produkt-Logik (SKU → Limits/Tier/Dauer).\n\nBedienung:\n- Aktualisieren lädt die aktuellen Pakete.\n- Neues Paket erstellt eine neue Definition.\n- Bearbeiten aktualisiert eine bestehende Definition.'}
                actions={
                  <>
                    <ActionButton variant="secondary" onClick={() => togglePanel('packages')}>
                      {openPanels.packages ? 'Einklappen' : 'Aufklappen'}
                    </ActionButton>
                    <ActionButton onClick={loadPackages}>Aktualisieren</ActionButton>
                  </>
                }
              />

              {openPanels.packages && (
                <>

              {packagesError && (
                <p className="mt-3 text-sm text-[var(--status-danger)]">{packagesError}</p>
              )}

              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-app-border text-left">
                      <th className="p-2 font-semibold text-app-fg">SKU</th>
                      <th className="p-2 font-semibold text-app-fg">Name</th>
                      <th className="p-2 font-semibold text-app-fg">Typ</th>
                      <th className="p-2 font-semibold text-app-fg">Tier</th>
                      <th className="p-2 font-semibold text-app-fg">From</th>
                      <th className="p-2 font-semibold text-app-fg">Limit (Bytes)</th>
                      <th className="p-2 font-semibold text-app-fg">Dauer (Tage)</th>
                      <th className="p-2 font-semibold text-app-fg">Aktiv</th>
                      <th className="p-2 font-semibold text-app-fg"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {packagesLoading ? (
                      <tr>
                        <td colSpan={9} className="p-3 text-sm text-app-muted">
                          Lade…
                        </td>
                      </tr>
                    ) : (
                      packages.map((p) => (
                        <tr key={p.id} className="border-b border-app-border">
                        <td className="p-2 font-mono">{p.sku}</td>
                        <td className="p-2">{p.name}</td>
                        <td className="p-2">{p.type}</td>
                        <td className="p-2">{p.resultingTier}</td>
                        <td className="p-2">{p.upgradeFromTier || '-'}</td>
                        <td className="p-2 font-mono">{p.storageLimitBytes ?? '-'}</td>
                        <td className="p-2 font-mono">{p.storageDurationDays ?? '-'}</td>
                        <td className="p-2">{p.isActive ? 'ja' : 'nein'}</td>
                        <td className="p-2 whitespace-nowrap">
                            <ActionButton
                              variant="secondary"
                              onClick={() =>
                                setEditingPkg({
                                  ...p,
                                  storageLimitBytes: p.storageLimitBytes ?? '',
                                  storageDurationDays: p.storageDurationDays ?? '',
                                })
                              }
                            >
                              Bearbeiten
                            </ActionButton>
                            <span className="inline-block w-2" />
                            <ActionButton
                              variant="danger"
                              onClick={async () => {
                                const ok = await requestConfirm({
                                  title: `Paket deaktivieren? ${p.sku}`,
                                  description: 'Das Paket wird deaktiviert und ist nicht mehr kaufbar.',
                                  confirmText: 'Deaktivieren',
                                  cancelText: 'Abbrechen',
                                });
                                if (!ok) return;
                                setPackagesError(null);
                                try {
                                  await api.delete(`/admin/package-definitions/${p.id}`);
                                  await loadPackages();
                                } catch (err: any) {
                                  setPackagesError(err.response?.data?.error || 'Fehler beim Löschen');
                                }
                              }}
                            >
                              Löschen
                            </ActionButton>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

              {/* Create */}
              <div className="mt-5 border-t border-app-border pt-4">
                <h3 className="mb-3 text-sm font-semibold text-app-fg">Neues Paket</h3>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={newPkg.sku}
                      onChange={(e) => setNewPkg({ ...newPkg, sku: e.target.value })}
                      placeholder="SKU"
                      className="font-mono"
                    />
                    <HelpTooltip title="SKU" content={'Produkt-SKU aus WooCommerce. Muss eindeutig sein.'} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={newPkg.name}
                      onChange={(e) => setNewPkg({ ...newPkg, name: e.target.value })}
                      placeholder="Name"
                    />
                    <HelpTooltip title="Name" content={'Interner Anzeigename.'} />
                  </div>
                  <Select value={newPkg.type} onValueChange={(value) => setNewPkg({ ...newPkg, type: value })}>
                    <SelectTrigger className="rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm text-app-fg">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BASE">BASE</SelectItem>
                      <SelectItem value="UPGRADE">UPGRADE</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={newPkg.resultingTier}
                    onChange={(e) => setNewPkg({ ...newPkg, resultingTier: e.target.value })}
                    placeholder="resultingTier"
                  />
                  <Input
                    value={newPkg.upgradeFromTier}
                    onChange={(e) => setNewPkg({ ...newPkg, upgradeFromTier: e.target.value })}
                    placeholder="upgradeFromTier (optional)"
                  />
                  <Input
                    value={newPkg.storageLimitBytes}
                    onChange={(e) => setNewPkg({ ...newPkg, storageLimitBytes: e.target.value })}
                    placeholder="storageLimitBytes (optional)"
                    className="font-mono"
                  />
                  <Input
                    value={newPkg.storageDurationDays}
                    onChange={(e) => setNewPkg({ ...newPkg, storageDurationDays: e.target.value })}
                    placeholder="storageDurationDays (optional)"
                    className="font-mono"
                  />
                  <label className="flex items-center gap-2 text-sm text-app-fg">
                    <Checkbox checked={newPkg.isActive} onCheckedChange={(checked) => setNewPkg({ ...newPkg, isActive: checked })} />
                    aktiv
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <ActionButton
                    onClick={async () => {
                      setPackagesError(null);
                      try {
                        await api.post('/admin/package-definitions', {
                          sku: newPkg.sku.trim(),
                          name: newPkg.name.trim(),
                          type: newPkg.type,
                          resultingTier: newPkg.resultingTier.trim(),
                          upgradeFromTier: newPkg.upgradeFromTier.trim() || null,
                          storageLimitBytes: newPkg.storageLimitBytes.trim() || null,
                          storageDurationDays: newPkg.storageDurationDays.trim() ? Number(newPkg.storageDurationDays.trim()) : null,
                          isActive: newPkg.isActive,
                        });
                        setNewPkg({
                          sku: '',
                          name: '',
                          type: 'BASE',
                          resultingTier: 'SMART',
                          upgradeFromTier: '',
                          storageLimitBytes: '',
                          storageDurationDays: '',
                          isActive: true,
                        });
                        await loadPackages();
                      } catch (err: any) {
                        setPackagesError(err.response?.data?.error || 'Fehler beim Erstellen');
                      }
                    }}
                  >
                    Speichern
                  </ActionButton>
                </div>
              </div>

              {/* Edit */}
              {editingPkg && (
                <div className="mt-5 border-t border-app-border pt-4">
                  <h3 className="mb-3 text-sm font-semibold text-app-fg">
                    Paket bearbeiten: <span className="font-mono">{editingPkg.sku}</span>
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <Input
                      value={editingPkg.sku}
                      onChange={(e) => setEditingPkg({ ...editingPkg, sku: e.target.value })}
                      placeholder="SKU"
                      className="font-mono"
                    />
                    <Input value={editingPkg.name} onChange={(e) => setEditingPkg({ ...editingPkg, name: e.target.value })} placeholder="Name" />
                    <Select value={editingPkg.type} onValueChange={(value) => setEditingPkg({ ...editingPkg, type: value })}>
                      <SelectTrigger className="rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm text-app-fg">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BASE">BASE</SelectItem>
                        <SelectItem value="UPGRADE">UPGRADE</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={editingPkg.resultingTier}
                      onChange={(e) => setEditingPkg({ ...editingPkg, resultingTier: e.target.value })}
                      placeholder="resultingTier"
                    />
                    <Input
                      value={editingPkg.upgradeFromTier || ''}
                      onChange={(e) => setEditingPkg({ ...editingPkg, upgradeFromTier: e.target.value })}
                      placeholder="upgradeFromTier (optional)"
                    />
                    <Input
                      value={editingPkg.storageLimitBytes ?? ''}
                      onChange={(e) => setEditingPkg({ ...editingPkg, storageLimitBytes: e.target.value })}
                      placeholder="storageLimitBytes (optional)"
                      className="font-mono"
                    />
                    <Input
                      value={editingPkg.storageDurationDays ?? ''}
                      onChange={(e) => setEditingPkg({ ...editingPkg, storageDurationDays: e.target.value })}
                      placeholder="storageDurationDays (optional)"
                      className="font-mono"
                    />
                    <label className="flex items-center gap-2 text-sm text-app-fg">
                      <Checkbox checked={!!editingPkg.isActive} onCheckedChange={(checked) => setEditingPkg({ ...editingPkg, isActive: checked })} />
                      aktiv
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <ActionButton
                      onClick={async () => {
                        setPackagesError(null);
                        try {
                          await api.put(`/admin/package-definitions/${editingPkg.id}`, {
                            sku: editingPkg.sku.trim(),
                            name: editingPkg.name.trim(),
                            type: editingPkg.type,
                            resultingTier: editingPkg.resultingTier.trim(),
                            upgradeFromTier: (editingPkg.upgradeFromTier || '').trim() || null,
                            storageLimitBytes: (String(editingPkg.storageLimitBytes || '')).trim() || null,
                            storageDurationDays: (String(editingPkg.storageDurationDays || '')).trim() ? Number(String(editingPkg.storageDurationDays || '').trim()) : null,
                            isActive: !!editingPkg.isActive,
                          });
                          setEditingPkg(null);
                          await loadPackages();
                        } catch (err: any) {
                          setPackagesError(err.response?.data?.error || 'Fehler beim Aktualisieren');
                        }
                      }}
                    >
                      Update
                    </ActionButton>
                    <ActionButton variant="secondary" onClick={() => setEditingPkg(null)}>
                      Abbrechen
                    </ActionButton>
                  </div>
                </div>
              )}

              {(cmsSnapshots || []).length ? (
                <div className="mt-3 overflow-hidden rounded-xl border border-app-border">
                  <div className="border-b border-app-border bg-app-bg p-3 text-sm text-app-muted">
                    Letzte Snapshots:
                  </div>
                  <div className="max-h-[220px] overflow-y-auto">
                    {(cmsSnapshots || []).slice(0, 20).map((it: any) => (
                      <Button
                        key={String(it?.id)}
                        onClick={() => {
                          if (it?.kind) setCmsFaqKind(String(it.kind) as any);
                          if (it?.slug) setCmsFaqSlug(String(it.slug));
                        }}
                        variant="ghost"
                        className="h-auto w-full justify-start rounded-none border-b border-app-border bg-app-card p-3 text-left"
                      >
                        <div className="font-semibold text-app-fg">{String(it?.title || '')}</div>
                        <div className="font-mono text-xs text-app-muted">
                          {String(it?.kind || '')}:{String(it?.slug || '')}
                        </div>
                        <div className="text-xs text-app-muted">
                          {it?.fetchedAt ? String(it.fetchedAt).replace('T', ' ').replace('Z', '') : ''}
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}

                </>
              )}
            </section>

            )}

            {activeSection === 'cms' && (
            <section id="admin-cms" className={sectionCardClass}>
              <SectionHeader
                title="CMS Sync (WordPress)"
                helpTitle="CMS Sync"
                helpContent={'Ziel: WordPress-Inhalte (z.B. FAQ-Seite) finden und als Snapshot speichern.\n\nBedienung:\n- Recent: zeigt die neuesten WP Pages/Posts.\n- Klick auf einen Treffer setzt den slug.\n- Fetch lädt den Inhalt live aus WP (Preview).\n- Sync & Save speichert einen Snapshot in der DB.'}
                actions={
                  <>
                    <ActionButton variant="secondary" onClick={() => togglePanel('cms')}>
                      {openPanels.cms ? 'Einklappen' : 'Aufklappen'}
                    </ActionButton>
                    <ActionButton variant="secondary" onClick={() => window.open('https://xn--gstefotos-v2a.com/faq/', '_blank', 'noreferrer')}>
                      Öffentliche FAQ
                    </ActionButton>
                    <ActionButton onClick={fetchCmsFaqPreview} disabled={cmsFaqLoading}>
                      {cmsFaqLoading ? 'Lade…' : 'Fetch'}
                    </ActionButton>
                    <ActionButton onClick={syncAndSaveCms} disabled={cmsSyncSaving}>
                      {cmsSyncSaving ? 'Sync…' : 'Sync & Save'}
                    </ActionButton>
                    <ActionButton variant="secondary" onClick={loadCmsSnapshots} disabled={cmsSnapshotsLoading}>
                      {cmsSnapshotsLoading ? 'Lade…' : 'Snapshots'}
                    </ActionButton>
                  </>
                }
              />

              {openPanels.cms && (
                <>

              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select value={cmsFaqKind} onValueChange={(value) => setCmsFaqKind(value as any)}>
                      <SelectTrigger className="rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm text-app-fg">
                        <SelectValue placeholder="WP Kind" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pages">pages</SelectItem>
                        <SelectItem value="posts">posts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <HelpTooltip title="WP Kind" content={'pages = normale Seiten (z.B. FAQ).\nposts = Blog-Beiträge.\n\nFür FAQ ist meist pages korrekt.'} />
                </div>
                <div className="flex items-center gap-2">
                  <Input value={cmsFaqSlug} onChange={(e) => setCmsFaqSlug(e.target.value)} placeholder="slug (e.g. faq)" />
                  <HelpTooltip title="WP Slug" content={'Der Slug ist der URL-Teil (z.B. /faq → slug=faq).\n\nTipp: Nutze Search/Recent und klicke einen Treffer.'} />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Input value={cmsSearchQuery} onChange={(e) => setCmsSearchQuery(e.target.value)} placeholder="Search WP (e.g. faq)" className="min-w-[320px]" />
                  <HelpTooltip title="Search" content={'Sucht im WordPress nach Titel/Slug. Klick auf Treffer setzt den slug.'} />
                </div>
                <ActionButton variant="secondary" onClick={searchCmsWp} disabled={cmsSearchLoading}>
                  {cmsSearchLoading ? 'Suche…' : 'Search'}
                </ActionButton>
                <ActionButton onClick={loadCmsWpRecent} disabled={cmsSearchLoading}>
                  {cmsSearchLoading ? 'Lade…' : 'Recent'}
                </ActionButton>
              </div>

              {cmsSearchError && (
                <p className="mt-3 text-sm text-[var(--status-danger)]">{cmsSearchError}</p>
              )}

              {cmsSearchResult?.items?.length ? (
                <div className="mt-3 overflow-hidden rounded-xl border border-app-border">
                  <div className="border-b border-app-border bg-app-bg p-3 text-sm text-app-muted">
                    Treffer (klick setzt slug):
                  </div>
                  <div className="max-h-[220px] overflow-y-auto">
                    {(cmsSearchResult?.items || []).map((it: any) => (
                      <Button
                        key={String(it?.id || it?.slug)}
                        onClick={() => setCmsFaqSlug(String(it?.slug || ''))}
                        variant="ghost"
                        className="h-auto w-full justify-start rounded-none border-b border-app-border bg-app-card p-3 text-left"
                      >
                        <div className="font-semibold text-app-fg">{String(it?.title || '')}</div>
                        <div className="font-mono text-xs text-app-muted">{String(it?.slug || '')}</div>
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}

              {cmsFaqError && (
                <p className="mt-3 text-sm text-[var(--status-danger)]">{cmsFaqError}</p>
              )}

              {cmsLastSync?.extraction && (
                <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-app-border bg-app-bg p-3 font-mono text-xs">
                  {JSON.stringify({
                    kind: cmsFaqKind,
                    slug: cmsFaqSlug,
                    extraction: cmsLastSync.extraction,
                    debug: cmsLastSync.debug || null,
                  }, null, 2)}
                </pre>
              )}

              {cmsFaqResult && (
                <div className="mt-3">
                  <p className="m-0 text-sm text-app-muted">
                    Source: <span className="font-mono">{String(cmsFaqResult?.source?.url || '')}</span>
                  </p>

                  <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-app-border bg-app-bg p-3 font-mono text-xs">
                    {JSON.stringify({
                      count: cmsFaqResult?.count,
                      items: (cmsFaqResult?.items || []).map((i: any) => ({
                        id: i.id,
                        slug: i.slug,
                        title: i.title,
                        modifiedGmt: i.modifiedGmt,
                        link: i.link,
                        extraction: i.extraction,
                      })),
                    }, null, 2)}
                  </pre>

                  {(cmsFaqResult?.items?.[0]?.html || '') && (
                    <div className="mt-3 overflow-hidden rounded-xl border border-app-border">
                      <iframe
                        title="cms-faq-preview"
                        className="h-[320px] w-full border-0"
                        srcDoc={String(cmsFaqResult?.items?.[0]?.html || '')}
                      />
                    </div>
                  )}
                </div>
              )}
                </>
              )}
            </section>

            )}

            {activeSection === 'apiKeys' && (
            <section id="admin-api-keys" className={sectionCardClass}>
              <SectionHeader
                title="API Keys"
                helpContent={'API Keys sind für Integrationen/Automationen.\n\nBedienung:\n- Erstellen: Name + Scopes + optionales Ablaufdatum.\n- Revoke: deaktiviert einen Key dauerhaft.\nHinweis: Den kompletten Key siehst du nur beim Erstellen.'}
                actions={
                  <>
                    <ActionButton variant="secondary" onClick={() => togglePanel('apiKeys')}>
                      {openPanels.apiKeys ? 'Einklappen' : 'Aufklappen'}
                    </ActionButton>
                    <ActionButton onClick={loadApiKeys} disabled={apiKeysLoading}>
                      {apiKeysLoading ? 'Lade…' : 'Aktualisieren'}
                    </ActionButton>
                  </>
                }
              />

              {openPanels.apiKeys && (
                <>

              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div className="flex items-center gap-2">
                  <Input value={newApiKeyName} onChange={(e) => setNewApiKeyName(e.target.value)} placeholder="Name" />
                  <HelpTooltip title="Name" content={'Interner Anzeigenname für den Key (z.B. "Zapier" oder "Invoice Export").'} />
                </div>
                <div className="flex items-center gap-2">
                  <Input value={newApiKeyScopes} onChange={(e) => setNewApiKeyScopes(e.target.value)} placeholder="Scopes (comma separated)" className="font-mono" />
                  <HelpTooltip title="Scopes" content={'Komma-getrennte Liste von Berechtigungen (z.B. "events:read, photos:read").\n\nLeer = je nach Backend-Konfiguration evtl. Full Access (nur wenn du das bewusst willst).'} />
                </div>
                <div className="flex items-center gap-2">
                  <Input value={newApiKeyExpiresAt} onChange={(e) => setNewApiKeyExpiresAt(e.target.value)} placeholder="expiresAt (YYYY-MM-DD or ISO)" className="font-mono" />
                  <HelpTooltip title="expiresAt" content={'Optional. Beispiele:\n- 2030-01-01\n- 2030-01-01T00:00:00.000Z\n\nLeer = läuft nie ab.'} />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <ActionButton onClick={createApiKey} disabled={createApiKeyLoading}>
                  {createApiKeyLoading ? 'Erstelle…' : 'API Key erstellen'}
                </ActionButton>
                {apiKeysError && <span className="text-sm text-[var(--status-danger)]">{apiKeysError}</span>}
              </div>

              {createdApiKeyRaw && (
                <div className="mt-3 rounded-xl border border-app-border bg-app-bg p-3">
                  <p className="m-0 text-sm font-semibold text-app-fg">Neuer API Key (nur jetzt sichtbar):</p>
                  <p className="mt-2 break-all font-mono text-sm text-app-fg">{createdApiKeyRaw}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <ActionButton
                      onClick={async () => {
                        await navigator.clipboard.writeText(createdApiKeyRaw);
                      }}
                    >
                      Copy
                    </ActionButton>
                    <span className="text-sm text-app-muted">Prefix: {createdApiKeyMeta?.prefix || '-'}</span>
                  </div>
                </div>
              )}

              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-app-border text-left">
                      <th className="p-2 font-semibold text-app-fg">Name</th>
                      <th className="p-2 font-semibold text-app-fg">Status</th>
                      <th className="p-2 font-semibold text-app-fg">Prefix</th>
                      <th className="p-2 font-semibold text-app-fg">Scopes</th>
                      <th className="p-2 font-semibold text-app-fg">Last used</th>
                      <th className="p-2 font-semibold text-app-fg"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiKeysLoading ? (
                      <tr>
                        <td colSpan={6} className="p-3 text-sm text-app-muted">
                          Lade…
                        </td>
                      </tr>
                    ) : (
                      (apiKeys || []).slice(0, 100).map((k: any) => (
                        <tr key={k.id} className="border-b border-app-border">
                          <td className="p-2">{k.name}</td>
                          <td className="p-2 font-mono">{k.status}</td>
                          <td className="p-2 font-mono">{k.prefix}</td>
                          <td className="p-2 font-mono">{Array.isArray(k.scopes) ? k.scopes.join(',') : ''}</td>
                          <td className="whitespace-nowrap p-2">{k.lastUsedAt ? String(k.lastUsedAt).replace('T', ' ').replace('Z', '') : '-'}</td>
                          <td className="p-2">
                            <ActionButton variant="danger" onClick={() => revokeApiKey(k.id)} disabled={k.status !== 'ACTIVE'}>
                              Revoke
                            </ActionButton>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
                </>
              )}
            </section>

            )}

            {activeSection === 'emailTemplates' && (
            <section id="admin-email-templates" className={sectionCardClass}>
              <SectionHeader
                title="E-Mail Templates"
                helpTitle="Email Templates"
                helpContent={'Hier kannst du E-Mail Inhalte bearbeiten (Subject/HTML/Text) inkl. {{variablen}}.\n\nBedienung:\n- Speichern speichert das Template in der DB.\n- Preview rendert mit Variables JSON.\n- Test senden verschickt eine Test-Mail an eine Adresse.'}
                actions={
                  <>
                    <ActionButton variant="secondary" onClick={() => togglePanel('emailTemplates')}>
                      {openPanels.emailTemplates ? 'Einklappen' : 'Aufklappen'}
                    </ActionButton>
                    <ActionButton onClick={() => loadEmailTemplate(emailTplKind)} disabled={emailTplLoading}>
                      {emailTplLoading ? 'Lade…' : 'Aktualisieren'}
                    </ActionButton>
                  </>
                }
              />

              {openPanels.emailTemplates && (
                <>

              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select value={emailTplKind} onValueChange={(value) => setEmailTplKind(value as any)}>
                      <SelectTrigger className="rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm text-app-fg">
                        <SelectValue placeholder="Kind" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INVITATION">INVITATION</SelectItem>
                        <SelectItem value="STORAGE_ENDS_REMINDER">STORAGE_ENDS_REMINDER</SelectItem>
                        <SelectItem value="PHOTO_NOTIFICATION">PHOTO_NOTIFICATION</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <HelpTooltip title="Kind" content={'Welches Template du bearbeitest.'} />
                </div>
                <div className="flex items-center gap-2">
                  <Input value={emailTplName} onChange={(e) => setEmailTplName(e.target.value)} placeholder="Name" />
                  <HelpTooltip title="Name" content={'Interner Name/Label für das Template.'} />
                </div>
                <div className="flex items-center gap-2">
                  <label className="m-0 flex items-center gap-2 text-sm font-semibold text-app-fg">
                    <Checkbox checked={emailTplIsActive} onCheckedChange={(checked) => setEmailTplIsActive(checked)} />
                    Active
                  </label>
                  <HelpTooltip title="Active" content={'Wenn deaktiviert, wird dieses Template nicht verwendet.'} />
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Input
                  value={emailTplSubject}
                  onChange={(e) => setEmailTplSubject(e.target.value)}
                  placeholder="Subject (supports {{variables}})"
                  className="flex-1 font-mono"
                />
                <HelpTooltip title="Subject" content={'Betreff der E-Mail. Unterstützt {{variablen}}.'} />
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <div className="flex items-start gap-2">
                  <Textarea value={emailTplHtml} onChange={(e) => setEmailTplHtml(e.target.value)} placeholder="HTML (optional)" className="min-h-[160px] flex-1 font-mono" />
                  <div className="pt-1">
                    <HelpTooltip title="HTML" content={'HTML-Version der Mail (optional).'} />
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Textarea value={emailTplText} onChange={(e) => setEmailTplText(e.target.value)} placeholder="Text (optional)" className="min-h-[160px] flex-1 font-mono" />
                  <div className="pt-1">
                    <HelpTooltip title="Text" content={'Plaintext-Version der Mail (optional).'} />
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <ActionButton onClick={saveEmailTemplate} disabled={emailTplSaving}>
                  {emailTplSaving ? 'Speichere…' : 'Speichern'}
                </ActionButton>
                <ActionButton variant="secondary" onClick={previewEmailTemplate} disabled={emailTplPreviewLoading}>
                  {emailTplPreviewLoading ? 'Preview…' : 'Preview'}
                </ActionButton>
                {emailTplError && <span className="text-sm text-[var(--status-danger)]">{emailTplError}</span>}
              </div>

              <div className="mt-3 flex items-start gap-2">
                <Textarea value={emailTplVarsJson} onChange={(e) => setEmailTplVarsJson(e.target.value)} placeholder="Variables JSON" className="min-h-[160px] flex-1 font-mono" />
                <div className="pt-1">
                  <HelpTooltip title="Variables JSON" content={'Beispielwerte zum Rendern der Template-Vorschau.\n\nTipp: Muss gültiges JSON sein.'} />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Input value={emailTplTestTo} onChange={(e) => setEmailTplTestTo(e.target.value)} placeholder="Test-Send to (email)" className="min-w-[320px]" />
                  <HelpTooltip title="Test-Empfänger" content={'E-Mail Adresse für den Testversand.'} />
                </div>
                <ActionButton onClick={testSendEmailTemplate} disabled={emailTplTestSending}>
                  {emailTplTestSending ? 'Sende…' : 'Test senden'}
                </ActionButton>
              </div>

              {emailTplPreview && (
                <div className="mt-3 rounded-xl border border-app-border p-3">
                  <p className="m-0 text-sm font-semibold text-app-fg">Preview Subject:</p>
                  <p className="mt-2 font-mono text-sm">{String(emailTplPreview?.subject || '')}</p>
                  {emailTplPreview?.text && (
                    <>
                      <p className="m-0 text-sm font-semibold text-app-fg">Preview Text:</p>
                      <pre className="mt-2 whitespace-pre-wrap font-mono text-sm">{String(emailTplPreview?.text || '')}</pre>
                    </>
                  )}
                  {emailTplPreview?.html && (
                    <>
                      <p className="m-0 text-sm font-semibold text-app-fg">Preview HTML:</p>
                      <div className="mt-2 overflow-hidden rounded-lg border border-app-border">
                        <iframe title="email-preview" className="h-[260px] w-full border-0" srcDoc={String(emailTplPreview?.html || '')} />
                      </div>
                    </>
                  )}
                </div>
              )}

                </>
              )}
            </section>

            )}

            {activeSection === 'maintenance' && (
            <section id="admin-maintenance" className={sectionCardClass}>
              <SectionHeader
                title="Maintenance Mode"
                helpContent={'Aktiviert den Wartungsmodus für Gäste.\n\nBedienung:\n- Toggle einschalten → App zeigt Hinweis-Banner und blockt Gäste.\n- Nachricht: optionaler Text im Banner.'}
                actions={
                  <>
                    <ActionButton variant="secondary" onClick={() => togglePanel('maintenance')}>
                      {openPanels.maintenance ? 'Einklappen' : 'Aufklappen'}
                    </ActionButton>
                    <ActionButton onClick={loadMaintenance} disabled={maintenanceLoading}>
                      {maintenanceLoading ? 'Lade…' : 'Aktualisieren'}
                    </ActionButton>
                  </>
                }
              />

              {openPanels.maintenance && (
                <>

              <div className="mt-3 flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-app-fg">
                  <Checkbox checked={maintenanceEnabled} onCheckedChange={(checked) => setMaintenanceEnabled(checked)} />
                  Wartungsmodus aktiv
                </label>
                <HelpTooltip title="Wartungsmodus" content={'Aktiv = Gäste werden blockiert und sehen den Hinweis.'} />
                <ActionButton onClick={saveMaintenance} disabled={maintenanceSaving}>
                  {maintenanceSaving ? 'Speichere…' : 'Speichern'}
                </ActionButton>
                {maintenanceError && <span className="text-sm text-[var(--status-danger)]">{maintenanceError}</span>}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Input
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  placeholder="Banner-Text (optional)"
                  className="flex-1"
                />
                <HelpTooltip title="Banner-Text" content={'Optionaler Hinweistext, der Gästen im Wartungsmodus angezeigt wird.'} />
              </div>
                </>
              )}
            </section>

            )}

            {activeSection === 'more' && (
              <>

            <section id="admin-impersonation" className={sectionCardClass}>
              <SectionHeader
                title="Impersonation"
                helpContent={'Admin-only: erstellt ein kurzlebiges Token für einen Ziel-User und öffnet dessen Dashboard in einem neuen Tab.\n\nHinweis: Nutze das für Support/Debugging.'}
                actions={
                  <ActionButton onClick={issueImpersonationToken} disabled={impersonateLoading}>
                    {impersonateLoading ? 'Token…' : 'Token erstellen & öffnen'}
                  </ActionButton>
                }
              />

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={impersonateUserId}
                    onChange={(e) => setImpersonateUserId(e.target.value)}
                    placeholder="userId (UUID)"
                    className="flex-1 font-mono"
                  />
                  <HelpTooltip title="userId" content={'Interne User-ID (UUID) aus der DB / Logs.'} />
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={impersonateReason}
                    onChange={(e) => setImpersonateReason(e.target.value)}
                    placeholder="reason (optional)"
                    className="flex-1"
                  />
                  <HelpTooltip title="reason" content={'Optionaler Grund (z.B. Ticket/Support-Fall). Wird im Token mitgeführt.'} />
                </div>
              </div>

              {impersonateError && (
                <p className="mt-3 text-sm text-[var(--status-danger)]">{impersonateError}</p>
              )}

              {impersonateResult && (
                <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-app-border bg-app-bg p-3 font-mono text-xs">
                  {JSON.stringify({
                    expiresInSeconds: impersonateResult?.expiresInSeconds,
                    user: impersonateResult?.user,
                  }, null, 2)}
                </pre>
              )}
            </section>

            <section id="admin-invoices" className={sectionCardClass}>
              <SectionHeader
                title="Invoices"
                helpContent={'Exportiert Rechnungen als CSV. Filter sind optional.'}
                actions={
                  <ActionButton onClick={exportInvoicesCsv} disabled={invoiceExporting}>
                    {invoiceExporting ? 'Export…' : 'CSV Export'}
                  </ActionButton>
                }
              />

              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="flex items-center gap-2">
                  <Input value={invoiceStatus} onChange={(e) => setInvoiceStatus(e.target.value)} placeholder="status (OPEN/PAID/VOID/REFUNDED)" />
                  <HelpTooltip title="status" content={'Optionaler Filter. Leer = alle.'} />
                </div>
                <div className="flex items-center gap-2">
                  <Input value={invoiceEventId} onChange={(e) => setInvoiceEventId(e.target.value)} placeholder="eventId" className="font-mono" />
                  <HelpTooltip title="eventId" content={'Optionaler Filter nach Event.'} />
                </div>
                <div className="flex items-center gap-2">
                  <Input value={invoiceWcOrderId} onChange={(e) => setInvoiceWcOrderId(e.target.value)} placeholder="wcOrderId" className="font-mono" />
                  <HelpTooltip title="wcOrderId" content={'Optionaler Filter nach WooCommerce Order ID.'} />
                </div>
                <div className="flex items-center gap-2">
                  <Input value={invoiceWpUserId} onChange={(e) => setInvoiceWpUserId(e.target.value)} placeholder="wpUserId" className="font-mono" />
                  <HelpTooltip title="wpUserId" content={'Optionaler Filter nach WordPress User ID.'} />
                </div>
              </div>

              {invoiceExportError && (
                <p className="mt-3 text-sm text-[var(--status-danger)]">{invoiceExportError}</p>
              )}
            </section>

            <section id="admin-qr-print" className={sectionCardClass}>
              <SectionHeader
                title="QR Print‑Service (Admin)"
                helpContent={'Generiert ein druckfertiges PDF (optional Beschnitt/Schnittmarken) für Dienstleister.'}
              />

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={qrEventId}
                    onChange={(e) => setQrEventId(e.target.value)}
                    placeholder="eventId"
                    className="min-w-[360px] font-mono"
                  />
                  <HelpTooltip title="eventId" content={'Event-ID, für den du die QR-Links und das Provider-PDF erzeugen willst.'} />
                </div>
                <ActionButton onClick={loadQrEvent} disabled={qrEventLoading}>
                  {qrEventLoading ? 'Lade…' : 'Event laden'}
                </ActionButton>
                <ActionButton variant="secondary" onClick={loadQrTraffic} disabled={qrTrafficLoading}>
                  {qrTrafficLoading ? 'Traffic…' : 'Views laden'}
                </ActionButton>
              </div>

              {qrEventError && <p className="mt-3 text-sm text-[var(--status-danger)]">{qrEventError}</p>}
              {qrTrafficError && <p className="mt-3 text-sm text-[var(--status-danger)]">{qrTrafficError}</p>}

              {(hostEventUrl || guestEventUrl) && (
                <div className="mt-3 grid gap-2">
                  {qrEventTitle && (
                    <div className="text-sm font-semibold text-app-fg">{qrEventTitle}</div>
                  )}
                  {hostEventUrl && (
                    <div className="text-sm">
                      <div className="text-app-muted">Host-Link:</div>
                      <a href={hostEventUrl} target="_blank" rel="noreferrer" className="break-all text-app-fg underline">
                        {hostEventUrl}
                      </a>
                    </div>
                  )}
                  {guestEventUrl && (
                    <div className="text-sm">
                      <div className="text-app-muted">Gast-Link:</div>
                      <a href={guestEventUrl} target="_blank" rel="noreferrer" className="break-all text-app-fg underline">
                        {guestEventUrl}
                      </a>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-app-fg">
                  Format
                  <div className="min-w-[90px]">
                    <Select value={qrFormat} onValueChange={(value) => setQrFormat(value as any)}>
                      <SelectTrigger className="rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm text-app-fg">
                        <SelectValue placeholder="Format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A6">A6</SelectItem>
                        <SelectItem value="A5">A5</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-app-fg">
                  bleedMm
                  <Input value={qrBleedMm} onChange={(e) => setQrBleedMm(e.target.value)} className="w-[90px] font-mono" />
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-app-fg">
                  <Checkbox checked={qrCropMarks} onCheckedChange={(checked) => setQrCropMarks(checked)} />
                  cropMarks
                </label>
                <HelpTooltip title="PDF Export" content={'Erzeugt ein druckfertiges PDF (z.B. für Print‑Service).'} />
                <ActionButton variant="secondary" onClick={exportProviderPdf} disabled={qrExporting}>
                  {qrExporting ? 'Export…' : 'PDF exportieren (Print‑Service)'}
                </ActionButton>
              </div>

              {qrExportError && <p className="mt-3 text-sm text-[var(--status-danger)]">{qrExportError}</p>}

              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-app-fg">Views by source</div>
                  <HelpTooltip title="Views by source" content={'Zeigt die gezählten Aufrufe pro Quelle (z.B. source=qr).'} />
                </div>

                {qrTrafficStats && (
                  <div className="mt-2 grid gap-1 text-sm">
                    {qrTrafficStats.length === 0 ? (
                      <div className="text-app-muted">Noch keine Views (oder Migration noch nicht deployed).</div>
                    ) : (
                      qrTrafficStats.map((s: any) => (
                        <div key={String(s?.source || '')} className="flex items-baseline gap-3">
                          <div className="min-w-[120px] font-mono">{String(s?.source || '')}</div>
                          <div className="font-semibold">{Number(s?.count || 0)}</div>
                          <div className="text-app-muted">
                            {s?.lastSeenAt ? `last: ${new Date(s.lastSeenAt).toLocaleString()}` : ''}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Usage Inspector */}
            <section id="admin-usage-inspector" className={sectionCardClass}>
              <SectionHeader
                title="Usage Inspector"
                helpContent={'Debug-Tool: zeigt aktuelle Usage/Storage Daten eines Events.'}
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={usageEventId}
                    onChange={(e) => setUsageEventId(e.target.value)}
                    placeholder="eventId"
                    className="min-w-[320px] font-mono"
                  />
                  <HelpTooltip title="eventId" content={'Event-ID, dessen Usage du abrufen willst.'} />
                </div>
                <ActionButton
                  onClick={async () => {
                    setUsageError(null);
                    setUsageResult(null);
                    const eventId = usageEventId.trim();
                    if (!eventId) {
                      setUsageError('Bitte eventId eingeben');
                      return;
                    }
                    try {
                      setUsageLoading(true);
                      const { data } = await api.get(`/events/${eventId}/usage`);
                      setUsageResult(data);
                    } catch (err: any) {
                      setUsageError(err.response?.data?.error || 'Fehler beim Abrufen');
                    } finally {
                      setUsageLoading(false);
                    }
                  }}
                  disabled={usageLoading}
                >
                  {usageLoading ? 'Lade…' : 'Abrufen'}
                </ActionButton>
              </div>
              {usageError && <p className="mt-3 text-sm text-[var(--status-danger)]">{usageError}</p>}
              {usageResult && (
                <pre className="mt-3 overflow-x-auto rounded-lg bg-app-bg p-3 text-xs">
                  {JSON.stringify(usageResult, null, 2)}
                </pre>
              )}
            </section>

            {/* Upgrade Link Generator */}
            <section id="admin-upgrade-link" className={sectionCardClass}>
              <SectionHeader
                title="Upgrade-Link Generator"
                helpContent={'Generiert einen WooCommerce Add-to-Cart Link inkl. eventCode.'}
              />
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div className="flex items-center gap-2">
                  <Input value={upgradeEventId} onChange={(e) => setUpgradeEventId(e.target.value)} placeholder="eventId" className="flex-1 font-mono" />
                  <HelpTooltip title="eventId" content={'Event-ID, für die das Upgrade gelten soll.'} />
                </div>
                <div className="flex items-center gap-2">
                  <Input value={upgradeSku} onChange={(e) => setUpgradeSku(e.target.value)} placeholder="sku (optional)" className="flex-1" />
                  <HelpTooltip title="sku" content={'Optional. Wenn gesetzt, wird darüber das Produkt gefunden.'} />
                </div>
                <div className="flex items-center gap-2">
                  <Input value={upgradeProductId} onChange={(e) => setUpgradeProductId(e.target.value)} placeholder="productId (optional)" className="flex-1" />
                  <HelpTooltip title="productId" content={'Optional. Alternative zu sku.'} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <ActionButton
                  variant="secondary"
                  onClick={async () => {
                    setUpgradeError(null);
                    setUpgradeUrl(null);
                    const eventId = upgradeEventId.trim();
                    if (!eventId) {
                      setUpgradeError('Bitte eventId eingeben');
                      return;
                    }
                    try {
                      setUpgradeLoading(true);
                      const qs = new URLSearchParams();
                      if (upgradeSku.trim()) qs.set('sku', upgradeSku.trim());
                      if (upgradeProductId.trim()) qs.set('productId', upgradeProductId.trim());
                      const { data } = await api.get(`/events/${eventId}/upgrade-link?${qs.toString()}`);
                      setUpgradeUrl(data.url);
                    } catch (err: any) {
                      setUpgradeError(err.response?.data?.error || 'Fehler beim Erstellen des Links');
                    } finally {
                      setUpgradeLoading(false);
                    }
                  }}
                  disabled={upgradeLoading}
                >
                  {upgradeLoading ? 'Erzeuge…' : 'Link erzeugen'}
                </ActionButton>
                <HelpTooltip title="Upgrade-Link" content={'Erzeugt einen Add-to-Cart Link. Danach kannst du ihn kopieren und weitergeben.'} />
              </div>
              {upgradeError && <p className="mt-3 text-sm text-[var(--status-danger)]">{upgradeError}</p>}
              {upgradeUrl ? (
                <div className="mt-3">
                  <p className="text-sm font-medium text-app-fg">Link:</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <a href={upgradeUrl} target="_blank" rel="noreferrer" className="break-all text-app-fg underline">{upgradeUrl}</a>
                    <ActionButton
                      onClick={async () => {
                        await navigator.clipboard.writeText(upgradeUrl);
                      }}
                    >
                      Copy
                    </ActionButton>
                  </div>
                </div>
              ) : null}
            </section>

            <section id="admin-woo-webhooks" className={sectionCardClass}>
              <SectionHeader
                title="WooCommerce Webhook Inbox"
                helpContent={'Zeigt die letzten eingegangenen WooCommerce Webhooks inkl. Status/Reason. Filter sind optional.'}
                actions={
                  <ActionButton onClick={loadWooLogs} disabled={wooLogsLoading}>
                    {wooLogsLoading ? 'Lade…' : 'Aktualisieren'}
                  </ActionButton>
                }
              />

              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div className="flex items-center gap-2">
                  <Input value={wooFilterStatus} onChange={(e) => setWooFilterStatus(e.target.value)} placeholder="status (z.B. PROCESSED/IGNORED/FAILED/FORBIDDEN)" />
                  <HelpTooltip title="status" content={'Optionaler Filter nach Status.'} />
                </div>
                <div className="flex items-center gap-2">
                  <Input value={wooFilterOrderId} onChange={(e) => setWooFilterOrderId(e.target.value)} placeholder="wcOrderId" className="font-mono" />
                  <HelpTooltip title="wcOrderId" content={'Optionaler Filter nach WooCommerce Order ID.'} />
                </div>
                <div className="flex items-center gap-2">
                  <Input value={wooFilterEventId} onChange={(e) => setWooFilterEventId(e.target.value)} placeholder="eventId" className="font-mono" />
                  <HelpTooltip title="eventId" content={'Optionaler Filter nach Event.'} />
                </div>
              </div>

              {wooLogsError && (
                <p className="mt-3 text-sm text-[var(--status-danger)]">{wooLogsError}</p>
              )}

              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-app-border text-left">
                      <th className="p-2 font-semibold text-app-fg">Zeit</th>
                      <th className="p-2 font-semibold text-app-fg">Status</th>
                      <th className="p-2 font-semibold text-app-fg">wcOrderId</th>
                      <th className="p-2 font-semibold text-app-fg">eventId</th>
                      <th className="p-2 font-semibold text-app-fg">SKU</th>
                      <th className="p-2 font-semibold text-app-fg">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wooLogsLoading ? (
                      <tr>
                        <td colSpan={6} className="p-3 text-sm text-app-muted">
                          Lade…
                        </td>
                      </tr>
                    ) : (
                      (wooLogs || []).slice(0, 50).map((l: any) => (
                        <tr key={l.id} className="border-b border-app-border">
                          <td className="whitespace-nowrap p-2">{String(l.createdAt || '').replace('T', ' ').replace('Z', '')}</td>
                          <td className="p-2 font-mono">{l.status}</td>
                          <td className="p-2 font-mono">{l.wcOrderId || '-'}</td>
                          <td className="p-2 font-mono">{l.eventId || '-'}</td>
                          <td className="p-2 font-mono">{l.wcSku || '-'}</td>
                          <td className="p-2">{l.reason || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

              </>
            )}
            </div>
          </div>
        </div>
      </main>
      </div>
    </Dialog>
  );
}
