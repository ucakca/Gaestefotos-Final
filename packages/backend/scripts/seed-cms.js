#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding CMS landing page...');
  
  const now = new Date().toISOString();
  
  const result = await prisma.cmsContentSnapshot.upsert({
    where: {
      kind_slug: {
        kind: 'pages',
        slug: 'landing'
      }
    },
    create: {
      kind: 'pages',
      slug: 'landing',
      title: 'Willkommen bei Gästefotos',
      html: '<div><h1>Event-Fotos einfach teilen</h1><p>Die professionelle Plattform für Hochzeiten, Geburtstage und Events.</p></div>',
      excerpt: 'Event-Foto-Plattform',
      sourceUrl: 'https://gaestefotos.com/',
      link: 'https://gaestefotos.com/',
      modifiedGmt: now,
      fetchedAt: new Date(),
      updatedAt: new Date()
    },
    update: {
      html: '<div><h1>Event-Fotos einfach teilen</h1><p>Die professionelle Plattform für Hochzeiten, Geburtstage und Events.</p></div>',
      updatedAt: new Date()
    }
  });
  
  console.log('✅ Created/Updated:', result.id);
  console.log('📊 Title:', result.title);
}

main()
  .catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
