'use client';

import { useRouter } from 'next/navigation';
import { Printer, QrCode } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-8">
      <div className="text-center max-w-lg">
        <div className="w-20 h-20 rounded-2xl bg-brand-500/20 flex items-center justify-center mx-auto mb-6">
          <Printer className="w-10 h-10 text-brand-300" />
        </div>
        <h1 className="text-3xl font-bold mb-2">gästefotos.com</h1>
        <p className="text-gray-400 mb-8">Print Terminal</p>
        <p className="text-gray-500 text-sm mb-8">
          Öffne das Terminal über die Event-URL:<br />
          <code className="text-brand-300">/t/{'<event-slug>'}</code>
        </p>
      </div>
    </div>
  );
}
