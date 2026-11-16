import React from 'react';
import { ArrowRight, UserPlus } from 'lucide-react';

interface FloatingAffiliateButtonProps {
  onBecomeAffiliate: () => void;
}

export const FloatingAffiliateButton: React.FC<FloatingAffiliateButtonProps> = ({
  onBecomeAffiliate,
}) => {
  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[55]">
      <div className="relative animate-affiliate-float">
        {/* Subtle ambient pulse halo (compositor-only, hidden under reduced motion) */}
        <span
          aria-hidden="true"
          className="absolute -inset-1 rounded-full bg-[#FF7900]/35 animate-affiliate-pulse pointer-events-none"
        />

        <button
          type="button"
          onClick={onBecomeAffiliate}
          aria-label="Become an Affiliate"
          className="relative group flex items-center gap-2 sm:gap-2.5 min-h-[44px] sm:min-h-[48px] px-3.5 py-2.5 sm:px-5 sm:py-3 rounded-full bg-gradient-to-r from-[#061B45] via-[#0a2761] to-[#061B45] hover:from-[#FF7900] hover:via-[#FF8A1F] hover:to-[#FF7900] text-white border-2 border-[#FF7900] shadow-xl shadow-[#061B45]/30 hover:shadow-orange-500/40 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-400/60 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#FF7900] group-hover:bg-[#061B45] flex items-center justify-center shrink-0 transition-colors duration-200">
            <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          </span>
          <span className="text-xs sm:text-sm font-extrabold tracking-tight whitespace-nowrap shrink-0">
            Become an Affiliate
          </span>
          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FF9200] group-hover:text-white group-hover:translate-x-0.5 transition-all duration-200 hidden sm:inline-block shrink-0" />
        </button>
      </div>
    </div>
  );
};
