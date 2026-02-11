'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Check,
  Crown,
  Sparkles,
  Shield,
  Zap,
  HardDrive,
  Camera,
  Video,
  BookOpen,
  Printer,
  LayoutGrid,
  Download,
  Users,
  ScanFace,
  Lock,
  Loader2,
  Star,
} from 'lucide-react';
import api from '@/lib/api';

interface PackageOption {
  id: string;
  sku: string;
  name: string;
  resultingTier: string;
  description: string | null;
  priceEurCents: number | null;
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
  allowMosaicWall: boolean;
  allowMosaicPrint: boolean;
  allowMosaicExport: boolean;
  maxCategories: number | null;
  maxChallenges: number | null;
  maxCoHosts: number | null;
  maxZipDownloadPhotos: number | null;
}

const TIER_CONFIG: Record<string, { icon: React.ElementType; gradient: string; badge: string }> = {
  FREE: { icon: Sparkles, gradient: 'from-gray-100 to-gray-200', badge: 'Kostenlos' },
  STARTER: { icon: Zap, gradient: 'from-blue-100 to-blue-200', badge: 'Starter' },
  PRO: { icon: Crown, gradient: 'from-purple-100 to-pink-200', badge: 'Pro' },
  PREMIUM: { icon: Star, gradient: 'from-amber-100 to-yellow-200', badge: 'Premium' },
  ENTERPRISE: { icon: Shield, gradient: 'from-emerald-100 to-teal-200', badge: 'Enterprise' },
};

const FEATURE_LIST: { key: keyof PackageOption; label: string; icon: React.ElementType }[] = [
  { key: 'allowVideoUpload', label: 'Video-Upload', icon: Video },
  { key: 'allowGuestbook', label: 'Gästebuch', icon: BookOpen },
  { key: 'allowLiveWall', label: 'Live Wall', icon: Camera },
  { key: 'allowMosaicWall', label: 'Mosaic Wall', icon: LayoutGrid },
  { key: 'allowMosaicPrint', label: 'Mosaic Print-Station', icon: Printer },
  { key: 'allowMosaicExport', label: 'Mosaic HD-Export', icon: Download },
  { key: 'allowFaceSearch', label: 'Gesichtserkennung', icon: ScanFace },
  { key: 'allowZipDownload', label: 'ZIP-Download', icon: Download },
  { key: 'allowCoHosts', label: 'Co-Hosts', icon: Users },
  { key: 'allowPasswordProtect', label: 'Passwortschutz', icon: Lock },
  { key: 'allowStories', label: 'Stories', icon: Sparkles },
  { key: 'allowBulkOperations', label: 'Bulk-Aktionen', icon: Zap },
  { key: 'allowFullInvitation', label: 'Erweiterte Einladungen', icon: Users },
  { key: 'allowGuestlist', label: 'Gästeliste', icon: Users },
  { key: 'isAdFree', label: 'Werbefrei', icon: Shield },
];

function formatBytes(bytes: string | null): string {
  if (!bytes) return 'Unbegrenzt';
  const b = parseInt(bytes);
  if (b <= 0) return 'Unbegrenzt';
  const gb = b / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(gb % 1 === 0 ? 0 : 1)} GB`;
  const mb = b / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

function formatPrice(cents: number | null): string {
  if (!cents || cents === 0) return 'Kostenlos';
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

export default function PackagePage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [currentSku, setCurrentSku] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState('FREE');
  const [packageName, setPackageName] = useState('Free');
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedPkg, setExpandedPkg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [pkgRes, infoRes] = await Promise.all([
        api.get(`/events/${eventId}/available-packages`),
        api.get(`/events/${eventId}/package-info`),
      ]);
      setPackages(pkgRes.data.packages || []);
      setCurrentSku(infoRes.data.sku || null);
      setCurrentTier(infoRes.data.tier || 'FREE');
      setPackageName(infoRes.data.packageName || 'Free');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const switchPackage = async (sku: string) => {
    if (switching) return;
    setSwitching(sku);
    setError(null);
    setSuccess(null);
    try {
      const { data } = await api.put(`/events/${eventId}/change-package`, { sku });
      setCurrentSku(sku);
      setCurrentTier(data.tier || 'FREE');
      setPackageName(data.packageName || sku);
      setSuccess(`Paket erfolgreich auf "${data.packageName || sku}" gewechselt!`);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Paketwechsel');
    } finally {
      setSwitching(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Paket verwalten</h1>
            <p className="text-xs text-gray-500">
              Aktuell: <span className="font-medium text-purple-600">{packageName}</span> ({currentTier})
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {success && (
        <div className="max-w-4xl mx-auto px-4 mt-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <Check className="w-5 h-5 text-green-500 shrink-0" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        </div>
      )}
      {error && (
        <div className="max-w-4xl mx-auto px-4 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Package Grid */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {packages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Keine Pakete verfügbar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {packages.map((pkg) => {
              const isCurrent = pkg.sku === currentSku;
              const tier = TIER_CONFIG[pkg.resultingTier] || TIER_CONFIG.FREE;
              const TierIcon = tier.icon;
              const isExpanded = expandedPkg === pkg.id;

              return (
                <div
                  key={pkg.id}
                  className={`relative rounded-2xl border-2 transition-all ${
                    isCurrent
                      ? 'border-purple-400 bg-white shadow-lg shadow-purple-100'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-purple-500 text-white text-xs font-bold rounded-full">
                      Aktuelles Paket
                    </div>
                  )}

                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tier.gradient} flex items-center justify-center`}>
                        <TierIcon className="w-6 h-6 text-gray-700" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-lg">{pkg.name}</h3>
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {tier.badge}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-gray-900">
                          {formatPrice(pkg.priceEurCents)}
                        </div>
                        {pkg.priceEurCents && pkg.priceEurCents > 0 && (
                          <div className="text-xs text-gray-400">einmalig</div>
                        )}
                      </div>
                    </div>

                    {pkg.description && (
                      <p className="text-sm text-gray-500 mb-4">{pkg.description}</p>
                    )}

                    {/* Key Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <HardDrive className="w-4 h-4 mx-auto text-gray-400 mb-1" />
                        <div className="text-xs font-medium text-gray-700">{formatBytes(pkg.storageLimitBytes)}</div>
                        <div className="text-[10px] text-gray-400">Speicher</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <Camera className="w-4 h-4 mx-auto text-gray-400 mb-1" />
                        <div className="text-xs font-medium text-gray-700">
                          {pkg.storageLimitPhotos ? `${pkg.storageLimitPhotos}` : '∞'}
                        </div>
                        <div className="text-[10px] text-gray-400">Fotos</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <Shield className="w-4 h-4 mx-auto text-gray-400 mb-1" />
                        <div className="text-xs font-medium text-gray-700">
                          {pkg.storageDurationDays ? `${pkg.storageDurationDays}d` : '∞'}
                        </div>
                        <div className="text-[10px] text-gray-400">Laufzeit</div>
                      </div>
                    </div>

                    {/* Feature Toggle */}
                    <button
                      onClick={() => setExpandedPkg(isExpanded ? null : pkg.id)}
                      className="w-full text-left text-xs text-purple-600 font-medium mb-3 hover:text-purple-700"
                    >
                      {isExpanded ? '▾ Features ausblenden' : '▸ Alle Features anzeigen'}
                    </button>

                    {isExpanded && (
                      <div className="space-y-1.5 mb-4 border-t pt-3">
                        {FEATURE_LIST.map(({ key, label, icon: Icon }) => {
                          const enabled = !!(pkg as any)[key];
                          return (
                            <div key={key} className="flex items-center gap-2 text-sm">
                              {enabled ? (
                                <Check className="w-4 h-4 text-green-500 shrink-0" />
                              ) : (
                                <Lock className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                              )}
                              <Icon className={`w-3.5 h-3.5 ${enabled ? 'text-gray-600' : 'text-gray-300'}`} />
                              <span className={enabled ? 'text-gray-700' : 'text-gray-400'}>{label}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Action */}
                    {isCurrent ? (
                      <div className="w-full py-2.5 bg-purple-50 text-purple-600 rounded-xl text-sm font-medium text-center">
                        Dein aktuelles Paket
                      </div>
                    ) : (
                      <button
                        onClick={() => switchPackage(pkg.sku)}
                        disabled={!!switching}
                        className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                          switching === pkg.sku
                            ? 'bg-gray-200 text-gray-400'
                            : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-sm'
                        }`}
                      >
                        {switching === pkg.sku ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Wechsle...
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4" />
                            Zu {pkg.name} wechseln
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
