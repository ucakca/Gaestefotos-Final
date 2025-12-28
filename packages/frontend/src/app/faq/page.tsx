'use client';

import { useEffect } from 'react';

export default function FaqPage() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.location.href = 'https://xn--gstefotos-v2a.com/faq/';
    }
  }, []);

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '1.25rem' }}>
      <h1 style={{ margin: 0, color: '#295B4D' }}>FAQ</h1>
      <p style={{ marginTop: '0.75rem', color: '#666' }}>Weiterleitung…</p>
    </div>
  );
}
