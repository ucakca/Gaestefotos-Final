import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { PasswordGate } from '@/components/ui/PasswordGate';

describe('PasswordGate', () => {
  it('renders heading and description', () => {
    render(<PasswordGate onSubmit={async () => {}} />);
    expect(screen.getByText('Event-Passwort')).toBeInTheDocument();
    expect(screen.getByText('Dieses Event ist passwortgeschützt.')).toBeInTheDocument();
  });

  it('renders password input', () => {
    render(<PasswordGate onSubmit={async () => {}} />);
    const input = screen.getByPlaceholderText('Passwort eingeben');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'password');
  });

  it('renders submit button', () => {
    render(<PasswordGate onSubmit={async () => {}} />);
    expect(screen.getByRole('button', { name: /Zugriff erhalten/i })).toBeInTheDocument();
  });

  it('shows validation error for empty submit', async () => {
    render(<PasswordGate onSubmit={async () => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /Zugriff erhalten/i }));

    await waitFor(() => {
      expect(screen.getByText('Bitte Passwort eingeben')).toBeInTheDocument();
    });
  });

  it('calls onSubmit with password value', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<PasswordGate onSubmit={onSubmit} />);

    await userEvent.type(screen.getByPlaceholderText('Passwort eingeben'), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: /Zugriff erhalten/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('secret123');
    });
  });

  it('displays server error', () => {
    render(<PasswordGate onSubmit={async () => {}} serverError="Ungültiges Passwort" />);
    expect(screen.getByText('Ungültiges Passwort')).toBeInTheDocument();
  });

  it('does not show server error when null', () => {
    render(<PasswordGate onSubmit={async () => {}} serverError={null} />);
    expect(screen.queryByText('Ungültiges Passwort')).not.toBeInTheDocument();
  });
});
