'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QrScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
}

export default function QrScanner({ onScan, onError }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const hasScannedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const scannerId = 'qr-scanner-element';
    const scanner = new Html5Qrcode(scannerId);
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      },
      (decodedText) => {
        if (hasScannedRef.current) return;
        hasScannedRef.current = true;
        onScan(decodedText);
      },
      () => {
        // Ignore scan failures (no QR in frame)
      }
    ).then(() => {
      setStarted(true);
    }).catch((err) => {
      onError?.(typeof err === 'string' ? err : err?.message || 'Kamera konnte nicht gestartet werden');
    });

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [onScan, onError]);

  return (
    <div className="relative w-full aspect-square max-w-sm mx-auto rounded-2xl overflow-hidden bg-gray-900">
      <div id="qr-scanner-element" ref={containerRef} className="w-full h-full" />
      {!started && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-gray-400 text-sm">Kamera wird gestartet...</div>
        </div>
      )}
    </div>
  );
}
