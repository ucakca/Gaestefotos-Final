'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import { FormInput } from '@/components/ui/FormInput';
import { Lock } from 'lucide-react';

const passwordSchema = z.object({
  password: z.string().min(1, 'Bitte Passwort eingeben'),
});
type PasswordFormData = z.infer<typeof passwordSchema>;

type PasswordGateProps = {
  onSubmit: (password: string) => Promise<void>;
  serverError?: string | null;
};

export function PasswordGate({ onSubmit, serverError }: PasswordGateProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '' },
  });

  const onFormSubmit = async (data: PasswordFormData) => {
    await onSubmit(data.password);
  };

  return (
    <Container>
      <Card className="p-8 w-full">
        <h2 className="text-2xl font-semibold mb-4 text-foreground">Event-Passwort</h2>
        <p className="text-muted-foreground mb-6 text-sm">Dieses Event ist passwortgeschützt.</p>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div>
            <FormInput
              type="password"
              placeholder="Passwort eingeben"
              error={errors.password?.message}
              {...register('password')}
            />
            {serverError && (
              <Alert variant="danger" className="mt-2">
                {serverError}
              </Alert>
            )}
          </div>
          <Button type="submit" loading={isSubmitting} className="w-full" size="lg" leftIcon={<Lock className="w-4 h-4" />}>
            Zugriff erhalten
          </Button>
        </form>
      </Card>
    </Container>
  );
}
