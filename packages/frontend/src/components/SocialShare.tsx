'use client';

import { Share2, Facebook, Instagram, MessageCircle, Copy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToastStore } from '@/store/toastStore';

interface SocialShareProps {
  url: string;
  title?: string;
  imageUrl?: string;
  className?: string;
}

export default function SocialShare({ url, title = 'Event Foto', imageUrl, className = '' }: SocialShareProps) {
  const { showToast } = useToastStore();
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    instagram: url, // Instagram doesn't support direct sharing via URL
    copy: url,
  };

  const handleShare = (type: 'facebook' | 'whatsapp' | 'copy') => {
    if (type === 'copy') {
      navigator.clipboard
        .writeText(url)
        .then(() => {
          showToast('Link kopiert', 'success');
        })
        .catch(() => {
          showToast('Kopieren fehlgeschlagen', 'error');
        });
      return;
    }

    window.open(shareLinks[type], '_blank', 'width=600,height=400');
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <Button
        onClick={() => handleShare('facebook')}
        variant="ghost"
        size="sm"
        className="p-2 bg-[var(--status-info)] text-app-bg rounded-full hover:opacity-90 transition-colors"
        aria-label="Auf Facebook teilen"
      >
        <Facebook className="w-5 h-5" />
      </Button>
      <Button
        onClick={() => handleShare('whatsapp')}
        variant="ghost"
        size="sm"
        className="p-2 bg-[var(--status-success)] text-app-bg rounded-full hover:opacity-90 transition-colors"
        aria-label="Auf WhatsApp teilen"
      >
        <MessageCircle className="w-5 h-5" />
      </Button>
      <Button
        onClick={() => handleShare('copy')}
        variant="ghost"
        size="sm"
        className="p-2 bg-[var(--status-neutral)] text-app-bg rounded-full hover:opacity-90 transition-colors"
        aria-label="Link kopieren"
      >
        <Copy className="w-5 h-5" />
      </Button>
    </div>
  );
}















