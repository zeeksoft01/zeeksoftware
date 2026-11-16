import React from 'react';
import { HeroSlider } from '../components/HeroSlider';
import { BenefitsSection } from '../components/BenefitsSection';
import { ProductCarousel } from '../components/ProductCarousel';
import { ProductCard } from '../components/ProductCard';
import { ReviewsSlider } from '../components/ReviewsSlider';
import { FaqSection } from '../components/FaqSection';
import { Product, SiteSettings, HeroSlide, BenefitCard, CustomerReview, FAQItem } from '../types';
import {
  ArrowRight,
  Sparkles,
  MessageCircle,
  Send,
  CheckCircle2,
  Shield,
  UserPlus,
  BookOpen,
  Link2,
} from 'lucide-react';

interface HomePageProps {
  products: Product[];
  heroSlides: HeroSlide[];
  benefitCards: BenefitCard[];
  reviews: CustomerReview[];
  faqs: FAQItem[];
  settings: SiteSettings;
  onNavigate: (tab: string, filter?: string) => void;
  onBuyNow: (product: Product) => void;
  onViewDetails: (product: Product) => void;
  onWhatsAppEnquiry: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  onOpenAffiliate?: () => void;
  onOpenAffiliateGuide?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  products,
  heroSlides,
  benefitCards,
  reviews,
  faqs,
  settings,
  onNavigate,
  onBuyNow,
  onViewDetails,
  onWhatsAppEnquiry,
  onAddToCart,
  onOpenAffiliate,
  onOpenAffiliateGuide,
}) => {
  const featuredProducts = products.filter((p) => p.isFeatured).slice(0, 8);
  const guideButtonLabel =
    settings.affiliateGuide?.buttonText?.trim() || 'How to Earn From Our Affiliate';

  return (
    <div className="w-full space-y-0">
      {/* 1. Full-Width Revolution Hero Slider */}
      <HeroSlider
        slides={heroSlides}
        onNavigate={onNavigate}
        onOpenAffiliate={onOpenAffiliate}
        settings={settings}
      />

      {/* 2. Interactive Trust & Benefits Section */}
      <BenefitsSection cards={benefitCards} />

      {/* 3. Revolution-Style Product Slider */}
      <ProductCarousel
        products={products}
        onBuyNow={onBuyNow}
        onViewDetails={onViewDetails}
        onNavigateToProducts={() => onNavigate('products')}
      />

      {/* 4. Featured Category Showcase Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <span className="text-xs font-bold text-[#FF7900] tracking-widest uppercase block mb-1">
                Curated Recommendations
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#061B45] tracking-tight">
                Featured Software Plans
              </h2>
              <p className="text-slate-600 text-sm sm:text-base mt-2 max-w-xl">
                Explore our most requested AI and design tools, handpicked for creators, students, and businesses.
              </p>
            </div>

            <button
              onClick={() => onNavigate('products')}
              className="btn-zeek-orange px-5 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-2 self-start md:self-auto"
            >
              <span>View All {products.length} Products</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product, idx) => (
              <ProductCard
                key={`${product.id}-${idx}`}
                product={product}
                onBuyNow={onBuyNow}
                onViewDetails={onViewDetails}
                onWhatsAppEnquiry={onWhatsAppEnquiry}
                onAddToCart={onAddToCart}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 5. Customer Reviews Slider */}
      <ReviewsSlider reviews={reviews} />

      {/* 6. Frequently Asked Questions */}
      <FaqSection
        faqs={faqs}
        onContactClick={() => onNavigate('contact')}
      />

      {/* 6B. Become an Affiliate & How to Earn Section (Immediately Before Join Our Community) */}
      <section className="py-16 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#061B45] text-white rounded-3xl p-6 sm:p-10 lg:p-12 border border-[#0f2e6e] shadow-xl relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#FF9200]">
                  <Link2 className="w-4 h-4" />
                  <span>
                    {settings.affiliateGuide?.promoEyebrow?.trim() ||
                      'Zeek Softwares Affiliate Programme'}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
                  {settings.affiliateGuide?.promoHeadline?.trim() ||
                    'Share One Personal Link. Earn Across Every Product.'}
                </h2>

                <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
                  {settings.affiliateGuide?.promoDescription?.trim() ? (
                    settings.affiliateGuide.promoDescription
                  ) : (
                    <>
                      Partner with Zeek Softwares and earn{' '}
                      {(settings.defaultCommissionRate ?? 0) > 0 ? (
                        <strong className="text-white tabular-nums">
                          {settings.defaultCommissionRate}%+ commission
                        </strong>
                      ) : (
                        <strong className="text-white">competitive commissions</strong>
                      )}{' '}
                      when customers purchase AI tools and software plans through your unique referral link—with direct Naira payouts from{' '}
                      <strong className="text-white tabular-nums">
                        ₦{(settings.minWithdrawalAmount ?? 100).toLocaleString('en-NG')}
                      </strong>
                      .
                    </>
                  )}
                </p>

                <div className="flex flex-wrap items-center gap-3.5 pt-2">
                  <button
                    type="button"
                    onClick={() => onOpenAffiliate?.()}
                    className="btn-zeek-orange px-6 sm:px-7 py-3.5 sm:py-4 rounded-xl text-xs sm:text-sm font-extrabold uppercase tracking-wider inline-flex items-center gap-2.5 shadow-xl"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Become an Affiliate</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenAffiliateGuide?.()}
                    className="px-5 sm:px-6 py-3.5 sm:py-4 rounded-xl text-xs sm:text-sm font-bold bg-white/10 hover:bg-white/20 text-white border border-white/25 inline-flex items-center gap-2 transition-colors"
                  >
                    <BookOpen className="w-4 h-4 text-[#FF9200]" />
                    <span>{guideButtonLabel}</span>
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {(settings.affiliateGuide?.highlightCards?.length
                  ? settings.affiliateGuide.highlightCards
                  : [
                      {
                        label: 'Storewide Link',
                        value: '1 Unique Link',
                        subtitle: 'Tracks referrals across every product',
                      },
                      {
                        label: 'Minimum Payout',
                        value: `₦${(settings.minWithdrawalAmount ?? 100).toLocaleString('en-NG')}`,
                        subtitle: 'Direct Nigerian bank payout',
                      },
                      {
                        label: 'Commission Structure',
                        value:
                          (settings.defaultCommissionRate ?? 0) > 0
                            ? `${settings.defaultCommissionRate}% Base`
                            : 'Per-Product Rates',
                        subtitle: 'Configurable rates managed by Admin',
                      },
                      {
                        label: 'Partner Dashboard',
                        value: 'Live Tracking',
                        subtitle: 'Monitor clicks, sales & earnings',
                      },
                    ]
                )
                  .slice(0, 4)
                  .map((card, idx) => (
                    <div
                      key={`${card.label}-${idx}`}
                      className="bg-[#082256] border border-[#143977] rounded-2xl p-4 space-y-1"
                    >
                      <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block">
                        {card.label}
                      </span>
                      <span
                        className={`text-lg font-black block tabular-nums ${
                          idx === 2 ? 'text-[#FF9200]' : idx === 1 ? 'text-emerald-400' : 'text-white'
                        }`}
                      >
                        {card.value}
                      </span>
                      <span className="text-xs text-slate-300 block">{card.subtitle}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Join Our Community Banner */}
      <section className="py-16 bg-gradient-to-br from-[#061B45] via-[#09245c] to-[#041230] text-white relative overflow-hidden">
        <div className="absolute top-0 right-10 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-extrabold uppercase tracking-widest border border-orange-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Connect & Grow</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
            Join the Zeek Softwares Digital Community
          </h2>

          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Connect with our growing community to discover product updates, digital tools, software offers, and useful technology information.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <a
              href={settings.whatsappCommunityUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-7 py-3.5 rounded-xl text-xs sm:text-sm font-bold bg-[#16A34A] hover:bg-[#15803d] text-white flex items-center gap-2.5 shadow-xl transition-all duration-200 hover:scale-105"
            >
              <MessageCircle className="w-4 h-4 fill-white text-[#16A34A]" />
              <span>JOIN WHATSAPP COMMUNITY</span>
            </a>

            <a
              href={settings.telegramChannelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-7 py-3.5 rounded-xl text-xs sm:text-sm font-bold bg-[#0284c7] hover:bg-[#0369a1] text-white flex items-center gap-2.5 shadow-xl transition-all duration-200 hover:scale-105"
            >
              <Send className="w-4 h-4" />
              <span>JOIN TELEGRAM COMMUNITY</span>
            </a>
          </div>

          <div className="pt-6 flex flex-wrap items-center justify-center gap-8 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Exclusive Subsidized Flash Deals
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-orange-400" />
              Latest AI Model Updates & Tips
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-sky-400" />
              Direct Support Access
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
