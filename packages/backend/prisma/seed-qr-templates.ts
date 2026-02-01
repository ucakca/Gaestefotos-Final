import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface TemplateConfig {
  slug: string;
  name: string;
  description: string;
  category: 'MINIMAL' | 'ELEGANT' | 'NATURAL' | 'FESTIVE' | 'MODERN' | 'RUSTIC';
  defaultBgColor: string;
  defaultTextColor: string;
  defaultAccentColor: string;
  isPremium: boolean;
  sortOrder: number;
}

const TEMPLATES: TemplateConfig[] = [
  {
    slug: 'minimal-classic',
    name: 'Minimal Classic',
    description: 'Schlicht und zeitlos mit elegantem Rahmen',
    category: 'MINIMAL',
    defaultBgColor: '#ffffff',
    defaultTextColor: '#1a1a1a',
    defaultAccentColor: '#295B4D',
    isPremium: false,
    sortOrder: 0,
  },
  {
    slug: 'minimal-floral',
    name: 'Minimal Floral',
    description: 'Dezente Blumenakzente für romantische Events',
    category: 'MINIMAL',
    defaultBgColor: '#ffffff',
    defaultTextColor: '#1a1a1a',
    defaultAccentColor: '#d4a5a5',
    isPremium: false,
    sortOrder: 1,
  },
  {
    slug: 'minimal-modern',
    name: 'Minimal Modern',
    description: 'Klare Linien und modernes Design',
    category: 'MODERN',
    defaultBgColor: '#ffffff',
    defaultTextColor: '#1a1a1a',
    defaultAccentColor: '#3b82f6',
    isPremium: false,
    sortOrder: 2,
  },
  {
    slug: 'elegant-gold',
    name: 'Elegant Gold',
    description: 'Luxuriöse Goldakzente für besondere Anlässe',
    category: 'ELEGANT',
    defaultBgColor: '#1a1a1a',
    defaultTextColor: '#ffffff',
    defaultAccentColor: '#d4af37',
    isPremium: true,
    sortOrder: 3,
  },
  {
    slug: 'elegant-floral',
    name: 'Elegant Floral',
    description: 'Blumenmuster mit eleganter Ausstrahlung',
    category: 'ELEGANT',
    defaultBgColor: '#fdf8f5',
    defaultTextColor: '#1a1a1a',
    defaultAccentColor: '#8b5a5a',
    isPremium: true,
    sortOrder: 4,
  },
  {
    slug: 'botanical-green',
    name: 'Botanical Green',
    description: 'Natürliche Grüntöne mit botanischen Elementen',
    category: 'NATURAL',
    defaultBgColor: '#f5f7f0',
    defaultTextColor: '#2d3b2d',
    defaultAccentColor: '#4a7c4e',
    isPremium: false,
    sortOrder: 5,
  },
  {
    slug: 'festive-celebration',
    name: 'Festive Celebration',
    description: 'Fröhlich und bunt für Partys und Feiern',
    category: 'FESTIVE',
    defaultBgColor: '#ffffff',
    defaultTextColor: '#1a1a1a',
    defaultAccentColor: '#e63946',
    isPremium: false,
    sortOrder: 6,
  },
  {
    slug: 'modern-geometric',
    name: 'Modern Geometric',
    description: 'Geometrische Formen für einen modernen Look',
    category: 'MODERN',
    defaultBgColor: '#ffffff',
    defaultTextColor: '#1a1a1a',
    defaultAccentColor: '#6366f1',
    isPremium: true,
    sortOrder: 7,
  },
  {
    slug: 'rustic-wood',
    name: 'Rustic Wood',
    description: 'Rustikaler Holz-Look für Landhochzeiten',
    category: 'RUSTIC',
    defaultBgColor: '#f5ebe0',
    defaultTextColor: '#3d2c1e',
    defaultAccentColor: '#8b6914',
    isPremium: false,
    sortOrder: 8,
  },
  {
    slug: 'vintage-frame',
    name: 'Vintage Frame',
    description: 'Nostalgischer Rahmen im Vintage-Stil',
    category: 'ELEGANT',
    defaultBgColor: '#fefcf3',
    defaultTextColor: '#4a4a4a',
    defaultAccentColor: '#9e7b5a',
    isPremium: true,
    sortOrder: 9,
  },
];

const SVG_BASE_PATH = path.resolve(__dirname, '../../frontend/public/qr-templates');

async function readSvgFile(templateSlug: string, format: string): Promise<string | null> {
  const filePath = path.join(SVG_BASE_PATH, templateSlug, `${format}.svg`);
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch (err) {
    console.warn(`Could not read ${filePath}:`, err);
  }
  return null;
}

async function main() {
  console.log('🚀 Starting QR Templates seed...\n');

  for (const config of TEMPLATES) {
    console.log(`Processing: ${config.name} (${config.slug})`);

    // Read SVG files
    const svgA6 = await readSvgFile(config.slug, 'A6');
    const svgA5 = await readSvgFile(config.slug, 'A5');
    const svgStory = await readSvgFile(config.slug, 'story');
    const svgSquare = await readSvgFile(config.slug, 'square');

    if (!svgA6) {
      console.warn(`  ⚠️  No A6.svg found for ${config.slug}, skipping...`);
      continue;
    }

    // Upsert template
    const existing = await prisma.qr_templates.findFirst({
      where: { slug: config.slug },
    });

    if (existing) {
      await prisma.qr_templates.update({
        where: { slug: config.slug },
        data: {
          name: config.name,
          description: config.description,
          category: config.category,
          defaultBgColor: config.defaultBgColor,
          defaultTextColor: config.defaultTextColor,
          defaultAccentColor: config.defaultAccentColor,
          isPremium: config.isPremium,
          sortOrder: config.sortOrder,
          svgA6,
          svgA5,
          svgStory,
          svgSquare,
          isActive: true,
          isPublic: true,
        },
      });
      console.log(`  ✅ Updated existing template`);
    } else {
      await prisma.qr_templates.create({
        data: {
          id: crypto.randomUUID(),
          slug: config.slug,
          name: config.name,
          description: config.description,
          category: config.category,
          defaultBgColor: config.defaultBgColor,
          defaultTextColor: config.defaultTextColor,
          defaultAccentColor: config.defaultAccentColor,
          isPremium: config.isPremium,
          sortOrder: config.sortOrder,
          svgA6,
          svgA5,
          svgStory,
          svgSquare,
          isActive: true,
          isPublic: true,
        },
      });
      console.log(`  ✅ Created new template`);
    }

    // Log which formats were found
    const formats = [
      svgA6 ? 'A6' : null,
      svgA5 ? 'A5' : null,
      svgStory ? 'Story' : null,
      svgSquare ? 'Square' : null,
    ].filter(Boolean);
    console.log(`  📄 Formats: ${formats.join(', ')}`);
  }

  console.log('\n✨ QR Templates seed completed!');

  // Summary
  const count = await prisma.qr_templates.count();
  console.log(`📊 Total templates in DB: ${count}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
