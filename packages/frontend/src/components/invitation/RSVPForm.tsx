'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import { InvitationRSVPQuestion, InvitationGuestGroup, InvitationRSVPResponse } from '@gaestefotos/shared';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';

interface RSVPFormProps {
  questions: InvitationRSVPQuestion[];
  currentGroup?: InvitationGuestGroup;
  onSubmit: (response: InvitationRSVPResponse) => Promise<void>;
  theme?: string;
}

export function RSVPForm({ questions, currentGroup, onSubmit, theme = 'classic' }: RSVPFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);

  const visibleQuestions = questions.filter(
    (q) => !q.visibleForGroups || q.visibleForGroups.includes(currentGroup?.slug || 'all')
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
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
          .filter((key) => !['name', 'email', 'attending', 'attendingCeremony', 'attendingReception', 'attendingParty', 'dietaryRestrictions', 'plusOneName'].includes(key))
          .reduce((acc, key) => ({ ...acc, [key]: formData[key] }), {}),
      };

      await onSubmit(response);
      setFormData({});
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestion = (question: InvitationRSVPQuestion) => {
    const value = formData[question.id];

    switch (question.type) {
      case 'text':
      case 'email':
        return (
          <Input
            type={question.type}
            value={value || ''}
            onChange={(e) => setFormData({ ...formData, [question.id]: e.target.value })}
            placeholder={question.placeholder}
            required={question.required}
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => setFormData({ ...formData, [question.id]: e.target.value })}
            placeholder={question.placeholder}
            required={question.required}
            rows={3}
          />
        );

      case 'boolean':
        return (
          <Checkbox
            checked={!!value}
            onCheckedChange={(checked) => setFormData({ ...formData, [question.id]: checked })}
          />
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => setFormData({ ...formData, [question.id]: e.target.value })}
            required={question.required}
            className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-rose"
          >
            <option value="">Bitte wählen...</option>
            {question.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
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

      <form onSubmit={handleSubmit} className="bg-card rounded-2xl shadow-sm border border-blush/20 p-6 md:p-8 space-y-6">
        {visibleQuestions.map((question) => (
          <div key={question.id} className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              {question.label}
              {question.required && <span className="text-rose ml-1">*</span>}
            </label>
            {renderQuestion(question)}
          </div>
        ))}

        <Button type="submit" disabled={submitting} className="w-full">
          <Send size={16} className="mr-2" />
          {submitting ? 'Wird gesendet...' : 'Absenden'}
        </Button>
      </form>
    </motion.section>
  );
}
