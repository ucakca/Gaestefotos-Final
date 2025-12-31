'use client';

import React from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';

type PasswordGateProps = {
  password: string;
  onPasswordChange: (value: string) => void;
  passwordError?: string | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

export function PasswordGate({ password, onPasswordChange, passwordError, onSubmit }: PasswordGateProps) {
  return (
    <Container>
      <Card className="p-8 w-full">
        <h2 className="text-2xl font-semibold mb-4 text-app-fg">Event-Passwort</h2>
        <p className="text-app-muted mb-6 text-sm">Dieses Event ist passwortgeschützt.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Input
              type="password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="Passwort eingeben"
              required
            />
            {passwordError && (
              <Alert variant="danger" className="mt-2">
                {passwordError}
              </Alert>
            )}
          </div>
          <Button type="submit" className="w-full" size="lg">
            Zugriff erhalten
          </Button>
        </form>
      </Card>
    </Container>
  );
}
