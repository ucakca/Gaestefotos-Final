import { redirect } from 'next/navigation';

export default async function EventDetailRedirectPage({ params }: { params: { id: string } }) {
  redirect(`/events/${params.id}/dashboard`);
}
