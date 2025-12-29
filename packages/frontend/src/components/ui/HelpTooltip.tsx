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
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          border: '1px solid #E5E7EB',
          background: '#fff',
          color: '#295B4D',
          fontWeight: 800,
          fontSize: 12,
          lineHeight: '20px',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ?
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={title ? `Hilfe: ${title}` : 'Hilfe'}
          style={{
            position: 'absolute',
            zIndex: 50,
            top: 'calc(100% + 8px)',
            right: 0,
            width: 320,
            maxWidth: 'min(85vw, 360px)',
            background: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: 12,
            boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
            padding: 12,
          }}
        >
          {title ? (
            <div style={{ fontWeight: 800, color: '#295B4D', marginBottom: 6, fontSize: 13 }}>{title}</div>
          ) : null}
          <div style={{ color: '#374151', fontSize: 13, lineHeight: 1.35, whiteSpace: 'pre-wrap' }}>{content}</div>
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                padding: '6px 10px',
                backgroundColor: '#295B4D',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Schließen
            </button>
          </div>
        </div>
      )}
    </span>
  );
}
