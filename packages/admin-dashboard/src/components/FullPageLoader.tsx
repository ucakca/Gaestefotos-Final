'use client';

export default function FullPageLoader({
  label = 'Wird geladen...'
}: {
  label?: string;
}) {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center bg-app-bg text-app-fg">
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-app-border border-t-tokens-brandGreen" />
        <p className="text-sm text-app-muted">{label}</p>
      </div>
    </div>
  );
}
