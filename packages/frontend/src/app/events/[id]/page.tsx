import { redirect } from 'next/navigation';

export default async function EventDetailRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/events/${id}/dashboard`);
}
