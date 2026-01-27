"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useParams, useRouter } from "next/navigation";
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
  Menu,
  X,
  ChevronDown,
  ExternalLink,
  Bell,
  HelpCircle,
  ArrowLeft,
  Plus,
  LogOut,
  User,
  CreditCard,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const sidebarGroups = [
  {
    title: "Übersicht",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "" },
      { id: "live-wall", label: "Live-Wall", icon: Monitor, href: "/live-wall" },
      { id: "timeline", label: "Timeline", icon: Clock, href: "/timeline" },
    ],
  },
  {
    title: "Inhalte",
    items: [
      { id: "photos", label: "Fotos", icon: Camera, href: "/photos" },
      { id: "videos", label: "Videos", icon: Video, href: "/videos" },
      { id: "categories", label: "Alben", icon: FolderOpen, href: "/categories" },
      { id: "challenges", label: "Challenges", icon: Trophy, href: "/challenges" },
      { id: "guestbook", label: "Gästebuch", icon: BookOpen, href: "/guestbook" },
    ],
  },
  {
    title: "Verwaltung",
    items: [
      { id: "guests", label: "Gästeliste", icon: Users, href: "/guests" },
      { id: "invitation", label: "Einladungen", icon: Mail, href: "/invitation" },
      { id: "permissions", label: "Berechtigungen", icon: Lock, href: "/permissions" },
      { id: "notifications", label: "Benachrichtigungen", icon: Bell, href: "/notifications" },
    ],
  },
  {
    title: "Analytics & Tools",
    items: [
      { id: "statistics", label: "Statistiken", icon: BarChart3, href: "/statistics" },
      { id: "analytics", label: "Analytics", icon: BarChart2, href: "/analytics" },
      { id: "search", label: "Suche", icon: Search, href: "/search" },
      { id: "duplicates", label: "Duplikate", icon: Copy, href: "/duplicates" },
      { id: "moderation", label: "Moderation", icon: Shield, href: "/moderation" },
      { id: "ai-tagging", label: "KI-Tagging", icon: Brain, href: "/ai-tagging" },
    ],
  },
  {
    title: "Design & Export",
    items: [
      { id: "design", label: "Design", icon: Palette, href: "/design" },
      { id: "branding", label: "Branding", icon: Zap, href: "/branding" },
      { id: "qr-styler", label: "QR-Codes", icon: QrCode, href: "/qr-styler" },
      { id: "photo-booth", label: "Photo Booth", icon: Camera, href: "/photo-booth" },
      { id: "export", label: "Export", icon: Download, href: "/export" },
    ],
  },
  {
    title: "Einstellungen",
    items: [
      { id: "settings", label: "Einstellungen", icon: Settings, href: "/settings" },
      { id: "integrations", label: "Integrationen", icon: Cloud, href: "/integrations" },
      { id: "backup", label: "Backup", icon: Cloud, href: "/backup" },
      { id: "templates", label: "Vorlagen", icon: FileText, href: "/templates" },
      { id: "clone", label: "Event klonen", icon: Copy, href: "/clone" },
    ],
  },
];

const mobileNavItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "" },
  { id: "photos", label: "Fotos", icon: Camera, href: "/photos" },
  { id: "guests", label: "Gäste", icon: Users, href: "/guests" },
  { id: "settings", label: "Mehr", icon: Menu, href: "/settings" },
];

// Demo events data
const demoEvents = [
  {
    id: "demo-event",
    title: "Hochzeit Max & Anna",
    date: "15.02.2026",
    coverImage: "https://images.unsplash.com/photo-1519741497674-611481863552?w=100&q=80",
  },
  {
    id: "birthday-party",
    title: "Lenas 30. Geburtstag",
    date: "22.03.2026",
    coverImage: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=100&q=80",
  },
];

// Demo user data
const demoUser = {
  name: "Max Mustermann",
  email: "max@example.com",
  avatar: null,
  initials: "MM",
};

// Pages that should not allow back navigation (e.g., after wizard completion)
const noBackPages = ["/events3/new/success", "/events3/new/complete"];

import { CommandPalette } from "@/components/command-palette";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  const currentEvent = demoEvents.find((e) => e.id === eventId) || demoEvents[0];
  const basePath = `/events3/${eventId}`;

  // Check if we can safely go back
  useEffect(() => {
    // Check if there's history and we're not on a no-back page
    const hasHistory = typeof window !== "undefined" && window.history.length > 1;
    const isNoBackPage = noBackPages.some((page) => pathname.includes(page));
    
    // Also check referrer to avoid going back to wizard
    const referrer = typeof document !== "undefined" ? document.referrer : "";
    const fromWizard = referrer.includes("/new") || referrer.includes("/wizard") || referrer.includes("/create");
    
    setCanGoBack(hasHistory && !isNoBackPage && !fromWizard);
  }, [pathname]);

  const handleBack = () => {
    // Check if we should go back or go to a safe default
    const referrer = typeof document !== "undefined" ? document.referrer : "";
    const isFromWizard = referrer.includes("/new") || referrer.includes("/wizard") || referrer.includes("/create");
    
    if (isFromWizard || !canGoBack) {
      // Go to dashboard as safe default
      router.push(basePath);
    } else {
      router.back();
    }
  };

  const isActivePath = (href: string) => {
    const fullPath = `${basePath}${href}`;
    if (href === "") {
      return pathname === basePath || pathname === `${basePath}/`;
    }
    return pathname.startsWith(fullPath);
  };

  const isDashboardHome = pathname === basePath || pathname === `${basePath}/`;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full max-w-[100vw]">
      {/* Command Palette */}
      <CommandPalette open={commandOpen} setOpen={setCommandOpen} />
      
      {/* Top Bar */}
      <header className="sticky top-0 z-50 h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-full items-center justify-between px-4">
          {/* Left: Back Button & Menu */}
          <div className="flex items-center gap-2">
            {/* Smart Back Button - only show when not on dashboard home */}
            {!isDashboardHome && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground bg-transparent"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Zurück</span>
                </Button>
                <div className="h-6 w-px bg-border" />
              </>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden bg-transparent"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <Link href="/events3" className="flex items-center gap-2 font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
                G
              </div>
              <span className="hidden sm:inline">Gästefotos</span>
            </Link>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCommandOpen(true)}
              className="hidden md:flex gap-2 bg-transparent text-muted-foreground"
            >
              <Search className="h-4 w-4" />
              <span className="text-xs">Suche...</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCommandOpen(true)}
              className="md:hidden bg-transparent"
            >
              <Search className="h-4 w-4" />
              <span className="sr-only">Suche</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:flex bg-transparent"
              asChild
            >
              <Link href={`/e3/${eventId}`} target="_blank">
                <ExternalLink className="h-4 w-4" />
                <span className="sr-only">Event ansehen</span>
              </Link>
            </Button>
            <Button variant="ghost" size="icon" className="bg-transparent">
              <Bell className="h-4 w-4" />
              <span className="sr-only">Benachrichtigungen</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex w-full max-w-full overflow-hidden">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex w-56 flex-col border-r bg-card h-[calc(100vh-3.5rem)] sticky top-14">
          {/* Event Selector in Sidebar */}
          <div className="p-3 border-b">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2 bg-transparent">
                  <div className="relative h-6 w-6 overflow-hidden rounded flex-shrink-0">
                    <Image
                      src={currentEvent.coverImage || "/placeholder.svg"}
                      alt={currentEvent.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <span className="truncate text-sm flex-1 text-left">{currentEvent.title}</span>
                  <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Deine Events</DropdownMenuLabel>
                {demoEvents.map((event) => (
                  <DropdownMenuItem key={event.id} asChild>
                    <Link href={`/events3/${event.id}`} className="flex items-center gap-2">
                      <div className="relative h-8 w-8 overflow-hidden rounded flex-shrink-0">
                        <Image
                          src={event.coverImage || "/placeholder.svg"}
                          alt={event.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground">{event.date}</p>
                      </div>
                      {event.id === eventId && (
                        <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/events3/new" className="flex items-center gap-2 text-primary">
                    <Plus className="h-4 w-4" />
                    <span>Neues Event erstellen</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto p-3">
            <Accordion type="multiple" defaultValue={["Übersicht", "Inhalte"]} className="space-y-1">
              {sidebarGroups.map((group) => (
                <AccordionItem key={group.title} value={group.title} className="border-none">
                  <AccordionTrigger className="py-2 px-2 hover:no-underline hover:bg-accent/50 rounded-lg">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {group.title}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-2">
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = isActivePath(item.href);
                        return (
                          <Link
                            key={item.id}
                            href={`${basePath}${item.href}`}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </nav>

          {/* Profile Section in Sidebar */}
          <div className="border-t p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-2 bg-transparent">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary flex-shrink-0">
                    {demoUser.initials}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate">{demoUser.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{demoUser.email}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{demoUser.name}</p>
                    <p className="text-xs text-muted-foreground">{demoUser.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profil</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <CreditCard className="mr-2 h-4 w-4" />
                  <span>Abonnement</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Einstellungen</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <span>Hilfe & Support</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Abmelden</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* Sidebar - Mobile Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="absolute left-0 top-0 h-full w-72 bg-card border-r shadow-xl flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <span className="font-semibold">Navigation</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(false)}
                  className="bg-transparent"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Event Selector - Mobile */}
              <div className="p-3 border-b">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-start gap-2 bg-transparent">
                      <div className="relative h-6 w-6 overflow-hidden rounded flex-shrink-0">
                        <Image
                          src={currentEvent.coverImage || "/placeholder.svg"}
                          alt={currentEvent.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <span className="truncate text-sm flex-1 text-left">{currentEvent.title}</span>
                      <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-60">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Deine Events</DropdownMenuLabel>
                    {demoEvents.map((event) => (
                      <DropdownMenuItem key={event.id} asChild>
                        <Link 
                          href={`/events3/${event.id}`} 
                          className="flex items-center gap-2"
                          onClick={() => setSidebarOpen(false)}
                        >
                          <div className="relative h-8 w-8 overflow-hidden rounded flex-shrink-0">
                            <Image
                              src={event.coverImage || "/placeholder.svg"}
                              alt={event.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{event.title}</p>
                            <p className="text-xs text-muted-foreground">{event.date}</p>
                          </div>
                          {event.id === eventId && (
                            <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link 
                        href="/events3/new" 
                        className="flex items-center gap-2 text-primary"
                        onClick={() => setSidebarOpen(false)}
                      >
                        <Plus className="h-4 w-4" />
                        <span>Neues Event erstellen</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Navigation - Mobile */}
              <nav className="flex-1 overflow-y-auto p-3">
                <Accordion type="multiple" defaultValue={["Übersicht", "Inhalte"]} className="space-y-1">
                  {sidebarGroups.map((group) => (
                    <AccordionItem key={group.title} value={group.title} className="border-none">
                      <AccordionTrigger className="py-2 px-2 hover:no-underline hover:bg-accent/50 rounded-lg">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {group.title}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="pb-2">
                        <div className="space-y-1">
                          {group.items.map((item) => {
                            const Icon = item.icon;
                            const isActive = isActivePath(item.href);
                            return (
                              <Link
                                key={item.id}
                                href={`${basePath}${item.href}`}
                                onClick={() => setSidebarOpen(false)}
                                className={cn(
                                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                  isActive
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                )}
                              >
                                <Icon className="h-4 w-4" />
                                {item.label}
                              </Link>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </nav>

              {/* Profile Section - Mobile */}
              <div className="border-t p-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-2 bg-transparent">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary flex-shrink-0">
                        {demoUser.initials}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium truncate">{demoUser.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{demoUser.email}</p>
                      </div>
                      <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{demoUser.name}</p>
                        <p className="text-xs text-muted-foreground">{demoUser.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSidebarOpen(false)}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profil</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSidebarOpen(false)}>
                      <CreditCard className="mr-2 h-4 w-4" />
                      <span>Abonnement</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSidebarOpen(false)}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Einstellungen</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSidebarOpen(false)}>
                      <HelpCircle className="mr-2 h-4 w-4" />
                      <span>Hilfe & Support</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => setSidebarOpen(false)}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Abmelden</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0 min-h-[calc(100vh-3.5rem)] pb-20 lg:pb-0 overflow-x-hidden">
          <div className="w-full overflow-x-hidden">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background lg:hidden safe-area-bottom">
        <div className="flex items-center justify-around py-2">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActivePath(item.href);
            return (
              <Link
                key={item.id}
                href={`${basePath}${item.href}`}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
