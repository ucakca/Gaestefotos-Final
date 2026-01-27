"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { MapPin, Calendar, Users, Camera, Plus, Play, ImageIcon, X, Share2, Clock, Gift, Shirt, ChevronDown, User, Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface ScheduleItem {
  time: string;
  title: string;
}

interface EventHeroProps {
  coverImage?: string;
  hostAvatar: string;
  hostName: string;
  eventTitle: string;
  welcomeMessage?: string;
  location?: string;
  date: string;
  guestCount: number;
  photoCount: number;
  hasActiveStory?: boolean;
  schedule?: ScheduleItem[];
  wishlistUrl?: string;
  dressCode?: string;
  dashboardUrl?: string;
  onAddStory?: () => void;
  onViewStories?: () => void;
  onShare?: () => void;
}

export function EventHero({
  coverImage,
  hostAvatar,
  hostName,
  eventTitle,
  welcomeMessage,
  location,
  date,
  guestCount,
  photoCount,
  hasActiveStory = false,
  schedule,
  wishlistUrl,
  dressCode,
  dashboardUrl,
  onAddStory,
  onViewStories,
  onShare,
}: EventHeroProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showAvatarLightbox, setShowAvatarLightbox] = useState(false);
  const [showCoverLightbox, setShowCoverLightbox] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
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
      {/* Cover Image with Parallax Effect - Clickable */}
      <div className="relative h-56 w-full overflow-hidden bg-muted">
        <button
          onClick={() => coverImage && setShowCoverLightbox(true)}
          className="absolute inset-0 w-full h-full"
          aria-label="Titelbild ansehen"
        >
          {coverImage ? (
            <>
              <Image
                src={coverImage || "/placeholder.svg"}
                alt={eventTitle}
                fill
                className={cn(
                  "object-cover transition-all duration-700",
                  imageLoaded ? "scale-100 blur-0" : "scale-110 blur-lg"
                )}
                onLoad={() => setImageLoaded(true)}
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-background" />
            </>
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/20 via-primary/10 to-background" />
          )}
        </button>
        
        {/* Branding Logo - Top Center */}
        <Link
          href="https://gaestefotos.com"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-white drop-shadow-lg transition-opacity hover:opacity-80"
          aria-label="Gästefotos.com"
        >
          <span className="text-sm font-bold tracking-wide">Gästefotos.com</span>
        </Link>

        {/* Host Dashboard Button - Top Left */}
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

        {/* Share Button - Top Right */}
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
      </div>

      {/* Cover Image Lightbox */}
      {showCoverLightbox && coverImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
          <button
            onClick={() => setShowCoverLightbox(false)}
            className="absolute top-4 right-4 z-50 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
            aria-label="Schliessen"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="relative h-full w-full max-h-[90vh] max-w-[90vw]">
            <Image
              src={coverImage || "/placeholder.svg"}
              alt={eventTitle}
              fill
              className="object-contain"
            />
          </div>
        </div>
      )}

      {/* Profile Avatar with Story Ring */}
      <div className="relative z-10 -mt-16 flex flex-col items-center px-4">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowAvatarMenu(!showAvatarMenu)}
            className="group relative"
            aria-label={hasActiveStory ? "Stories ansehen" : "Profil"}
          >
            {/* Gradient Ring for Stories */}
            <div
              className={cn(
                "absolute -inset-1 rounded-full",
                hasActiveStory
                  ? "bg-gradient-to-tr from-primary via-red-400 to-orange-400 animate-gradient-ring"
                  : "bg-border"
              )}
            />
            <div className="relative rounded-full bg-background p-1">
              <div className="relative h-28 w-28 overflow-hidden rounded-full ring-4 ring-background">
                <Image
                  src={hostAvatar || "/placeholder.svg"}
                  alt={hostName}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </div>
            
            {/* Add Story Button */}
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAddStory?.();
              }}
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full shadow-lg"
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">Story hinzufügen</span>
            </Button>
          </button>

          {/* Avatar Menu Dropdown */}
          {showAvatarMenu && (
            <div className="absolute left-1/2 top-full mt-2 -translate-x-1/2 z-50 min-w-48 rounded-xl border bg-card p-1 shadow-xl animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
              {hasActiveStory && (
                <button
                  onClick={() => {
                    setShowAvatarMenu(false);
                    onViewStories?.();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-accent"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-primary via-red-400 to-orange-400">
                    <Play className="h-4 w-4 text-white" fill="white" />
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

        {/* Avatar Lightbox */}
        {showAvatarLightbox && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
            <button
              onClick={() => setShowAvatarLightbox(false)}
              className="absolute top-4 right-4 z-50 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
              aria-label="Schliessen"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="relative h-80 w-80 overflow-hidden rounded-full">
              <Image
                src={hostAvatar || "/placeholder.svg"}
                alt={hostName}
                fill
                className="object-cover"
              />
            </div>
          </div>
        )}

        {/* Host Name */}
        <h2 className="mt-4 text-sm font-medium text-muted-foreground">
          {hostName}
        </h2>
      </div>

      {/* Event Info Card */}
      <div className="relative z-10 mx-4 mt-4 rounded-2xl border bg-card shadow-lg overflow-hidden">
        {/* Header - Always visible */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start justify-between">
            <h1 className="text-xl font-bold text-card-foreground text-balance">
              {eventTitle}
            </h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-primary" />
                {guestCount}
              </span>
              <span className="flex items-center gap-1">
                <Camera className="h-3.5 w-3.5 text-primary" />
                {photoCount}
              </span>
            </div>
          </div>
          
          {/* Welcome Message - Always visible */}
          {welcomeMessage && (
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {welcomeMessage}
            </p>
          )}
        </div>

        {/* Details Accordion */}
        <Accordion type="single" collapsible defaultValue="">
          <AccordionItem value="details" className="border-0">
            <AccordionTrigger className="px-4 py-3 border-t hover:no-underline text-sm font-medium text-muted-foreground">
              <span className="flex items-center gap-2">
                Details anzeigen
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-4">
                {/* Date & Location */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>{date}</span>
                  </div>
                  {location && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{location}</span>
                    </div>
                  )}
                </div>

                {/* Schedule / Tagesablauf */}
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

                {/* Dress Code */}
                {dressCode && (
                  <div className="border-t pt-4">
                    <h3 className="flex items-center gap-2 text-sm font-medium mb-2">
                      <Shirt className="h-4 w-4 text-primary" />
                      Dresscode
                    </h3>
                    <p className="text-sm text-muted-foreground ml-6">{dressCode}</p>
                  </div>
                )}

                {/* Wishlist */}
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
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </section>
  );
}
