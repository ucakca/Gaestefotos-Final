
'use client';

import { useEffect, useRef, useState } from 'react';

export default function WpConsentBanner() {
  const [height, setHeight] = useState<number>(460);
  const hasSeenNonZeroHeightRef = useRef(false);

  function hasConsentCookieOnApp(): boolean {
    try {
      return typeof document !== 'undefined' && document.cookie.includes('mfnConsent=');
    } catch {
      return false;
    }
  }

  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      try {
        if (!ev || !ev.data || typeof ev.data !== 'object') return;
        const data: any = ev.data;
        if (data.type !== 'wp-consent-height') return;
        const h = Number(data.height);
        if (!Number.isFinite(h) || h < 0 || h > 1200) return;
        if (h === 0) {
          if (hasConsentCookieOnApp() || hasSeenNonZeroHeightRef.current) {
            setHeight(0);
          }
          return;
        }
        hasSeenNonZeroHeightRef.current = true;
        setHeight(Math.max(120, Math.min(1200, Math.ceil(h))));
      } catch {
        return;
      }
    }

    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
    };
  }, []);

  return (
    <iframe
      title="Cookie Consent"
      src="/api/wp-consent/frame"
      sandbox="allow-scripts allow-same-origin"
      style={{
        position: 'fixed',
        left: 0,
        bottom: 0,
        width: '100%',
        height: `${height}px`,
        border: 'none',
        zIndex: 2147483647,
        background: 'transparent',
        pointerEvents: height > 0 ? 'auto' : 'none',
      }}
    />
  );
}
