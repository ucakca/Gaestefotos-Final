import type { Metadata } from 'next';
import ClientRedirect from './ClientRedirect';
import { headers } from 'next/headers';

type ShortlinkResolveResponse = {
  code: string;
  invitationSlug: string;
  invitationUrl: string;
  event?: {
    title?: string;
    dateTime?: string | null;
    locationName?: string | null;
  };
};

function getApiBaseUrl(): string {
  // In production we must use same-origin to avoid mixed deployments / wrong domains.
  if (process.env.NODE_ENV === 'production') {
    const h = headers();
    const proto = h.get('x-forwarded-proto') || 'https';
    const host = h.get('x-forwarded-host') || h.get('host');
    if (host) return `${proto}://${host}`;
    return '';
  }

  // Dev/E2E fallback: allow explicit overrides.
  const raw = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:8001';
  return raw.replace(/\/+$/, '');
}

async function resolveShortlink(code: string): Promise<ShortlinkResolveResponse | null> {
  try {
    const url = `${getApiBaseUrl()}/api/shortlinks/${encodeURIComponent(code)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as ShortlinkResolveResponse;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { code: string } }): Promise<Metadata> {
  const data = await resolveShortlink(params.code);
  const title = data?.event?.title ? `Einladung: ${data.event.title}` : 'Einladung';
  const descriptionParts: string[] = [];
  if (data?.event?.dateTime) descriptionParts.push(`Wann: ${new Date(data.event.dateTime).toLocaleString('de-DE')}`);
  if (data?.event?.locationName) descriptionParts.push(`Wo: ${data.event.locationName}`);
  const description = descriptionParts.length > 0 ? descriptionParts.join(' · ') : 'Digitale Einladung';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function ShortLinkResolvePageV2({ params }: { params: { code: string } }) {
  const code = params.code;
  const initialData = await resolveShortlink(code);
  const initialSlug = initialData?.invitationSlug;
  const initialTarget = typeof initialSlug === 'string' && initialSlug.length > 0 ? `/i/${initialSlug}` : null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="text-lg font-semibold">Weiterleitung…</div>
        {initialTarget ? (
          <>
            <p className="mt-3 text-sm text-gray-600">Bitte kurz warten.</p>
            <a className="mt-3 inline-block text-sm text-[#295B4D] underline" href={initialTarget}>
              Falls du nicht weitergeleitet wirst, klicke hier.
            </a>
            <ClientRedirect code={code} initialTarget={initialTarget} />
          </>
        ) : (
          <div className="mt-3 text-sm text-red-700">Link konnte nicht aufgelöst werden</div>
        )}
      </div>
    </div>
  );
}
