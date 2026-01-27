"use client";

import { useState } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  Building2,
  FileText,
  Shield,
  Cookie,
  HelpCircle,
  ChevronRight,
  Sparkles,
  Heart,
  Gift,
  Users,
  Music,
  Utensils,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

type InfoSection = "event" | "operator";

interface ScheduleItem {
  time: string;
  title: string;
  description?: string;
  icon?: string;
}

interface EventInfo {
  title: string;
  hostName: string;
  date: string;
  location?: string;
  locationUrl?: string;
  description?: string;
  schedule?: ScheduleItem[];
  contactPhone?: string;
  contactEmail?: string;
  wishlistUrl?: string;
}

interface OperatorInfo {
  companyName: string;
  address: string;
  uid?: string;
  registrationNumber?: string;
  email: string;
  phone?: string;
}

interface InfoTabProps {
  eventInfo: EventInfo;
  operatorInfo: OperatorInfo;
  defaultSection?: InfoSection;
  eventSlug?: string;
}

const scheduleIcons: Record<string, typeof Calendar> = {
  users: Users,
  calendar: Calendar,
  food: Utensils,
  music: Music,
  gift: Gift,
};

export function InfoTab({
  eventInfo,
  operatorInfo,
  defaultSection = "event",
  eventSlug,
}: InfoTabProps) {
  const [activeSection, setActiveSection] = useState<InfoSection>(defaultSection);

  return (
    <div className="space-y-4 px-4 pb-28 pt-4">
      {/* Section Toggle */}
      <div className="flex gap-2 rounded-xl bg-muted p-1">
        <button
          onClick={() => setActiveSection("event")}
          className={cn(
            "flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
            activeSection === "event"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span className="flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4" />
            Event Info
          </span>
        </button>
        <button
          onClick={() => setActiveSection("operator")}
          className={cn(
            "flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
            activeSection === "operator"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span className="flex items-center justify-center gap-2">
            <Building2 className="h-4 w-4" />
            Betreiber
          </span>
        </button>
      </div>

      {/* Event Info Section */}
      {activeSection === "event" && (
        <div className="space-y-4 animate-in fade-in-0 slide-in-from-left-4">
          {/* Event Details Card */}
          <Card className="p-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Heart className="h-5 w-5 text-primary" />
              {eventInfo.title}
            </h3>
            <p className="text-sm text-muted-foreground">{eventInfo.hostName}</p>
            
            {eventInfo.description && (
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                {eventInfo.description}
              </p>
            )}

            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Datum</p>
                  <p className="text-sm text-muted-foreground">{eventInfo.date}</p>
                </div>
              </div>

              {eventInfo.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">{eventInfo.location}</p>
                    {eventInfo.locationUrl && (
                      <a
                        href={eventInfo.locationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        In Google Maps öffnen
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Schedule */}
          {eventInfo.schedule && eventInfo.schedule.length > 0 && (
            <Card className="p-4">
              <h3 className="flex items-center gap-2 font-semibold">
                <Clock className="h-5 w-5 text-primary" />
                Tagesablauf
              </h3>
              <div className="mt-4 space-y-4">
                {eventInfo.schedule.map((item, index) => {
                  const IconComponent = item.icon ? scheduleIcons[item.icon] || Clock : Clock;
                  return (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <IconComponent className="h-5 w-5 text-primary" />
                        </div>
                        {index < eventInfo.schedule!.length - 1 && (
                          <div className="mt-1 h-full w-0.5 bg-border" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.time} Uhr</p>
                        {item.description && (
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Wishlist */}
          {eventInfo.wishlistUrl && (
            <Card className="p-4">
              <h3 className="flex items-center gap-2 font-semibold">
                <Gift className="h-5 w-5 text-primary" />
                Wunschliste
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Eure Anwesenheit ist das schönste Geschenk! Falls ihr uns dennoch eine Freude machen möchtet...
              </p>
              <Button variant="outline" className="mt-3 w-full bg-transparent" asChild>
                <a href={eventInfo.wishlistUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Wunschliste ansehen
                </a>
              </Button>
            </Card>
          )}

          {/* Contact */}
          {(eventInfo.contactPhone || eventInfo.contactEmail) && (
            <Card className="p-4">
              <h3 className="font-semibold">Kontakt</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Bei Fragen zum Event erreichst du uns hier:
              </p>
              <div className="mt-3 space-y-2">
                {eventInfo.contactPhone && (
                  <a
                    href={`tel:${eventInfo.contactPhone}`}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                  >
                    <Phone className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">{eventInfo.contactPhone}</span>
                    <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                  </a>
                )}
                {eventInfo.contactEmail && (
                  <a
                    href={`mailto:${eventInfo.contactEmail}`}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                  >
                    <Mail className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">{eventInfo.contactEmail}</span>
                    <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                  </a>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Operator Info Section */}
      {activeSection === "operator" && (
        <div className="space-y-4 animate-in fade-in-0 slide-in-from-right-4">
          {/* Impressum */}
          <Card className="p-4">
            <h3 className="flex items-center gap-2 font-semibold">
              <Building2 className="h-5 w-5 text-primary" />
              Impressum
            </h3>
            <div className="mt-3 space-y-2 text-sm">
              <p className="font-medium">{operatorInfo.companyName}</p>
              <p className="whitespace-pre-line text-muted-foreground">
                {operatorInfo.address}
              </p>
              {operatorInfo.uid && (
                <p className="text-muted-foreground">UID: {operatorInfo.uid}</p>
              )}
              {operatorInfo.registrationNumber && (
                <p className="text-muted-foreground">
                  FN: {operatorInfo.registrationNumber}
                </p>
              )}
              <div className="pt-2">
                <p className="text-muted-foreground">E-Mail: {operatorInfo.email}</p>
                {operatorInfo.phone && (
                  <p className="text-muted-foreground">Tel: {operatorInfo.phone}</p>
                )}
              </div>
            </div>
          </Card>

          {/* Legal Accordions */}
          <Card className="p-4">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="privacy" className="border-b-0">
                <AccordionTrigger className="hover:no-underline py-3">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Shield className="h-4 w-4 text-primary" />
                    Datenschutzerklärung
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <p>
                      <strong className="text-foreground">1. Verantwortlicher</strong><br />
                      {operatorInfo.companyName}, {operatorInfo.email}
                    </p>
                    <p>
                      <strong className="text-foreground">2. Erhobene Daten</strong><br />
                      Wir speichern hochgeladene Fotos, optionale Namen und technische Zugriffsdaten.
                    </p>
                    <p>
                      <strong className="text-foreground">3. Zweck der Verarbeitung</strong><br />
                      Die Daten werden zur Bereitstellung der Event-Galerie verwendet.
                    </p>
                    <p>
                      <strong className="text-foreground">4. Speicherdauer</strong><br />
                      Fotos werden nach Ablauf des Events gemäß den Einstellungen des Hosts gelöscht.
                    </p>
                    <p>
                      <strong className="text-foreground">5. Ihre Rechte</strong><br />
                      Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Widerspruch.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="terms" className="border-b-0">
                <AccordionTrigger className="hover:no-underline py-3">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="h-4 w-4 text-primary" />
                    Nutzungsbedingungen
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <p>
                      <strong className="text-foreground">1. Nutzung</strong><br />
                      Diese Plattform dient dem Teilen von Event-Fotos unter geladenen Gästen.
                    </p>
                    <p>
                      <strong className="text-foreground">2. Inhalte</strong><br />
                      Nutzer sind für hochgeladene Inhalte selbst verantwortlich. Unzulässige Inhalte werden entfernt.
                    </p>
                    <p>
                      <strong className="text-foreground">3. Urheberrecht</strong><br />
                      Mit dem Upload räumen Sie dem Host das Recht ein, die Fotos im Rahmen des Events zu nutzen.
                    </p>
                    <p>
                      <strong className="text-foreground">4. Haftung</strong><br />
                      Der Betreiber haftet nicht für Inhalte Dritter oder technische Ausfälle.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="cookies" className="border-b-0">
                <AccordionTrigger className="hover:no-underline py-3">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Cookie className="h-4 w-4 text-primary" />
                    Cookie-Richtlinie
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <p>
                      <strong className="text-foreground">Technische Cookies</strong><br />
                      Wir verwenden nur technisch notwendige Cookies für die Funktionalität der App.
                    </p>
                    <p>
                      <strong className="text-foreground">Lokaler Speicher</strong><br />
                      Ihr Name wird lokal gespeichert, um wiederholte Eingaben zu vermeiden.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>

          {/* Support Contact */}
          <Card className="p-4">
            <h3 className="flex items-center gap-2 font-semibold">
              <HelpCircle className="h-5 w-5 text-primary" />
              Support
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Bei technischen Problemen oder Fragen zur Plattform:
            </p>
            <a
              href={`mailto:${operatorInfo.email}`}
              className="mt-3 flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
            >
              <Mail className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">{operatorInfo.email}</span>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
            </a>
          </Card>
        </div>
      )}
    </div>
  );
}
