import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const packages = [
  {
    sku: 'free',
    name: 'Free',
    type: 'BASE' as const,
    resultingTier: 'FREE',
    displayOrder: 1,
    priceEurCents: 0,
    description: 'Kostenlos testen mit Basisfunktionen',
    
    // Storage & Duration
    storageLimitPhotos: 50,
    storageLimitBytes: BigInt(50 * 5 * 1024 * 1024), // ~250MB (50 Fotos à 5MB)
    storageDurationDays: 14,
    
    // Feature Flags (Screenshot: Free Spalte)
    allowVideoUpload: false,
    allowStories: false,
    allowPasswordProtect: false,
    allowGuestbook: false,
    allowZipDownload: false,
    allowBulkOperations: false,
    allowLiveWall: false,
    allowFaceSearch: false,
    allowGuestlist: false,
    allowFullInvitation: false,
    allowCoHosts: false,
    isAdFree: false,
    
    // Limits
    maxCategories: 1,
    maxChallenges: 0,
    maxZipDownloadPhotos: 0,
    maxCoHosts: 0,
  },
  {
    sku: 'basic',
    name: 'Basic',
    type: 'BASE' as const,
    resultingTier: 'BASIC',
    displayOrder: 2,
    priceEurCents: 2900, // 29€
    description: 'Ideal für kleine Feiern und private Events',
    
    // Storage & Duration
    storageLimitPhotos: 200,
    storageLimitBytes: BigInt(200 * 5 * 1024 * 1024), // ~1GB (200 Fotos à 5MB)
    storageDurationDays: 30,
    
    // Feature Flags (Screenshot: Basic Spalte)
    allowVideoUpload: false,
    allowStories: false,
    allowPasswordProtect: true,  // ✅
    allowGuestbook: false,
    allowZipDownload: true,      // ✅ (Max. 200)
    allowBulkOperations: false,
    allowLiveWall: false,
    allowFaceSearch: false,
    allowGuestlist: false,
    allowFullInvitation: false,
    allowCoHosts: false,         // Kein Co-Host für Basic
    isAdFree: false,
    
    // Limits
    maxCategories: 1,
    maxChallenges: 0,
    maxZipDownloadPhotos: 200,
    maxCoHosts: 0,
  },
  {
    sku: 'smart',
    name: 'Smart',
    type: 'BASE' as const,
    resultingTier: 'SMART',
    displayOrder: 3,
    priceEurCents: 5900, // 59€
    description: 'Perfekt für Hochzeiten und größere Events',
    
    // Storage & Duration
    storageLimitPhotos: null,    // Unbegrenzt
    storageLimitBytes: null,     // Unbegrenzt
    storageDurationDays: 180,    // 6 Monate
    
    // Feature Flags (Screenshot: Smart Spalte)
    allowVideoUpload: false,     // Erst bei Premium
    allowStories: true,          // ✅
    allowPasswordProtect: true,  // ✅
    allowGuestbook: true,        // ✅ Ab Basic
    allowZipDownload: true,      // ✅
    allowBulkOperations: true,   // ✅
    allowLiveWall: true,         // ✅
    allowFaceSearch: false,      // ❌ Nur Premium
    allowGuestlist: true,        // ✅
    allowFullInvitation: true,   // ✅
    allowCoHosts: true,          // 2 Co-Hosts
    isAdFree: true,              // ✅
    
    // Limits
    maxCategories: 3,
    maxChallenges: null,         // Unbegrenzt
    maxZipDownloadPhotos: null,  // Unbegrenzt
    maxCoHosts: 2,
  },
  {
    sku: 'premium',
    name: 'Premium',
    type: 'BASE' as const,
    resultingTier: 'PREMIUM',
    displayOrder: 4,
    priceEurCents: 8900, // 89€
    description: 'Alle Features für das perfekte Event',
    
    // Storage & Duration
    storageLimitPhotos: null,    // Unbegrenzt
    storageLimitBytes: null,     // Unbegrenzt
    storageDurationDays: 365,    // 1 Jahr
    
    // Feature Flags (Screenshot: Premium Spalte - ALLE ✅)
    allowVideoUpload: true,      // ✅
    allowStories: true,          // ✅
    allowPasswordProtect: true,  // ✅
    allowGuestbook: true,        // ✅
    allowZipDownload: true,      // ✅
    allowBulkOperations: true,   // ✅
    allowLiveWall: true,         // ✅
    allowFaceSearch: true,       // ✅
    allowGuestlist: true,        // ✅
    allowFullInvitation: true,   // ✅
    allowCoHosts: true,          // ✅ Unbegrenzt
    isAdFree: true,              // ✅
    
    // Limits (alle unbegrenzt)
    maxCategories: null,
    maxChallenges: null,
    maxZipDownloadPhotos: null,
    maxCoHosts: null,
  },
];

// Upgrade-Pakete
const upgrades = [
  {
    sku: 'upgrade-basic-smart',
    name: 'Upgrade: Basic → Smart',
    type: 'UPGRADE' as const,
    resultingTier: 'SMART',
    upgradeFromTier: 'BASIC',
    displayOrder: 10,
    priceEurCents: 3000, // 30€
    description: 'Upgrade von Basic auf Smart',
    isActive: true,
  },
  {
    sku: 'upgrade-basic-premium',
    name: 'Upgrade: Basic → Premium',
    type: 'UPGRADE' as const,
    resultingTier: 'PREMIUM',
    upgradeFromTier: 'BASIC',
    displayOrder: 11,
    priceEurCents: 6000, // 60€
    description: 'Upgrade von Basic auf Premium',
    isActive: true,
  },
  {
    sku: 'upgrade-smart-premium',
    name: 'Upgrade: Smart → Premium',
    type: 'UPGRADE' as const,
    resultingTier: 'PREMIUM',
    upgradeFromTier: 'SMART',
    displayOrder: 12,
    priceEurCents: 3000, // 30€
    description: 'Upgrade von Smart auf Premium',
    isActive: true,
  },
];

async function main() {
  console.log('🌱 Seeding package definitions...');

  for (const pkg of packages) {
    const existing = await prisma.packageDefinition.findUnique({
      where: { sku: pkg.sku },
    });

    if (existing) {
      console.log(`  ↻ Updating ${pkg.name} (${pkg.sku})`);
      await prisma.packageDefinition.update({
        where: { sku: pkg.sku },
        data: {
          ...pkg,
          isActive: true,
        },
      });
    } else {
      console.log(`  + Creating ${pkg.name} (${pkg.sku})`);
      await prisma.packageDefinition.create({
        data: {
          ...pkg,
          isActive: true,
        },
      });
    }
  }

  for (const upgrade of upgrades) {
    const existing = await prisma.packageDefinition.findUnique({
      where: { sku: upgrade.sku },
    });

    if (existing) {
      console.log(`  ↻ Updating ${upgrade.name}`);
      await prisma.packageDefinition.update({
        where: { sku: upgrade.sku },
        data: upgrade,
      });
    } else {
      console.log(`  + Creating ${upgrade.name}`);
      await prisma.packageDefinition.create({
        data: upgrade,
      });
    }
  }

  console.log('✅ Package definitions seeded successfully!');
  
  // Summary
  const count = await prisma.packageDefinition.count();
  console.log(`\n📦 Total packages: ${count}`);
  
  const all = await prisma.packageDefinition.findMany({
    where: { type: 'BASE', isActive: true },
    orderBy: { displayOrder: 'asc' },
    select: { sku: true, name: true, priceEurCents: true, storageDurationDays: true },
  });
  
  console.log('\nBase Packages:');
  for (const p of all) {
    const price = p.priceEurCents ? `${p.priceEurCents / 100}€` : 'Free';
    const duration = p.storageDurationDays ? `${p.storageDurationDays} Tage` : 'Unbegrenzt';
    console.log(`  - ${p.name}: ${price}, ${duration}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
