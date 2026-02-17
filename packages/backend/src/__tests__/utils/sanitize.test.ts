import { describe, it, expect } from 'vitest';
import { sanitizeText, sanitizeObject, sanitizeSlug, escapeHtml } from '../../utils/sanitize';

describe('sanitizeText', () => {
  it('strips HTML tags', () => {
    expect(sanitizeText('Hello <script>alert("xss")</script> World')).toBe('Hello alert("xss") World');
    expect(sanitizeText('<b>bold</b> text')).toBe('bold text');
    expect(sanitizeText('<img src=x onerror=alert(1)>')).toBe('');
  });

  it('strips javascript: URIs', () => {
    expect(sanitizeText('click javascript:alert(1)')).toBe('click alert(1)');
  });

  it('strips event handlers', () => {
    expect(sanitizeText('test onload=alert(1)')).toBe('test alert(1)');
    expect(sanitizeText('test onclick =alert(1)')).toBe('test alert(1)');
  });

  it('strips data URIs', () => {
    expect(sanitizeText('img data:text/html;base64,PHNjcmlwdD4=')).toBe('img ,PHNjcmlwdD4=');
  });

  it('trims whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
  });

  it('handles non-string input', () => {
    expect(sanitizeText(null as any)).toBe('');
    expect(sanitizeText(undefined as any)).toBe('');
    expect(sanitizeText(42 as any)).toBe('');
  });

  it('preserves safe text', () => {
    expect(sanitizeText('Hello World! 🎉')).toBe('Hello World! 🎉');
    expect(sanitizeText('Schöne Grüße von der Hochzeit')).toBe('Schöne Grüße von der Hochzeit');
  });
});

describe('sanitizeObject', () => {
  it('sanitizes string fields', () => {
    const result = sanitizeObject({
      name: '<script>xss</script>Max',
      age: 25,
      bio: '<b>bold</b>',
    });
    expect(result.name).toBe('xssMax');
    expect(result.age).toBe(25);
    expect(result.bio).toBe('bold');
  });

  it('sanitizes only specified fields', () => {
    const result = sanitizeObject(
      { name: '<b>Max</b>', html: '<b>allowed</b>' },
      ['name']
    );
    expect(result.name).toBe('Max');
    expect(result.html).toBe('<b>allowed</b>');
  });
});

describe('sanitizeSlug', () => {
  it('produces URL-safe slugs', () => {
    expect(sanitizeSlug('Hello World!')).toBe('helloworld');
    expect(sanitizeSlug('my-event-2026')).toBe('my-event-2026');
  });

  it('removes special characters', () => {
    expect(sanitizeSlug('Café & Bar')).toBe('cafbar');
  });

  it('collapses multiple dashes', () => {
    expect(sanitizeSlug('a---b')).toBe('a-b');
  });

  it('strips leading/trailing dashes', () => {
    expect(sanitizeSlug('-test-')).toBe('test');
  });

  it('truncates to 200 chars', () => {
    const long = 'a'.repeat(300);
    expect(sanitizeSlug(long).length).toBe(200);
  });

  it('handles non-string input', () => {
    expect(sanitizeSlug(null as any)).toBe('');
  });
});

describe('escapeHtml', () => {
  it('escapes HTML entities', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('escapes ampersands', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe("it&#x27;s");
  });

  it('handles non-string input', () => {
    expect(escapeHtml(null as any)).toBe('');
  });
});
