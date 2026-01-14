'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { InvitationConfig, InvitationRSVPResponse } from '@gaestefotos/shared';
import { InvitationHeader } from '@/components/invitation/InvitationHeader';
import { ScheduleTimeline } from '@/components/invitation/ScheduleTimeline';
import { DresscodeCard } from '@/components/invitation/DresscodeCard';
import { LocationSection } from '@/components/invitation/LocationSection';
import { RSVPForm } from '@/components/invitation/RSVPForm';
import { CountdownTimer } from '@/components/invitation/CountdownTimer';
import { FullPageLoader } from '@/components/ui/FullPageLoader';
import { ErrorState } from '@/components/ui/ErrorState';

export default function InvitationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;
  const groupSlug = searchParams?.get('group');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [config, setConfig] = useState<InvitationConfig | null>(null);

  useEffect(() => {
    loadInvitation();
  }, [slug]);

  const loadInvitation = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get(`/invitations/slug/${slug}`);
      setInvitation(data.invitation);
      setEvent(data.event);
      
      const invConfig = (data.invitation?.config || {}) as InvitationConfig;
      if (groupSlug && invConfig.availableGroups) {
        invConfig.guestGroup = groupSlug;
      }
      setConfig(invConfig);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Einladung konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const handleRSVPSubmit = async (response: InvitationRSVPResponse) => {
    try {
      await api.post(`/invitations/slug/${slug}/rsvp`, response);
      alert('Deine Rückmeldung wurde gespeichert. Vielen Dank!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Fehler beim Speichern');
    }
  };

  if (loading) return <FullPageLoader />;
  if (error) return <ErrorState message={error} />;
  if (!invitation || !event || !config) return <ErrorState message="Einladung nicht gefunden" />;

  const currentGroup = config.availableGroups?.find(g => g.slug === config.guestGroup);

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream via-blush/20 to-background">
      <InvitationHeader
        coupleNames={config.coupleNames || event.title}
        eventDate={config.eventDate || event.dateTime}
        welcomeText={config.welcomeText}
        backgroundImage={config.backgroundImageUrl}
        theme={config.themePreset}
      />

      {config.showCountdown && event.dateTime && (
        <CountdownTimer targetDate={new Date(event.dateTime)} />
      )}

      {config.schedule && config.schedule.length > 0 && (
        <ScheduleTimeline
          items={config.schedule}
          currentGroup={currentGroup?.slug || 'all'}
          theme={config.themePreset}
        />
      )}

      {config.dresscode && (
        <DresscodeCard
          title={config.dresscode.title}
          description={config.dresscode.description}
          examples={config.dresscode.examples}
          theme={config.themePreset}
        />
      )}

      {config.ceremonyLocation && (
        <LocationSection
          title="Trauung"
          location={config.ceremonyLocation}
          theme={config.themePreset}
        />
      )}

      {config.receptionLocation && (
        <LocationSection
          title="Empfang"
          location={config.receptionLocation}
          theme={config.themePreset}
        />
      )}

      {config.partyLocation && (
        <LocationSection
          title="Feier"
          location={config.partyLocation}
          theme={config.themePreset}
        />
      )}

      {config.rsvpEnabled && (
        <RSVPForm
          questions={config.rsvpQuestions || []}
          currentGroup={currentGroup}
          onSubmit={handleRSVPSubmit}
          theme={config.themePreset}
        />
      )}

      {config.showGalleryLink && (
        <div className="max-w-2xl mx-auto px-6 py-12 text-center">
          <a
            href={`/e2/${event.slug}`}
            className="inline-block px-8 py-3 bg-rose text-white rounded-lg hover:bg-rose/90 transition-colors font-medium"
          >
            Zur Foto-Galerie
          </a>
        </div>
      )}
    </div>
  );
}
