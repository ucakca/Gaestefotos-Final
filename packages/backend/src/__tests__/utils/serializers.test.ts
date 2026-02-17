import { describe, it, expect } from 'vitest';
import { serializeBigInt } from '../../utils/serializers';

describe('serializeBigInt', () => {
  it('converts BigInt values to strings', () => {
    const input = { id: 'test', sizeBytes: BigInt(1234567890) };
    const result = serializeBigInt(input) as any;
    expect(result.sizeBytes).toBe('1234567890');
    expect(typeof result.sizeBytes).toBe('string');
  });

  it('leaves non-BigInt values unchanged', () => {
    const input = { name: 'hello', count: 42, active: true };
    const result = serializeBigInt(input);
    expect(result).toEqual({ name: 'hello', count: 42, active: true });
  });

  it('handles nested BigInt values', () => {
    const input = { outer: { inner: BigInt(999) } };
    const result = serializeBigInt(input) as any;
    expect(result.outer.inner).toBe('999');
  });

  it('handles arrays with BigInt', () => {
    const input = [BigInt(1), BigInt(2), BigInt(3)];
    const result = serializeBigInt(input) as any;
    expect(result).toEqual(['1', '2', '3']);
  });

  it('handles null and undefined gracefully', () => {
    expect(serializeBigInt(null)).toBeNull();
    expect(serializeBigInt({})).toEqual({});
  });

  it('handles BigInt zero', () => {
    const input = { size: BigInt(0) };
    const result = serializeBigInt(input) as any;
    expect(result.size).toBe('0');
  });
});
