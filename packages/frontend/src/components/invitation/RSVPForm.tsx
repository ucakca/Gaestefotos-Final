'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { InvitationRSVPQuestion, InvitationGuestGroup, InvitationRSVPResponse } from '@gaestefotos/shared';
import { Button } from '@/components/ui/Button';
import { FormInput } from '@/components/ui/FormInput';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { Checkbox } from '@/components/ui/Checkbox';

function buildDynamicSchema(questions: InvitationRSVPQuestion[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const q of questions) {
    switch (q.type) {
      case 'text':
      case 'textarea':
        shape[q.id] = q.required
          ? z.string().min(1, `${q.label} ist erforderlich`)
          : z.string().optional().default('');
        break;
      case 'email':
        shape[q.id] = q.required
          ? z.string().min(1, `${q.label} ist erforderlich`).email('Ungültige E-Mail')
          : z.string().email('Ungültige E-Mail').optional().or(z.literal(''));
        break;
      case 'boolean':
        shape[q.id] = z.boolean().optional().default(false);
        break;
      case 'select':
        shape[q.id] = q.required
          ? z.string().min(1, `Bitte wähle eine Option für ${q.label}`)
          : z.string().optional().default('');
        break;
      default:
        shape[q.id] = z.any().optional();
    }
  }
  return z.object(shape);
}

interface RSVPFormProps {
  questions: InvitationRSVPQuestion[];
  currentGroup?: InvitationGuestGroup;
  onSubmit: (response: InvitationRSVPResponse) => Promise<void>;
  theme?: string;
}

const KNOWN_KEYS = ['name', 'email', 'attending', 'attendingCeremony', 'attendingReception', 'attendingParty', 'dietaryRestrictions', 'plusOneName'];

export function RSVPForm({ questions, currentGroup, onSubmit, theme = 'classic' }: RSVPFormProps) {
  const visibleQuestions = questions.filter(
    (q) => !q.visibleForGroups || q.visibleForGroups.includes(currentGroup?.slug || 'all')
  );

  const schema = useMemo(() => buildDynamicSchema(visibleQuestions), [visibleQuestions]);

  const defaultValues = useMemo(() => {
    const vals: Record<string, any> = {};
    for (const q of visibleQuestions) {
      vals[q.id] = q.type === 'boolean' ? false : '';
    }
    return vals;
  }, [visibleQuestions]);

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const onFormSubmit = async (formData: Record<string, any>) => {
    const response: InvitationRSVPResponse = {
      name: formData.name || '',
      email: formData.email,
      attending: formData.attending,
      attendingCeremony: formData.attendingCeremony,
      attendingReception: formData.attendingReception,
      attendingParty: formData.attendingParty,
      dietaryRestrictions: formData.dietaryRestrictions,
      plusOneName: formData.plusOneName,
      customAnswers: Object.keys(formData)
        .filter((key) => !KNOWN_KEYS.includes(key))
        .reduce((acc, key) => ({ ...acc, [key]: formData[key] }), {}),
    };

    await onSubmit(response);
    reset();
  };

  const renderQuestion = (question: InvitationRSVPQuestion) => {
    const fieldError = (errors as Record<string, any>)[question.id]?.message as string | undefined;

    switch (question.type) {
      case 'text':
      case 'email':
        return (
          <FormInput
            type={question.type}
            placeholder={question.placeholder}
            error={fieldError}
            {...register(question.id)}
          />
        );

      case 'textarea':
        return (
          <FormTextarea
            placeholder={question.placeholder}
            rows={3}
            error={fieldError}
            {...register(question.id)}
          />
        );

      case 'boolean':
        return (
          <Controller
            name={question.id}
            control={control}
            render={({ field }) => (
              <Checkbox
                checked={!!field.value}
                onCheckedChange={(checked) => field.onChange(checked)}
              />
            )}
          />
        );

      case 'select':
        return (
          <div>
            <select
              {...register(question.id)}
              className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Bitte wählen...</option>
              {question.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {fieldError && <p className="text-sm text-destructive mt-1">{fieldError}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.section
      className="max-w-2xl mx-auto px-6 py-16"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      <h2 className="text-3xl md:text-4xl font-serif text-center mb-8 text-foreground">
        Rückmeldung
      </h2>

      <form onSubmit={handleSubmit(onFormSubmit)} className="bg-card rounded-2xl shadow-sm border border-blush/20 p-6 md:p-8 space-y-6">
        {visibleQuestions.map((question) => (
          <div key={question.id} className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              {question.label}
              {question.required && <span className="text-destructive ml-1">*</span>}
            </label>
            {renderQuestion(question)}
          </div>
        ))}

        <Button type="submit" loading={isSubmitting} className="w-full" leftIcon={<Send size={16} />}>
          Absenden
        </Button>
      </form>
    </motion.section>
  );
}
