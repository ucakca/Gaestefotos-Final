'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Package,
  RefreshCw,
  Loader2,
  Check,
  X,
  Save,
  Plus,
  Puzzle,
  TableProperties,
  Euro,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { HelpButton } from '@/components/ui/HelpPanel';

interface PackageDefinition {
  id: string;
  sku: string;
  name: string;
  type: string;
  resultingTier: string;
  upgradeFromTier: string | null;
  isActive: boolean;
  storageLimitBytes: string | null;
  storageLimitPhotos: number | null;
  storageDurationDays: number | null;
  allowVideoUpload: boolean;
  allowStories: boolean;
  allowPasswordProtect: boolean;
  allowGuestbook: boolean;
  allowZipDownload: boolean;
  allowBulkOperations: boolean;
  allowLiveWall: boolean;
  allowFaceSearch: boolean;
  allowGuestlist: boolean;
  allowFullInvitation: boolean;
  allowCoHosts: boolean;
  allowMosaicWall: boolean;
  allowMosaicPrint: boolean;
  allowMosaicExport: boolean;
  isAdFree: boolean;
  maxCategories: number | null;
  maxChallenges: number | null;
  maxZipDownloadPhotos: number | null;
  maxCoHosts: number | null;
  displayOrder: number;
  priceEurCents: number | null;
  description: string | null;
}

type TabId = 'base' | 'addons' | 'matrix';

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'base', label: 'Basis-Pakete', icon: Package },
  { id: 'addons', label: 'Add-ons', icon: Puzzle },
  { id: 'matrix', label: 'Feature-Matrix', icon: TableProperties },
];

const FEATURE_FIELDS: { key: keyof PackageDefinition; label: string; description: string }[] = [
  { key: 'allowFaceSearch', label: 'Face Search', description: 'KI-Gesichtserkennung' },
  { key: 'allowPasswordProtect', label: 'Passwortschutz', description: 'Event-Passwortschutz' },
  { key: 'allowGuestbook', label: 'Gästebuch', description: 'Gästebuch-Einträge' },
  { key: 'allowZipDownload', label: 'ZIP Download', description: 'Massen-Download als ZIP' },
  { key: 'allowBulkOperations', label: 'Bulk Ops', description: 'Massen-Aktionen auf Fotos' },
  { key: 'allowVideoUpload', label: 'Video Upload', description: 'Video-Uploads erlauben' },
  { key: 'allowStories', label: 'Stories', description: '24h Stories Feature' },
  { key: 'allowLiveWall', label: 'Live Wall', description: 'Live-Slideshow auf Beamer' },
  { key: 'allowFullInvitation', label: 'Einladungen', description: 'Erweiterte Einladungen' },
  { key: 'allowCoHosts', label: 'Co-Hosts', description: 'Mehrere Event-Verwalter' },
  { key: 'allowMosaicWall', label: 'Mosaic Wall', description: 'Foto-Mosaik' },
  { key: 'allowMosaicPrint', label: 'Mosaic Print', description: 'Mosaik-Sticker drucken' },
  { key: 'allowMosaicExport', label: 'Mosaic Export', description: 'HD-Poster Export' },
  { key: 'isAdFree', label: 'Werbefrei', description: 'Keine Fremdwerbung' },
];

const LIMIT_FIELDS: { key: keyof PackageDefinition; label: string; placeholder: string }[] = [
  { key: 'storageLimitPhotos', label: 'Max Fotos', placeholder: '∞' },
  { key: 'storageDurationDays', label: 'Galerie (Tage)', placeholder: '∞' },
  { key: 'maxCoHosts', label: 'Max Co-Hosts', placeholder: '∞' },
  { key: 'maxCategories', label: 'Max Kategorien', placeholder: '∞' },
  { key: 'maxChallenges', label: 'Max Challenges', placeholder: '∞' },
];

function formatPrice(cents: number | null): string {
  if (cents === null || cents === undefined) return '—';
  return `${(cents / 100).toFixed(0)} €`;
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'BASE': return 'Basis';
    case 'ADDON': return 'Add-on';
    case 'UPGRADE': return 'Upgrade';
    default: return type;
  }
}

function getTypeBadgeClass(type: string): string {
  switch (type) {
    case 'BASE': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    case 'ADDON': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    case 'UPGRADE': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
  }
}

export default function PackagesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [packages, setPackages] = useState<PackageDefinition[]>([]);
  const [editingPackage, setEditingPackage] = useState<PackageDefinition | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('base');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadPackages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ packages: PackageDefinition[] }>('/admin/package-definitions');
      const sorted = (res.data.packages || []).sort((a, b) => a.displayOrder - b.displayOrder);
      setPackages(sorted);
    } catch (err) {
      console.error('Failed to load packages:', err);
      toast.error('Fehler beim Laden der Pakete');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  const handleSave = async (pkg: PackageDefinition) => {
    setSaving(pkg.id);
    try {
      await api.put(`/admin/package-definitions/${pkg.id}`, pkg);
      toast.success(`${pkg.name} gespeichert`);
      setEditingPackage(null);
      loadPackages();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setSaving(null);
    }
  };

  const handleCreate = async (data: Partial<PackageDefinition>) => {
    try {
      await api.post('/admin/package-definitions', data);
      toast.success('Paket erstellt');
      setShowCreateModal(false);
      loadPackages();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Fehler beim Erstellen');
    }
  };

  const toggleFeature = (pkg: PackageDefinition, field: keyof PackageDefinition) => {
    const base = editingPackage?.id === pkg.id ? editingPackage : pkg;
    setEditingPackage({ ...base, [field]: !base[field] });
  };

  const updateField = (pkg: PackageDefinition, field: keyof PackageDefinition, value: any) => {
    const base = editingPackage?.id === pkg.id ? editingPackage : pkg;
    setEditingPackage({ ...base, [field]: value });
  };

  const getDisplayPackage = (pkg: PackageDefinition) => {
    return editingPackage?.id === pkg.id ? editingPackage : pkg;
  };

  const basePackages = packages.filter((p) => p.type === 'BASE');
  const addonPackages = packages.filter((p) => p.type === 'ADDON');
  const allActive = packages.filter((p) => p.isActive);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-app-fg flex items-center gap-2">
            <Package className="w-6 h-6 text-app-accent" />
            Pakete & Features
            <HelpButton
              title="Pakete & WooCommerce"
              sections={[
                {
                  title: 'SKUs müssen übereinstimmen',
                  content: 'Die SKU jedes Pakets hier muss exakt mit der SKU des WooCommerce-Produkts übereinstimmen. Beispiel: \"starter\", \"addon-mosaic-digital\".\n\nOhne übereinstimmende SKU wird der WooCommerce-Webhook ignoriert.',
                },
                {
                  title: 'Paket-Typen',
                  content: '• BASE = Basis-Paket (Starter, Premium, etc.)\n• ADDON = Zusatz-Feature (Mosaic Wall, Print)\n• UPGRADE = Upgrade von einem Tier zum nächsten\n\nKunden können BASE + ADDON(s) im selben Warenkorb kaufen.',
                },
                {
                  title: 'Mosaic Wall Pakete',
                  content: '• addon-mosaic-digital (199€): Digitale Mosaik-Wand + HD-Export\n• addon-mosaic-print (599€): Print + Digital — beinhaltet alles aus Digital plus Print-Station und Sticker-Druck\n\nPrint inkludiert immer Digital. Kein separates Hybrid-Paket nötig.',
                },
                {
                  title: 'Feature-Merge (OR-Logik)',
                  content: 'Wenn ein Event ein Base-Paket UND Addons hat, werden Features mit OR zusammengeführt:\n\nBase: mosaicWall=❌, videoUpload=✅\nAddon: mosaicWall=✅\n→ Ergebnis: mosaicWall=✅, videoUpload=✅\n\nDer höhere Limit-Wert gewinnt immer.',
                },
                {
                  title: 'Feature-Flags bearbeiten',
                  content: 'Klicke auf ein Paket → Feature-Toggles ändern → Speichern.\n\nÄnderungen gelten sofort für alle Events mit diesem Paket.',
                },
              ]}
              docsLink="https://github.com/ucakca/Gaestefotos-Final/blob/master/docs/woocommerce-setup.md"
            />
          </h1>
          <p className="mt-1 text-sm text-app-muted">
            Basis-Pakete, Add-ons und Feature-Konfiguration
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={loadPackages} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Neues Paket
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-app-bg border border-app-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
              activeTab === tab.id
                ? 'bg-app-accent text-white shadow-sm'
                : 'text-app-muted hover:text-app-fg hover:bg-app-card'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.id === 'base' && (
              <span className="ml-1 text-xs opacity-70">({basePackages.length})</span>
            )}
            {tab.id === 'addons' && (
              <span className="ml-1 text-xs opacity-70">({addonPackages.length})</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-app-accent" />
        </div>
      ) : (
        <>
          {/* Tab: Base Packages / Add-ons (shared card layout) */}
          {(activeTab === 'base' || activeTab === 'addons') && (
            <PackageCards
              packages={activeTab === 'base' ? basePackages : addonPackages}
              editingPackage={editingPackage}
              saving={saving}
              getDisplayPackage={getDisplayPackage}
              toggleFeature={toggleFeature}
              updateField={updateField}
              handleSave={handleSave}
              setEditingPackage={setEditingPackage}
              emptyMessage={
                activeTab === 'base'
                  ? 'Keine Basis-Pakete vorhanden'
                  : 'Keine Add-ons vorhanden. Erstelle ein Paket mit Typ "Add-on".'
              }
            />
          )}

          {/* Tab: Feature Matrix */}
          {activeTab === 'matrix' && (
            <FeatureMatrix
              packages={allActive}
              saving={saving}
              onToggle={async (pkgId, flagKey, currentValue) => {
                setSaving(pkgId);
                try {
                  const pkg = packages.find((p) => p.id === pkgId);
                  if (!pkg) return;
                  await api.put(`/admin/package-definitions/${pkgId}`, {
                    ...pkg,
                    [flagKey]: !currentValue,
                  });
                  setPackages((prev) =>
                    prev.map((p) => (p.id === pkgId ? { ...p, [flagKey]: !currentValue } : p))
                  );
                  toast.success(`${pkg.name}: ${flagKey} ${!currentValue ? 'aktiviert' : 'deaktiviert'}`);
                } catch (err: any) {
                  toast.error(err?.response?.data?.error || 'Fehler beim Speichern');
                } finally {
                  setSaving(null);
                }
              }}
            />
          )}
        </>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreatePackageModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}

/* ────────────────────── Package Cards ────────────────────── */

function PackageCards({
  packages,
  editingPackage,
  saving,
  getDisplayPackage,
  toggleFeature,
  updateField,
  handleSave,
  setEditingPackage,
  emptyMessage,
}: {
  packages: PackageDefinition[];
  editingPackage: PackageDefinition | null;
  saving: string | null;
  getDisplayPackage: (pkg: PackageDefinition) => PackageDefinition;
  toggleFeature: (pkg: PackageDefinition, field: keyof PackageDefinition) => void;
  updateField: (pkg: PackageDefinition, field: keyof PackageDefinition, value: any) => void;
  handleSave: (pkg: PackageDefinition) => void;
  setEditingPackage: (pkg: PackageDefinition | null) => void;
  emptyMessage: string;
}) {
  if (packages.length === 0) {
    return <div className="text-center py-12 text-app-muted">{emptyMessage}</div>;
  }

  return (
    <div className="space-y-5">
      {packages.map((pkg) => {
        const displayPkg = getDisplayPackage(pkg);
        const hasChanges = editingPackage?.id === pkg.id;

        return (
          <div
            key={pkg.id}
            className={`rounded-2xl border bg-app-card p-6 transition-all ${
              hasChanges ? 'border-app-accent ring-1 ring-app-accent/20' : 'border-app-border'
            } ${!pkg.isActive ? 'opacity-50' : ''}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    displayPkg.isActive ? 'bg-app-accent/10' : 'bg-gray-500/10'
                  }`}
                >
                  {displayPkg.type === 'ADDON' ? (
                    <Puzzle className={`w-6 h-6 ${displayPkg.isActive ? 'text-app-accent' : 'text-gray-500'}`} />
                  ) : (
                    <Package className={`w-6 h-6 ${displayPkg.isActive ? 'text-app-accent' : 'text-gray-500'}`} />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{displayPkg.name}</h3>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${getTypeBadgeClass(displayPkg.type)}`}>
                      {getTypeLabel(displayPkg.type)}
                    </span>
                    {!displayPkg.isActive && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/30">
                        Inaktiv
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-app-muted mt-0.5">
                    <span className="font-mono text-xs">{displayPkg.sku}</span>
                    <span>·</span>
                    <span>{displayPkg.resultingTier}</span>
                    {displayPkg.priceEurCents != null && (
                      <>
                        <span>·</span>
                        <span className="text-green-400 font-semibold">{formatPrice(displayPkg.priceEurCents)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {hasChanges && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingPackage(null)}>
                    Abbrechen
                  </Button>
                  <Button size="sm" onClick={() => handleSave(displayPkg)} disabled={saving === pkg.id}>
                    {saving === pkg.id ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-1" />
                    )}
                    Speichern
                  </Button>
                </div>
              )}
            </div>

            {/* Price + Limits */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-5">
              <div>
                <label className="text-xs text-app-muted mb-1 block">Preis (€)</label>
                <Input
                  type="number"
                  value={displayPkg.priceEurCents != null ? displayPkg.priceEurCents / 100 : ''}
                  onChange={(e) =>
                    updateField(pkg, 'priceEurCents', e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null)
                  }
                  className="text-center"
                  placeholder="0"
                />
              </div>
              {LIMIT_FIELDS.map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs text-app-muted mb-1 block">{label}</label>
                  <Input
                    type="number"
                    value={(displayPkg[key] as number | null) ?? ''}
                    onChange={(e) =>
                      updateField(pkg, key, e.target.value ? parseInt(e.target.value) : null)
                    }
                    className="text-center"
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="mb-5">
              <label className="text-xs text-app-muted mb-1 block">Beschreibung</label>
              <Input
                value={displayPkg.description ?? ''}
                onChange={(e) => updateField(pkg, 'description', e.target.value || null)}
                placeholder="Kurzbeschreibung des Pakets..."
              />
            </div>

            {/* Features */}
            <div>
              <label className="text-xs text-app-muted mb-2 block">Features</label>
              <div className="flex flex-wrap gap-2">
                {FEATURE_FIELDS.map(({ key, label }) => {
                  const isEnabled = !!displayPkg[key];
                  return (
                    <button
                      key={key}
                      onClick={() => toggleFeature(pkg, key)}
                      title={FEATURE_FIELDS.find((f) => f.key === key)?.description}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                        isEnabled
                          ? 'bg-green-500/10 text-green-500 border border-green-500/30'
                          : 'bg-app-bg text-app-muted border border-app-border hover:border-app-accent/50'
                      }`}
                    >
                      {isEnabled ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ────────────────────── Feature Matrix ────────────────────── */

function FeatureMatrix({
  packages,
  saving,
  onToggle,
}: {
  packages: PackageDefinition[];
  saving: string | null;
  onToggle: (pkgId: string, flagKey: string, currentValue: boolean) => void;
}) {
  if (packages.length === 0) {
    return <div className="text-center py-12 text-app-muted">Keine aktiven Pakete vorhanden</div>;
  }

  return (
    <div className="rounded-2xl border border-app-border bg-app-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-app-border bg-app-bg/50">
              <th className="text-left px-4 py-3 font-semibold text-app-fg text-sm sticky left-0 bg-app-bg/50 z-10 min-w-[180px]">
                Feature
              </th>
              {packages.map((pkg) => (
                <th key={pkg.id} className="px-3 py-3 text-center min-w-[100px]">
                  <div className="text-sm font-semibold text-app-fg">{pkg.name}</div>
                  <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${getTypeBadgeClass(pkg.type)}`}>
                    {getTypeLabel(pkg.type)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Price row */}
            <tr className="border-b border-app-border bg-app-bg/30">
              <td className="px-4 py-2.5 sticky left-0 bg-app-bg/30 z-10">
                <div className="flex items-center gap-2">
                  <Euro className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-sm font-medium text-app-fg">Preis</span>
                </div>
              </td>
              {packages.map((pkg) => (
                <td key={pkg.id} className="px-3 py-2.5 text-center">
                  <span className="text-sm font-semibold text-green-400">
                    {formatPrice(pkg.priceEurCents)}
                  </span>
                </td>
              ))}
            </tr>
            {/* Limit rows */}
            {LIMIT_FIELDS.map(({ key, label }) => (
              <tr key={key} className="border-b border-app-border/50">
                <td className="px-4 py-2.5 sticky left-0 bg-app-card z-10">
                  <span className="text-sm text-app-muted">{label}</span>
                </td>
                {packages.map((pkg) => {
                  const val = pkg[key] as number | null;
                  return (
                    <td key={pkg.id} className="px-3 py-2.5 text-center">
                      <span className="text-sm text-app-fg">{val ?? '∞'}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* Divider */}
            <tr className="border-b-2 border-app-border">
              <td colSpan={packages.length + 1} className="px-4 py-2 bg-app-bg/50">
                <span className="text-xs font-bold uppercase tracking-wider text-app-muted">Features</span>
              </td>
            </tr>
            {/* Feature rows */}
            {FEATURE_FIELDS.map(({ key, label, description }, idx) => (
              <tr
                key={key}
                className={`border-b border-app-border/30 ${idx % 2 === 0 ? '' : 'bg-app-bg/20'}`}
              >
                <td className="px-4 py-2.5 sticky left-0 z-10" style={{ backgroundColor: 'inherit' }}>
                  <div>
                    <span className="text-sm text-app-fg">{label}</span>
                    <span className="block text-[11px] text-app-muted">{description}</span>
                  </div>
                </td>
                {packages.map((pkg) => {
                  const value = pkg[key] as boolean;
                  return (
                    <td key={pkg.id} className="px-3 py-2.5 text-center">
                      <button
                        onClick={() => onToggle(pkg.id, key, value)}
                        disabled={saving === pkg.id}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-colors ${
                          value
                            ? 'bg-green-500/15 text-green-500 hover:bg-green-500/25'
                            : 'bg-app-bg text-app-muted/40 hover:bg-app-bg/80 hover:text-app-muted'
                        } ${saving === pkg.id ? 'opacity-50' : ''}`}
                      >
                        {saving === pkg.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : value ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ────────────────────── Create Modal ────────────────────── */

function CreatePackageModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: Partial<PackageDefinition>) => void;
}) {
  const [form, setForm] = useState({
    name: '',
    sku: '',
    type: 'BASE' as string,
    resultingTier: '',
    priceEurCents: null as number | null,
    description: '',
    displayOrder: 0,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-app-card rounded-2xl border border-app-border p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">Neues Paket erstellen</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-app-muted mb-1 block">Name *</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="z.B. Photo Booth" />
          </div>
          <div>
            <label className="text-xs text-app-muted mb-1 block">SKU *</label>
            <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="z.B. addon-photo-booth" />
          </div>
          <div>
            <label className="text-xs text-app-muted mb-1 block">Typ</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-app-bg border border-app-border text-app-fg text-sm"
            >
              <option value="BASE">Basis-Paket</option>
              <option value="ADDON">Add-on</option>
              <option value="UPGRADE">Upgrade</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-app-muted mb-1 block">Resulting Tier *</label>
            <Input value={form.resultingTier} onChange={(e) => setForm({ ...form, resultingTier: e.target.value })} placeholder="z.B. SMART" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-app-muted mb-1 block">Preis (€)</label>
              <Input
                type="number"
                value={form.priceEurCents != null ? form.priceEurCents / 100 : ''}
                onChange={(e) => setForm({ ...form, priceEurCents: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null })}
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-xs text-app-muted mb-1 block">Reihenfolge</label>
              <Input
                type="number"
                value={form.displayOrder}
                onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-app-muted mb-1 block">Beschreibung</label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional..." />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button
            onClick={() => onCreate({
              ...form,
              description: form.description || null,
            })}
            disabled={!form.name || !form.sku || !form.resultingTier}
          >
            <Plus className="w-4 h-4 mr-1" />
            Erstellen
          </Button>
        </div>
      </div>
    </div>
  );
}
