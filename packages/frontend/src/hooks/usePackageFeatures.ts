'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

export type FeatureKey =
  | 'videoUpload'
  | 'stories'
  | 'passwordProtect'
  | 'guestbook'
  | 'zipDownload'
  | 'bulkOperations'
  | 'liveWall'
  | 'faceSearch'
  | 'guestlist'
  | 'fullInvitation'
  | 'coHosts'
  | 'adFree'
  | 'mosaicWall'
  | 'mosaicPrint'
  | 'mosaicExport'
  | 'boothGames';

export type LimitKey =
  | 'maxCategories'
  | 'maxChallenges'
  | 'maxZipDownloadPhotos'
  | 'maxCoHosts'
  | 'maxGamePlaysPerDay'
  | 'storageLimitPhotos';

export interface PackageInfo {
  tier: string;
  packageName: string;
  isFree: boolean;
  features: Record<FeatureKey, boolean>;
  limits: Record<LimitKey, number | null>;
  usage?: {
    photosBytes: string;
    videosBytes: string;
    guestbookBytes: string;
    totalBytes: string;
  };
  storageEndsAt?: string | null;
  isStorageLocked?: boolean;
}

const DEFAULT_PACKAGE_INFO: PackageInfo = {
  tier: 'FREE',
  packageName: 'Free',
  isFree: true,
  features: {
    videoUpload: false,
    stories: false,
    passwordProtect: false,
    guestbook: false,
    zipDownload: false,
    bulkOperations: false,
    liveWall: false,
    faceSearch: false,
    guestlist: false,
    fullInvitation: false,
    coHosts: false,
    adFree: false,
    mosaicWall: false,
    mosaicPrint: false,
    mosaicExport: false,
    boothGames: true,
  },
  limits: {
    maxCategories: 1,
    maxChallenges: 0,
    maxZipDownloadPhotos: 0,
    maxCoHosts: 0,
    maxGamePlaysPerDay: 3,
    storageLimitPhotos: 50,
  },
};

// Feature descriptions for upgrade prompts
export const FEATURE_DESCRIPTIONS: Record<FeatureKey, { name: string; description: string }> = {
  videoUpload: { name: 'Video-Upload', description: 'Gäste können Videos hochladen' },
  stories: { name: 'Stories', description: 'Instagram-ähnliche Story-Funktion' },
  passwordProtect: { name: 'Passwortschutz', description: 'Event mit Passwort schützen' },
  guestbook: { name: 'Gästebuch', description: 'Digitales Gästebuch mit Nachrichten' },
  zipDownload: { name: 'ZIP-Download', description: 'Alle Fotos als ZIP herunterladen' },
  bulkOperations: { name: 'Bulk-Aktionen', description: 'Mehrere Fotos gleichzeitig bearbeiten' },
  liveWall: { name: 'Live-Wall', description: 'Echtzeit-Fotowand für Beamer' },
  faceSearch: { name: 'Gesichtserkennung', description: 'Fotos nach Gesichtern durchsuchen' },
  guestlist: { name: 'Gästeliste', description: 'Gäste verwalten und einladen' },
  fullInvitation: { name: 'Erweiterte Einladungen', description: 'Einladungen per E-Mail versenden' },
  coHosts: { name: 'Co-Hosts', description: 'Andere Personen als Mitverwalter einladen' },
  adFree: { name: 'Werbefrei', description: 'Keine Werbung für Gäste' },
  mosaicWall: { name: 'Mosaic Wall', description: 'Foto-Mosaik aus Gäste-Fotos erstellen' },
  mosaicPrint: { name: 'Mosaic Print', description: 'Tiles als Labels drucken (Print-Station)' },
  mosaicExport: { name: 'Mosaic Export', description: 'HD-Poster des fertigen Mosaiks herunterladen' },
  boothGames: { name: 'Foto-Spaß', description: 'Selfie-Spiele und interaktive Foto-Challenges für Gäste' },
};

export function usePackageFeatures(eventId: string | null) {
  const [packageInfo, setPackageInfo] = useState<PackageInfo>(DEFAULT_PACKAGE_INFO);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPackageInfo = useCallback(async () => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get(`/events/${eventId}/package-info`);
      setPackageInfo(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Laden der Paket-Informationen');
      // Keep default package info on error
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadPackageInfo();
  }, [loadPackageInfo]);

  // Helper to check if a feature is enabled
  const isFeatureEnabled = useCallback(
    (feature: FeatureKey): boolean => {
      return packageInfo.features[feature] === true;
    },
    [packageInfo.features]
  );

  // Helper to get a limit value (null = unlimited)
  const getLimit = useCallback(
    (limit: LimitKey): number | null => {
      return packageInfo.limits[limit];
    },
    [packageInfo.limits]
  );

  // Helper to check if within a limit
  const isWithinLimit = useCallback(
    (limit: LimitKey, currentCount: number): boolean => {
      const max = packageInfo.limits[limit];
      if (max === null) return true; // unlimited
      return currentCount < max;
    },
    [packageInfo.limits]
  );

  // Helper to get upgrade message for a feature
  const getUpgradeMessage = useCallback(
    (feature: FeatureKey): string => {
      const desc = FEATURE_DESCRIPTIONS[feature];
      return `${desc.name} ist in deinem aktuellen Paket (${packageInfo.packageName}) nicht verfügbar. Upgrade für dieses Feature.`;
    },
    [packageInfo.packageName]
  );

  return {
    packageInfo,
    loading,
    error,
    reload: loadPackageInfo,
    isFeatureEnabled,
    getLimit,
    isWithinLimit,
    getUpgradeMessage,
    // Convenience getters
    tier: packageInfo.tier,
    packageName: packageInfo.packageName,
    isFree: packageInfo.isFree,
    features: packageInfo.features,
    limits: packageInfo.limits,
  };
}
