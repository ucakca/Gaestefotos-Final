'use client';

import EventHero from '@/components/e3/EventHero';
import BottomNav from '@/components/e3/BottomNav';
import PhotoGrid from '@/components/e3/PhotoGrid';

/**
 * TEST PAGE - Zeigt neues v0-Design OHNE Datenbank
 * URL: /test-design
 */

export default function TestDesignPage() {
  const mockEvent = {
    id: 'test-123',
    title: 'Design Test Event',
    slug: 'test-design',
    description: 'Das ist ein Test des neuen v0-Designs',
    hostId: 'host-123',
    designConfig: {
      // KEIN Matez Logo - nur Fallback Gradient!
      welcomeMessage: 'Willkommen zum neuen Design! 🎉',
    },
  };

  return (
    <div className="min-h-screen bg-app-bg">
      {/* Event Hero - NEU */}
      <EventHero
        event={mockEvent as any}
        hostName="Test Host"
        photoCount={42}
        hasStories={false}
      />

      {/* Bottom Nav - NEU */}
      <BottomNav
        activeTab="feed"
        onTabChange={() => {}}
        challengeCount={5}
        guestbookCount={12}
      />

      {/* Info Box */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-green-800 mb-4">
            ✅ Neues v0-Design funktioniert!
          </h2>
          <p className="text-green-700 mb-4">
            Wenn du diese Seite siehst mit:
          </p>
          <ul className="list-disc list-inside text-green-700 space-y-2 mb-4">
            <li>✅ Großem Cover-Bild / Gradient (KEIN Matez Logo!)</li>
            <li>✅ Rundem Avatar in der Mitte</li>
            <li>✅ Tab-Navigation unten (Feed, Challenges, Gästebuch, Info)</li>
            <li>✅ Modernem Instagram-Style</li>
          </ul>
          <p className="text-green-700 font-bold">
            → Dann funktioniert der Code!
          </p>
          <p className="text-green-700 mt-4">
            Das Problem bei /e3/manueller-produktiv-test ist:
            <br />
            <strong>Der Event hat alte Daten in der Datenbank (Matez Logo als Profilbild)!</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
