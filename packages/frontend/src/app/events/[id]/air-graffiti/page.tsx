'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import AppLayout from '@/components/AppLayout';
import DashboardFooter from '@/components/DashboardFooter';
import { useToastStore } from '@/store/toastStore';
import api from '@/lib/api';
import { Hand } from 'lucide-react';

const AirGraffitiWall = dynamic(() => import('@/components/booth/AirGraffitiWall'), { ssr: false });

export default function AirGraffitiPage({ params }: { params: Promise<{ id: string }> }) {
  const [eventId, setEventId] = useState<string | null>(null);
  const [showCanvas, setShowCanvas] = useState(false);
  const { showToast } = useToastStore();

  React.useEffect(() => { params.then(p => setEventId(p.id)); }, [params]);

  if (!eventId) return null;

  if (showCanvas) {
    return (
      <AirGraffitiWall
        onSave={async (dataUrl) => {
          try {
            await api.post('/graffiti/save', {
              eventId,
              drawingData: { type: 'air_graffiti', dataUrl },
            });
            showToast('Air Graffiti gespeichert! ✨', 'success');
            setShowCanvas(false);
          } catch {
            showToast('Speichern fehlgeschlagen', 'error');
          }
        }}
        onClose={() => setShowCanvas(false)}
      />
    );
  }

  return (
    <AppLayout showBackButton backUrl={`/events/${eventId}/booth-games`}>
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">

        <div className="mb-8">
          <Hand className="w-20 h-20 text-emerald-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-app-fg mb-2">Air Graffiti Wall</h1>
          <p className="text-app-muted max-w-md mx-auto">
            Male in der Luft mit deinen Händen! Deine Webcam erkennt deine Finger — 
            Daumen und Zeigefinger zusammen = Zeichnen. Neon-Effekte inklusive.
          </p>
        </div>

        <div className="bg-app-card rounded-2xl border border-app-border p-6 max-w-sm mx-auto mb-8">
          <h3 className="font-semibold text-app-fg mb-3">So funktioniert&apos;s:</h3>
          <ul className="text-sm text-app-muted text-left space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">1.</span>
              Kamera-Zugriff erlauben
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">2.</span>
              Hand vor die Kamera halten — Zeigefinger = Cursor
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">3.</span>
              Daumen + Zeigefinger zusammen = Zeichnen
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">4.</span>
              Farbe & Pinselgröße unten wählen
            </li>
          </ul>
        </div>

        <button
          onClick={() => setShowCanvas(true)}
          className="px-8 py-4 rounded-2xl bg-emerald-500 text-white font-semibold text-lg hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
        >
          🖐️ Air Graffiti starten
        </button>
      </div>
      <DashboardFooter eventId={eventId} />
    </AppLayout>
  );
}
