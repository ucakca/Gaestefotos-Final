'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  HelpCircle,
  Server,
  Users,
  Calendar,
  Activity,
  UserCog,
  KeyRound,
  Mail,
  FileText,
  ShoppingCart,
  RefreshCw,
  Settings,
  Wrench,
  Megaphone,
  Receipt,
  Package,
  LogOut,
  Flag,
  TrendingUp,
  Image as ImageIcon,
  Shield,
  Palette,
  QrCode,
} from 'lucide-react';
import { useAdminAuthStore } from '@/store/authStore';
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

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'System', href: '/system', icon: Server },
  { name: 'Rate Limits', href: '/system/rate-limits', icon: Shield },
  { name: 'Ops', href: '/ops', icon: Activity },
  { name: 'Analytics', href: '/analytics', icon: TrendingUp },
  { name: 'Photos', href: '/photos', icon: ImageIcon },
  { name: 'Impersonation', href: '/impersonation', icon: UserCog },
  { name: 'Packages', href: '/packages', icon: Package },
  { name: 'QR-Templates', href: '/manage/qr-templates', icon: QrCode },
  { name: 'Feature Flags', href: '/feature-flags', icon: Flag },
  { name: 'API Keys', href: '/api-keys', icon: KeyRound },
  { name: 'E-Mail Templates', href: '/manage/email-templates', icon: Mail },
  { name: 'Invitation Templates', href: '/invitation-templates', icon: FileText },
  { name: 'Maintenance', href: '/maintenance', icon: Wrench },
  { name: 'Marketing', href: '/marketing', icon: Megaphone },
  { name: 'Invoices', href: '/invoices', icon: Receipt },
  { name: 'Benutzer', href: '/users', icon: Users },
  { name: 'Events', href: '/events', icon: Calendar },
  { name: 'Woo Inbox', href: '/woo', icon: ShoppingCart },
  { name: 'CMS Sync', href: '/cms', icon: RefreshCw },
  { name: 'Logs', href: '/logs', icon: FileText },
  { name: 'Einstellungen', href: '/settings', icon: Settings },
  { name: 'Theme', href: '/settings/theme', icon: Palette },
];

const helpByHref: Record<string, { title: string; body: string }> = {
  '/dashboard': {
    title: 'Dashboard',
    body: 'Schneller System-Überblick (Backend-Version, Uptime, Load, Memory, Disk). Nutze Refresh, um aktuelle Werte zu laden.',
  },
  '/system': {
    title: 'System',
    body: 'Health-Checks für app/dash/API und _next Assets. Wenn hier Fehler auftauchen: Deploy-Reihenfolge (stop → build → start) prüfen.',
  },
  '/system/rate-limits': {
    title: 'Rate Limits',
    body: 'Übersicht aller aktiven Rate Limits für API, Auth, Uploads. Zeigt Fenster-Dauer und Max-Requests pro Kategorie.',
  },
  '/ops': {
    title: 'Ops',
    body: 'Diagnostik für WordPress Integration. Der verify-password Check sollte 200 oder 400 liefern. Andere Status deuten oft auf Auth-Wall oder falsche URL/Secrets hin.',
  },
  '/impersonation': {
    title: 'Impersonation',
    body: 'Temporäre Tokens ausstellen, um als User zu testen/debuggen. Nutze einen klaren Grund und kurze TTL.',
  },
  '/packages': {
    title: 'Packages',
    body: 'Package Definitions verwalten (aktiv/inaktiv, Preise/Features). Änderungen beeinflussen Shop/Checkout.',
  },
  '/feature-flags': {
    title: 'Feature Flags',
    body: 'Feature Flags für Package Tiers verwalten (Video Upload, Stories, Password Protect, Guestbook, Zip Download, Bulk Operations, Live Wall, Face Search, Guestlist, Full Invitation, Co-Hosts, Ad Free). Click-to-Toggle aktiviert Auto-Save.',
  },
  '/api-keys': {
    title: 'API Keys',
    body: 'API Keys erstellen/anzeigen/widerrufen. Nutze Scopes und Expiry bewusst (least privilege).',
  },
  '/email-templates': {
    title: 'E-Mail Templates',
    body: 'Templates ansehen und aktualisieren. Änderungen wirken sich direkt auf ausgehende E-Mails aus – vorsichtig testen.',
  },
  '/invitation-templates': {
    title: 'Invitation Templates',
    body: 'Einladungsvorlagen (HTML/Text) verwalten. Änderungen können Einladungsseiten/E-Mails beeinflussen – vorsichtig testen.',
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
  '/users': {
    title: 'Benutzer',
    body: 'User finden/prüfen. Für tieferes Debugging ggf. Impersonation nutzen.',
  },
  '/events': {
    title: 'Events',
    body: 'Events durchsuchen und Details öffnen. Co-Hosts/Invites sind im Event-Detail.',
  },
  '/woo': {
    title: 'Woo Inbox',
    body: 'Webhook Logs prüfen, CSV exportieren, Logs purgen, einzelne Logs (dry-run/apply) reprocessen. Nutze Export für Support/Debugging.',
  },
  '/cms': {
    title: 'CMS Sync',
    body: 'WordPress Seiten/Posts suchen, Snapshots ansehen, Preview öffnen und Sync & Save ausführen. Nutze Recent/Search, um Slugs schnell zu finden.',
  },
  '/logs': {
    title: 'Logs',
    body: 'QA/Admin Logs ansehen. Bei Fehlern Zeitfenster/Filter anpassen und ggf. Export nutzen.',
  },
  '/settings': {
    title: 'Einstellungen',
    body: 'Globale App Settings (Theme Tokens, Texte, Consent). Änderungen wirken sofort – vorsichtig speichern.',
  },
  '/settings/theme': {
    title: 'Theme',
    body: 'CSS-Variablen für App-Farben anpassen. Änderungen wirken auf Host-Dashboard und Gäste-Seiten.',
  },
  '/manage/qr-templates': {
    title: 'QR-Templates',
    body: 'SVG-Vorlagen für QR-Code-Designer verwalten. Templates können für verschiedene Formate (A6, A5, Story, Square) erstellt werden.',
  },
};

export default function Sidebar({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, admin } = useAdminAuthStore();

  const buildSha = process.env.NEXT_PUBLIC_GIT_SHA;
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const handleLogout = () => {
    logout();
    onNavigate?.();
    router.push('/login');
  };

  const handleReload = () => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('v', String(Date.now()));
    window.location.href = url.toString();
  };

  return (
    <div className={cn('flex min-h-0 w-64 flex-col bg-app-card text-app-fg', className)}>
      <div className="flex h-16 items-center justify-center border-b border-app-border/50 bg-gradient-to-r from-app-accent/5 to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-app-accent/10 flex items-center justify-center">
            <LayoutDashboard className="w-4 h-4 text-app-accent" />
          </div>
          <h1 className="text-lg font-bold">Admin</h1>
        </div>
      </div>
      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const help = helpByHref[item.href] || { title: item.name, body: `Keine Hilfe hinterlegt für: ${item.href}` };
          return (
            <div key={item.name} className="flex items-center gap-1">
              <Button
                asChild
                variant="ghost"
                className={cn(
                  'w-full justify-start px-3 py-2.5 text-sm font-medium transition-all rounded-xl',
                  isActive
                    ? 'bg-app-accent text-app-bg hover:opacity-90 shadow-sm'
                    : 'text-app-muted hover:bg-app-accent/10 hover:text-app-fg'
                )}
              >
                <Link href={item.href} onClick={() => onNavigate?.()} className="flex items-center gap-3">
                  <item.icon className={cn('h-4 w-4', isActive ? '' : 'opacity-70')} />
                  <span>{item.name}</span>
                </Link>
              </Button>

              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-9 w-9 p-0',
                      isActive ? 'text-app-bg hover:bg-app-accent/20' : 'text-app-muted hover:bg-app-bg hover:text-app-fg'
                    )}
                    aria-label={`Hilfe: ${item.name}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{help.title}</DialogTitle>
                    <DialogDescription>{help.body}</DialogDescription>
                  </DialogHeader>
                  <div className="text-xs text-app-muted">Route: {item.href}</div>
                </DialogContent>
              </Dialog>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-app-border/50 p-3 space-y-3">
        {admin && (
          <div className="rounded-xl bg-app-bg/50 p-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-app-accent/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-app-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-app-fg truncate">{admin.name}</p>
                <p className="text-xs text-app-muted truncate">{admin.email}</p>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl bg-app-bg/50 p-3 text-[11px] space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-app-muted">Build</span>
            <span className="truncate text-app-fg font-mono">{buildSha ? buildSha.slice(0, 8) : '—'}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-app-muted">Zeit</span>
            <span className="truncate text-app-fg">
              {buildTime ? new Date(buildTime).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
            </span>
          </div>
          <Button onClick={handleReload} variant="outline" size="sm" className="mt-2 h-8 w-full rounded-lg text-xs">
            <RefreshCw className="w-3 h-3 mr-1.5" />
            Neu laden (Cache)
          </Button>
        </div>

        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start px-3 py-2.5 text-sm font-medium text-app-muted hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all"
        >
          <LogOut className="h-4 w-4 mr-2" />
          <span>Abmelden</span>
        </Button>
      </div>
    </div>
  );
}

