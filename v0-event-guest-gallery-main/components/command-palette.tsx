"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Camera,
  Video,
  FolderOpen,
  Trophy,
  BookOpen,
  Users,
  Mail,
  Palette,
  QrCode,
  Monitor,
  BarChart3,
  Copy,
  Settings,
  BarChart2,
  Shield,
  Brain,
  Clock,
  Lock,
  Download,
  FileText,
  Cloud,
  Search,
  Zap,
  Bell,
  ExternalLink,
} from "lucide-react";

const commandItems = [
  // Übersicht
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "", group: "Übersicht", keywords: ["home", "start"] },
  { id: "live-wall", label: "Live-Wall", icon: Monitor, href: "/live-wall", group: "Übersicht", keywords: ["slideshow", "präsentation"] },
  { id: "timeline", label: "Timeline", icon: Clock, href: "/timeline", group: "Übersicht", keywords: ["chronologie", "verlauf"] },
  
  // Inhalte
  { id: "photos", label: "Fotos", icon: Camera, href: "/photos", group: "Inhalte", keywords: ["bilder", "gallery"] },
  { id: "videos", label: "Videos", icon: Video, href: "/videos", group: "Inhalte", keywords: ["filme", "clips"] },
  { id: "categories", label: "Alben", icon: FolderOpen, href: "/categories", group: "Inhalte", keywords: ["kategorien", "ordner"] },
  { id: "challenges", label: "Challenges", icon: Trophy, href: "/challenges", group: "Inhalte", keywords: ["aufgaben", "wettbewerb"] },
  { id: "guestbook", label: "Gästebuch", icon: BookOpen, href: "/guestbook", group: "Inhalte", keywords: ["kommentare", "nachrichten"] },
  
  // Verwaltung
  { id: "guests", label: "Gästeliste", icon: Users, href: "/guests", group: "Verwaltung", keywords: ["personen", "teilnehmer"] },
  { id: "invitation", label: "Einladungen", icon: Mail, href: "/invitation", group: "Verwaltung", keywords: ["email", "versenden"] },
  { id: "permissions", label: "Berechtigungen", icon: Lock, href: "/permissions", group: "Verwaltung", keywords: ["rollen", "rechte"] },
  { id: "notifications", label: "Benachrichtigungen", icon: Bell, href: "/notifications", group: "Verwaltung", keywords: ["alerts", "meldungen"] },
  
  // Analytics & Tools
  { id: "statistics", label: "Statistiken", icon: BarChart3, href: "/statistics", group: "Analytics", keywords: ["stats", "zahlen"] },
  { id: "analytics", label: "Analytics", icon: BarChart2, href: "/analytics", group: "Analytics", keywords: ["analyse", "metriken"] },
  { id: "search", label: "Suche", icon: Search, href: "/search", group: "Tools", keywords: ["finden", "durchsuchen"] },
  { id: "duplicates", label: "Duplikate", icon: Copy, href: "/duplicates", group: "Tools", keywords: ["doppelte", "ähnliche"] },
  { id: "moderation", label: "Moderation", icon: Shield, href: "/moderation", group: "Tools", keywords: ["überprüfen", "freigabe"] },
  { id: "ai-tagging", label: "KI-Tagging", icon: Brain, href: "/ai-tagging", group: "Tools", keywords: ["künstliche intelligenz", "auto-tag"] },
  
  // Design & Export
  { id: "design", label: "Design", icon: Palette, href: "/design", group: "Design", keywords: ["aussehen", "farben"] },
  { id: "branding", label: "Branding", icon: Zap, href: "/branding", group: "Design", keywords: ["marke", "logo"] },
  { id: "qr-styler", label: "QR-Codes", icon: QrCode, href: "/qr-styler", group: "Design", keywords: ["qr", "code"] },
  { id: "photo-booth", label: "Photo Booth", icon: Camera, href: "/photo-booth", group: "Design", keywords: ["fotobox", "filter"] },
  { id: "export", label: "Export", icon: Download, href: "/export", group: "Export", keywords: ["download", "herunterladen"] },
  
  // Einstellungen
  { id: "settings", label: "Einstellungen", icon: Settings, href: "/settings", group: "Einstellungen", keywords: ["optionen", "konfiguration"] },
  { id: "integrations", label: "Integrationen", icon: Cloud, href: "/integrations", group: "Einstellungen", keywords: ["verbindungen", "apps"] },
  { id: "backup", label: "Backup", icon: Cloud, href: "/backup", group: "Einstellungen", keywords: ["sicherung", "wiederherstellen"] },
  { id: "templates", label: "Vorlagen", icon: FileText, href: "/templates", group: "Einstellungen", keywords: ["templates", "muster"] },
  { id: "clone", label: "Event klonen", icon: Copy, href: "/clone", group: "Einstellungen", keywords: ["kopieren", "duplizieren"] },
  
  // Quick Actions
  { id: "view-event", label: "Event ansehen", icon: ExternalLink, href: "/view", group: "Aktionen", keywords: ["öffnen", "vorschau"], action: "view-event" },
];

interface CommandPaletteProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function CommandPalette({ open, setOpen }: CommandPaletteProps) {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, setOpen]);

  const handleSelect = (item: typeof commandItems[0]) => {
    setOpen(false);
    
    if (item.action === "view-event") {
      window.open(`/e3/${eventId}`, "_blank");
      return;
    }
    
    router.push(`/events3/${eventId}${item.href}`);
  };

  const groupedItems = useMemo(() => {
    const groups: Record<string, typeof commandItems> = {};
    commandItems.forEach((item) => {
      if (!groups[item.group]) {
        groups[item.group] = [];
      }
      groups[item.group].push(item);
    });
    return groups;
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Suche nach Seiten und Aktionen..." />
      <CommandList>
        <CommandEmpty>Keine Ergebnisse gefunden.</CommandEmpty>
        {Object.entries(groupedItems).map(([group, items]) => (
          <div key={group}>
            <CommandGroup heading={group}>
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.id}
                    value={`${item.label} ${item.keywords?.join(" ")}`}
                    onSelect={() => handleSelect(item)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{item.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
