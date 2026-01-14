'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface CountdownTimerProps {
  targetDate: Date;
}

export function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    const now = new Date().getTime();
    const target = new Date(targetDate).getTime();
    const difference = target - now;

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((difference % (1000 * 60)) / 1000),
    };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const { days, hours, minutes, seconds } = timeLeft;

  return (
    <motion.section
      className="max-w-4xl mx-auto px-6 py-12"
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      <div className="bg-gradient-to-br from-rose/10 via-blush/20 to-gold/10 rounded-2xl p-8 md:p-12">
        <h3 className="text-center text-xl font-medium text-muted-foreground mb-6">
          Noch
        </h3>

        <div className="grid grid-cols-4 gap-4 md:gap-8">
          {[
            { value: days, label: 'Tage' },
            { value: hours, label: 'Stunden' },
            { value: minutes, label: 'Minuten' },
            { value: seconds, label: 'Sekunden' },
          ].map((unit, index) => (
            <div key={index} className="text-center">
              <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 mb-2">
                <div className="text-3xl md:text-5xl font-bold text-rose font-mono">
                  {String(unit.value).padStart(2, '0')}
                </div>
              </div>
              <div className="text-xs md:text-sm text-muted-foreground font-medium uppercase tracking-wide">
                {unit.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
