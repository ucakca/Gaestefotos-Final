import { Card } from '@/components/ui/Card';

export default function UsersPage() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-app-fg">Benutzer</h1>
        <p className="mt-1 text-sm text-app-muted">Admin-Benutzer und Rollen</p>
      </div>

      <Card className="p-5">
        <div className="text-sm text-app-muted">Noch nicht implementiert</div>
        <div className="mt-2 text-sm text-app-muted">
          Nächster Schritt: User-Liste (Table auf Desktop, Cards auf Mobile) inkl. Suche, Rollen und Audit.
        </div>
      </Card>
    </div>
  );
}
