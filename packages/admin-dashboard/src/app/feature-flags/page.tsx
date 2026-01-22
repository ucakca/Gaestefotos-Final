'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ToggleLeft, ToggleRight } from 'lucide-react';

interface PackageDefinition {
  id: string;
  name: string;
  sku: string;
  type: string;
  resultingTier: string;
  isActive: boolean;
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
  priceEurCents?: number;
  storageLimitBytes?: number;
  storageLimitPhotos?: number;
  displayOrder: number;
  description?: string;
}

const FEATURE_FLAGS = [
  { key: 'allowVideoUpload', label: 'Video Upload', icon: '🎥' },
  { key: 'allowStories', label: 'Stories', icon: '📖' },
  { key: 'allowPasswordProtect', label: 'Password Protect', icon: '🔒' },
  { key: 'allowGuestbook', label: 'Guestbook', icon: '📝' },
  { key: 'allowZipDownload', label: 'Zip Download', icon: '📦' },
  { key: 'allowBulkOperations', label: 'Bulk Operations', icon: '⚡' },
  { key: 'allowLiveWall', label: 'Live Wall', icon: '📺' },
  { key: 'allowFaceSearch', label: 'Face Search', icon: '🔍' },
  { key: 'allowGuestlist', label: 'Guestlist', icon: '👥' },
  { key: 'allowFullInvitation', label: 'Full Invitation', icon: '💌' },
  { key: 'allowCoHosts', label: 'Co-Hosts', icon: '🤝' },
  { key: 'isAdFree', label: 'Ad Free', icon: '🚫' },
] as const;

export default function FeatureFlagsPage() {
  const [packages, setPackages] = useState<PackageDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/admin/feature-flags');
      setPackages(data.packages || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = async (packageId: string, featureKey: string, currentValue: boolean) => {
    try {
      setSaving(packageId);
      const pkg = packages.find((p) => p.id === packageId);
      if (!pkg) return;

      const updated = { ...pkg, [featureKey]: !currentValue };
      await api.put(`/admin/feature-flags/${packageId}`, updated);

      setPackages((prev) =>
        prev.map((p) => (p.id === packageId ? updated : p))
      );
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update feature');
    } finally {
      setSaving(null);
    }
  };

  const togglePackageActive = async (packageId: string, currentActive: boolean) => {
    try {
      setSaving(packageId);
      const pkg = packages.find((p) => p.id === packageId);
      if (!pkg) return;

      const updated = { ...pkg, isActive: !currentActive };
      await api.put(`/admin/feature-flags/${packageId}`, updated);

      setPackages((prev) =>
        prev.map((p) => (p.id === packageId ? updated : p))
      );
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update package');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex items-center justify-center py-12">
          <div className="text-app-muted">Laden...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-app-fg">Feature Flags</h1>
        <p className="mt-1 text-sm text-app-muted">Feature Flags für Package Tiers verwalten</p>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-app-border bg-app-card p-3 text-sm text-[var(--status-danger)]">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg) => (
          <Card key={pkg.id} className="p-6">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-app-fg">{pkg.name}</h3>
                <p className="mt-1 text-sm text-app-muted">
                  SKU: {pkg.sku} • Tier: {pkg.resultingTier}
                </p>
                {pkg.priceEurCents && (
                  <p className="mt-1 text-sm font-medium text-[var(--status-success)]">
                    €{(pkg.priceEurCents / 100).toFixed(2)}
                  </p>
                )}
              </div>
              <Button
                onClick={() => togglePackageActive(pkg.id, pkg.isActive)}
                disabled={saving === pkg.id}
                variant="ghost"
                size="sm"
                className={pkg.isActive ? 'text-[var(--status-success)]' : 'text-app-muted'}
                title={pkg.isActive ? 'Active' : 'Inactive'}
              >
                {pkg.isActive ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
              </Button>
            </div>

            {pkg.description && (
              <p className="mb-4 border-b border-app-border pb-4 text-sm text-app-muted">
                {pkg.description}
              </p>
            )}

            <div className="space-y-2">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-app-muted">
                Features
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {FEATURE_FLAGS.map((feature) => {
                  const isEnabled = pkg[feature.key as keyof PackageDefinition] as boolean;
                  return (
                    <Button
                      key={feature.key}
                      onClick={() => toggleFeature(pkg.id, feature.key, isEnabled)}
                      disabled={saving === pkg.id}
                      variant="outline"
                      size="sm"
                      className={`flex items-center justify-between px-3 py-2 text-xs font-medium ${
                        isEnabled
                          ? 'border-[var(--status-success)] bg-[var(--status-success)]/10 text-[var(--status-success)]'
                          : 'border-app-border text-app-muted'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <span>{feature.icon}</span>
                        <span className="truncate">{feature.label}</span>
                      </span>
                      {isEnabled && <span>✓</span>}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 space-y-1 border-t border-app-border pt-4 text-xs text-app-muted">
              {pkg.storageLimitPhotos && (
                <div>📸 {pkg.storageLimitPhotos.toLocaleString()} photos</div>
              )}
              {pkg.storageLimitBytes && (
                <div>
                  💾 {(pkg.storageLimitBytes / 1024 / 1024 / 1024).toFixed(1)} GB
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {packages.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-app-muted">Keine Packages gefunden</p>
        </Card>
      )}
    </div>
  );
}
