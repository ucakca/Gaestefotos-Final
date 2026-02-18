import { describe, it, expect } from 'vitest';
import { isWithinEventDateWindow } from '../../services/eventPolicy';

describe('eventPolicy', () => {
  describe('isWithinEventDateWindow', () => {
    const eventDate = new Date('2026-03-15T18:00:00Z');

    it('should return true when now is within tolerance window', () => {
      const now = new Date('2026-03-15T12:00:00Z');
      expect(isWithinEventDateWindow(now, eventDate, 1)).toBe(true);
    });

    it('should return true on the event date itself', () => {
      expect(isWithinEventDateWindow(eventDate, eventDate, 1)).toBe(true);
    });

    it('should return true 1 day before event', () => {
      const dayBefore = new Date('2026-03-14T18:00:00Z');
      expect(isWithinEventDateWindow(dayBefore, eventDate, 1)).toBe(true);
    });

    it('should return true 1 day after event', () => {
      const dayAfter = new Date('2026-03-16T18:00:00Z');
      expect(isWithinEventDateWindow(dayAfter, eventDate, 1)).toBe(true);
    });

    it('should return false 2 days before event with tolerance=1', () => {
      const twoDaysBefore = new Date('2026-03-13T17:59:59Z');
      expect(isWithinEventDateWindow(twoDaysBefore, eventDate, 1)).toBe(false);
    });

    it('should return false 2 days after event with tolerance=1', () => {
      const twoDaysAfter = new Date('2026-03-17T18:00:01Z');
      expect(isWithinEventDateWindow(twoDaysAfter, eventDate, 1)).toBe(false);
    });

    it('should accept tolerance=3 (wider window)', () => {
      const threeDaysBefore = new Date('2026-03-12T18:00:00Z');
      expect(isWithinEventDateWindow(threeDaysBefore, eventDate, 3)).toBe(true);
      const fourDaysBefore = new Date('2026-03-11T17:59:59Z');
      expect(isWithinEventDateWindow(fourDaysBefore, eventDate, 3)).toBe(false);
    });

    it('should default to tolerance=1 when not specified', () => {
      const dayBefore = new Date('2026-03-14T18:00:00Z');
      expect(isWithinEventDateWindow(dayBefore, eventDate)).toBe(true);
      const twoDaysBefore = new Date('2026-03-13T17:00:00Z');
      expect(isWithinEventDateWindow(twoDaysBefore, eventDate)).toBe(false);
    });

    it('should handle tolerance=0 (exact match only)', () => {
      expect(isWithinEventDateWindow(eventDate, eventDate, 0)).toBe(true);
      const oneHourLater = new Date('2026-03-15T19:00:00Z');
      expect(isWithinEventDateWindow(oneHourLater, eventDate, 0)).toBe(false);
    });
  });
});
