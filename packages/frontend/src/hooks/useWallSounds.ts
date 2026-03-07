'use client';

import { useCallback, useRef, useEffect } from 'react';

export type WallSoundEffect = 'shutter' | 'ding' | 'whoosh' | 'pop' | 'chime';

/**
 * Lightweight sound effects for the Live Wall.
 * Uses Web Audio API to generate sounds procedurally — no external files needed.
 */
export function useWallSounds(enabled: boolean = true) {
  const ctxRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  // Lazy-init AudioContext on first interaction
  const getCtx = useCallback(() => {
    if (!enabledRef.current) return null;
    if (!ctxRef.current) {
      try {
        ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch {
        return null;
      }
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume().catch(() => {});
    }
    return ctxRef.current;
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    };
  }, []);

  // ─── Shutter click (camera sound) ───────────────────────
  const playShutter = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;

    // White noise burst
    const bufferSize = ctx.sampleRate * 0.06;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Bandpass to shape the click
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3000;
    filter.Q.value = 1.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start(t);
    noise.stop(t + 0.08);
  }, [getCtx]);

  // ─── Ding (bell-like notification) ──────────────────────
  const playDing = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(1320, t + 0.05);
    osc.frequency.exponentialRampToValueAtTime(1100, t + 0.3);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.5);
  }, [getCtx]);

  // ─── Whoosh (slide transition) ──────────────────────────
  const playWhoosh = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;

    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = Math.sin((i / bufferSize) * Math.PI);
      data[i] = (Math.random() * 2 - 1) * env * 0.3;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, t);
    filter.frequency.exponentialRampToValueAtTime(2000, t + 0.15);
    filter.frequency.exponentialRampToValueAtTime(300, t + 0.3);
    filter.Q.value = 2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start(t);
    noise.stop(t + 0.3);
  }, [getCtx]);

  // ─── Pop (bubble / UI feedback) ─────────────────────────
  const playPop = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.1);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  }, [getCtx]);

  // ─── Chime (pleasant multi-tone) ────────────────────────
  const playChime = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const freqs = [523, 659, 784]; // C5, E5, G5

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      const start = t + i * 0.08;
      gain.gain.setValueAtTime(0.12, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6);

      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.6);
    });
  }, [getCtx]);

  const play = useCallback((effect: WallSoundEffect) => {
    if (!enabledRef.current) return;
    switch (effect) {
      case 'shutter': playShutter(); break;
      case 'ding': playDing(); break;
      case 'whoosh': playWhoosh(); break;
      case 'pop': playPop(); break;
      case 'chime': playChime(); break;
    }
  }, [playShutter, playDing, playWhoosh, playPop, playChime]);

  return { play, enabled };
}
