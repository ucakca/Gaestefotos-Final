'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface Step {
  id: number;
  label: string;
  description: string;
}

interface QrWizardStepsProps {
  currentStep: number;
  steps: Step[];
}

export default function QrWizardSteps({ currentStep, steps }: QrWizardStepsProps) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between relative">
        {/* Progress Line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" style={{ zIndex: 0 }} />
        <div
          className="absolute top-5 left-0 h-0.5 bg-app-accent transition-all duration-500"
          style={{
            width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
            zIndex: 1,
          }}
        />

        {/* Steps */}
        {steps.map((step, index) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          const stepNumber = index + 1;

          return (
            <div key={step.id} className="flex flex-col items-center relative" style={{ zIndex: 2 }}>
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1.1 : 1,
                  backgroundColor: isCompleted || isActive ? 'var(--app-accent)' : 'var(--card)',
                }}
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                  isCompleted || isActive
                    ? 'border-app-accent text-background'
                    : 'border-border text-muted-foreground bg-card'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-bold">{stepNumber}</span>
                )}
              </motion.div>
              <div className="mt-2 text-center max-w-[120px]">
                <div
                  className={`text-xs font-semibold ${
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </div>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-muted-foreground mt-0.5"
                  >
                    {step.description}
                  </motion.div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
