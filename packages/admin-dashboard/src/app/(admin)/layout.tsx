import AdminShellV2 from '@/components/AdminShellV2';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShellV2>{children}</AdminShellV2>;
}
