import { Card } from '@/components/ui/Card';

export default function LogsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-app-fg">Logs</h1>
        <p className="mt-1 text-sm text-app-muted">System- und Audit-Logs</p>
      </div>

      <Card className="p-5">
        <div className="text-sm text-app-muted">Noch nicht implementiert</div>
        <div className="mt-2 text-sm text-app-muted">
          Nächster Schritt: Log-Stream/Filter (level, service, eventId) und Export.
        </div>
      </Card>
    </div>
  );
}
