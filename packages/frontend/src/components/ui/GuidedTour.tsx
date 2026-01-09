'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';

type TourStep = {
  id: string;
  target: string; // CSS selector
  title: string;
  body: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
};

type GuidedTourProps = {
  tourId: string;
  steps: TourStep[];
  autoStart?: boolean;
};

function safeGet(key: string): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function safeRemove(key: string): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function getRect(target: string): DOMRect | null {
  if (typeof document === 'undefined') return null;
  const el = document.querySelector(target) as HTMLElement | null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!Number.isFinite(r.left) || !Number.isFinite(r.top)) return null;
  return r;
}

function scrollIntoView(target: string) {
  if (typeof document === 'undefined') return;
  const el = document.querySelector(target) as HTMLElement | null;
  if (!el) return;
  try {
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  } catch {
    el.scrollIntoView();
  }
}

export default function GuidedTour({ tourId, steps, autoStart = true }: GuidedTourProps) {
  const dismissedKey = `gf_tour:${tourId}:dismissed`;
  const seenKey = `gf_tour:${tourId}:seen`;

  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const current = steps[idx] || null;

  const dismissed = useMemo(() => safeGet(dismissedKey) === '1', [dismissedKey]);
  const seen = useMemo(() => safeGet(seenKey) === '1', [seenKey]);

  const recalc = () => {
    if (!current) return;
    const r = getRect(current.target);
    if (!r) {
      setPos(null);
      return;
    }
    setPos({ top: r.top, left: r.left, width: r.width, height: r.height });
  };

  useEffect(() => {
    if (!autoStart) return;
    if (dismissed) return;
    if (seen) return;

    // open after first paint so DOM is ready
    const t = setTimeout(() => {
      setOpen(true);
      setIdx(0);
      safeSet(seenKey, '1');
    }, 250);
    return () => clearTimeout(t);
  }, [autoStart, dismissed, seen, seenKey]);

  useEffect(() => {
    if (!open) return;
    if (!current) return;

    scrollIntoView(current.target);

    const t = setTimeout(() => {
      recalc();
    }, 250);

    const onResize = () => recalc();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);

    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, idx]);

  const start = () => {
    safeRemove(dismissedKey);
    safeRemove(seenKey);
    setIdx(0);
    setOpen(true);
  };

  const close = (opts?: { dismiss?: boolean }) => {
    if (opts?.dismiss) safeSet(dismissedKey, '1');
    setOpen(false);
  };

  const next = () => {
    const n = Math.min(idx + 1, steps.length - 1);
    setIdx(n);
  };

  const prev = () => {
    const p = Math.max(idx - 1, 0);
    setIdx(p);
  };

  const bubbleStyle: React.CSSProperties | undefined = useMemo(() => {
    if (!pos || !current) return undefined;

    const pad = 12;
    const placement = current.placement || 'bottom';

    const centerX = pos.left + pos.width / 2;
    const centerY = pos.top + pos.height / 2;

    // default size assumptions; bubble width is limited via tailwind.
    const w = 360;
    const h = 170;

    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

    let left = centerX - w / 2;
    let top = centerY + pos.height / 2 + pad;

    if (placement === 'top') top = centerY - pos.height / 2 - pad - h;
    if (placement === 'left') {
      left = pos.left - pad - w;
      top = centerY - h / 2;
    }
    if (placement === 'right') {
      left = pos.left + pos.width + pad;
      top = centerY - h / 2;
    }

    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

    left = clamp(left, 12, vw - w - 12);
    top = clamp(top, 12, vh - h - 12);

    return { left, top };
  }, [pos, current]);

  if (!open) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={start}>
        Tour starten
      </Button>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/55" onClick={() => close()} />

      {pos ? (
        <div
          className="fixed z-[81] rounded-xl ring-2 ring-[var(--status-warning)] ring-offset-2 ring-offset-transparent"
          style={{ top: pos.top, left: pos.left, width: pos.width, height: pos.height }}
        />
      ) : null}

      <div
        className="fixed z-[82] w-[360px] max-w-[calc(100vw-24px)] rounded-2xl border border-app-border bg-app-card p-4 shadow-xl"
        style={bubbleStyle}
      >
        <div className="text-sm font-semibold text-app-fg">{current?.title || 'Tour'}</div>
        <div className="mt-2 whitespace-pre-wrap text-sm text-app-muted">{current?.body || ''}</div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="text-xs text-app-muted">
            Schritt {idx + 1}/{steps.length}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={prev} disabled={idx === 0}>
              Zurück
            </Button>
            {idx < steps.length - 1 ? (
              <Button type="button" size="sm" onClick={next}>
                Weiter
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={() => close()}>
                Fertig
              </Button>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={() => close()}>
            Schließen
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => close({ dismiss: true })}>
            Nicht mehr anzeigen
          </Button>
        </div>

        {!pos ? (
          <div className="mt-2 text-xs text-[var(--status-warning)]">
            Hinweis: Ziel-Element nicht gefunden. Bitte scrolle etwas oder klappe das Panel auf.
          </div>
        ) : null}
      </div>
    </>
  );
}
