import ProtectedRoute from '@/components/ProtectedRoute';
import AdminShell from '@/components/AdminShell';

export default function InvitationTemplatesLayout({
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
