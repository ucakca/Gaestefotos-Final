'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AppLayout from '@/components/AppLayout';
import DashboardFooter from '@/components/DashboardFooter';
import Guestbook from '@/components/Guestbook';
import api from '@/lib/api';
import { Event as EventType } from '@gaestefotos/shared';
import { useAuthStore } from '@/store/authStore';

export default function GuestbookPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { user } = useAuthStore();
  const [event, setEvent] = useState<EventType | null>(null);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    loadEvent();
  }, [eventId, user]);

  const loadEvent = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}`);
      setEvent(data.event);
      const hostCheck = user?.id === data.event.hostId;
      setIsHost(hostCheck);
    } catch (err) {
      void err;
    }
  };

  return (
    <AppLayout showBackButton backUrl={`/events/${eventId}/dashboard`}>
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 min-h-screen pb-24">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-app-fg mb-2">
            Gästebuch
          </h1>
          <p className="text-app-muted">
            {isHost ? 'Verwalte dein Gästebuch' : 'Hinterlasse eine Nachricht für die Gastgeber'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-app-card rounded-lg shadow-sm border border-app-border overflow-hidden min-h-[600px] flex flex-col"
        >
          <Guestbook eventId={eventId} isHost={isHost} eventTitle={event?.title} />
        </motion.div>
      </div>
      <DashboardFooter eventId={eventId} />
      <div className="h-20" />
    </AppLayout>
  );
}

