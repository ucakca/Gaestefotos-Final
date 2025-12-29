import { Card } from '@/components/ui/Card';

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-app-fg">Einstellungen</h1>
        <p className="mt-1 text-sm text-app-muted">Systemweite Konfiguration</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="text-xs text-app-muted">Theme</div>
          <div className="mt-1 text-base font-medium text-app-fg">In Vorbereitung</div>
          <div className="mt-2 text-sm text-app-muted">
            Hier kommt das Theme-System (Design Tokens in DB + Live Preview).
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-xs text-app-muted">Sicherheit</div>
          <div className="mt-2 text-sm text-app-muted">
            Geplant: Rate-Limits Defaults, Allow-Downloads Defaults, Audit.
          </div>
        </Card>
      </div>
    </div>
  );
}
