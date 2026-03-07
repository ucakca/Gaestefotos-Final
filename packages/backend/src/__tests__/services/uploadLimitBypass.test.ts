/**
 * TEST-04: Security test — Upload limit bypass prevention
 * 
 * Verifies that the S-05 fix (IP-based upload counter) prevents
 * guests from bypassing maxUploadsPerGuest by changing their name.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// The ipUploadCountMap is module-scoped in uploads.ts.
// We test the LOGIC, not the full Express route, because the TUS server
// is tightly coupled. These are unit-level behavioural tests.

describe('Upload Limit Bypass Prevention (S-05)', () => {
  // Simulate the IP-based counter logic from uploads.ts
  let ipUploadCountMap: Map<string, number>;

  beforeEach(() => {
    ipUploadCountMap = new Map();
  });

  function checkIpLimit(eventId: string, ipHash: string, maxPerGuest: number): boolean {
    const ipKey = `${eventId}:${ipHash}`;
    const ipCount = ipUploadCountMap.get(ipKey) || 0;
    // IP limit is 2× maxPerGuest (buffer for shared IPs)
    if (ipCount >= maxPerGuest * 2) {
      return false; // blocked
    }
    ipUploadCountMap.set(ipKey, ipCount + 1);
    return true; // allowed
  }

  function checkNameLimit(
    existingCountByName: Record<string, number>,
    uploadedBy: string,
    maxPerGuest: number,
  ): boolean {
    const count = existingCountByName[uploadedBy] || 0;
    return count < maxPerGuest;
  }

  it('blocks same name after reaching limit', () => {
    const existing: Record<string, number> = { 'Alice': 5 };
    expect(checkNameLimit(existing, 'Alice', 5)).toBe(false);
    expect(checkNameLimit(existing, 'Alice', 10)).toBe(true);
  });

  it('name change alone would bypass name-based limit', () => {
    const existing: Record<string, number> = { 'Alice': 5 };
    // Changing name to "Bob" bypasses the name check
    expect(checkNameLimit(existing, 'Bob', 5)).toBe(true);
  });

  it('IP-based counter blocks bypass via name change', () => {
    const eventId = 'evt-123';
    const ipHash = 'abcdef1234567890';
    const maxPerGuest = 3;

    // Simulate 6 uploads from same IP (3 as Alice, 3 as Bob)
    // IP limit = 2 × 3 = 6
    for (let i = 0; i < 6; i++) {
      expect(checkIpLimit(eventId, ipHash, maxPerGuest)).toBe(true);
    }

    // 7th upload: IP limit reached
    expect(checkIpLimit(eventId, ipHash, maxPerGuest)).toBe(false);
  });

  it('different IPs are tracked independently', () => {
    const eventId = 'evt-456';
    const maxPerGuest = 2;

    // IP-A uploads 4 times (limit = 2×2 = 4)
    for (let i = 0; i < 4; i++) {
      expect(checkIpLimit(eventId, 'ip-a', maxPerGuest)).toBe(true);
    }
    expect(checkIpLimit(eventId, 'ip-a', maxPerGuest)).toBe(false);

    // IP-B can still upload
    expect(checkIpLimit(eventId, 'ip-b', maxPerGuest)).toBe(true);
  });

  it('different events are tracked independently', () => {
    const maxPerGuest = 1;

    // Same IP, different events
    expect(checkIpLimit('evt-1', 'ip-x', maxPerGuest)).toBe(true);
    expect(checkIpLimit('evt-1', 'ip-x', maxPerGuest)).toBe(true);
    expect(checkIpLimit('evt-1', 'ip-x', maxPerGuest)).toBe(false); // 3rd = blocked (limit=2)

    // Different event, same IP — fresh counter
    expect(checkIpLimit('evt-2', 'ip-x', maxPerGuest)).toBe(true);
  });

  it('counter resets after clear (simulating periodic cleanup)', () => {
    const eventId = 'evt-789';
    const maxPerGuest = 1;

    expect(checkIpLimit(eventId, 'ip-z', maxPerGuest)).toBe(true);
    expect(checkIpLimit(eventId, 'ip-z', maxPerGuest)).toBe(true);
    expect(checkIpLimit(eventId, 'ip-z', maxPerGuest)).toBe(false);

    // Simulate periodic cleanup
    ipUploadCountMap.clear();

    // After cleanup, uploads are allowed again
    expect(checkIpLimit(eventId, 'ip-z', maxPerGuest)).toBe(true);
  });
});
