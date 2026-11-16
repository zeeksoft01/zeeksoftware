import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  ExternalLink,
  Link2,
  Repeat,
  TrendingUp,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { SiteSettings } from '../types';

interface AffiliateGuidePageProps {
  settings: SiteSettings;
  onBecomeAffiliate: () => void;
  onSignInAffiliate: () => void;
  onNavigateHome: () => void;
}

export const AffiliateGuidePage: React.FC<AffiliateGuidePageProps> = ({
  settings,
  onBecomeAffiliate,
  onSignInAffiliate,
  onNavigateHome,
}) => {
  const guide = settings.affiliateGuide || {
    buttonText: 'How to Earn From Our Affiliate',
    title: 'How to Earn From Our Affiliate Programme',
    description:
      'Earn commissions promoting trusted AI and creative software plans at subsidized Naira rates with a single personal referral link.',
    sections: [],
  };

  const sortedSections = [...(guide.sections || [])].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
  );

  const defaultRate = settings.defaultCommissionRate ?? 0;
  const minWithdrawal = settings.minWithdrawalAmount ?? 100;
  const highlightCards = guide.highlightCards?.length
    ? guide.highlightCards
    : [
        {
          label: 'Storewide Link',
          value: '1 Unique Link',
          subtitle: 'Tracks referrals across every product',
        },
        {
          label: 'Minimum Payout',
          value: `₦${minWithdrawal.toLocaleString('en-NG')}`,
          subtitle: 'Direct Nigerian bank payout',
        },
        {
          label: 'Commission Structure',
          value: defaultRate > 0 ? `${defaultRate}% Base` : 'Per-Product Rates',
          subtitle: 'Product rates configurable by Admin',
        },
        {
          label: 'Partner Dashboard',
          value: 'Live Tracking',
          subtitle: 'Monitor clicks, sales & earnings',
        },
      ];

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-20">
      {/* Hero Banner */}
      <section className="bg-[#061B45] text-white relative overflow-hidden border-b border-[#0f2e6e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <button
              type="button"
              onClick={onNavigateHome}
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#FF7900]" />
              <span>Back to Storefront</span>
            </button>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white">
              {guide.title}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
              {guide.description}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onBecomeAffiliate}
                className="btn-zeek-orange px-6 py-3.5 rounded-xl text-xs sm:text-sm font-extrabold uppercase tracking-wider inline-flex items-center gap-2 shadow-xl"
              >
                <UserPlus className="w-4 h-4" />
                <span>Become an Affiliate</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onSignInAffiliate}
                className="px-6 py-3.5 rounded-xl text-xs sm:text-sm font-bold bg-white/10 hover:bg-white/15 text-white border border-white/20 inline-flex items-center gap-2 transition-colors"
              >
                <Link2 className="w-4 h-4 text-[#FF7900]" />
                <span>Sign In to Copy Your Link</span>
              </button>
            </div>
          </div>

          {/* Live Program Highlights (Editable in Admin CMS) */}
          <div className="lg:col-span-5 space-y-4">
            {guide.heroImageUrl && (
              <div className="rounded-2xl overflow-hidden border border-white/15 bg-slate-900 aspect-video shadow-2xl">
                <img
                  src={guide.heroImageUrl}
                  alt={guide.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {highlightCards.slice(0, 4).map((card, idx) => {
                const Icon =
                  idx === 0 ? Link2 : idx === 1 ? Wallet : idx === 2 ? TrendingUp : Award;
                return (
                  <div
                    key={`${card.label}-${idx}`}
                    className="bg-[#082256] border border-[#143977] rounded-xl p-4"
                  >
                    <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold">
                      <Icon className="w-4 h-4 text-[#FF7900] shrink-0" />
                      <span>{card.label}</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-white mt-1 tabular-nums">
                      {card.value}
                    </p>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {card.subtitle}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Step-by-Step Guide Sections */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#FF7900]">
            Complete Partner Walkthrough
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#061B45] tracking-tight">
            Step-by-Step Guide to Earning Commissions
          </h2>
          <p className="text-sm text-slate-600">
            Follow these steps to register, share your single personal referral link, and get paid to your bank account.
          </p>
        </div>

        {sortedSections.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
            Instructional steps are being updated by the administrator. Click below to create your affiliate account now.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sortedSections.map((sec, idx) => (
              <article
                key={sec.id || idx}
                className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between gap-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="w-9 h-9 rounded-xl bg-[#061B45] text-[#FF7900] font-mono font-black text-sm flex items-center justify-center shrink-0 tabular-nums">
                      {sec.stepNumber || String(idx + 1).padStart(2, '0')}
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  </div>

                  <h3 className="text-lg font-extrabold text-[#061B45] leading-snug">
                    {sec.title}
                  </h3>

                  {sec.imageUrl && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video">
                      <img
                        src={sec.imageUrl}
                        alt={sec.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {sec.content}
                  </p>
                </div>

                {sec.linkUrl && (
                  <div className="pt-2 border-t border-slate-100">
                    {sec.linkUrl === '#register-affiliate' ? (
                      <button
                        type="button"
                        onClick={onBecomeAffiliate}
                        className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#FF7900] hover:underline"
                      >
                        <span>{sec.linkLabel || 'Become an Affiliate'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <a
                        href={sec.linkUrl}
                        target={sec.linkUrl.startsWith('http') ? '_blank' : undefined}
                        rel={sec.linkUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#FF7900] hover:underline"
                      >
                        <span>{sec.linkLabel || 'Learn More'}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="bg-[#061B45] text-white rounded-3xl p-6 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-[#0f2e6e] shadow-xl">
          <div className="space-y-2 max-w-xl">
            <h3 className="text-2xl font-black tracking-tight">
              {guide.ctaBannerTitle?.trim() || 'Ready to Start Earning With Zeek Softwares?'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {guide.ctaBannerDescription?.trim() ||
                'Registration is free and takes under two minutes. Get your unique personal affiliate link and earn across every software subscription in our store.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onBecomeAffiliate}
              className="btn-zeek-orange px-6 py-3.5 rounded-xl text-xs sm:text-sm font-extrabold uppercase tracking-wider inline-flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Become an Affiliate</span>
            </button>
            <button
              type="button"
              onClick={onSignInAffiliate}
              className="px-5 py-3.5 rounded-xl text-xs sm:text-sm font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
            >
              Partner Sign In
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
