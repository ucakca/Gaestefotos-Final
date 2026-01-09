import ProtectedRoute from '@/components/ProtectedRoute';
import AdminShell from '@/components/AdminShell';

export default function CmsLayout({
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
