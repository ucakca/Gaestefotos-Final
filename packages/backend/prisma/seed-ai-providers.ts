import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// ─── Encryption (mirrors src/utils/encryption.ts) ────────────────────────────

function normalizeEncryptionKey(raw: string): Buffer {
  const trimmed = String(raw || '').trim();
  if (!trimmed) throw new Error('ENCRYPTION_KEY / TWO_FACTOR_ENCRYPTION_KEY is missing');
  if (/^[0-9a-f]{64}$/i.test(trimmed)) return Buffer.from(trimmed, 'hex');
  return crypto.createHash('sha256').update(trimmed, 'utf8').digest();
}

function encryptValue(plaintext: string): { encrypted: string; iv: string; tag: string } {
  const keyRaw = process.env.TWO_FACTOR_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || '';
  const key = normalizeEncryptionKey(keyRaw);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

// ─── Provider Definitions ────────────────────────────────────────────────────

interface ProviderSeed {
  slug: string;
  name: string;
  type: 'LLM' | 'IMAGE_GEN' | 'FACE_RECOGNITION' | 'VIDEO_GEN' | 'STT' | 'TTS';
  baseUrl: string | null;
  defaultModel: string;
  models: { id: string; name: string; costPer1kTokens?: number }[];
  envKey?: string; // env var name holding the API key
  isDefault?: boolean;
}

const providers: ProviderSeed[] = [
  {
    slug: 'grok',
    name: 'Grok (xAI)',
    type: 'LLM',
    baseUrl: 'https://api.x.ai/v1',
    defaultModel: 'grok-2-latest',
    models: [
      { id: 'grok-2-latest', name: 'Grok 2 (Latest)', costPer1kTokens: 0.01 },
      { id: 'grok-3-mini-fast', name: 'Grok 3 Mini Fast', costPer1kTokens: 0.005 },
    ],
    envKey: 'XAI_API_KEY',
    isDefault: true,
  },
  {
    slug: 'groq',
    name: 'Groq (Llama 3.1)',
    type: 'LLM',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.1-70b-versatile',
    models: [
      { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B', costPer1kTokens: 0.00059 },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', costPer1kTokens: 0.00005 },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', costPer1kTokens: 0.00024 },
    ],
    envKey: 'GROQ_API_KEY',
    isDefault: false,
  },
  {
    slug: 'openai',
    name: 'OpenAI',
    type: 'LLM',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', costPer1kTokens: 0.00015 },
      { id: 'gpt-4o', name: 'GPT-4o', costPer1kTokens: 0.005 },
    ],
    envKey: 'OPENAI_API_KEY',
    isDefault: false,
  },
];

// ─── Seed Logic ──────────────────────────────────────────────────────────────

async function upsertProvider(p: ProviderSeed) {
  const apiKey = p.envKey ? process.env[p.envKey] : undefined;
  let encrypted: { encrypted: string; iv: string; tag: string } | null = null;
  let hint: string | null = null;

  if (apiKey) {
    encrypted = encryptValue(apiKey);
    hint = `…${apiKey.slice(-4)}`;
  }

  const existing = await prisma.aiProvider.findUnique({ where: { slug: p.slug } });

  const data = {
    name: p.name,
    type: p.type as any,
    baseUrl: p.baseUrl,
    defaultModel: p.defaultModel,
    models: p.models as any,
    isActive: !!apiKey,
    isDefault: p.isDefault ?? false,
    ...(encrypted
      ? {
          apiKeyEncrypted: encrypted.encrypted,
          apiKeyIv: encrypted.iv,
          apiKeyTag: encrypted.tag,
          apiKeyHint: hint,
        }
      : {}),
  };

  if (existing) {
    // Only update key fields if a new key is provided
    console.log(`  ↻ Updating ${p.name} (${p.slug})${apiKey ? ' — API Key encrypted ✓' : ' — no API Key'}`);
    await prisma.aiProvider.update({ where: { slug: p.slug }, data });
  } else {
    console.log(`  + Creating ${p.name} (${p.slug})${apiKey ? ' — API Key encrypted ✓' : ' — no API Key (inactive)'}`);
    await prisma.aiProvider.create({ data: { slug: p.slug, ...data } });
  }
}

async function main() {
  console.log('🤖 Seeding AI Providers...\n');

  for (const p of providers) {
    await upsertProvider(p);
  }

  // Summary
  const all = await prisma.aiProvider.findMany({ orderBy: { createdAt: 'asc' } });
  console.log('\n┌──────────────────────────┬──────────┬────────┬─────────┬────────────────────────┐');
  console.log('│ Provider                 │ Type     │ Active │ Default │ Model                  │');
  console.log('├──────────────────────────┼──────────┼────────┼─────────┼────────────────────────┤');
  for (const p of all) {
    const name = p.name.padEnd(24);
    const type = p.type.padEnd(8);
    const active = (p.isActive ? '  ✓' : '  ✗').padEnd(6);
    const def = (p.isDefault ? '  ✓' : '  ✗').padEnd(7);
    const model = (p.defaultModel || '—').padEnd(22);
    console.log(`│ ${name} │ ${type} │ ${active} │ ${def} │ ${model} │`);
  }
  console.log('└──────────────────────────┴──────────┴────────┴─────────┴────────────────────────┘');

  console.log(`\n✅ ${all.length} AI Provider angelegt.`);
  const active = all.filter(p => p.isActive);
  if (active.length === 0) {
    console.log('⚠️  Kein Provider hat einen API Key. Bitte in .env setzen:');
    console.log('   XAI_API_KEY=xai-... (Grok)  |  GROQ_API_KEY=gsk_... (Groq)  |  OPENAI_API_KEY=sk-... (OpenAI)');
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
