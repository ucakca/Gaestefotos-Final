'use client';

import { useEffect } from 'react';

export default function FaqPage() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.location.href = 'https://xn--gstefotos-v2a.com/faq/';
    }
  }, []);

  return (
    <div className="max-w-[980px] mx-auto p-5">
      <h1 className="m-0 text-tokens-brandGreen">FAQ</h1>
      <p className="mt-3 text-app-muted">Weiterleitung…</p>
    </div>
  );
}
