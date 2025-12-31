import ProtectedRoute from '@/components/ProtectedRoute';

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
