'use client';

import React from 'react';
import { Alert } from '@/components/ui/Alert';
import { Centered } from '@/components/ui/Centered';
import { Container } from '@/components/ui/Container';

type ErrorStateProps = {
  message: React.ReactNode;
  className?: string;
};

export function ErrorState({ message, className }: ErrorStateProps) {
  return (
    <Centered>
      <Container className={className}>
        <Alert variant="danger">{message}</Alert>
      </Container>
    </Centered>
  );
}
