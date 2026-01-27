'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { HelpCircle, Menu, X } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const help = (() => {
    const map: Record<string, { title: string; body: string }> = {
      '/dashboard': {
        title: 'Dashboard',
        body: 'Schneller System-Überblick (Backend-Version, Uptime, Load, Memory, Disk). Nutze Refresh, um aktuelle Werte zu laden.',
      },
      '/system': {
        title: 'System',
        body: 'Health-Checks für app/dash/API und _next Assets. Wenn hier Fehler auftauchen: Deploy-Reihenfolge (stop → build → start) prüfen.',
      },
      '/ops': {
        title: 'Ops',
        body: 'Diagnostik für WordPress Integration. Der verify-password Check sollte 200 oder 400 liefern. Andere Status deuten oft auf Auth-Wall oder falsche URL/Secrets hin.',
      },
      '/woo': {
        title: 'Woo Inbox',
        body: 'Webhook Logs prüfen, CSV exportieren, Logs purgen, einzelne Logs (dry-run/apply) reprocessen. Nutze Export für Support/Debugging.',
      },
      '/cms': {
        title: 'CMS Sync',
        body: 'WordPress Seiten/Posts suchen, Snapshots ansehen, Preview öffnen und Sync & Save ausführen. Nutze Recent/Search, um Slugs schnell zu finden.',
      },
      '/api-keys': {
        title: 'API Keys',
        body: 'API Keys erstellen/anzeigen/widerrufen. Nutze Scopes und Expiry bewusst (least privilege).',
      },
      '/email-templates': {
        title: 'E-Mail Templates',
        body: 'Templates ansehen und aktualisieren. Änderungen wirken sich direkt auf ausgehende E-Mails aus – vorsichtig testen.',
      },
      '/maintenance': {
        title: 'Maintenance',
        body: 'Maintenance Mode umschalten + Hinweistext setzen. Aktiviert blockt App-Flows für User.',
      },
      '/marketing': {
        title: 'Marketing',
        body: 'Traffic/Woo Stats ansehen. Nutze Filter + Reload, um aktuelle Zahlen zu prüfen.',
      },
      '/invoices': {
        title: 'Invoices',
        body: 'Rechnungen filtern, ansehen und CSV exportieren. Export ist für Buchhaltung/Support gedacht.',
      },
      '/packages': {
        title: 'Packages',
        body: 'Package Definitions verwalten (aktiv/inaktiv, Preise/Features). Änderungen beeinflussen Shop/Checkout.',
      },
      '/impersonation': {
        title: 'Impersonation',
        body: 'Temporäre Tokens ausstellen, um als User zu testen/debuggen. Nutze einen klaren Grund und kurze TTL.',
      },
      '/users': {
        title: 'Benutzer',
        body: 'User finden/prüfen. Für tieferes Debugging ggf. Impersonation nutzen.',
      },
      '/events': {
        title: 'Events',
        body: 'Events durchsuchen und Details öffnen. Co-Hosts/Invites sind im Event-Detail.',
      },
      '/logs': {
        title: 'Logs',
        body: 'QA/Admin Logs ansehen. Bei Fehlern Zeitfenster/Filter anpassen und ggf. Export nutzen.',
      },
      '/settings': {
        title: 'Einstellungen',
        body: 'Globale App Settings (Theme Tokens, Texte, Consent). Änderungen wirken sofort – vorsichtig speichern.',
      },
    };
    return map[pathname] || { title: 'Hilfe', body: `Keine Hilfe hinterlegt für: ${pathname}` };
  })();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-app-bg text-app-fg">
      <aside className="hidden lg:block lg:w-64 lg:shrink-0">
        <Sidebar className="h-screen" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-app-border/50 bg-app-bg/95 px-4 backdrop-blur-md">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMobileOpen(true)}
              className="h-10 w-10 p-0 lg:hidden rounded-xl hover:bg-app-accent/10"
              aria-label="Menü öffnen"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-app-fg">{help.title}</div>
              <div className="truncate text-xs text-app-muted font-mono">{pathname}</div>
            </div>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl hover:bg-app-accent/10" aria-label="Hilfe">
                <HelpCircle className="h-5 w-5 text-app-muted" />
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>{help.title}</DialogTitle>
                <DialogDescription className="text-app-muted">{help.body}</DialogDescription>
              </DialogHeader>
              <div className="text-xs text-app-muted font-mono bg-app-bg/50 p-2 rounded-lg">Route: {pathname}</div>
            </DialogContent>
          </Dialog>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto bg-app-bg p-4 sm:p-6">{children}</main>
      </div>

      <div className={cn('lg:hidden', mobileOpen ? '' : 'pointer-events-none')}>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0">
            <div className="flex h-14 items-center justify-between border-b border-app-border/40 px-3">
              <div className="text-sm font-semibold">Admin Dashboard</div>
              <SheetClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileOpen(false)}
                  className="h-10 w-10 p-0 text-inherit hover:bg-app-card/10"
                  aria-label="Menü schließen"
                >
                  <X className="h-5 w-5" />
                </Button>
              </SheetClose>
            </div>

            <Sidebar className="h-[calc(100vh-3.5rem)]" onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
