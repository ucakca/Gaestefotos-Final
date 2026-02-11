'use client';

import { motion } from 'framer-motion';
import { Calendar, MapPin, Camera, Users, ChevronRight, Clock, Package, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Event as EventType } from '@gaestefotos/shared';

interface EventCardProps {
  event: EventType;
  index?: number;
  photoCount?: number;
  guestCount?: number;
  pendingCount?: number;
}

export default function EventCard({ event, index = 0, photoCount = 0, guestCount = 0, pendingCount = 0 }: EventCardProps) {
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
      color: 'bg-green-500',
      label: 'Live',
      textColor: 'text-green-700',
      bgColor: 'bg-green-50',
    },
    archived: {
      color: 'bg-orange-500',
      label: 'Archiviert',
      textColor: 'text-orange-700',
      bgColor: 'bg-orange-50',
    },
    locked: {
      color: 'bg-red-500',
      label: 'Gesperrt',
      textColor: 'text-red-700',
      bgColor: 'bg-red-50',
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        href={`/events/${event.id}/dashboard`}
        prefetch={false}
        className="group block bg-white border border-stone-200 rounded-2xl overflow-hidden hover:border-blue-300 hover:shadow-lg transition-all"
      >
        {/* Cover Image */}
        <div className="relative h-32 bg-gradient-to-br from-stone-200 to-stone-100 overflow-hidden">
          {coverImage && (
            <img
              src={coverImage}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          )}
          
          {/* Top Badges Row */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
            {/* Status Badge + Package */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-2 py-0.5 ${statusConfig[status].bgColor} backdrop-blur-sm rounded-full`}>
                <div className={`w-2 h-2 rounded-full ${statusConfig[status].color}`} />
                <span className={`text-[10px] font-medium ${statusConfig[status].textColor}`}>
                  {statusConfig[status].label}
                </span>
              </div>
              <span className="px-2 py-0.5 bg-white/90 backdrop-blur-sm text-[10px] font-medium text-stone-600 rounded-full">
                {packageType}
              </span>
            </div>
            
            {/* Pending Badge */}
            {pendingCount > 0 && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500 text-white text-[10px] font-medium rounded-full shadow-sm">
                <Clock className="w-3 h-3" />
                {pendingCount}
              </div>
            )}
          </div>
          
          {/* Locked Overlay */}
          {status === 'locked' && (
            <div className="absolute inset-0 bg-stone-900/40 flex items-center justify-center">
              <span className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-full shadow-lg">
                Galerie gesperrt
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Profile Image */}
            {profileImage && (
              <div className="w-12 h-12 rounded-full overflow-hidden bg-stone-50 border-2 border-white flex-shrink-0 -mt-8 relative z-10 shadow-lg">
                <img
                  src={profileImage}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="flex-1 min-w-0 pt-1">
              <h3 className="font-semibold text-stone-800 truncate group-hover:text-blue-600 transition-colors">
                {event.title}
              </h3>
              <p className="text-xs text-stone-500 truncate">{event.slug}</p>
            </div>

            <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
          </div>

          {/* Meta Info */}
          <div className="mt-3 flex items-center gap-4 text-xs text-stone-500">
            {eventDate && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{eventDate}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Camera className="w-3.5 h-3.5" />
              <span>{photoCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span>{guestCount}</span>
            </div>
          </div>
          
          {/* Deletion Warning - only for archived/locked events */}
          {(status === 'archived' || status === 'locked') && daysUntilDeletion !== null && (
            <div className={`mt-2 flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg ${
              daysUntilDeletion <= 7 
                ? 'bg-red-50 text-red-600' 
                : daysUntilDeletion <= 30 
                  ? 'bg-orange-50 text-orange-600' 
                  : 'bg-stone-50 text-stone-500'
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
