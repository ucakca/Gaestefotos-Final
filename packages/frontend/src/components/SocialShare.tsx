'use client';

import { Share2, Facebook, Instagram, MessageCircle, Copy } from 'lucide-react';

interface SocialShareProps {
  url: string;
  title?: string;
  imageUrl?: string;
  className?: string;
}

export default function SocialShare({ url, title = 'Event Foto', imageUrl, className = '' }: SocialShareProps) {
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
      navigator.clipboard.writeText(url).then(() => {
        alert('Link in Zwischenablage kopiert!');
      });
      return;
    }

    window.open(shareLinks[type], '_blank', 'width=600,height=400');
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <button
        onClick={() => handleShare('facebook')}
        className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
        aria-label="Auf Facebook teilen"
      >
        <Facebook className="w-5 h-5" />
      </button>
      <button
        onClick={() => handleShare('whatsapp')}
        className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
        aria-label="Auf WhatsApp teilen"
      >
        <MessageCircle className="w-5 h-5" />
      </button>
      <button
        onClick={() => handleShare('copy')}
        className="p-2 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors"
        aria-label="Link kopieren"
      >
        <Copy className="w-5 h-5" />
      </button>
    </div>
  );
}















