import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { FormInput } from '@/components/ui/FormInput';

describe('FormInput', () => {
  it('renders with label', () => {
    render(<FormInput label="Email" id="email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows required indicator', () => {
    render(<FormInput label="Name" required id="name" />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<FormInput label="Email" error="Invalid email" id="email" />);
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('sets aria-invalid when error present', () => {
    render(<FormInput label="Email" error="Invalid" id="email" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('sets aria-invalid false when no error', () => {
    render(<FormInput label="Email" id="email" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'false');
  });

  it('shows helper text when no error', () => {
    render(<FormInput label="Email" helperText="We won't share your email" id="email" />);
    expect(screen.getByText("We won't share your email")).toBeInTheDocument();
  });

  it('hides helper text when error present', () => {
    render(<FormInput label="Email" helperText="Helper" error="Error" id="email" />);
    expect(screen.queryByText('Helper')).not.toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('handles user input', async () => {
    const onChange = vi.fn();
    render(<FormInput label="Name" onChange={onChange} id="name" />);
    await userEvent.type(screen.getByRole('textbox'), 'test');
    expect(onChange).toHaveBeenCalled();
  });

  it('forwards ref', () => {
    const ref = vi.fn();
    render(<FormInput label="Test" ref={ref} id="test" />);
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLInputElement));
  });

  it('renders without label', () => {
    render(<FormInput placeholder="No label" id="nolabel" />);
    expect(screen.getByPlaceholderText('No label')).toBeInTheDocument();
  });
});
