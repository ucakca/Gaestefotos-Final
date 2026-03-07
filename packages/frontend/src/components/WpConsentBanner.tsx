'use client';

import { useEffect, useRef, useState } from 'react';

const CONSENT_COOKIE = 'mfnConsent';
const CONSENT_MAX_AGE = 365 * 24 * 60 * 60; // 365 days (same as WP plugin data-expires)

function hasConsentCookie(): boolean {
  try {
    return typeof document !== 'undefined' && document.cookie.includes(`${CONSENT_COOKIE}=`);
  } catch {
    return false;
  }
}

function setConsentCookie(): void {
  try {
    document.cookie = `${CONSENT_COOKIE}=1; path=/; max-age=${CONSENT_MAX_AGE}; SameSite=Lax`;
  } catch {
    // ignore
  }
}

export default function WpConsentBanner() {
  // Start hidden (height 0) to avoid flash — iframe will report actual height via postMessage
  const [height, setHeight] = useState<number>(0);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const hasSeenNonZeroHeightRef = useRef(false);

  // Skip rendering entirely if user already gave consent
  useEffect(() => {
    if (hasConsentCookie()) {
      setDismissed(true);
    }
  }, []);

  useEffect(() => {
    if (dismissed) return;

    function onMessage(ev: MessageEvent) {
      try {
        if (!ev || !ev.data || typeof ev.data !== 'object') return;
        const data: any = ev.data;

        // Handle consent acceptance from iframe
        if (data.type === 'wp-consent-accepted') {
          setConsentCookie();
          setHeight(0);
          setDismissed(true);
          return;
        }

        if (data.type !== 'wp-consent-height') return;
        const h = Number(data.height);
        if (!Number.isFinite(h) || h < 0 || h > 1200) return;

        if (h === 0) {
          // Banner collapsed → user accepted or banner was hidden
          if (hasSeenNonZeroHeightRef.current) {
            // Was visible before → user accepted cookies
            setConsentCookie();
            setHeight(0);
            setDismissed(true);
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
  }, [dismissed]);

  if (dismissed) return null;

  return (
    <iframe
      title="Cookie Consent"
      src="/api/wp-consent/frame"
      sandbox="allow-scripts allow-forms"
      className="fixed left-0 bottom-0 w-full border-0 bg-transparent z-[2147483647]"
      style={{
        height: `${height}px`,
        pointerEvents: height > 0 ? 'auto' : 'none',
        opacity: height > 0 ? 1 : 0,
        transition: 'opacity 0.2s ease-in-out',
      }}
    />
  );
}
