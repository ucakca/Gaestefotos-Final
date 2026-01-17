#!/usr/bin/env ts-node
/**
 * Löscht alle Events von test@host.at für Testing-Zwecke
 * Usage: cd packages/backend && npx ts-node ../../scripts/delete-test-events.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteTestEvents() {
  const testEmail = 'test@host.at';
  
  console.log(`Suche Events von ${testEmail}...`);
  
  const user = await prisma.users.findUnique({
    where: { email: testEmail },
    include: { 
      events: { 
        select: { id: true, title: true, slug: true } 
      } 
    }
  });
  
  if (!user) {
    console.error(`❌ User ${testEmail} nicht gefunden`);
    await prisma.$disconnect();
    process.exit(1);
  }
  
  if (user.events.length === 0) {
    console.log('✅ Keine Events vorhanden - nichts zu löschen');
    await prisma.$disconnect();
    return;
  }
  
  console.log(`\nGefundene Events (${user.events.length}):`);
  user.events.forEach((e) => {
    console.log(`  - ${e.title} (${e.slug})`);
  });
  
  console.log('\nLösche Events...');
  
  for (const event of user.events) {
    try {
      await prisma.event.delete({
        where: { id: event.id }
      });
      console.log(`✅ Gelöscht: ${event.title}`);
    } catch (error) {
      console.error(`❌ Fehler bei ${event.title}:`, (error as any)?.message);
    }
  }
  
  console.log('\n✅ Alle Events gelöscht');
  await prisma.$disconnect();
}

deleteTestEvents().catch((error) => {
  console.error('Fatal error:', error);
  prisma.$disconnect();
  process.exit(1);
});
