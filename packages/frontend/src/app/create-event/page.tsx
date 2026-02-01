import { Suspense } from 'react';
import SetupWizard from '@/components/setup-wizard/SetupWizard';
import { FullPageLoader } from '@/components/ui/FullPageLoader';

export const dynamic = 'force-dynamic';

export default function CreateEventPage() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <SetupWizard />
    </Suspense>
  );
}
