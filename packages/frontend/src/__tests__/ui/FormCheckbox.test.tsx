import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { FormCheckbox } from '@/components/ui/FormCheckbox';

describe('FormCheckbox', () => {
  it('renders with label', () => {
    render(<FormCheckbox label="Accept terms" id="terms" />);
    expect(screen.getByText('Accept terms')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('shows required indicator', () => {
    render(<FormCheckbox label="Accept" required id="accept" />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('toggles on click', async () => {
    const onChange = vi.fn();
    render(<FormCheckbox label="Toggle" onChange={onChange} id="toggle" />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    await userEvent.click(checkbox);
    expect(onChange).toHaveBeenCalled();
  });

  it('shows error message', () => {
    render(<FormCheckbox label="Agree" error="Must agree" id="agree" />);
    expect(screen.getByText('Must agree')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('sets aria-invalid when error present', () => {
    render(<FormCheckbox label="Agree" error="Required" id="agree" />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('sets aria-invalid false when no error', () => {
    render(<FormCheckbox label="Agree" id="agree" />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'false');
  });

  it('shows helper text when no error', () => {
    render(<FormCheckbox label="Newsletter" helperText="Optional" id="news" />);
    expect(screen.getByText('Optional')).toBeInTheDocument();
  });

  it('hides helper text when error present', () => {
    render(<FormCheckbox label="Terms" helperText="Helper" error="Required" id="terms" />);
    expect(screen.queryByText('Helper')).not.toBeInTheDocument();
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('is disabled when disabled', () => {
    render(<FormCheckbox label="Disabled" disabled id="dis" />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });

  it('forwards ref', () => {
    const ref = vi.fn();
    render(<FormCheckbox label="Ref" ref={ref} id="ref" />);
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLInputElement));
  });
});
