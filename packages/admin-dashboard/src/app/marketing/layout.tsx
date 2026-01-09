import ProtectedRoute from '@/components/ProtectedRoute';
import AdminShell from '@/components/AdminShell';

export default function MarketingLayout({
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
