'use client';

import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export default function QRCode({ value, size = 200, className = '' }: QRCodeProps) {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className={`bg-white p-4 rounded-lg shadow-lg ${className}`}
    >
      <QRCodeSVG
        value={value}
        size={size}
        level="H"
        includeMargin={true}
      />
    </motion.div>
  );
}

