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
  name: string;
  slug: string;
  active: boolean;
  maxPhotos: number;
  maxVideos: number;
  maxGuests: number;
  storageLimitGb: number;
  features: Record<string, boolean>;
}

const FEATURE_LABELS: Record<string, string> = {
  videoUpload: 'Video Upload',
  stories: 'Stories',
  passwordProtect: 'Passwortschutz',
  guestbook: 'Gästebuch',
  zipDownload: 'ZIP Download',
  bulkOperations: 'Bulk Operations',
  liveWall: 'Live Wall',
  faceSearch: 'Face Search',
  guestList: 'Gästeliste',
  fullInvitation: 'Einladungen',
  coHosts: 'Co-Hosts',
  adFree: 'Werbefrei',
};

export default function PackagesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [packages, setPackages] = useState<PackageDefinition[]>([]);
  const [editingPackage, setEditingPackage] = useState<PackageDefinition | null>(null);

  const loadPackages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ packages: PackageDefinition[] }>('/admin/packages');
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
      await api.put(`/admin/packages/${pkg.id}`, pkg);
      toast.success(`${pkg.name} gespeichert`);
      setEditingPackage(null);
      loadPackages();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setSaving(null);
    }
  };

  const toggleFeature = (pkg: PackageDefinition, feature: string) => {
    if (!editingPackage || editingPackage.id !== pkg.id) {
      setEditingPackage({
        ...pkg,
        features: { ...pkg.features, [feature]: !pkg.features[feature] },
      });
    } else {
      setEditingPackage({
        ...editingPackage,
        features: { ...editingPackage.features, [feature]: !editingPackage.features[feature] },
      });
    }
  };

  const updateLimit = (pkg: PackageDefinition, field: keyof PackageDefinition, value: number) => {
    if (!editingPackage || editingPackage.id !== pkg.id) {
      setEditingPackage({ ...pkg, [field]: value });
    } else {
      setEditingPackage({ ...editingPackage, [field]: value });
    }
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
                        displayPkg.active ? 'bg-green-500/10' : 'bg-gray-500/10'
                      }`}
                    >
                      <Package
                        className={`w-6 h-6 ${
                          displayPkg.active ? 'text-green-500' : 'text-gray-500'
                        }`}
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{displayPkg.name}</h3>
                      <p className="text-sm text-app-muted">/{displayPkg.slug}</p>
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
                      value={displayPkg.maxPhotos}
                      onChange={(e) => updateLimit(pkg, 'maxPhotos', parseInt(e.target.value) || 0)}
                      className="text-center"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-app-muted mb-1 block">Max Videos</label>
                    <Input
                      type="number"
                      value={displayPkg.maxVideos}
                      onChange={(e) => updateLimit(pkg, 'maxVideos', parseInt(e.target.value) || 0)}
                      className="text-center"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-app-muted mb-1 block">Max Gäste</label>
                    <Input
                      type="number"
                      value={displayPkg.maxGuests}
                      onChange={(e) => updateLimit(pkg, 'maxGuests', parseInt(e.target.value) || 0)}
                      className="text-center"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-app-muted mb-1 block">Speicher (GB)</label>
                    <Input
                      type="number"
                      value={displayPkg.storageLimitGb}
                      onChange={(e) => updateLimit(pkg, 'storageLimitGb', parseInt(e.target.value) || 0)}
                      className="text-center"
                    />
                  </div>
                </div>

                {/* Features */}
                <div>
                  <label className="text-xs text-app-muted mb-2 block">Features</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                      const isEnabled = displayPkg.features?.[key] ?? false;
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
