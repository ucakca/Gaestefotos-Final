'use client';

import { type ReactNode } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { FormInput, type FormInputProps } from './FormInput';
import { FormSelect, type FormSelectProps } from './FormSelect';
import { FormTextarea, type FormTextareaProps } from './FormTextarea';
import { FormCheckbox, type FormCheckboxProps } from './FormCheckbox';

/**
 * FormField — React Hook Form Controller wrapper for unified form components.
 *
 * Usage:
 *   <FormField control={form.control} name="email" render={({ field, error }) => (
 *     <FormInput {...field} label="E-Mail" error={error} />
 *   )} />
 *
 * Or use the shorthand components below:
 *   <RHFInput control={form.control} name="email" label="E-Mail" />
 */

interface FormFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  render: (props: {
    field: any;
    error?: string;
  }) => ReactNode;
}

export function FormField<T extends FieldValues>({
  control,
  name,
  render,
}: FormFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) =>
        render({
          field,
          error: fieldState.error?.message,
        }) as any
      }
    />
  );
}

// --- Shorthand components for common patterns ---

type RHFInputProps<T extends FieldValues> = Omit<FormInputProps, 'name' | 'value' | 'onChange' | 'onBlur' | 'ref'> & {
  control: Control<T>;
  name: Path<T>;
};

export function RHFInput<T extends FieldValues>({ control, name, ...rest }: RHFInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormInput {...field} error={fieldState.error?.message} {...rest} />
      )}
    />
  );
}

type RHFSelectProps<T extends FieldValues> = Omit<FormSelectProps, 'name' | 'value' | 'onChange' | 'onBlur' | 'ref'> & {
  control: Control<T>;
  name: Path<T>;
};

export function RHFSelect<T extends FieldValues>({ control, name, ...rest }: RHFSelectProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormSelect {...field} error={fieldState.error?.message} {...rest} />
      )}
    />
  );
}

type RHFTextareaProps<T extends FieldValues> = Omit<FormTextareaProps, 'name' | 'value' | 'onChange' | 'onBlur' | 'ref'> & {
  control: Control<T>;
  name: Path<T>;
};

export function RHFTextarea<T extends FieldValues>({ control, name, ...rest }: RHFTextareaProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormTextarea {...field} error={fieldState.error?.message} {...rest} />
      )}
    />
  );
}

type RHFCheckboxProps<T extends FieldValues> = Omit<FormCheckboxProps, 'name' | 'checked' | 'onChange' | 'onBlur' | 'ref'> & {
  control: Control<T>;
  name: Path<T>;
};

export function RHFCheckbox<T extends FieldValues>({ control, name, ...rest }: RHFCheckboxProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, ...field }, fieldState }) => (
        <FormCheckbox {...field} checked={!!value} error={fieldState.error?.message} {...rest} />
      )}
    />
  );
}
