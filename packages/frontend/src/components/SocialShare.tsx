'use client';

import { Facebook, MessageCircle, Copy } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { useToastStore } from '@/store/toastStore';

interface SocialShareProps {
  url: string;
  title?: string;
  imageUrl?: string;
  className?: string;
}

export default function SocialShare({ url, title = 'Event Foto', imageUrl: _imageUrl, className = '' }: SocialShareProps) {
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
      <IconButton
        onClick={() => handleShare('facebook')}
        variant="ghost"
        size="sm"
        className="border border-app-border bg-app-card hover:bg-app-bg"
        aria-label="Auf Facebook teilen"
        icon={<Facebook className="h-5 w-5" />}
      />
      <IconButton
        onClick={() => handleShare('whatsapp')}
        variant="ghost"
        size="sm"
        className="border border-app-border bg-app-card hover:bg-app-bg"
        aria-label="Auf WhatsApp teilen"
        icon={<MessageCircle className="h-5 w-5" />}
      />
      <IconButton
        onClick={() => handleShare('copy')}
        variant="ghost"
        size="sm"
        className="border border-app-border bg-app-card hover:bg-app-bg"
        aria-label="Link kopieren"
        icon={<Copy className="h-5 w-5" />}
      />
    </div>
  );
}















