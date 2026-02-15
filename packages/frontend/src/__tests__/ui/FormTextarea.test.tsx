import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { FormTextarea } from '@/components/ui/FormTextarea';

describe('FormTextarea', () => {
  it('renders with label', () => {
    render(<FormTextarea label="Message" id="msg" />);
    expect(screen.getByText('Message')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows required indicator', () => {
    render(<FormTextarea label="Bio" required id="bio" />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<FormTextarea label="Message" error="Too short" id="msg" />);
    expect(screen.getByText('Too short')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('sets aria-invalid when error present', () => {
    render(<FormTextarea label="Msg" error="Error" id="msg" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('sets aria-invalid false when no error', () => {
    render(<FormTextarea label="Msg" id="msg" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'false');
  });

  it('shows helper text when no error', () => {
    render(<FormTextarea label="Msg" helperText="Max 500 chars" id="msg" />);
    expect(screen.getByText('Max 500 chars')).toBeInTheDocument();
  });

  it('hides helper text when error present', () => {
    render(<FormTextarea label="Msg" helperText="Helper" error="Error" id="msg" />);
    expect(screen.queryByText('Helper')).not.toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('handles user input', async () => {
    const onChange = vi.fn();
    render(<FormTextarea label="Msg" onChange={onChange} id="msg" />);
    await userEvent.type(screen.getByRole('textbox'), 'hello');
    expect(onChange).toHaveBeenCalled();
  });

  it('forwards ref', () => {
    const ref = vi.fn();
    render(<FormTextarea label="Test" ref={ref} id="test" />);
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLTextAreaElement));
  });

  it('renders without label', () => {
    render(<FormTextarea placeholder="Write here" id="nolabel" />);
    expect(screen.getByPlaceholderText('Write here')).toBeInTheDocument();
  });

  it('applies error border styles', () => {
    const { container } = render(<FormTextarea error="Bad" id="err" />);
    const textarea = container.querySelector('textarea');
    expect(textarea?.className).toContain('border-destructive');
  });
});
