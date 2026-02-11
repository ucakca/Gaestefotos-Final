import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────
// Finalisierte Preise — Stand: 11.02.2026 (PRICING-STRATEGY.md v3)
// ─────────────────────────────────────────────────────────────

const basePackages = [
  {
    sku: 'free',
    name: 'Free',
    type: 'BASE' as const,
    resultingTier: 'FREE',
    displayOrder: 1,
    priceEurCents: 0,
    description: 'Kostenlos testen — 50 Fotos, 7 Tage Galerie, Face Search inklusive',

    storageLimitPhotos: 50,
    storageLimitBytes: null,          // Kein Speicherlimit
    storageDurationDays: 7,

    allowFaceSearch: true,            // ✅ Alleinstellungsmerkmal — für ALLE Tiers
    allowPasswordProtect: false,
    allowGuestbook: false,
    allowZipDownload: false,
    allowBulkOperations: false,
    allowVideoUpload: false,
    allowStories: false,
    allowLiveWall: false,
    allowFullInvitation: false,
    allowCoHosts: false,
    allowGuestlist: false,
    allowMosaicWall: false,
    allowMosaicPrint: false,
    allowMosaicExport: false,
    isAdFree: false,

    maxCategories: 1,
    maxChallenges: 1,
    maxZipDownloadPhotos: null,
    maxCoHosts: 0,
  },
  {
    sku: 'basic',
    name: 'Basic',
    type: 'BASE' as const,
    resultingTier: 'BASIC',
    displayOrder: 2,
    priceEurCents: 4900,              // 49 €
    description: 'Ideal für private Feiern — unbegrenzte Fotos, Passwort, Gästebuch, ZIP',

    storageLimitPhotos: null,         // ∞
    storageLimitBytes: null,
    storageDurationDays: 30,

    allowFaceSearch: true,            // ✅
    allowPasswordProtect: true,       // ✅
    allowGuestbook: true,             // ✅
    allowZipDownload: true,           // ✅
    allowBulkOperations: true,        // ✅
    allowVideoUpload: false,
    allowStories: false,
    allowLiveWall: false,
    allowFullInvitation: false,
    allowCoHosts: false,
    allowGuestlist: false,
    allowMosaicWall: false,
    allowMosaicPrint: false,
    allowMosaicExport: false,
    isAdFree: false,

    maxCategories: 3,
    maxChallenges: 3,
    maxZipDownloadPhotos: null,       // Keine Begrenzung
    maxCoHosts: 1,
  },
  {
    sku: 'smart',
    name: 'Smart',
    type: 'BASE' as const,
    resultingTier: 'SMART',
    displayOrder: 3,
    priceEurCents: 9900,              // 99 €
    description: 'Perfekt für Hochzeiten — Video, Stories, Live Wall, Einladungen, 3 Co-Hosts',

    storageLimitPhotos: null,
    storageLimitBytes: null,
    storageDurationDays: 90,

    allowFaceSearch: true,            // ✅
    allowPasswordProtect: true,       // ✅
    allowGuestbook: true,             // ✅
    allowZipDownload: true,           // ✅
    allowBulkOperations: true,        // ✅
    allowVideoUpload: true,           // ✅
    allowStories: true,               // ✅
    allowLiveWall: true,              // ✅
    allowFullInvitation: true,        // ✅
    allowCoHosts: true,               // ✅ (3)
    allowGuestlist: false,
    allowMosaicWall: false,
    allowMosaicPrint: false,
    allowMosaicExport: false,
    isAdFree: false,

    maxCategories: 6,
    maxChallenges: 6,
    maxZipDownloadPhotos: null,
    maxCoHosts: 3,
  },
  {
    sku: 'premium',
    name: 'Premium',
    type: 'BASE' as const,
    resultingTier: 'PREMIUM',
    displayOrder: 4,
    priceEurCents: 19900,             // 199 €
    description: 'Alles inklusive — unbegrenzte Kategorien & Challenges, 10 Co-Hosts, werbefrei',

    storageLimitPhotos: null,
    storageLimitBytes: null,
    storageDurationDays: 180,

    allowFaceSearch: true,            // ✅
    allowPasswordProtect: true,       // ✅
    allowGuestbook: true,             // ✅
    allowZipDownload: true,           // ✅
    allowBulkOperations: true,        // ✅
    allowVideoUpload: true,           // ✅
    allowStories: true,               // ✅
    allowLiveWall: true,              // ✅
    allowFullInvitation: true,        // ✅
    allowCoHosts: true,               // ✅ (10)
    allowGuestlist: true,             // ✅
    allowMosaicWall: false,           // Nur via Add-on
    allowMosaicPrint: false,
    allowMosaicExport: false,
    isAdFree: true,                   // ✅ Keine Fremdwerbung

    maxCategories: null,              // ∞
    maxChallenges: null,              // ∞
    maxZipDownloadPhotos: null,
    maxCoHosts: 10,
  },
];

// ─────────────────────────────────────────────────────────────
// Add-ons (pro Event, inkl. Hardware + Smart-Paket gratis)
// ─────────────────────────────────────────────────────────────

const addons = [
  {
    sku: 'addon-mosaic-digital',
    name: 'Mosaic Wall Digital',
    type: 'ADDON' as const,
    resultingTier: 'SMART',           // Inkludiert Smart-Paket
    displayOrder: 10,
    priceEurCents: 19900,             // 199 €
    description: 'Digitale Mosaikwand — Gäste-Fotos werden live zum Mosaik zusammengesetzt',
    allowMosaicWall: true,
    allowMosaicExport: true,
  },
  {
    sku: 'addon-mosaic-print',
    name: 'Mosaic Wall + Print',
    type: 'ADDON' as const,
    resultingTier: 'SMART',
    displayOrder: 11,
    priceEurCents: 59900,             // 599 €
    description: 'Inkl. Drucker, Tablet, Banner & Aufhänge-Wand — Gäste drucken Sticker für das Mosaik',
    allowMosaicWall: true,
    allowMosaicPrint: true,
    allowMosaicExport: true,
  },
  {
    sku: 'addon-photo-booth',
    name: 'Photo Booth',
    type: 'ADDON' as const,
    resultingTier: 'SMART',
    displayOrder: 12,
    priceEurCents: 44900,             // 449 €
    description: 'Klassische Fotobox mit Drucker & Requisiten — Sofortdruck und digitaler Download',
  },
  {
    sku: 'addon-mirror-booth',
    name: 'Mirror Booth',
    type: 'ADDON' as const,
    resultingTier: 'SMART',
    displayOrder: 13,
    priceEurCents: 54900,             // 549 €
    description: 'Interaktiver Fotospiegel mit Touch-Effekten, Animationen und Sofortdruck',
  },
  {
    sku: 'addon-ki-booth',
    name: 'KI Booth (AI)',
    type: 'ADDON' as const,
    resultingTier: 'SMART',
    displayOrder: 14,
    priceEurCents: 59900,             // 599 €
    description: 'AI Style Transfer — Gästefotos werden zu Kunstwerken (Monet, Pop Art, Cartoon)',
  },
  {
    sku: 'addon-drawbot',
    name: 'Drawbot',
    type: 'ADDON' as const,
    resultingTier: 'SMART',
    displayOrder: 15,
    priceEurCents: 99000,             // 990 €
    description: 'Roboterarm zeichnet live Porträts der Gäste — KI-Kunststile wählbar',
  },
  {
    sku: 'addon-highlight-reel',
    name: 'Highlight Reel',
    type: 'ADDON' as const,
    resultingTier: 'SMART',
    displayOrder: 16,
    priceEurCents: 4900,              // 49 €
    description: 'Auto-generiertes Event-Video aus den besten Fotos mit Musik',
  },
];

// ─────────────────────────────────────────────────────────────
// Upgrade-Pakete (Differenzpreis)
// ─────────────────────────────────────────────────────────────

const upgrades = [
  {
    sku: 'upgrade-basic-smart',
    name: 'Upgrade: Basic → Smart',
    type: 'UPGRADE' as const,
    resultingTier: 'SMART',
    upgradeFromTier: 'BASIC',
    displayOrder: 20,
    priceEurCents: 5000,              // 50 € (99 - 49)
    description: 'Upgrade von Basic auf Smart',
  },
  {
    sku: 'upgrade-basic-premium',
    name: 'Upgrade: Basic → Premium',
    type: 'UPGRADE' as const,
    resultingTier: 'PREMIUM',
    upgradeFromTier: 'BASIC',
    displayOrder: 21,
    priceEurCents: 15000,             // 150 € (199 - 49)
    description: 'Upgrade von Basic auf Premium',
  },
  {
    sku: 'upgrade-smart-premium',
    name: 'Upgrade: Smart → Premium',
    type: 'UPGRADE' as const,
    resultingTier: 'PREMIUM',
    upgradeFromTier: 'SMART',
    displayOrder: 22,
    priceEurCents: 10000,             // 100 € (199 - 99)
    description: 'Upgrade von Smart auf Premium',
  },
];

// ─────────────────────────────────────────────────────────────
// Seed Logic (upsert by SKU)
// ─────────────────────────────────────────────────────────────

async function upsertPackage(pkg: any) {
  const existing = await prisma.packageDefinition.findUnique({
    where: { sku: pkg.sku },
  });

  if (existing) {
    console.log(`  ↻ Updating ${pkg.name} (${pkg.sku})`);
    await prisma.packageDefinition.update({
      where: { sku: pkg.sku },
      data: { ...pkg, isActive: true },
    });
  } else {
    console.log(`  + Creating ${pkg.name} (${pkg.sku})`);
    await prisma.packageDefinition.create({
      data: { ...pkg, isActive: true },
    });
  }
}

async function main() {
  console.log('🌱 Seeding package definitions (v3 — 11.02.2026)...\n');

  console.log('📦 Basis-Pakete:');
  for (const pkg of basePackages) {
    await upsertPackage(pkg);
  }

  console.log('\n🧩 Add-ons:');
  for (const addon of addons) {
    await upsertPackage(addon);
  }

  console.log('\n⬆️  Upgrades:');
  for (const upgrade of upgrades) {
    await upsertPackage(upgrade);
  }

  // Summary
  const countBase = await prisma.packageDefinition.count({ where: { type: 'BASE', isActive: true } });
  const countAddon = await prisma.packageDefinition.count({ where: { type: 'ADDON', isActive: true } });
  const countUpgrade = await prisma.packageDefinition.count({ where: { type: 'UPGRADE', isActive: true } });

  console.log(`\n✅ Seeding abgeschlossen!`);
  console.log(`   ${countBase} Basis-Pakete | ${countAddon} Add-ons | ${countUpgrade} Upgrades`);

  const all = await prisma.packageDefinition.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' },
    select: { sku: true, name: true, type: true, priceEurCents: true },
  });

  console.log('\n┌─────────────────────────────┬──────────┬──────────┐');
  console.log('│ Paket                       │ Typ      │ Preis    │');
  console.log('├─────────────────────────────┼──────────┼──────────┤');
  for (const p of all) {
    const name = p.name.padEnd(27);
    const type = p.type.padEnd(8);
    const price = p.priceEurCents ? `${(p.priceEurCents / 100).toFixed(0)} €`.padStart(8) : '    0 €';
    console.log(`│ ${name} │ ${type} │ ${price} │`);
  }
  console.log('└─────────────────────────────┴──────────┴──────────┘');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
