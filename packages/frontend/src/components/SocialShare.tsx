'use client';

import { useState } from 'react';
import { Facebook, MessageCircle, Copy, Mail, Smartphone, Share2, Check, QrCode, X } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { useToastStore } from '@/store/toastStore';

interface SocialShareProps {
  url: string;
  title?: string;
  imageUrl?: string;
  className?: string;
  showExpanded?: boolean;
}

export default function SocialShare({ url, title = 'Event Foto', imageUrl: _imageUrl, className = '', showExpanded = false }: SocialShareProps) {
  const { showToast } = useToastStore();
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedText = encodeURIComponent(`${title} — ${url}`);

  const channels = [
    { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'bg-success/100 hover:bg-success',
      action: () => window.open(`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`, '_blank') },
    { key: 'facebook', label: 'Facebook', icon: Facebook, color: 'bg-blue-600 hover:bg-blue-700',
      action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank', 'width=600,height=400') },
    { key: 'sms', label: 'SMS', icon: Smartphone, color: 'bg-orange-500 hover:bg-orange-600',
      action: () => window.open(`sms:?body=${encodedText}`) },
    { key: 'email', label: 'E-Mail', icon: Mail, color: 'bg-destructive/100 hover:bg-destructive',
      action: () => window.open(`mailto:?subject=${encodedTitle}&body=${encodedText}`) },
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      showToast('Link kopiert', 'success');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => showToast('Kopieren fehlgeschlagen', 'error'));
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch { /* cancelled */ }
    } else {
      setShowModal(true);
    }
  };

  // Compact mode: just icon buttons
  if (!showExpanded) {
    return (
      <div className={`flex gap-2 ${className}`}>
        {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
          <IconButton onClick={handleNativeShare} variant="ghost" size="sm"
            className="border border-border bg-card hover:bg-background"
            aria-label="Teilen" title="Teilen" icon={<Share2 className="h-5 w-5" />} />
        )}
        <IconButton onClick={() => channels[0].action()} variant="ghost" size="sm"
          className="border border-border bg-card hover:bg-background"
          aria-label="WhatsApp" title="WhatsApp" icon={<MessageCircle className="h-5 w-5" />} />
        <IconButton onClick={() => channels[1].action()} variant="ghost" size="sm"
          className="border border-border bg-card hover:bg-background"
          aria-label="Facebook" title="Facebook" icon={<Facebook className="h-5 w-5" />} />
        <IconButton onClick={() => channels[3].action()} variant="ghost" size="sm"
          className="border border-border bg-card hover:bg-background"
          aria-label="E-Mail" title="E-Mail" icon={<Mail className="h-5 w-5" />} />
        <IconButton onClick={handleCopy} variant="ghost" size="sm"
          className="border border-border bg-card hover:bg-background"
          aria-label="Link kopieren" title="Link kopieren"
          icon={copied ? <Check className="h-5 w-5 text-success" /> : <Copy className="h-5 w-5" />} />
      </div>
    );
  }

  // Expanded mode: full share panel
  return (
    <div className={`${className}`}>
      <div className="grid grid-cols-2 gap-3">
        {channels.map(ch => (
          <button key={ch.key} onClick={ch.action}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-medium transition ${ch.color}`}>
            <ch.icon className="w-5 h-5" />
            {ch.label}
          </button>
        ))}
      </div>

      {/* Copy Link */}
      <div className="mt-3 flex items-center gap-2 p-3 bg-muted rounded-xl border border-border">
        <input value={url} readOnly className="flex-1 text-sm bg-transparent text-foreground truncate outline-none" />
        <button onClick={handleCopy}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition">
          {copied ? <><Check className="w-3 h-3" /> Kopiert</> : <><Copy className="w-3 h-3" /> Kopieren</>}
        </button>
      </div>

      {/* QR Code hint */}
      <div className="mt-3 flex items-center gap-2 p-3 bg-muted/50 rounded-xl border border-border text-xs text-muted-foreground">
        <QrCode className="w-4 h-4" />
        <span>QR-Code findest du im Dashboard unter „QR-Code & Teilen"</span>
      </div>
    </div>
  );
}















