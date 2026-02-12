/**
 * Feature Gate Service
 * 
 * Prüft ob Features basierend auf dem Event-Paket aktiviert sind.
 * Verwendet PackageDefinition mit Feature-Flags.
 */

import prisma from '../config/database';
import { getEffectiveEventPackage } from './packageLimits';
import { logger } from '../utils/logger';

// Feature Keys die geprüft werden können
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
  | 'mosaicExport';

// Limit Keys die geprüft werden können
export type LimitKey =
  | 'maxCategories'
  | 'maxChallenges'
  | 'maxZipDownloadPhotos'
  | 'maxCoHosts'
  | 'storageLimitPhotos';

// Mapping von FeatureKey zu PackageDefinition Feld
const featureToFieldMap: Record<FeatureKey, string> = {
  videoUpload: 'allowVideoUpload',
  stories: 'allowStories',
  passwordProtect: 'allowPasswordProtect',
  guestbook: 'allowGuestbook',
  zipDownload: 'allowZipDownload',
  bulkOperations: 'allowBulkOperations',
  liveWall: 'allowLiveWall',
  faceSearch: 'allowFaceSearch',
  guestlist: 'allowGuestlist',
  fullInvitation: 'allowFullInvitation',
  coHosts: 'allowCoHosts',
  adFree: 'isAdFree',
  mosaicWall: 'allowMosaicWall',
  mosaicPrint: 'allowMosaicPrint',
  mosaicExport: 'allowMosaicExport',
};

// Features die im Free-Tier immer aktiviert sind
const FREE_TIER_FEATURES: FeatureKey[] = [];

// Features die in ALLEN Tiers aktiviert sind (Screenshot: alle ✅)
const ALWAYS_ENABLED_FEATURES: FeatureKey[] = [];

/**
 * Holt das vollständige PackageDefinition für ein Event
 */
export async function getEventPackageDefinition(eventId: string) {
  const { packageDefinition, isFree } = await getEffectiveEventPackage(eventId);
  
  if (isFree || !packageDefinition.sku) {
    // Free-Tier: Lade das "free" Paket
    const freePkg = await prisma.packageDefinition.findFirst({
      where: { sku: 'free', isActive: true },
    });
    return { pkg: freePkg, isFree: true };
  }
  
  const pkg = await prisma.packageDefinition.findFirst({
    where: { sku: packageDefinition.sku, isActive: true },
  });
  
  return { pkg, isFree: false };
}

/**
 * Prüft ob ein Feature für ein Event aktiviert ist
 */
export async function isFeatureEnabled(
  eventId: string,
  feature: FeatureKey
): Promise<boolean> {
  // Features die immer aktiviert sind
  if (ALWAYS_ENABLED_FEATURES.includes(feature)) {
    return true;
  }
  
  const { pkg, isFree } = await getEventPackageDefinition(eventId);
  
  // Free-Tier ohne Paket-Definition: Basis-Features
  if (isFree && !pkg) {
    return FREE_TIER_FEATURES.includes(feature);
  }
  
  if (!pkg) {
    logger.warn(`No package found for event ${eventId}, denying feature ${feature}`);
    return false;
  }
  
  const fieldName = featureToFieldMap[feature];
  const value = (pkg as any)[fieldName];
  
  return value === true;
}

/**
 * Holt ein Limit für ein Event (null = unlimited)
 */
export async function getFeatureLimit(
  eventId: string,
  limit: LimitKey
): Promise<number | null> {
  const { pkg, isFree } = await getEventPackageDefinition(eventId);
  
  // Free-Tier Defaults
  if (isFree && !pkg) {
    const freeDefaults: Record<LimitKey, number | null> = {
      maxCategories: 1,
      maxChallenges: 0,
      maxZipDownloadPhotos: 0,
      maxCoHosts: 0,
      storageLimitPhotos: 50,
    };
    return freeDefaults[limit] ?? 0;
  }
  
  if (!pkg) {
    return 0;
  }
  
  const value = (pkg as any)[limit];
  
  // null in DB = unlimited
  if (value === null || value === undefined) {
    return null;
  }
  
  return typeof value === 'number' ? value : parseInt(String(value), 10) || 0;
}

/**
 * Wirft Error wenn Feature nicht aktiviert ist
 */
export async function assertFeatureEnabled(
  eventId: string,
  feature: FeatureKey
): Promise<void> {
  const enabled = await isFeatureEnabled(eventId, feature);
  
  if (!enabled) {
    const { pkg } = await getEventPackageDefinition(eventId);
    const tierName = pkg?.name || 'Free';
    
    const err: any = new Error(
      `Feature "${feature}" ist in deinem aktuellen Paket (${tierName}) nicht verfügbar. Upgrade für dieses Feature.`
    );
    err.code = 'FEATURE_NOT_AVAILABLE';
    err.httpStatus = 403;
    err.details = {
      eventId,
      feature,
      currentPackage: tierName,
      requiredUpgrade: true,
    };
    throw err;
  }
}

/**
 * Wirft Error wenn Limit erreicht ist
 */
export async function assertWithinLimit(
  eventId: string,
  limit: LimitKey,
  currentCount: number
): Promise<void> {
  const max = await getFeatureLimit(eventId, limit);
  
  // null = unlimited
  if (max === null) {
    return;
  }
  
  if (currentCount >= max) {
    const { pkg } = await getEventPackageDefinition(eventId);
    const tierName = pkg?.name || 'Free';
    
    const err: any = new Error(
      `Limit für "${limit}" erreicht (${currentCount}/${max}). Upgrade für mehr.`
    );
    err.code = 'LIMIT_REACHED';
    err.httpStatus = 403;
    err.details = {
      eventId,
      limit,
      currentCount,
      maxAllowed: max,
      currentPackage: tierName,
      requiredUpgrade: true,
    };
    throw err;
  }
}

/**
 * Holt alle Feature-Flags und Limits für ein Event
 * Nützlich für Frontend um UI anzupassen
 * Merges base package + all active addon entitlements using OR logic
 */
export async function getEventFeatures(eventId: string): Promise<{
  tier: string;
  packageName: string;
  isFree: boolean;
  features: Record<FeatureKey, boolean>;
  limits: Record<LimitKey, number | null>;
  activeAddons: { sku: string; name: string }[];
}> {
  const { pkg, isFree } = await getEventPackageDefinition(eventId);
  
  const features: Record<FeatureKey, boolean> = {
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
  };
  
  const limits: Record<LimitKey, number | null> = {
    maxCategories: 1,
    maxChallenges: 0,
    maxZipDownloadPhotos: 0,
    maxCoHosts: 0,
    storageLimitPhotos: 50,
  };
  
  if (pkg) {
    // Feature Flags from base package
    for (const [key, field] of Object.entries(featureToFieldMap)) {
      features[key as FeatureKey] = (pkg as any)[field] === true;
    }
    
    // Limits from base package
    limits.maxCategories = pkg.maxCategories;
    limits.maxChallenges = pkg.maxChallenges;
    limits.maxZipDownloadPhotos = pkg.maxZipDownloadPhotos;
    limits.maxCoHosts = pkg.maxCoHosts;
    limits.storageLimitPhotos = pkg.storageLimitPhotos;
  }
  
  // Merge addon entitlements (OR logic: if any addon enables a feature, it's enabled)
  const activeAddons: { sku: string; name: string }[] = [];
  try {
    const addonEntitlements = await prisma.eventEntitlement.findMany({
      where: {
        eventId,
        status: 'ACTIVE',
        source: { startsWith: 'addon' },
      },
    });
    
    for (const ent of addonEntitlements) {
      if (!ent.wcSku) continue;
      const addonPkg = await prisma.packageDefinition.findFirst({
        where: { sku: ent.wcSku, isActive: true },
      });
      if (!addonPkg) continue;
      
      activeAddons.push({ sku: addonPkg.sku, name: addonPkg.name });
      
      // Merge features with OR logic
      for (const [key, field] of Object.entries(featureToFieldMap)) {
        if ((addonPkg as any)[field] === true) {
          features[key as FeatureKey] = true;
        }
      }
      
      // Merge limits: take the higher value (null = unlimited wins)
      const limitFields: LimitKey[] = ['maxCategories', 'maxChallenges', 'maxZipDownloadPhotos', 'maxCoHosts', 'storageLimitPhotos'];
      for (const lk of limitFields) {
        const addonVal = (addonPkg as any)[lk];
        if (addonVal === null) {
          limits[lk] = null; // unlimited
        } else if (typeof addonVal === 'number' && (limits[lk] === null || addonVal > (limits[lk] as number))) {
          limits[lk] = addonVal;
        }
      }
    }
  } catch (err) {
    logger.warn('Failed to load addon entitlements for event', { eventId, error: err });
  }
  
  return {
    tier: pkg?.resultingTier || 'FREE',
    packageName: pkg?.name || 'Free',
    isFree,
    features,
    limits,
    activeAddons,
  };
}

/**
 * Prüft ob Event ein Upgrade benötigt für ein Feature
 * Gibt das minimale Paket zurück das das Feature hat
 */
export async function getRequiredPackageForFeature(
  feature: FeatureKey
): Promise<{ sku: string; name: string; priceEurCents: number | null } | null> {
  const fieldName = featureToFieldMap[feature];
  
  const pkg = await prisma.packageDefinition.findFirst({
    where: {
      type: 'BASE',
      isActive: true,
      [fieldName]: true,
    },
    orderBy: { displayOrder: 'asc' },
    select: {
      sku: true,
      name: true,
      priceEurCents: true,
    },
  });
  
  return pkg;
}

/**
 * Prüft ob Event ein Upgrade benötigt für ein höheres Limit
 */
export async function getRequiredPackageForLimit(
  limit: LimitKey,
  requiredValue: number
): Promise<{ sku: string; name: string; priceEurCents: number | null } | null> {
  // Finde Paket mit ausreichendem Limit oder unlimited (null)
  const packages = await prisma.packageDefinition.findMany({
    where: {
      type: 'BASE',
      isActive: true,
    },
    orderBy: { displayOrder: 'asc' },
    select: {
      sku: true,
      name: true,
      priceEurCents: true,
      [limit]: true,
    },
  });
  
  for (const pkg of packages) {
    const limitValue = (pkg as any)[limit];
    
    // null = unlimited
    if (limitValue === null || limitValue >= requiredValue) {
      return {
        sku: pkg.sku,
        name: pkg.name,
        priceEurCents: pkg.priceEurCents,
      };
    }
  }
  
  return null;
}
