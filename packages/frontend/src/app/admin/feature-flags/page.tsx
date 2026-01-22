'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ArrowLeft, ToggleLeft, ToggleRight } from 'lucide-react';

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
  const router = useRouter();
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Admin Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Feature Flags</h1>
              <p className="mt-2 text-gray-600">
                Manage feature flags for different package tiers
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`bg-white rounded-lg shadow-sm border-2 ${
                pkg.isActive ? 'border-green-200' : 'border-gray-200'
              } p-6 transition-all hover:shadow-md`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    SKU: {pkg.sku} • Tier: {pkg.resultingTier}
                  </p>
                  {pkg.priceEurCents && (
                    <p className="text-sm font-medium text-green-600 mt-1">
                      €{(pkg.priceEurCents / 100).toFixed(2)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => togglePackageActive(pkg.id, pkg.isActive)}
                  disabled={saving === pkg.id}
                  className={`ml-2 p-2 rounded-lg transition-colors ${
                    pkg.isActive
                      ? 'bg-green-100 text-green-600 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                  title={pkg.isActive ? 'Active' : 'Inactive'}
                >
                  {pkg.isActive ? (
                    <ToggleRight className="w-6 h-6" />
                  ) : (
                    <ToggleLeft className="w-6 h-6" />
                  )}
                </button>
              </div>

              {pkg.description && (
                <p className="text-sm text-gray-600 mb-4 pb-4 border-b border-gray-100">
                  {pkg.description}
                </p>
              )}

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Features
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {FEATURE_FLAGS.map((feature) => {
                    const isEnabled = pkg[feature.key as keyof PackageDefinition] as boolean;
                    return (
                      <button
                        key={feature.key}
                        onClick={() =>
                          toggleFeature(pkg.id, feature.key, isEnabled)
                        }
                        disabled={saving === pkg.id}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          isEnabled
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-gray-50 text-gray-400 border border-gray-200'
                        } hover:opacity-80`}
                      >
                        <span className="flex items-center gap-1">
                          <span>{feature.icon}</span>
                          <span className="truncate">{feature.label}</span>
                        </span>
                        {isEnabled && (
                          <span className="text-blue-600">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500 space-y-1">
                {pkg.storageLimitPhotos && (
                  <div>📸 {pkg.storageLimitPhotos.toLocaleString()} photos</div>
                )}
                {pkg.storageLimitBytes && (
                  <div>
                    💾 {(pkg.storageLimitBytes / 1024 / 1024 / 1024).toFixed(1)} GB
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {packages.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-500">No packages found</p>
          </div>
        )}
      </div>
    </div>
  );
}
