'use client';

import { WIZARD_STEPS } from './types';
import { Check } from 'lucide-react';

interface Props {
  currentStep: number;
  onStepClick?: (step: number) => void;
  maxReachedStep?: number;
}

export default function WizardStepIndicator({ currentStep, onStepClick, maxReachedStep = 1 }: Props) {
  return (
    <div className="flex items-center justify-between w-full px-2">
      {WIZARD_STEPS.map((step, i) => {
        const isActive = step.num === currentStep;
        const isDone = step.num < currentStep;
        const isClickable = onStepClick && step.num <= maxReachedStep;

        return (
          <div key={step.num} className="flex items-center flex-1 last:flex-none">
            {/* Step circle + label */}
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick(step.num)}
              className={`flex flex-col items-center gap-1 transition-all ${
                isClickable ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-200 scale-110'
                    : isDone
                      ? 'bg-purple-100 text-purple-600'
                      : 'bg-muted text-muted-foreground/70'
                }`}
              >
                {isDone ? <Check className="w-4 h-4" /> : step.num}
              </div>
              <span
                className={`text-[10px] sm:text-xs font-medium transition-colors ${
                  isActive ? 'text-purple-700' : isDone ? 'text-purple-500' : 'text-muted-foreground/70'
                }`}
              >
                {step.label}
              </span>
            </button>

            {/* Connector line */}
            {i < WIZARD_STEPS.length - 1 && (
              <div className="flex-1 mx-1.5 sm:mx-3">
                <div
                  className={`h-0.5 rounded-full transition-colors ${
                    step.num < currentStep ? 'bg-purple-400' : 'bg-muted/80'
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
