'use client';

import { useState, useEffect } from 'react';
import { Flag, Check, X, Loader2, AlertCircle, ChevronDown, ChevronUp, Save } from 'lucide-react';
import api from '@/lib/api';

interface PackageDefinition {
  id: string;
  name: string;
  sku: string;
  type: string;
  resultingTier: string;
  isActive: boolean;
  displayOrder: number;
  // Feature Flags
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
  // Limits
  storageLimitBytes: number | null;
  storageDurationDays: number | null;
  storageLimitPhotos: number | null;
  maxCategories: number | null;
  maxChallenges: number | null;
  maxCoHosts: number | null;
  maxZipDownloadPhotos: number | null;
}

const FEATURE_FLAGS = [
  { key: 'allowVideoUpload', label: 'Video Upload', description: 'Erlaubt Video-Uploads' },
  { key: 'allowStories', label: 'Stories', description: '24h Stories Feature' },
  { key: 'allowPasswordProtect', label: 'Passwortschutz', description: 'Event-Passwortschutz' },
  { key: 'allowGuestbook', label: 'Gästebuch', description: 'Gästebuch-Einträge' },
  { key: 'allowZipDownload', label: 'ZIP Download', description: 'Massen-Download als ZIP' },
  { key: 'allowBulkOperations', label: 'Bulk Operations', description: 'Massen-Aktionen auf Fotos' },
  { key: 'allowLiveWall', label: 'Live Wall', description: 'Live-Slideshow auf Beamer' },
  { key: 'allowFaceSearch', label: 'Face Search', description: 'Gesichtserkennung' },
  { key: 'allowGuestlist', label: 'Gästeliste', description: 'Gästeliste-Management' },
  { key: 'allowFullInvitation', label: 'Full Invitation', description: 'Erweiterte Einladungen' },
  { key: 'allowCoHosts', label: 'Co-Hosts', description: 'Mehrere Event-Verwalter' },
  { key: 'isAdFree', label: 'Werbefrei', description: 'Keine Werbung anzeigen' },
] as const;

export default function FeatureFlagsPage() {
  const [packages, setPackages] = useState<PackageDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedPkg, setExpandedPkg] = useState<string | null>(null);

  useEffect(() => {
    loadPackages();
  }, []);

  async function loadPackages() {
    try {
      setLoading(true);
      const res = await api.get('/admin/feature-flags');
      setPackages(res.data.packages || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }

  async function toggleFlag(pkgId: string, flagKey: string, currentValue: boolean) {
    try {
      setSaving(pkgId);
      setError(null);
      
      const pkg = packages.find(p => p.id === pkgId);
      if (!pkg) return;

      await api.put(`/admin/feature-flags/${pkgId}`, {
        ...pkg,
        [flagKey]: !currentValue,
      });

      setPackages(prev => prev.map(p => 
        p.id === pkgId ? { ...p, [flagKey]: !currentValue } : p
      ));

      setSuccess(`${pkg.name}: ${flagKey} ${!currentValue ? 'aktiviert' : 'deaktiviert'}`);
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setSaving(null);
    }
  }

  async function toggleActive(pkgId: string, currentValue: boolean) {
    try {
      setSaving(pkgId);
      setError(null);
      
      const pkg = packages.find(p => p.id === pkgId);
      if (!pkg) return;

      await api.put(`/admin/feature-flags/${pkgId}`, {
        ...pkg,
        isActive: !currentValue,
      });

      setPackages(prev => prev.map(p => 
        p.id === pkgId ? { ...p, isActive: !currentValue } : p
      ));

      setSuccess(`${pkg.name} ${!currentValue ? 'aktiviert' : 'deaktiviert'}`);
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          Lädt Feature Flags...
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Flag className="w-6 h-6" />
          Feature Flags
        </h1>
        <p className="text-gray-500 mt-1">
          Verwalte Feature-Freischaltungen pro Package-Tier
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
          <Check className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Feature Flags Matrix */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10">
                  Package
                </th>
                {FEATURE_FLAGS.map(flag => (
                  <th 
                    key={flag.key} 
                    className="px-2 py-3 text-center"
                    title={flag.description}
                  >
                    <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
                      {flag.label}
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 text-center font-semibold text-gray-700">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg, idx) => (
                <tr 
                  key={pkg.id} 
                  className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${!pkg.isActive ? 'opacity-50' : ''}`}
                >
                  <td className="px-4 py-3 sticky left-0 bg-inherit z-10">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedPkg(expandedPkg === pkg.id ? null : pkg.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {expandedPkg === pkg.id ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      <div>
                        <div className="font-medium text-gray-900">{pkg.name}</div>
                        <div className="text-xs text-gray-500">{pkg.sku} • {pkg.resultingTier}</div>
                      </div>
                    </div>
                  </td>
                  {FEATURE_FLAGS.map(flag => {
                    const value = pkg[flag.key as keyof PackageDefinition] as boolean;
                    return (
                      <td key={flag.key} className="px-2 py-3 text-center">
                        <button
                          onClick={() => toggleFlag(pkg.id, flag.key, value)}
                          disabled={saving === pkg.id}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            value 
                              ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          } ${saving === pkg.id ? 'opacity-50' : ''}`}
                          title={`${flag.label}: ${value ? 'Aktiv' : 'Inaktiv'}`}
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
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(pkg.id, pkg.isActive)}
                      disabled={saving === pkg.id}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        pkg.isActive 
                          ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {pkg.isActive ? 'Aktiv' : 'Inaktiv'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-700 mb-2">Legende</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {FEATURE_FLAGS.map(flag => (
            <div key={flag.key} className="flex items-start gap-2">
              <span className="font-medium text-gray-700">{flag.label}:</span>
              <span className="text-gray-500">{flag.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
