import { Card } from '@/components/ui/Card';

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-app-fg">Dashboard</h1>
        <p className="mt-1 text-sm text-app-muted">Überblick über System und Aktivität</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="text-sm font-medium text-app-muted">Events</div>
          <div className="mt-2 text-2xl font-semibold text-app-fg">-</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm font-medium text-app-muted">Fotos</div>
          <div className="mt-2 text-2xl font-semibold text-app-fg">-</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm font-medium text-app-muted">Benutzer</div>
          <div className="mt-2 text-2xl font-semibold text-app-fg">-</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm font-medium text-app-muted">System Status</div>
          <div className="mt-2 text-2xl font-semibold text-app-fg">Online</div>
          <div className="mt-1 text-xs text-app-muted">Letzte Prüfung: -</div>
        </Card>
      </div>
    </div>
  );
}

