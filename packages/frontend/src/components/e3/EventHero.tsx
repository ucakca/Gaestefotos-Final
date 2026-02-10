'use client';

import { useState, useRef, useEffect } from "react";
import { Event as EventType } from '@gaestefotos/shared';
import { MapPin, Calendar, Users, Camera, Plus, Play, ImageIcon, X, Share2, Clock, Gift, Shirt, User, Video, Eye, Moon, Sun, Wifi } from "lucide-react";
import { useTheme } from 'next-themes';
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface ScheduleItem {
  time: string;
  title: string;
}

export interface EventHeroProps {
  event: EventType;
  hostName?: string;
  coverImage?: string | null;
  profileImage?: string | null;
  hasStories?: boolean;
  onProfileClick?: () => void;
  onAddStory?: () => void;
  photoCount?: number;
  videoCount?: number;
  visitorCount?: number;
  isStorageLocked?: boolean;
  uploadDisabled?: boolean;
  uploadDisabledReason?: string;
  schedule?: ScheduleItem[];
  wishlistUrl?: string;
  dressCode?: string;
  dashboardUrl?: string;
  onShare?: () => void;
  hasWifi?: boolean;
  onWifiClick?: () => void;
}

export default function EventHero({
  event,
  hostName,
  coverImage,
  profileImage,
  hasStories = false,
  onProfileClick,
  onAddStory,
  photoCount = 0,
  videoCount = 0,
  visitorCount = 0,
  isStorageLocked = false,
  uploadDisabled = false,
  uploadDisabledReason,
  schedule,
  wishlistUrl,
  dressCode,
  dashboardUrl,
  onShare,
  hasWifi,
  onWifiClick,
}: EventHeroProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showAvatarLightbox, setShowAvatarLightbox] = useState(false);
  const [showCoverLightbox, setShowCoverLightbox] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const designConfig = event.designConfig as any || {};
  const welcomeMessage = designConfig.welcomeMessage || 'Schön, dass ihr alle hier seid! Lasst uns gemeinsam unvergessliche Erinnerungen schaffen ❤️';
  const actualCoverImage = coverImage || (() => {
    const coverImageStoragePath = designConfig.coverImageStoragePath;
    return coverImageStoragePath ? `/api/events/${event.id}/design-image/cover/${encodeURIComponent(coverImageStoragePath)}` : (designConfig.coverImage && !designConfig.coverImage.startsWith('http://localhost:8001') ? designConfig.coverImage : null);
  })();
  const actualProfileImage = profileImage || (() => {
    const profileImageStoragePath = designConfig.profileImageStoragePath;
    return profileImageStoragePath ? `/api/events/${event.id}/design-image/profile/${encodeURIComponent(profileImageStoragePath)}` : (designConfig.profileImage && !designConfig.profileImage.startsWith('http://localhost:8001') ? designConfig.profileImage : null);
  })();
  const eventDetails = event as any;
  const eventDate = eventDetails.date ? new Date(eventDetails.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const location = eventDetails.location || eventDetails.venue?.name || null;
  const eventTitle = event.title;
  const hostAvatar = actualProfileImage;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowAvatarMenu(false);
      }
    }
    if (showAvatarMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showAvatarMenu]);

  return (
    <section className="relative">
      <div className="relative h-56 w-full overflow-hidden bg-muted">
        <button
          onClick={() => actualCoverImage && setShowCoverLightbox(true)}
          className="absolute inset-0 w-full h-full"
          aria-label="Titelbild ansehen"
        >
          {actualCoverImage ? (
            <>
              <img
                src={actualCoverImage}
                alt={eventTitle}
                className={`object-cover w-full h-full transition-all duration-700 ${
                  imageLoaded ? "scale-100 blur-0" : "scale-110 blur-lg"
                }`}
                onLoad={() => setImageLoaded(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-background" />
            </>
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/20 via-primary/10 to-background" />
          )}
        </button>
        
        <Link
          href="https://gaestefotos.com"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute top-3 left-1/2 -translate-x-1/2 z-10 transition-all hover:scale-105"
          aria-label="Gästefotos.com"
        >
          <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-2">
            <img
              src="https://xn--gstefotos-v2a.com/wp-content/uploads/2025/11/logo-Kopie.webp"
              alt="Gästefotos.com"
              className="h-5 w-auto brightness-0 invert"
            />
          </div>
        </Link>

        {dashboardUrl && (
          <Link
            href={dashboardUrl}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-4 left-4 z-10 rounded-full bg-black/40 p-2.5 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
            aria-label="Host Dashboard"
          >
            <User className="h-5 w-5" />
          </Link>
        )}

        {onShare && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
            className="absolute top-4 right-4 z-10 rounded-full bg-black/40 p-2.5 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
            aria-label="Event teilen"
          >
            <Share2 className="h-5 w-5" />
          </button>
        )}

        {/* WiFi Button */}
        {hasWifi && onWifiClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onWifiClick();
            }}
            className="absolute top-4 right-16 z-10 rounded-full bg-blue-500/80 p-2.5 text-white backdrop-blur-sm transition-colors hover:bg-blue-600/80"
            aria-label="WLAN anzeigen"
          >
            <Wifi className="h-5 w-5" />
          </button>
        )}

        {/* Dark Mode Toggle */}
        {mounted && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setTheme(theme === 'dark' ? 'light' : 'dark');
            }}
            className={`absolute top-4 z-10 rounded-full bg-black/40 p-2.5 text-white backdrop-blur-sm transition-colors hover:bg-black/60 ${hasWifi && onWifiClick ? 'right-28' : 'right-16'}`}
            aria-label={theme === 'dark' ? 'Hell-Modus' : 'Dunkel-Modus'}
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
        )}
      </div>

      {showCoverLightbox && actualCoverImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
          <button
            onClick={() => setShowCoverLightbox(false)}
            className="absolute top-4 right-4 z-50 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
            aria-label="Schliessen"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="relative h-full w-full max-h-[90vh] max-w-[90vw]">
            <img
              src={actualCoverImage}
              alt={eventTitle}
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}

      <div className={`relative -mt-16 flex flex-col items-center px-4 ${showAvatarMenu ? 'z-[60]' : 'z-10'}`}>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowAvatarMenu(!showAvatarMenu)}
            className="group relative"
            aria-label={hasStories ? "Stories ansehen" : "Profil"}
          >
            <div
              className={`absolute -inset-1 rounded-full ${
                hasStories
                  ? "bg-gradient-to-tr from-primary via-red-400 to-orange-400 animate-gradient-ring"
                  : "bg-border"
              }`}
            />
            <div className="relative rounded-full bg-background p-1">
              <div className="relative h-28 w-28 overflow-hidden rounded-full ring-4 ring-background">
                {actualProfileImage ? (
                  <img
                    src={actualProfileImage}
                    alt={hostName || event.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Users className="w-12 h-12 text-white" />
                  </div>
                )}
              </div>
            </div>
            
            {onAddStory && !uploadDisabled && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddStory();
                }}
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full shadow-lg"
              >
                <Plus className="h-4 w-4" />
                <span className="sr-only">Story hinzufügen</span>
              </Button>
            )}
          </button>

          {showAvatarMenu && (
            <div className="absolute left-1/2 top-full mt-2 -translate-x-1/2 z-[60] min-w-48 rounded-xl border bg-card p-1 shadow-xl animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
              {hasStories && (
                <button
                  onClick={() => {
                    setShowAvatarMenu(false);
                    onProfileClick?.();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-accent"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                    <Play className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span>Stories ansehen</span>
                </button>
              )}
              <button
                onClick={() => {
                  setShowAvatarMenu(false);
                  setShowAvatarLightbox(true);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-accent"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <span>Profilbild ansehen</span>
              </button>
            </div>
          )}
        </div>

        {showAvatarLightbox && actualProfileImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
            <button
              onClick={() => setShowAvatarLightbox(false)}
              className="absolute top-4 right-4 z-50 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
              aria-label="Schliessen"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="relative h-80 w-80 overflow-hidden rounded-full">
              {actualProfileImage ? (
                <img
                  src={actualProfileImage}
                  alt={hostName || event.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Users className="w-16 h-16 text-white" />
                </div>
              )}
            </div>
          </div>
        )}

        <h2 className="mt-4 text-sm font-medium text-muted-foreground text-center">
          {hostName || event.title}
        </h2>
      </div>

      <div className="relative z-10 mx-4 mt-4 rounded-2xl border bg-card shadow-lg overflow-hidden">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-primary">
              {event.title}
            </h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5 text-primary" />
                {visitorCount}
              </span>
              <span className="flex items-center gap-1">
                <Camera className="h-3.5 w-3.5 text-primary" />
                {photoCount}
              </span>
              {videoCount > 0 && (
                <span className="flex items-center gap-1">
                  <Video className="h-3.5 w-3.5 text-primary" />
                  {videoCount}
                </span>
              )}
            </div>
          </div>
          
          {welcomeMessage && (
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {welcomeMessage}
            </p>
          )}
        </div>

        {(isStorageLocked || (uploadDisabled && uploadDisabledReason)) && (
          <div className="px-4 pb-3 space-y-2">
            {isStorageLocked && (
              <div className="px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  ⚠️ Speicherplatz voll - Upload aktuell nicht möglich
                </p>
              </div>
            )}
            {uploadDisabled && uploadDisabledReason && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">
                  {uploadDisabledReason}
                </p>
              </div>
            )}
          </div>
        )}

        <Accordion type="single" collapsible defaultValue="">
          <AccordionItem value="details" className="border-0">
            <AccordionTrigger className="px-4 py-3 border-t hover:no-underline text-sm font-medium text-muted-foreground">
              <span className="flex items-center gap-2">
                Details anzeigen
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-2 space-y-4">
              <div className="space-y-3">
                {eventDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>{eventDate}</span>
                  </div>
                )}
                {location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>{location}</span>
                  </div>
                )}
              </div>

              {schedule && schedule.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="flex items-center gap-2 text-sm font-medium mb-3">
                    <Clock className="h-4 w-4 text-primary" />
                    Tagesablauf
                  </h3>
                  <div className="space-y-2 ml-6">
                    {schedule.map((item, index) => (
                      <div key={index} className="flex gap-3 text-sm">
                        <span className="text-muted-foreground font-medium min-w-[50px]">
                          {item.time}
                        </span>
                        <span>{item.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {dressCode && (
                <div className="border-t pt-4">
                  <h3 className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Shirt className="h-4 w-4 text-primary" />
                    Dresscode
                  </h3>
                  <p className="text-sm text-muted-foreground ml-6">{dressCode}</p>
                </div>
              )}

              {wishlistUrl && (
                <div className="border-t pt-4">
                  <h3 className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Gift className="h-4 w-4 text-primary" />
                    Wunschliste
                  </h3>
                  <a
                    href={wishlistUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline ml-6"
                  >
                    Zur Wunschliste
                  </a>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </section>
  );
}
