'use client';

import Link from 'next/link';
import {
  Layout,
  Workflow,
  Printer,
  QrCode,
  Shield,
  UserPlus,
} from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';

interface AdminLink {
  href: string;
  label: string;
  description: string;
  icon: any;
  color: string;
}

const sections: { title: string; items: AdminLink[] }[] = [
  {
    title: 'Event-Verwaltung',
    items: [
      { href: '/dashboard/create-event', label: 'Event für Benutzer erstellen', description: 'Event im Namen eines Hosts anlegen — Host sieht es im Dashboard', icon: UserPlus, color: 'text-blue-500' },
    ],
  },
  {
    title: 'Booth & Templates',
    items: [
      { href: '/dashboard/templates', label: 'Booth Templates', description: 'Design-Vorlagen für Photo Booth, KI Booth, Mosaic', icon: Layout, color: 'text-purple-500' },
      { href: '/dashboard/workflows', label: 'Workflow Builder', description: 'Booth-Abläufe definieren und verwalten', icon: Workflow, color: 'text-blue-500' },
      { href: '/dashboard/qr-templates', label: 'QR-Templates', description: 'QR-Code-Designs verwalten', icon: QrCode, color: 'text-teal-500' },
      { href: '/dashboard/print-service', label: 'Print-Service', description: 'Druck-Aufträge und Terminal-Verwaltung', icon: Printer, color: 'text-orange-500' },
    ],
  },
];

export default function AdminHubPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5 text-destructive" /> Admin-Bereich
            </h1>
            <p className="text-sm text-muted-foreground mt-1">System-Verwaltung — nur für Administratoren</p>
          </div>

          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{section.title}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-foreground">{item.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
