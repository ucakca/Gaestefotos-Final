'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface DresscodeCardProps {
  title: string;
  description: string;
  examples?: string[];
  theme?: string;
}

export function DresscodeCard({ title, description, examples, theme = 'classic' }: DresscodeCardProps) {
  return (
    <motion.section
      className="max-w-2xl mx-auto px-6 py-16"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      <div className="bg-white rounded-2xl shadow-sm border border-blush/20 p-8 md:p-10">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Sparkles className="text-gold" size={28} />
          <h2 className="text-3xl font-serif text-foreground">{title}</h2>
        </div>

        <p className="text-center text-muted-foreground text-lg leading-relaxed mb-6">
          {description}
        </p>

        {examples && examples.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center">
            {examples.map((example, index) => (
              <span
                key={index}
                className="inline-block px-4 py-2 bg-blush/20 text-foreground rounded-full text-sm"
              >
                {example}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.section>
  );
}
