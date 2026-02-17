import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { bufferedEmit, immediateEmit } from '../../services/wsBuffer';

function createMockIo() {
  const emitFn = vi.fn();
  const toFn = vi.fn(() => ({ emit: emitFn }));
  return { to: toFn, emit: emitFn, _emitFn: emitFn, _toFn: toFn } as any;
}

describe('wsBuffer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('bufferedEmit', () => {
    it('does not emit immediately for single event', () => {
      const io = createMockIo();
      bufferedEmit(io, 'evt-1', 'photo_new', { id: '1' });
      expect(io._emitFn).not.toHaveBeenCalled();
    });

    it('flushes after debounce timeout', () => {
      const io = createMockIo();
      bufferedEmit(io, 'evt-1', 'photo_new', { id: '1' });

      vi.advanceTimersByTime(2000);

      // Single event emitted normally (not as batch)
      expect(io._emitFn).toHaveBeenCalledWith('photo_new', { id: '1' });
    });

    it('batches multiple events of same type', () => {
      const io = createMockIo();
      bufferedEmit(io, 'evt-1', 'photo_new', { id: '1' });
      bufferedEmit(io, 'evt-1', 'photo_new', { id: '2' });

      vi.advanceTimersByTime(2000);

      // Should emit batch + individual events
      expect(io._emitFn).toHaveBeenCalledWith(
        'photo_new_batch',
        expect.objectContaining({ count: 2 })
      );
    });

    it('flushes immediately when buffer reaches 50', () => {
      const io = createMockIo();
      for (let i = 0; i < 50; i++) {
        bufferedEmit(io, 'evt-bulk', 'photo_new', { id: String(i) });
      }

      // Should have flushed without waiting for timeout
      expect(io._emitFn).toHaveBeenCalled();
    });
  });

  describe('immediateEmit', () => {
    it('emits to the correct room immediately', () => {
      const io = createMockIo();
      immediateEmit(io, 'evt-1', 'error', { msg: 'test' });

      expect(io._toFn).toHaveBeenCalledWith('event:evt-1');
      expect(io._emitFn).toHaveBeenCalledWith('error', { msg: 'test' });
    });
  });
});
