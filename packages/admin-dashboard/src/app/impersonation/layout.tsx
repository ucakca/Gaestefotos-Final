import ProtectedRoute from '@/components/ProtectedRoute';
import AdminShell from '@/components/AdminShell';

export default function ImpersonationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <AdminShell>{children}</AdminShell>
    </ProtectedRoute>
  );
}
