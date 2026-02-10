'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Package,
  RefreshCw,
  Loader2,
  Check,
  X,
  Save,
  ShoppingCart,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';

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
  isAdFree: boolean;
  maxCategories: number | null;
  maxChallenges: number | null;
  maxZipDownloadPhotos: number | null;
  maxCoHosts: number | null;
  displayOrder: number;
  priceEurCents: number | null;
  description: string | null;
}

const FEATURE_FIELDS: { key: keyof PackageDefinition; label: string }[] = [
  { key: 'allowVideoUpload', label: 'Video Upload' },
  { key: 'allowStories', label: 'Stories' },
  { key: 'allowPasswordProtect', label: 'Passwortschutz' },
  { key: 'allowGuestbook', label: 'Gästebuch' },
  { key: 'allowZipDownload', label: 'ZIP Download' },
  { key: 'allowBulkOperations', label: 'Bulk Operations' },
  { key: 'allowLiveWall', label: 'Live Wall' },
  { key: 'allowFaceSearch', label: 'Face Search' },
  { key: 'allowGuestlist', label: 'Gästeliste' },
  { key: 'allowFullInvitation', label: 'Einladungen' },
  { key: 'allowCoHosts', label: 'Co-Hosts' },
  { key: 'isAdFree', label: 'Werbefrei' },
];

function formatStorage(bytes: string | null): string {
  if (!bytes) return '—';
  const gb = Number(bytes) / (1024 * 1024 * 1024);
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(Number(bytes) / (1024 * 1024)).toFixed(0)} MB`;
}

function formatPrice(cents: number | null): string {
  if (cents === null || cents === undefined) return '—';
  return `${(cents / 100).toFixed(2)} €`;
}

export default function PackagesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [packages, setPackages] = useState<PackageDefinition[]>([]);
  const [editingPackage, setEditingPackage] = useState<PackageDefinition | null>(null);

  const loadPackages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ packages: PackageDefinition[] }>('/admin/package-definitions');
      setPackages(res.data.packages || []);
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

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-app-fg flex items-center gap-2">
            <Package className="w-6 h-6 text-app-accent" />
            Pakete & Features
          </h1>
          <p className="mt-1 text-sm text-app-muted">
            Verwalte Paket-Definitionen und Feature-Flags
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={loadPackages} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
          <Button size="sm" variant="outline" disabled>
            <ShoppingCart className="w-4 h-4 mr-1" />
            WooCommerce Sync
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
        <p className="text-sm text-blue-400">
          💡 <strong>Tipp:</strong> Klicke auf Features um sie zu aktivieren/deaktivieren. 
          Änderungen werden erst nach dem Speichern wirksam.
        </p>
      </div>

      {/* Packages */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-app-accent" />
        </div>
      ) : packages.length === 0 ? (
        <div className="text-center py-12 text-app-muted">
          Keine Paket-Definitionen vorhanden
        </div>
      ) : (
        <div className="space-y-6">
          {packages.map((pkg) => {
            const displayPkg = getDisplayPackage(pkg);
            const hasChanges = editingPackage?.id === pkg.id;

            return (
              <div
                key={pkg.id}
                className={`rounded-2xl border bg-app-card p-6 transition-all ${
                  hasChanges ? 'border-app-accent' : 'border-app-border'
                }`}
              >
                {/* Package Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        displayPkg.isActive ? 'bg-green-500/10' : 'bg-gray-500/10'
                      }`}
                    >
                      <Package
                        className={`w-6 h-6 ${
                          displayPkg.isActive ? 'text-green-500' : 'text-gray-500'
                        }`}
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{displayPkg.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-app-muted">
                        <span className="font-mono">{displayPkg.sku}</span>
                        <span>·</span>
                        <span>{displayPkg.resultingTier}</span>
                        <span>·</span>
                        <span>{formatStorage(displayPkg.storageLimitBytes)}</span>
                        {displayPkg.priceEurCents != null && (
                          <>
                            <span>·</span>
                            <span className="text-green-400">{formatPrice(displayPkg.priceEurCents)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {hasChanges && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingPackage(null)}
                      >
                        Abbrechen
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSave(displayPkg)}
                        disabled={saving === pkg.id}
                      >
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

                {/* Limits */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div>
                    <label className="text-xs text-app-muted mb-1 block">Max Fotos</label>
                    <Input
                      type="number"
                      value={displayPkg.storageLimitPhotos ?? ''}
                      onChange={(e) => updateField(pkg, 'storageLimitPhotos', e.target.value ? parseInt(e.target.value) : null)}
                      className="text-center"
                      placeholder="∞"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-app-muted mb-1 block">Max Co-Hosts</label>
                    <Input
                      type="number"
                      value={displayPkg.maxCoHosts ?? ''}
                      onChange={(e) => updateField(pkg, 'maxCoHosts', e.target.value ? parseInt(e.target.value) : null)}
                      className="text-center"
                      placeholder="∞"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-app-muted mb-1 block">Max Kategorien</label>
                    <Input
                      type="number"
                      value={displayPkg.maxCategories ?? ''}
                      onChange={(e) => updateField(pkg, 'maxCategories', e.target.value ? parseInt(e.target.value) : null)}
                      className="text-center"
                      placeholder="∞"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-app-muted mb-1 block">Laufzeit (Tage)</label>
                    <Input
                      type="number"
                      value={displayPkg.storageDurationDays ?? ''}
                      onChange={(e) => updateField(pkg, 'storageDurationDays', e.target.value ? parseInt(e.target.value) : null)}
                      className="text-center"
                      placeholder="∞"
                    />
                  </div>
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
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                            isEnabled
                              ? 'bg-green-500/10 text-green-500 border border-green-500/30'
                              : 'bg-app-bg text-app-muted border border-app-border hover:border-app-accent/50'
                          }`}
                        >
                          {isEnabled ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
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
      )}
    </div>
  );
}
