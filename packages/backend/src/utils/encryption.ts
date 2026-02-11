import crypto from 'crypto';

function normalizeEncryptionKey(raw: string): Buffer {
  const trimmed = String(raw || '').trim();
  if (!trimmed) {
    throw new Error('Server misconfigured: ENCRYPTION_KEY is missing');
  }
  if (/^[0-9a-f]{64}$/i.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }
  return crypto.createHash('sha256').update(trimmed, 'utf8').digest();
}

function getEncryptionKey(): Buffer {
  const key = process.env.TWO_FACTOR_ENCRYPTION_KEY
    || process.env.ENCRYPTION_KEY
    || '';
  return normalizeEncryptionKey(key);
}

export interface EncryptedValue {
  encrypted: string;
  iv: string;
  tag: string;
}

export function encryptValue(plaintext: string): EncryptedValue {
  const key = getEncryptionKey();
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

export function decryptValue(enc: EncryptedValue): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(enc.iv, 'base64');
  const tag = Buffer.from(enc.tag, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(enc.encrypted, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
