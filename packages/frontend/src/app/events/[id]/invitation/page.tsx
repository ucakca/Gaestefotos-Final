'use client';

import { useParams } from 'next/navigation';
import { InvitationEditorPanel } from '@/components/invitation-editor/InvitationEditorPanel';
import { useEffect, useState } from 'react';

export default function InvitationEditorPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [eventSlug, setEventSlug] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch event details for slug
    fetch(`/api/events/${eventId}`)
      .then((res) => res.json())
      .then((data) => {
        setEventSlug(data.slug || eventId);
        setLoading(false);
      })
      .catch(() => {
        setEventSlug(eventId);
        setLoading(false);
      });
  }, [eventId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Editor wird geladen...</p>
        </div>
      </div>
    );
  }

  return <InvitationEditorPanel eventId={eventId} eventSlug={eventSlug} />;
}
