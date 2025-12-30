'use client';

import { useEffect, useRef, useState } from 'react';

type HelpTooltipProps = {
  title?: string;
  content: string;
  className?: string;
};

export default function HelpTooltip({ title, content, className }: HelpTooltipProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent | PointerEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (e.target && el.contains(e.target as Node)) return;
      setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <span ref={rootRef} className={className} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={title ? `Hilfe: ${title}` : 'Hilfe'}
        className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full border border-app-border bg-app-card text-tokens-brandGreen font-extrabold text-[12px] leading-[20px]"
      >
        ?
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={title ? `Hilfe: ${title}` : 'Hilfe'}
          className="absolute z-50 right-0 top-[calc(100%+8px)] w-80 max-w-[min(85vw,360px)] bg-app-card border border-app-border rounded-xl shadow-xl p-3"
        >
          {title ? (
            <div className="font-extrabold text-tokens-brandGreen mb-1.5 text-[13px]">{title}</div>
          ) : null}
          <div className="text-[13px] leading-[1.35] text-app-fg whitespace-pre-wrap">{content}</div>
          <div className="mt-2.5 flex justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-2.5 py-1.5 bg-tokens-brandGreen text-app-bg rounded-[10px] text-[12px] font-semibold hover:opacity-90"
            >
              Schließen
            </button>
          </div>
        </div>
      )}
    </span>
  );
}
