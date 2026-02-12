'use client';

import { useParams } from 'next/navigation';
import MosaicWizard from '@/components/mosaic/wizard/MosaicWizard';

export default function MosaicManagementPage() {
  const params = useParams();
  const eventId = params.id as string;
  return <MosaicWizard eventId={eventId} />;
}
