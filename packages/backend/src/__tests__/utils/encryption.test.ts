import { describe, it, expect, beforeEach } from 'vitest';
import { encryptValue, decryptValue } from '../../utils/encryption';

describe('encryption', () => {
  beforeEach(() => {
    // Set a valid 32-byte hex key for tests
    process.env.TWO_FACTOR_ENCRYPTION_KEY = 'a'.repeat(64);
  });

  it('encrypts and decrypts a value correctly', () => {
    const plaintext = 'Hello, Gästefotos!';
    const encrypted = encryptValue(plaintext);

    expect(encrypted.encrypted).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.tag).toBeDefined();
    expect(encrypted.encrypted).not.toBe(plaintext);

    const decrypted = decryptValue(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('produces different ciphertexts for the same plaintext (random IV)', () => {
    const plaintext = 'same-input';
    const a = encryptValue(plaintext);
    const b = encryptValue(plaintext);

    expect(a.encrypted).not.toBe(b.encrypted);
    expect(a.iv).not.toBe(b.iv);
  });

  it('throws on tampered ciphertext', () => {
    const encrypted = encryptValue('secret');
    encrypted.encrypted = Buffer.from('tampered').toString('base64');

    expect(() => decryptValue(encrypted)).toThrow();
  });

  it('throws on tampered auth tag', () => {
    const encrypted = encryptValue('secret');
    encrypted.tag = Buffer.from('0000000000000000').toString('base64');

    expect(() => decryptValue(encrypted)).toThrow();
  });

  it('handles empty string', () => {
    const encrypted = encryptValue('');
    const decrypted = decryptValue(encrypted);
    expect(decrypted).toBe('');
  });

  it('handles unicode characters', () => {
    const plaintext = '🎉 Hochzeit Fotos 日本語';
    const encrypted = encryptValue(plaintext);
    const decrypted = decryptValue(encrypted);
    expect(decrypted).toBe(plaintext);
  });
});
