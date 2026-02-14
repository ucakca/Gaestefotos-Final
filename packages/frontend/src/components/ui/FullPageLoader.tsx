import { Centered } from '@/components/ui/Centered';
import { Spinner } from '@/components/ui/Spinner';

export function FullPageLoader({
  label = 'Laden...'
}: {
  label?: string;
}) {
  return (
    <Centered>
      <div className="flex items-center gap-3">
        <Spinner size="md" />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </Centered>
  );
}
