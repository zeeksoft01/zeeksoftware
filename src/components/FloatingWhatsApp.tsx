import React, { useState } from 'react';
import { SiteSettings } from '../types';

interface FloatingWhatsAppProps {
  settings: SiteSettings;
}

export const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({ settings }) => {
  const [isHovered, setIsHovered] = useState(false);

  const cleanNumber = (settings.internationalWhatsApp || '2347045200361').replace(/\D/g, '');
  const defaultMessage =
    'Hello Zeek Softwares, I would like to enquire about your premium AI tools and software plans.';
  const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(defaultMessage)}`;

  return (
    <div className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-[55] flex items-center gap-3">
      {/* Floating Official WhatsApp Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Zeek Softwares on WhatsApp"
        title="Chat on WhatsApp"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative group w-12 h-12 sm:w-14 sm:h-14 min-h-[44px] min-w-[44px] bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-full flex items-center justify-center shadow-xl shadow-green-950/30 transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-400/60"
      >
        {/* Subtle ambient WhatsApp ripple */}
        <span
          aria-hidden="true"
          className="absolute -inset-1 rounded-full bg-[#25D366]/30 animate-ping group-hover:hidden pointer-events-none motion-reduce:hidden"
        />

        {/* Official WhatsApp SVG Brand Icon */}
        <svg
          viewBox="0 0 32 32"
          fill="currentColor"
          aria-hidden="true"
          className="w-7 h-7 sm:w-8 sm:h-8 text-white relative z-10"
        >
          <path d="M16.004 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.256.592 4.46 1.716 6.404L3.112 29l6.756-1.772A12.74 12.74 0 0 0 16.004 28.8c7.06 0 12.8-5.74 12.8-12.8s-5.74-12.8-12.8-12.8zm0 23.38a10.55 10.55 0 0 1-5.388-1.476l-.388-.228-4.01 1.052 1.07-3.908-.252-.4a10.55 10.55 0 0 1-1.622-5.62c0-5.836 4.748-10.584 10.59-10.584 5.836 0 10.584 4.748 10.584 10.584 0 5.836-4.748 10.58-10.584 10.58zm5.804-7.926c-.318-.16-1.884-.93-2.176-1.036-.292-.106-.504-.16-.716.16-.212.318-.822 1.036-1.008 1.248-.186.212-.372.24-.69.08-.318-.16-1.344-.496-2.56-1.58-.946-.844-1.586-1.888-1.772-2.206-.186-.318-.02-.49.14-.648.144-.144.318-.372.478-.558.16-.186.212-.318.318-.53.106-.212.054-.398-.026-.558-.08-.16-.716-1.726-.982-2.364-.258-.622-.52-.538-.716-.548-.186-.01-.398-.01-.61-.01s-.558.08-.85.398c-.292.318-1.114 1.088-1.114 2.654s1.14 3.08 1.3 3.292c.16.212 2.244 3.428 5.438 4.806.76.328 1.352.524 1.814.67.762.242 1.456.208 2.004.126.612-.092 1.884-.77 2.15-1.514.266-.744.266-1.38.186-1.514-.08-.132-.292-.212-.61-.372z" />
        </svg>
      </a>

      {/* Hover Tooltip on Desktop */}
      {isHovered && (
        <div className="hidden sm:flex items-center bg-[#061B45] text-white text-xs font-bold py-2 px-3.5 rounded-full shadow-2xl border border-emerald-400/30 whitespace-nowrap animate-in fade-in slide-in-from-left-3 duration-200 pointer-events-none">
          <span>Chat on WhatsApp</span>
        </div>
      )}
    </div>
  );
};
