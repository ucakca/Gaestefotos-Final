'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Camera, Users, ChevronRight, Clock, Package, Trash2, Settings, Eye, Image, Copy, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Event as EventType } from '@gaestefotos/shared';
import api from '@/lib/api';

interface EventCardProps {
  event: EventType;
  index?: number;
  photoCount?: number;
  guestCount?: number;
  pendingCount?: number;
  visitCount?: number;
}

export default function EventCard({ event, index = 0, photoCount = 0, guestCount = 0, pendingCount = 0, visitCount = 0 }: EventCardProps) {
  const router = useRouter();
  const [cloning, setCloning] = useState(false);

  const handleClone = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCloning(true);
    try {
      const res = await api.post(`/events/${event.id}/clone`, {});
      router.push(`/events/${res.data.event.id}/dashboard`);
    } catch {
      setCloning(false);
    }
  };
  const designConfig = (event.designConfig as any) || {};
  
  const profileImageStoragePath = designConfig.profileImageStoragePath;
  const coverImageStoragePath = designConfig.coverImageStoragePath;
  
  const profileImage = profileImageStoragePath 
    ? `/api/events/${event.id}/design-image/profile/${encodeURIComponent(profileImageStoragePath)}`
    : designConfig.profileImage;
    
  const coverImage = coverImageStoragePath
    ? `/api/events/${event.id}/design-image/cover/${encodeURIComponent(coverImageStoragePath)}`
    : designConfig.coverImage;

  const isActive = (event as any).isActive !== false;
  const eventDate = event.dateTime 
    ? new Date(event.dateTime).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;
  
  // Get package info (mock for now - would come from event data)
  const packageType = (event as any).packageType || 'Free';
  // Event is only "past" after the event day has fully ended (next day midnight)
  const isPast = (() => {
    if (!event.dateTime) return false;
    const eventDay = new Date(event.dateTime);
    eventDay.setHours(23, 59, 59, 999);
    return eventDay < new Date();
  })();
  
  // Calculate days until deletion based on package
  // Free: 14 days after event, Premium: 365 days after event
  const getDaysUntilDeletion = (): number | null => {
    if (!event.dateTime) return null;
    if (!isPast) return null; // Only show for past events
    
    const eventEndDate = new Date(event.dateTime);
    eventEndDate.setDate(eventEndDate.getDate() + 1); // +1 day buffer after event
    
    const deletionDate = new Date(eventEndDate);
    const retentionDays = packageType === 'Free' ? 14 : 365;
    deletionDate.setDate(deletionDate.getDate() + retentionDays);
    
    const today = new Date();
    const diffTime = deletionDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };
  
  const daysUntilDeletion = getDaysUntilDeletion();
  
  // Status Logic:
  // - "live": Event bevorstehend/heute UND Galerie aktiv
  // - "archived": Event vergangen ABER Galerie noch aktiv (Gäste können zugreifen)
  // - "locked": Galerie deaktiviert (egal ob Event vergangen oder nicht)
  type EventStatus = 'live' | 'archived' | 'locked';
  
  const getEventStatus = (): EventStatus => {
    if (!isActive) return 'locked';
    if (isPast) return 'archived';
    return 'live';
  };
  
  const status = getEventStatus();
  
  const statusConfig = {
    live: {
      color: 'bg-success/100',
      label: 'Live',
      textColor: 'text-success',
      bgColor: 'bg-success/10',
    },
    archived: {
      color: 'bg-amber-500',
      label: 'Archiviert',
      textColor: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    locked: {
      color: 'bg-destructive/100',
      label: 'Gesperrt',
      textColor: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative"
    >
      {/* Live Glow Effect */}
      {status === 'live' && (
        <div className="absolute -inset-0.5 bg-gradient-to-br from-success/20 to-emerald-500/10 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      )}

      <Link
        href={`/events/${event.id}/dashboard`}
        prefetch={false}
        className="relative block bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
      >
        {/* Cover Image — taller for better visual impact */}
        <div className="relative h-40 sm:h-44 overflow-hidden">
          {coverImage ? (
            <img
              src={coverImage}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 via-muted to-accent/10 flex items-center justify-center">
              <Image className="w-12 h-12 text-muted-foreground/30" />
            </div>
          )}

          {/* Dark gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          {/* Top Badges Row */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 ${statusConfig[status].bgColor} backdrop-blur-md rounded-full border border-white/10`}>
                <div className={`w-2 h-2 rounded-full ${statusConfig[status].color} ${status === 'live' ? 'animate-pulse' : ''}`} />
                <span className={`text-[11px] font-semibold ${statusConfig[status].textColor}`}>
                  {statusConfig[status].label}
                </span>
              </div>
              <span className="px-2 py-1 bg-black/30 backdrop-blur-md text-[10px] font-medium text-white/80 rounded-full">
                {packageType}
              </span>
            </div>

            {pendingCount > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-500 text-white text-[10px] font-bold rounded-full shadow-md shadow-amber-500/30">
                <Clock className="w-3 h-3" />
                {pendingCount}
              </div>
            )}
          </div>

          {/* Hover Quick Actions Overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
            <a
              href={`/e3/${event.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl hover:bg-white/30 transition-colors"
              title="Gästevorschau"
            >
              <Eye className="w-5 h-5 text-white" />
            </a>
            <a
              href={`/events/${event.id}/dashboard`}
              onClick={(e) => e.stopPropagation()}
              className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl hover:bg-white/30 transition-colors"
              title="Dashboard"
            >
              <Settings className="w-5 h-5 text-white" />
            </a>
            <button
              onClick={handleClone}
              disabled={cloning}
              className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl hover:bg-white/30 transition-colors disabled:opacity-50"
              title="Event klonen"
            >
              {cloning ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Copy className="w-5 h-5 text-white" />}
            </button>
          </div>

          {/* Locked Overlay */}
          {status === 'locked' && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center">
              <span className="px-4 py-2 bg-destructive/90 text-white text-xs font-semibold rounded-full shadow-lg shadow-destructive/30">
                Galerie gesperrt
              </span>
            </div>
          )}

          {/* Bottom-left: Event title on cover for visual impact */}
          <div className="absolute bottom-3 left-3 right-12">
            <h3 className="font-bold text-white text-base truncate drop-shadow-lg">
              {event.title}
            </h3>
          </div>

          {/* Bottom-right: Chevron */}
          <div className="absolute bottom-3 right-3">
            <div className="w-8 h-8 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center group-hover:bg-white/25 transition-colors">
              <ChevronRight className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Profile Image — overlapping cover */}
            {profileImage && (
              <div className="w-11 h-11 rounded-full overflow-hidden bg-muted border-2 border-card flex-shrink-0 -mt-9 relative z-10 shadow-lg ring-2 ring-card">
                <img
                  src={profileImage}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-xs text-muted-foreground truncate font-mono">{event.slug}</p>
            </div>
          </div>

          {/* Meta Info Row */}
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            {eventDate && (
              <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                <Calendar className="w-3.5 h-3.5" />
                <span>{eventDate}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
              <Camera className="w-3.5 h-3.5" />
              <span>{photoCount}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
              <Users className="w-3.5 h-3.5" />
              <span>{guestCount}</span>
            </div>
            {visitCount > 0 && (
              <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                <Eye className="w-3.5 h-3.5" />
                <span>{visitCount}</span>
              </div>
            )}
            {pendingCount > 0 && (
              <div className="flex items-center gap-1.5 bg-orange-500/10 text-orange-500 px-2 py-1 rounded-md">
                <Clock className="w-3.5 h-3.5" />
                <span>{pendingCount}</span>
              </div>
            )}
          </div>

          {/* Deletion Warning */}
          {(status === 'archived' || status === 'locked') && daysUntilDeletion !== null && (
            <div className={`mt-2.5 flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg ${
              daysUntilDeletion <= 7
                ? 'bg-destructive/10 text-destructive border border-destructive/20'
                : daysUntilDeletion <= 30
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  : 'bg-muted text-muted-foreground'
            }`}>
              <Trash2 className="w-3 h-3" />
              <span>
                {daysUntilDeletion === 0
                  ? 'Wird heute gelöscht'
                  : daysUntilDeletion === 1
                    ? 'Noch 1 Tag'
                    : `Noch ${daysUntilDeletion} Tage`}
              </span>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
