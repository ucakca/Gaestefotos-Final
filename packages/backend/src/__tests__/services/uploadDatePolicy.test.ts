import { describe, it, expect } from 'vitest';
import { isWithinDateWindowPlusMinusDays } from '../../services/uploadDatePolicy';

describe('uploadDatePolicy', () => {
  describe('isWithinDateWindowPlusMinusDays', () => {
    const ref = new Date('2026-06-15T14:00:00Z');

    it('should return true when capturedAt equals reference', () => {
      expect(isWithinDateWindowPlusMinusDays({
        capturedAt: ref,
        referenceDateTime: ref,
        toleranceDays: 1,
      })).toBe(true);
    });

    it('should return true within tolerance window', () => {
      const dayBefore = new Date('2026-06-14T10:00:00Z');
      expect(isWithinDateWindowPlusMinusDays({
        capturedAt: dayBefore,
        referenceDateTime: ref,
        toleranceDays: 1,
      })).toBe(true);
    });

    it('should return true at start of tolerance window', () => {
      const startOfWindow = new Date('2026-06-14T00:00:00.000Z');
      expect(isWithinDateWindowPlusMinusDays({
        capturedAt: startOfWindow,
        referenceDateTime: ref,
        toleranceDays: 1,
      })).toBe(true);
    });

    it('should return false well before tolerance window', () => {
      const tooEarly = new Date('2026-06-12T12:00:00Z');
      expect(isWithinDateWindowPlusMinusDays({
        capturedAt: tooEarly,
        referenceDateTime: ref,
        toleranceDays: 1,
      })).toBe(false);
    });

    it('should return true on the last day of tolerance window', () => {
      const lastDay = new Date('2026-06-16T12:00:00Z');
      expect(isWithinDateWindowPlusMinusDays({
        capturedAt: lastDay,
        referenceDateTime: ref,
        toleranceDays: 1,
      })).toBe(true);
    });

    it('should return false well after tolerance window', () => {
      const tooLate = new Date('2026-06-18T12:00:00Z');
      expect(isWithinDateWindowPlusMinusDays({
        capturedAt: tooLate,
        referenceDateTime: ref,
        toleranceDays: 1,
      })).toBe(false);
    });

    it('should handle tolerance=3', () => {
      const threeDaysBefore = new Date('2026-06-12T12:00:00Z');
      expect(isWithinDateWindowPlusMinusDays({
        capturedAt: threeDaysBefore,
        referenceDateTime: ref,
        toleranceDays: 3,
      })).toBe(true);

      const fourDaysBefore = new Date('2026-06-11T12:00:00Z');
      expect(isWithinDateWindowPlusMinusDays({
        capturedAt: fourDaysBefore,
        referenceDateTime: ref,
        toleranceDays: 3,
      })).toBe(false);
    });

    it('should handle tolerance=0 (same day only)', () => {
      const sameDay = new Date('2026-06-15T08:00:00Z');
      expect(isWithinDateWindowPlusMinusDays({
        capturedAt: sameDay,
        referenceDateTime: ref,
        toleranceDays: 0,
      })).toBe(true);

      const nextDay = new Date('2026-06-16T08:00:00Z');
      expect(isWithinDateWindowPlusMinusDays({
        capturedAt: nextDay,
        referenceDateTime: ref,
        toleranceDays: 0,
      })).toBe(false);
    });
  });
});
