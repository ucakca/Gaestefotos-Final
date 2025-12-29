import { Card } from '@/components/ui/Card';

export default function SystemPage() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-app-fg">System</h1>
        <p className="mt-1 text-sm text-app-muted">Systemstatus und Health-Checks</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="text-xs text-app-muted">Status</div>
          <div className="mt-1 text-base font-medium text-app-fg">Noch nicht angebunden</div>
          <div className="mt-2 text-sm text-app-muted">
            Diese Seite wird als Nächstes mit API-Daten (Health, Worker, Queue, Storage) verbunden.
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-xs text-app-muted">Aktionen</div>
          <div className="mt-2 text-sm text-app-muted">
            Geplante Tools: Testmail, Cache-Flush, Hintergrundjobs triggern (nur Admin).
          </div>
        </Card>
      </div>
    </div>
  );
}
