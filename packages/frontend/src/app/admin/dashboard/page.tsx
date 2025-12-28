'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { authApi } from '@/lib/auth';
import api from '@/lib/api';
import { User } from '@gaestefotos/shared';
import HelpTooltip from '@/components/ui/HelpTooltip';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const sectionCardClass = 'bg-white rounded-2xl border border-gray-200 shadow-sm p-6';

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

  const navBtnStyle = (isActive: boolean) => ({
    padding: '0.65rem 0.75rem',
    borderRadius: '0.75rem',
    border: isActive ? '1px solid #295B4D' : '1px solid #E5E7EB',
    background: isActive ? '#295B4D' : 'white',
    cursor: 'pointer',
    color: isActive ? 'white' : '#295B4D',
    fontWeight: 800,
    textAlign: 'left' as const,
  });

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
    const bg = variant === 'primary' ? '#295B4D' : variant === 'danger' ? '#B00020' : '#EAA48F';
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        style={{
          padding: '0.5rem 0.75rem',
          backgroundColor: bg,
          color: 'white',
          border: 'none',
          borderRadius: '0.5rem',
          cursor: disabled ? 'default' : 'pointer',
          fontSize: '0.875rem',
          opacity: disabled ? 0.8 : 1,
          fontWeight: 700,
        }}
      >
        {children}
      </button>
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
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
        <h2 style={{ color: '#295B4D', fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>{title}</h2>
        <HelpTooltip title={helpTitle || title} content={helpContent} />
      </div>
      {actions ? <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>{actions}</div> : null}
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
        console.error('Auth check error:', error);
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

      setQrExporting(true);

      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="105mm" height="148mm" viewBox="0 0 1050 1480">
  <rect x="0" y="0" width="1050" height="1480" fill="#ffffff"/>
  <text x="525" y="220" text-anchor="middle" font-size="52" fill="#111827">QR Aufsteller</text>
  <text x="525" y="290" text-anchor="middle" font-size="28" fill="#111827">${(qrEventTitle || qrEventSlug || '').replace(/</g, '').replace(/>/g, '')}</text>
  <text x="525" y="360" text-anchor="middle" font-size="24" fill="#374151">${guestEventUrl.replace(/</g, '').replace(/>/g, '')}</text>
  <rect id="gf:qr" x="350" y="470" width="350" height="350" rx="18" fill="#ffffff" stroke="#111827"/>
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
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#F9F5F2'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            border: '4px solid #EAA48F',
            borderTop: '4px solid #295B4D',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p style={{ marginTop: '1rem', color: '#295B4D' }}>Lade Dashboard...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: '#F9F5F2'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#295B4D',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <Logo width={150} height={60} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: '#F9F5F2', fontSize: '0.875rem' }}>
            {user.name} ({user.email})
          </span>
          <button
            onClick={() => {
              authApi.logout();
              router.push('/login');
            }}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#EAA48F',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            Abmelden
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
          <aside
            style={{
              width: 300,
              position: 'sticky',
              top: '1.5rem',
              borderRadius: '1rem',
              border: '1px solid #E5E7EB',
              backgroundColor: 'rgba(255,255,255,0.75)',
              padding: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div style={{ fontWeight: 900, color: '#295B4D' }}>Admin Navigation</div>
              <HelpTooltip
                title="Navigation"
                content={'Links springst du direkt zu den Admin-Bereichen.\n\nTipp: So bleibt das Dashboard übersichtlich, auch wenn es viele Tools gibt.'}
              />
            </div>
            <div style={{ marginTop: '0.5rem', color: '#6B7280', fontSize: '0.85rem' }}>{user.email}</div>

            <div style={{ marginTop: '0.9rem', display: 'grid', gap: '0.5rem' }}>
              <button type="button" onClick={() => setActiveSection('packages')} style={navBtnStyle(activeSection === 'packages')}>Commerce (Pakete)</button>
              <button type="button" onClick={() => setActiveSection('cms')} style={navBtnStyle(activeSection === 'cms')}>CMS (WordPress)</button>
              <button type="button" onClick={() => setActiveSection('apiKeys')} style={navBtnStyle(activeSection === 'apiKeys')}>API Keys</button>
              <button type="button" onClick={() => setActiveSection('emailTemplates')} style={navBtnStyle(activeSection === 'emailTemplates')}>E-Mail Templates</button>
              <button type="button" onClick={() => setActiveSection('maintenance')} style={navBtnStyle(activeSection === 'maintenance')}>Maintenance</button>
              <button type="button" onClick={() => setActiveSection('more')} style={navBtnStyle(activeSection === 'more')}>Weitere Tools</button>
            </div>
          </aside>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ color: '#295B4D', fontSize: '2rem', fontWeight: 900, marginBottom: '0.75rem' }}>Admin Dashboard</h1>
            <div style={{ color: '#6B7280', marginBottom: '1.25rem' }}>Aufgeräumt: Nutze links die Navigation, um schnell zum richtigen Bereich zu springen.</div>

            <div style={{ display: 'grid', gap: '1.5rem' }}>
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
                <p style={{ marginTop: '0.75rem', color: '#B00020' }}>{packagesError}</p>
              )}

              <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                      <th style={{ padding: '0.5rem' }}>SKU</th>
                      <th style={{ padding: '0.5rem' }}>Name</th>
                      <th style={{ padding: '0.5rem' }}>Typ</th>
                      <th style={{ padding: '0.5rem' }}>Tier</th>
                      <th style={{ padding: '0.5rem' }}>From</th>
                      <th style={{ padding: '0.5rem' }}>Limit (Bytes)</th>
                      <th style={{ padding: '0.5rem' }}>Dauer (Tage)</th>
                      <th style={{ padding: '0.5rem' }}>Aktiv</th>
                      <th style={{ padding: '0.5rem' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {packagesLoading ? (
                      <tr><td colSpan={9} style={{ padding: '0.75rem', color: '#666' }}>Lade…</td></tr>
                    ) : (
                      packages.map((p) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f2f2f2' }}>
                        <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{p.sku}</td>
                        <td style={{ padding: '0.5rem' }}>{p.name}</td>
                        <td style={{ padding: '0.5rem' }}>{p.type}</td>
                        <td style={{ padding: '0.5rem' }}>{p.resultingTier}</td>
                        <td style={{ padding: '0.5rem' }}>{p.upgradeFromTier || '-'}</td>
                        <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{p.storageLimitBytes ?? '-'}</td>
                        <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{p.storageDurationDays ?? '-'}</td>
                        <td style={{ padding: '0.5rem' }}>{p.isActive ? 'ja' : 'nein'}</td>
                        <td style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}>
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
                            <span style={{ display: 'inline-block', width: 8 }} />
                            <ActionButton
                              variant="danger"
                              onClick={async () => {
                                if (!confirm(`Paket deaktivieren? ${p.sku}`)) return;
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
              <div style={{ marginTop: '1.25rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                <h3 style={{ color: '#295B4D', fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>Neues Paket</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input value={newPkg.sku} onChange={(e) => setNewPkg({ ...newPkg, sku: e.target.value })} placeholder="SKU" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', flex: 1, fontFamily: 'monospace' }} />
                    <HelpTooltip title="SKU" content={'Produkt-SKU aus WooCommerce. Muss eindeutig sein.'} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input value={newPkg.name} onChange={(e) => setNewPkg({ ...newPkg, name: e.target.value })} placeholder="Name" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', flex: 1 }} />
                    <HelpTooltip title="Name" content={'Interner Anzeigename.'} />
                  </div>
                  <select value={newPkg.type} onChange={(e) => setNewPkg({ ...newPkg, type: e.target.value })} style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd' }}>
                    <option value="BASE">BASE</option>
                    <option value="UPGRADE">UPGRADE</option>
                  </select>
                  <input value={newPkg.resultingTier} onChange={(e) => setNewPkg({ ...newPkg, resultingTier: e.target.value })} placeholder="resultingTier" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd' }} />
                  <input value={newPkg.upgradeFromTier} onChange={(e) => setNewPkg({ ...newPkg, upgradeFromTier: e.target.value })} placeholder="upgradeFromTier (optional)" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd' }} />
                  <input value={newPkg.storageLimitBytes} onChange={(e) => setNewPkg({ ...newPkg, storageLimitBytes: e.target.value })} placeholder="storageLimitBytes (optional)" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', fontFamily: 'monospace' }} />
                  <input value={newPkg.storageDurationDays} onChange={(e) => setNewPkg({ ...newPkg, storageDurationDays: e.target.value })} placeholder="storageDurationDays (optional)" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', fontFamily: 'monospace' }} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#295B4D' }}>
                    <input type="checkbox" checked={newPkg.isActive} onChange={(e) => setNewPkg({ ...newPkg, isActive: e.target.checked })} />
                    aktiv
                  </label>
                </div>
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
                <div style={{ marginTop: '1.25rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                  <h3 style={{ color: '#295B4D', fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>
                    Paket bearbeiten: <span style={{ fontFamily: 'monospace' }}>{editingPkg.sku}</span>
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    <input value={editingPkg.sku} onChange={(e) => setEditingPkg({ ...editingPkg, sku: e.target.value })} placeholder="SKU" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd' }} />
                    <input value={editingPkg.name} onChange={(e) => setEditingPkg({ ...editingPkg, name: e.target.value })} placeholder="Name" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd' }} />
                    <select value={editingPkg.type} onChange={(e) => setEditingPkg({ ...editingPkg, type: e.target.value })} style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd' }}>
                      <option value="BASE">BASE</option>
                      <option value="UPGRADE">UPGRADE</option>
                    </select>
                    <input value={editingPkg.resultingTier} onChange={(e) => setEditingPkg({ ...editingPkg, resultingTier: e.target.value })} placeholder="resultingTier" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd' }} />
                    <input value={editingPkg.upgradeFromTier || ''} onChange={(e) => setEditingPkg({ ...editingPkg, upgradeFromTier: e.target.value })} placeholder="upgradeFromTier (optional)" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd' }} />
                    <input value={editingPkg.storageLimitBytes ?? ''} onChange={(e) => setEditingPkg({ ...editingPkg, storageLimitBytes: e.target.value })} placeholder="storageLimitBytes (optional)" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', fontFamily: 'monospace' }} />
                    <input value={editingPkg.storageDurationDays ?? ''} onChange={(e) => setEditingPkg({ ...editingPkg, storageDurationDays: e.target.value })} placeholder="storageDurationDays (optional)" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', fontFamily: 'monospace' }} />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#295B4D' }}>
                      <input type="checkbox" checked={!!editingPkg.isActive} onChange={(e) => setEditingPkg({ ...editingPkg, isActive: e.target.checked })} />
                      aktiv
                    </label>
                  </div>
                  <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
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
                <div style={{ marginTop: '0.75rem', border: '1px solid #eee', borderRadius: '0.75rem', overflow: 'hidden' }}>
                  <div style={{ padding: '0.75rem', background: '#fafafa', borderBottom: '1px solid #eee', fontSize: '0.875rem', color: '#666' }}>
                    Letzte Snapshots:
                  </div>
                  <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                    {(cmsSnapshots || []).slice(0, 20).map((it: any) => (
                      <button
                        key={String(it?.id)}
                        onClick={() => {
                          if (it?.kind) setCmsFaqKind(String(it.kind) as any);
                          if (it?.slug) setCmsFaqSlug(String(it.slug));
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '0.75rem',
                          border: 'none',
                          borderBottom: '1px solid #f2f2f2',
                          background: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ fontWeight: 700, color: '#295B4D' }}>{String(it?.title || '')}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#666' }}>
                          {String(it?.kind || '')}:{String(it?.slug || '')}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>{it?.fetchedAt ? String(it.fetchedAt).replace('T', ' ').replace('Z', '') : ''}</div>
                      </button>
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

              <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <select value={cmsFaqKind} onChange={(e) => setCmsFaqKind(e.target.value as any)} style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', flex: 1 }}>
                  <option value="pages">pages</option>
                  <option value="posts">posts</option>
                  </select>
                  <HelpTooltip title="WP Kind" content={'pages = normale Seiten (z.B. FAQ).\nposts = Blog-Beiträge.\n\nFür FAQ ist meist pages korrekt.'} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input value={cmsFaqSlug} onChange={(e) => setCmsFaqSlug(e.target.value)} placeholder="slug (e.g. faq)" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', flex: 1 }} />
                  <HelpTooltip title="WP Slug" content={'Der Slug ist der URL-Teil (z.B. /faq → slug=faq).\n\nTipp: Nutze Search/Recent und klicke einen Treffer.'} />
                </div>
              </div>

              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input value={cmsSearchQuery} onChange={(e) => setCmsSearchQuery(e.target.value)} placeholder="Search WP (e.g. faq)" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', minWidth: '320px' }} />
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
                <p style={{ marginTop: '0.75rem', color: '#B00020' }}>{cmsSearchError}</p>
              )}

              {cmsSearchResult?.items?.length ? (
                <div style={{ marginTop: '0.75rem', border: '1px solid #eee', borderRadius: '0.75rem', overflow: 'hidden' }}>
                  <div style={{ padding: '0.75rem', background: '#fafafa', borderBottom: '1px solid #eee', fontSize: '0.875rem', color: '#666' }}>
                    Treffer (klick setzt slug):
                  </div>
                  <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                    {(cmsSearchResult?.items || []).map((it: any) => (
                      <button
                        key={String(it?.id || it?.slug)}
                        onClick={() => setCmsFaqSlug(String(it?.slug || ''))}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '0.75rem',
                          border: 'none',
                          borderBottom: '1px solid #f2f2f2',
                          background: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ fontWeight: 700, color: '#295B4D' }}>{String(it?.title || '')}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#666' }}>{String(it?.slug || '')}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {cmsFaqError && (
                <p style={{ marginTop: '0.75rem', color: '#B00020' }}>{cmsFaqError}</p>
              )}

              {cmsLastSync?.extraction && (
                <pre style={{ marginTop: '0.75rem', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.8rem', background: '#f7fff9', border: '1px solid #d7f0df', borderRadius: '0.75rem', padding: '0.75rem' }}>
                  {JSON.stringify({
                    kind: cmsFaqKind,
                    slug: cmsFaqSlug,
                    extraction: cmsLastSync.extraction,
                    debug: cmsLastSync.debug || null,
                  }, null, 2)}
                </pre>
              )}

              {cmsFaqResult && (
                <div style={{ marginTop: '0.75rem' }}>
                  <p style={{ margin: 0, color: '#666', fontSize: '0.875rem' }}>
                    Source: <span style={{ fontFamily: 'monospace' }}>{String(cmsFaqResult?.source?.url || '')}</span>
                  </p>

                  <pre style={{ marginTop: '0.75rem', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.8rem', background: '#fafafa', border: '1px solid #eee', borderRadius: '0.75rem', padding: '0.75rem' }}>
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
                    <div style={{ marginTop: '0.75rem', border: '1px solid #eee', borderRadius: '0.75rem', overflow: 'hidden' }}>
                      <iframe title="cms-faq-preview" style={{ width: '100%', height: '320px', border: 'none' }} srcDoc={String(cmsFaqResult?.items?.[0]?.html || '')} />
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

              <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input value={newApiKeyName} onChange={(e) => setNewApiKeyName(e.target.value)} placeholder="Name" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', flex: 1 }} />
                  <HelpTooltip title="Name" content={'Interner Anzeigename für den Key (z.B. "Zapier" oder "Invoice Export").'} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input value={newApiKeyScopes} onChange={(e) => setNewApiKeyScopes(e.target.value)} placeholder="Scopes (comma separated)" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', fontFamily: 'monospace', flex: 1 }} />
                  <HelpTooltip title="Scopes" content={'Komma-getrennte Liste von Berechtigungen (z.B. "events:read, photos:read").\n\nLeer = je nach Backend-Konfiguration evtl. Full Access (nur wenn du das bewusst willst).'} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input value={newApiKeyExpiresAt} onChange={(e) => setNewApiKeyExpiresAt(e.target.value)} placeholder="expiresAt (YYYY-MM-DD or ISO)" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', fontFamily: 'monospace', flex: 1 }} />
                  <HelpTooltip title="expiresAt" content={'Optional. Beispiele:\n- 2030-01-01\n- 2030-01-01T00:00:00.000Z\n\nLeer = läuft nie ab.'} />
                </div>
              </div>

              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <ActionButton onClick={createApiKey} disabled={createApiKeyLoading}>
                  {createApiKeyLoading ? 'Erstelle…' : 'API Key erstellen'}
                </ActionButton>
                {apiKeysError && <span style={{ color: '#B00020' }}>{apiKeysError}</span>}
              </div>

              {createdApiKeyRaw && (
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', border: '1px solid #EAA48F', borderRadius: '0.75rem', background: '#FFF7F3' }}>
                  <p style={{ margin: 0, color: '#295B4D', fontWeight: 700 }}>Neuer API Key (nur jetzt sichtbar):</p>
                  <p style={{ marginTop: '0.5rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>{createdApiKeyRaw}</p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <ActionButton
                      onClick={async () => {
                        await navigator.clipboard.writeText(createdApiKeyRaw);
                      }}
                    >
                      Copy
                    </ActionButton>
                    <span style={{ color: '#295B4D', fontSize: '0.875rem' }}>Prefix: {createdApiKeyMeta?.prefix || '-'}</span>
                  </div>
                </div>
              )}

              <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                      <th style={{ padding: '0.5rem' }}>Name</th>
                      <th style={{ padding: '0.5rem' }}>Status</th>
                      <th style={{ padding: '0.5rem' }}>Prefix</th>
                      <th style={{ padding: '0.5rem' }}>Scopes</th>
                      <th style={{ padding: '0.5rem' }}>Last used</th>
                      <th style={{ padding: '0.5rem' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiKeysLoading ? (
                      <tr><td colSpan={6} style={{ padding: '0.75rem', color: '#666' }}>Lade…</td></tr>
                    ) : (
                      (apiKeys || []).slice(0, 100).map((k: any) => (
                        <tr key={k.id} style={{ borderBottom: '1px solid #f2f2f2' }}>
                          <td style={{ padding: '0.5rem' }}>{k.name}</td>
                          <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{k.status}</td>
                          <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{k.prefix}</td>
                          <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{Array.isArray(k.scopes) ? k.scopes.join(',') : ''}</td>
                          <td style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}>{k.lastUsedAt ? String(k.lastUsedAt).replace('T', ' ').replace('Z', '') : '-'}</td>
                          <td style={{ padding: '0.5rem' }}>
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

              <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <select value={emailTplKind} onChange={(e) => setEmailTplKind(e.target.value as any)} style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', flex: 1 }}>
                    <option value="INVITATION">INVITATION</option>
                    <option value="STORAGE_ENDS_REMINDER">STORAGE_ENDS_REMINDER</option>
                    <option value="PHOTO_NOTIFICATION">PHOTO_NOTIFICATION</option>
                  </select>
                  <HelpTooltip title="Kind" content={'Welches Template du bearbeitest.'} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input value={emailTplName} onChange={(e) => setEmailTplName(e.target.value)} placeholder="Name" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', flex: 1 }} />
                  <HelpTooltip title="Name" content={'Interner Name/Label für das Template.'} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontWeight: 600, color: '#295B4D', margin: 0 }}>
                    <input type="checkbox" checked={emailTplIsActive} onChange={(e) => setEmailTplIsActive(e.target.checked)} />
                    Active
                  </label>
                  <HelpTooltip title="Active" content={'Wenn deaktiviert, wird dieses Template nicht verwendet.'} />
                </div>
              </div>

              <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input value={emailTplSubject} onChange={(e) => setEmailTplSubject(e.target.value)} placeholder="Subject (supports {{variables}})" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', width: '100%', fontFamily: 'monospace', flex: 1 }} />
                <HelpTooltip title="Subject" content={'Betreff der E-Mail. Unterstützt {{variablen}}.'} />
              </div>

              <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <textarea value={emailTplHtml} onChange={(e) => setEmailTplHtml(e.target.value)} placeholder="HTML (optional)" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', width: '100%', minHeight: '160px', fontFamily: 'monospace' }} />
                  <div style={{ paddingTop: '0.35rem' }}>
                    <HelpTooltip title="HTML" content={'HTML-Version der Mail (optional).'} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <textarea value={emailTplText} onChange={(e) => setEmailTplText(e.target.value)} placeholder="Text (optional)" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', width: '100%', minHeight: '160px', fontFamily: 'monospace' }} />
                  <div style={{ paddingTop: '0.35rem' }}>
                    <HelpTooltip title="Text" content={'Plaintext-Version der Mail (optional).'} />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <ActionButton onClick={saveEmailTemplate} disabled={emailTplSaving}>
                  {emailTplSaving ? 'Speichere…' : 'Speichern'}
                </ActionButton>
                <ActionButton variant="secondary" onClick={previewEmailTemplate} disabled={emailTplPreviewLoading}>
                  {emailTplPreviewLoading ? 'Preview…' : 'Preview'}
                </ActionButton>
                {emailTplError && <span style={{ color: '#B00020' }}>{emailTplError}</span>}
              </div>

              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <textarea value={emailTplVarsJson} onChange={(e) => setEmailTplVarsJson(e.target.value)} placeholder="Variables JSON" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', width: '100%', minHeight: '160px', fontFamily: 'monospace' }} />
                <div style={{ paddingTop: '0.35rem' }}>
                  <HelpTooltip title="Variables JSON" content={'Beispielwerte zum Rendern der Template-Vorschau.\n\nTipp: Muss gültiges JSON sein.'} />
                </div>
              </div>

              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input value={emailTplTestTo} onChange={(e) => setEmailTplTestTo(e.target.value)} placeholder="Test-Send to (email)" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', minWidth: '320px' }} />
                  <HelpTooltip title="Test-Empfänger" content={'E-Mail Adresse für den Testversand.'} />
                </div>
                <ActionButton onClick={testSendEmailTemplate} disabled={emailTplTestSending}>
                  {emailTplTestSending ? 'Sende…' : 'Test senden'}
                </ActionButton>
              </div>

              {emailTplPreview && (
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '0.75rem' }}>
                  <p style={{ margin: 0, color: '#295B4D', fontWeight: 700 }}>Preview Subject:</p>
                  <p style={{ marginTop: '0.5rem', fontFamily: 'monospace' }}>{String(emailTplPreview?.subject || '')}</p>
                  {emailTplPreview?.text && (
                    <>
                      <p style={{ margin: 0, color: '#295B4D', fontWeight: 700 }}>Preview Text:</p>
                      <pre style={{ whiteSpace: 'pre-wrap', marginTop: '0.5rem', fontFamily: 'monospace' }}>{String(emailTplPreview?.text || '')}</pre>
                    </>
                  )}
                  {emailTplPreview?.html && (
                    <>
                      <p style={{ margin: 0, color: '#295B4D', fontWeight: 700 }}>Preview HTML:</p>
                      <div style={{ marginTop: '0.5rem', border: '1px solid #eee', borderRadius: '0.5rem', overflow: 'hidden' }}>
                        <iframe title="email-preview" style={{ width: '100%', height: '260px', border: 'none' }} srcDoc={String(emailTplPreview?.html || '')} />
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

              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontWeight: 600, color: '#295B4D' }}>
                  <input
                    type="checkbox"
                    checked={maintenanceEnabled}
                    onChange={(e) => setMaintenanceEnabled(e.target.checked)}
                  />
                  Wartungsmodus aktiv
                </label>
                <HelpTooltip title="Wartungsmodus" content={'Aktiv = Gäste werden blockiert und sehen den Hinweis.'} />
                <ActionButton onClick={saveMaintenance} disabled={maintenanceSaving}>
                  {maintenanceSaving ? 'Speichere…' : 'Speichern'}
                </ActionButton>
                {maintenanceError && <span style={{ color: '#B00020' }}>{maintenanceError}</span>}
              </div>

              <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  placeholder="Banner-Text (optional)"
                  style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', width: '100%', flex: 1 }}
                />
                <HelpTooltip title="Banner-Text" content={'Optionaler Hinweistext, der Gästen im Wartungsmodus angezeigt wird.'} />
              </div>
                </>
              )}
            </section>

            )}

            {activeSection === 'more' && (
              <>

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

              <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input value={invoiceStatus} onChange={(e) => setInvoiceStatus(e.target.value)} placeholder="status (OPEN/PAID/VOID/REFUNDED)" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', flex: 1 }} />
                  <HelpTooltip title="status" content={'Optionaler Filter. Leer = alle.'} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input value={invoiceEventId} onChange={(e) => setInvoiceEventId(e.target.value)} placeholder="eventId" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', fontFamily: 'monospace', flex: 1 }} />
                  <HelpTooltip title="eventId" content={'Optionaler Filter nach Event.'} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input value={invoiceWcOrderId} onChange={(e) => setInvoiceWcOrderId(e.target.value)} placeholder="wcOrderId" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', fontFamily: 'monospace', flex: 1 }} />
                  <HelpTooltip title="wcOrderId" content={'Optionaler Filter nach WooCommerce Order ID.'} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input value={invoiceWpUserId} onChange={(e) => setInvoiceWpUserId(e.target.value)} placeholder="wpUserId" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', fontFamily: 'monospace', flex: 1 }} />
                  <HelpTooltip title="wpUserId" content={'Optionaler Filter nach WordPress User ID.'} />
                </div>
              </div>

              {invoiceExportError && (
                <p style={{ marginTop: '0.75rem', color: '#B00020' }}>{invoiceExportError}</p>
              )}
            </section>

            <section id="admin-qr-print" className={sectionCardClass}>
              <SectionHeader
                title="QR Print‑Service (Admin)"
                helpContent={'Generiert ein druckfertiges PDF (optional Beschnitt/Schnittmarken) für Dienstleister.'}
              />

              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    value={qrEventId}
                    onChange={(e) => setQrEventId(e.target.value)}
                    placeholder="eventId"
                    style={{
                      padding: '0.6rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #ddd',
                      minWidth: '360px',
                      fontFamily: 'monospace'
                    }}
                  />
                  <HelpTooltip title="eventId" content={'Event-ID, für den du die QR-Links und das Provider-PDF erzeugen willst.'} />
                </div>
                <ActionButton onClick={loadQrEvent} disabled={qrEventLoading}>
                  {qrEventLoading ? 'Lade…' : 'Event laden'}
                </ActionButton>
              </div>

              {qrEventError && <p style={{ marginTop: '0.75rem', color: '#B00020' }}>{qrEventError}</p>}

              {(hostEventUrl || guestEventUrl) && (
                <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.5rem' }}>
                  {qrEventTitle && (
                    <div style={{ color: '#295B4D', fontWeight: 600 }}>{qrEventTitle}</div>
                  )}
                  {hostEventUrl && (
                    <div style={{ fontSize: '0.875rem' }}>
                      <div style={{ color: '#666' }}>Host-Link:</div>
                      <a href={hostEventUrl} target="_blank" rel="noreferrer" style={{ color: '#295B4D', textDecoration: 'underline', wordBreak: 'break-all' }}>
                        {hostEventUrl}
                      </a>
                    </div>
                  )}
                  {guestEventUrl && (
                    <div style={{ fontSize: '0.875rem' }}>
                      <div style={{ color: '#666' }}>Gast-Link:</div>
                      <a href={guestEventUrl} target="_blank" rel="noreferrer" style={{ color: '#295B4D', textDecoration: 'underline', wordBreak: 'break-all' }}>
                        {guestEventUrl}
                      </a>
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#295B4D' }}>
                  Format
                  <select value={qrFormat} onChange={(e) => setQrFormat(e.target.value as any)} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ddd' }}>
                    <option value="A6">A6</option>
                    <option value="A5">A5</option>
                  </select>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#295B4D' }}>
                  bleedMm
                  <input value={qrBleedMm} onChange={(e) => setQrBleedMm(e.target.value)} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ddd', width: 90, fontFamily: 'monospace' }} />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#295B4D' }}>
                  <input type="checkbox" checked={qrCropMarks} onChange={(e) => setQrCropMarks(e.target.checked)} />
                  cropMarks
                </label>
                <HelpTooltip title="PDF Export" content={'Erzeugt ein druckfertiges PDF (z.B. für Print‑Service).'} />
                <ActionButton variant="secondary" onClick={exportProviderPdf} disabled={qrExporting}>
                  {qrExporting ? 'Export…' : 'PDF exportieren (Print‑Service)'}
                </ActionButton>
              </div>

              {qrExportError && <p style={{ marginTop: '0.75rem', color: '#B00020' }}>{qrExportError}</p>}
            </section>

            {/* Usage Inspector */}
            <section id="admin-usage-inspector" className={sectionCardClass}>
              <SectionHeader
                title="Usage Inspector"
                helpContent={'Debug-Tool: zeigt aktuelle Usage/Storage Daten eines Events.'}
              />

              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    value={usageEventId}
                    onChange={(e) => setUsageEventId(e.target.value)}
                    placeholder="eventId"
                    style={{
                      padding: '0.6rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #ddd',
                      minWidth: '320px',
                      fontFamily: 'monospace'
                    }}
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
              {usageError && <p style={{ marginTop: '0.75rem', color: '#B00020' }}>{usageError}</p>}
              {usageResult && (
                <pre style={{
                  marginTop: '0.75rem',
                  padding: '0.75rem',
                  background: '#f7f7f7',
                  borderRadius: '0.5rem',
                  overflowX: 'auto',
                  fontSize: '0.8rem'
                }}>
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
              <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input value={upgradeEventId} onChange={(e) => setUpgradeEventId(e.target.value)} placeholder="eventId" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', fontFamily: 'monospace', flex: 1 }} />
                  <HelpTooltip title="eventId" content={'Event-ID, für die das Upgrade gelten soll.'} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input value={upgradeSku} onChange={(e) => setUpgradeSku(e.target.value)} placeholder="sku (optional)" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', flex: 1 }} />
                  <HelpTooltip title="sku" content={'Optional. Wenn gesetzt, wird darüber das Produkt gefunden.'} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input value={upgradeProductId} onChange={(e) => setUpgradeProductId(e.target.value)} placeholder="productId (optional)" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', flex: 1 }} />
                  <HelpTooltip title="productId" content={'Optional. Alternative zu sku.'} />
                </div>
              </div>
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
              {upgradeError && <p style={{ marginTop: '0.75rem', color: '#B00020' }}>{upgradeError}</p>}
              {upgradeUrl ? (
                <div style={{ marginTop: '0.75rem' }}>
                  <p style={{ color: '#295B4D', fontWeight: '500' }}>Link:</p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <a href={upgradeUrl} target="_blank" rel="noreferrer" style={{ color: '#295B4D', textDecoration: 'underline', wordBreak: 'break-all' }}>{upgradeUrl}</a>
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

              <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input value={wooFilterStatus} onChange={(e) => setWooFilterStatus(e.target.value)} placeholder="status (z.B. PROCESSED/IGNORED/FAILED/FORBIDDEN)" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', flex: 1 }} />
                  <HelpTooltip title="status" content={'Optionaler Filter nach Status.'} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input value={wooFilterOrderId} onChange={(e) => setWooFilterOrderId(e.target.value)} placeholder="wcOrderId" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', fontFamily: 'monospace', flex: 1 }} />
                  <HelpTooltip title="wcOrderId" content={'Optionaler Filter nach WooCommerce Order ID.'} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input value={wooFilterEventId} onChange={(e) => setWooFilterEventId(e.target.value)} placeholder="eventId" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', fontFamily: 'monospace', flex: 1 }} />
                  <HelpTooltip title="eventId" content={'Optionaler Filter nach Event.'} />
                </div>
              </div>

              {wooLogsError && (
                <p style={{ marginTop: '0.75rem', color: '#B00020' }}>{wooLogsError}</p>
              )}

              <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                      <th style={{ padding: '0.5rem' }}>Zeit</th>
                      <th style={{ padding: '0.5rem' }}>Status</th>
                      <th style={{ padding: '0.5rem' }}>wcOrderId</th>
                      <th style={{ padding: '0.5rem' }}>eventId</th>
                      <th style={{ padding: '0.5rem' }}>SKU</th>
                      <th style={{ padding: '0.5rem' }}>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wooLogsLoading ? (
                      <tr><td colSpan={6} style={{ padding: '0.75rem', color: '#666' }}>Lade…</td></tr>
                    ) : (
                      (wooLogs || []).slice(0, 50).map((l: any) => (
                        <tr key={l.id} style={{ borderBottom: '1px solid #f2f2f2' }}>
                          <td style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}>{String(l.createdAt || '').replace('T', ' ').replace('Z', '')}</td>
                          <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{l.status}</td>
                          <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{l.wcOrderId || '-'}</td>
                          <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{l.eventId || '-'}</td>
                          <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{l.wcSku || '-'}</td>
                          <td style={{ padding: '0.5rem' }}>{l.reason || '-'}</td>
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
  );
}
