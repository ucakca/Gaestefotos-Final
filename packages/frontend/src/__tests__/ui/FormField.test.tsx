import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RHFInput, RHFCheckbox } from '@/components/ui/FormField';

const schema = z.object({
  email: z.string().min(1, 'Required').email('Invalid email'),
  agree: z.boolean().refine(v => v, 'Must agree'),
});

function TestForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const { control, handleSubmit } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', agree: false },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <RHFInput control={control} name="email" label="Email" id="email" />
      <RHFCheckbox control={control} name="agree" label="I agree" />
      <button type="submit">Submit</button>
    </form>
  );
}

describe('FormField (RHF Integration)', () => {
  it('renders RHFInput with label', () => {
    render(<TestForm onSubmit={() => {}} />);
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders RHFCheckbox with label', () => {
    render(<TestForm onSubmit={() => {}} />);
    expect(screen.getByText('I agree')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('shows validation errors on submit', async () => {
    render(<TestForm onSubmit={() => {}} />);
    await userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(screen.getByText('Required')).toBeInTheDocument();
    });
  });

  it('shows email format error', async () => {
    render(<TestForm onSubmit={() => {}} />);
    await userEvent.type(screen.getByRole('textbox'), 'notanemail');
    await userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(screen.getByText('Invalid email')).toBeInTheDocument();
    });
  });

  it('submits valid data', async () => {
    const onSubmit = vi.fn();
    render(<TestForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByRole('textbox'), 'test@example.com');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        { email: 'test@example.com', agree: true },
        expect.anything()
      );
    });
  });
});
