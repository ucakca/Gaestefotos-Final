import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { IconButton } from '@/components/ui/IconButton';

describe('IconButton', () => {
  const TestIcon = () => <svg data-testid="test-icon" />;

  it('renders with icon', () => {
    render(<IconButton icon={<TestIcon />} aria-label="Test" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('defaults to type="button"', () => {
    render(<IconButton icon={<TestIcon />} aria-label="Test" />);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('handles click events', async () => {
    const onClick = vi.fn();
    render(<IconButton icon={<TestIcon />} onClick={onClick} aria-label="Click" />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is disabled when disabled', () => {
    render(<IconButton icon={<TestIcon />} disabled aria-label="Disabled" />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled when loading', () => {
    render(<IconButton icon={<TestIcon />} loading aria-label="Loading" />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows spinner when loading', () => {
    render(<IconButton icon={<TestIcon />} loading aria-label="Loading" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('forwards ref', () => {
    const ref = vi.fn();
    render(<IconButton icon={<TestIcon />} ref={ref} aria-label="Ref" />);
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLButtonElement));
  });

  it('does not fire click when disabled', async () => {
    const onClick = vi.fn();
    render(<IconButton icon={<TestIcon />} disabled onClick={onClick} aria-label="No Click" />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
