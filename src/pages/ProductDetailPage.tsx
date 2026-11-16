import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Link2,
  MessageCircle,
  PackageCheck,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { Product, SiteSettings } from '../types';
import { api } from '../api/client';
import { copyTextSafe, getProductUrl } from '../utils/productUrl';

interface ProductDetailPageProps {
  product: Product;
  allProducts: Product[];
  settings: SiteSettings;
  onBackToProducts: () => void;
  onSelectProduct: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onWhatsAppEnquiry: (product: Product) => void;
  onBecomeAffiliate: () => void;
  onOpenAffiliateGuide: () => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  allProducts,
  settings,
  onBackToProducts,
  onSelectProduct,
  onBuyNow,
  onAddToCart,
  onWhatsAppEnquiry,
  onBecomeAffiliate,
  onOpenAffiliateGuide,
}) => {
  const [liveProduct, setLiveProduct] = useState<Product>(product);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    setLiveProduct(product);
    if (!product?.id) return;

    let cancelled = false;
    api
      .getProduct(product.id)
      .then((fresh) => {
        if (!cancelled && fresh) {
          setLiveProduct(fresh);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [product]);

  const activeProduct = liveProduct || product;
  const formattedPrice = activeProduct.price.toLocaleString('en-NG');
  const shareUrl = getProductUrl(activeProduct);

  const configuredProductRate =
    activeProduct.commissionRateOverride ??
    settings.productCommissionRates?.[activeProduct.id] ??
    settings.defaultCommissionRate ??
    0;

  const relatedProducts = allProducts
    .filter((p) => p.id !== activeProduct.id && p.isAvailable)
    .sort((a, b) => {
      const aSame = a.category === activeProduct.category ? 1 : 0;
      const bSame = b.category === activeProduct.category ? 1 : 0;
      return bSame - aSame;
    })
    .slice(0, 4);

  const handleCopyProductLink = async () => {
    const ok = await copyTextSafe(shareUrl);
    if (ok) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${activeProduct.name} (${activeProduct.duration}) - Zeek Softwares`,
          text: `Get ${activeProduct.name} (${activeProduct.duration}) for ₦${formattedPrice} on Zeek Softwares!`,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to copy below
      }
    }
    await handleCopyProductLink();
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-24">
      {/* Top Breadcrumb Bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackToProducts}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#061B45] hover:text-[#FF7900] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#FF7900]" />
            <span>Back to All Software Plans</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">
              {activeProduct.category}
            </span>
            <button
              type="button"
              onClick={handleCopyProductLink}
              className="px-3 py-1.5 rounded-lg bg-[#061B45] hover:bg-[#0c2a63] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
            >
              {linkCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Link Copied</span>
                </>
              ) : (
                <>
                  <Link2 className="w-3.5 h-3.5 text-[#FF9200]" />
                  <span>Copy Product Link</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Product Detail Card */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Left: Clean Original Logo Showcase */}
            <div className="lg:col-span-5 bg-gradient-to-b from-slate-50 via-white to-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 px-5 pt-16 pb-7 sm:px-8 sm:pt-16 sm:pb-8 flex flex-col items-center justify-center relative min-h-[320px] sm:min-h-[400px]">
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2">
                <span className="px-3 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-wider bg-[#061B45] text-white">
                  {activeProduct.category}
                </span>
                <span
                  className={`px-3 py-1 rounded-lg text-[11px] font-extrabold ${
                    activeProduct.isAvailable
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}
                >
                  {activeProduct.isAvailable ? 'In Stock — Instant Activation' : 'Temporarily Unavailable'}
                </span>
              </div>

              <div className="w-56 h-56 sm:w-64 sm:h-64 lg:w-72 lg:h-72 rounded-3xl bg-white border border-slate-200/90 shadow-md p-3.5 sm:p-4 flex items-center justify-center">
                <img
                  src={activeProduct.image}
                  alt={activeProduct.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain drop-shadow-sm"
                />
              </div>

              <p className="text-[11px] font-semibold text-slate-500 mt-4 text-center">
                Official Subscription Access • {activeProduct.duration}
              </p>
            </div>

            {/* Right: Prominent Title, Pricing, & Actions */}
            <div className="lg:col-span-7 p-6 sm:p-10 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  {activeProduct.isFeatured && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200 text-[11px] font-extrabold uppercase tracking-wider">
                      <Sparkles className="w-3 h-3" />
                      <span>Popular Choice</span>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-[#061B45] border border-blue-200 text-[11px] font-extrabold">
                    <Clock className="w-3 h-3 text-[#FF7900]" />
                    <span>{activeProduct.duration}</span>
                  </span>
                </div>

                {/* Bold, High-Contrast Product Title */}
                <h1 className="text-2xl sm:text-4xl lg:text-[40px] font-black text-[#061B45] tracking-tight leading-tight">
                  {activeProduct.name}
                </h1>

                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  {activeProduct.shortDescription}
                </p>

                {/* Price Box */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      Subsidized Store Price
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-3xl sm:text-4xl font-black text-[#FF7900] tabular-nums">
                        ₦{formattedPrice}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-600">
                        / {activeProduct.duration}
                      </span>
                    </div>
                    {activeProduct.priceSourceCurrency === 'USD' && activeProduct.usdPrice ? (
                      <span className="text-xs font-semibold text-slate-500 tabular-nums mt-0.5 block">
                        ${activeProduct.usdPrice} USD base (₦{(settings.usdNgnRate || 1550).toLocaleString('en-NG')}/$1)
                      </span>
                    ) : null}
                  </div>

                  <div className="text-left sm:text-right space-y-1">
                    <span className="text-xs font-extrabold text-emerald-700 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Instant Activation on Confirmation</span>
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Pay via Paystack, Bank Transfer, or USDT BEP20/TRC20
                    </span>
                  </div>
                </div>

                {/* 3 Key Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-[#FF7900] shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Duration</span>
                      <span className="text-xs font-extrabold text-[#061B45]">{activeProduct.duration}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Licensing</span>
                      <span className="text-xs font-extrabold text-[#061B45]">Authorized Subsidized</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center gap-2.5">
                    <PackageCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Delivery</span>
                      <span className="text-xs font-extrabold text-[#061B45]">Email & WhatsApp</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Primary CTA Row */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onBuyNow(activeProduct)}
                    className="btn-zeek-orange w-full sm:flex-1 py-4 px-6 rounded-xl text-xs sm:text-sm font-extrabold tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg"
                  >
                    <span>BUY NOW (₦{formattedPrice})</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onAddToCart(activeProduct)}
                    className="w-full sm:w-auto px-5 py-4 rounded-xl text-xs sm:text-sm font-bold bg-[#061B45] hover:bg-[#0c2a63] text-white flex items-center justify-center gap-2 transition-colors"
                  >
                    <ShoppingBag className="w-4 h-4 text-[#FF9200]" />
                    <span>Add to Cart</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onWhatsAppEnquiry(activeProduct)}
                    className="w-full sm:w-auto px-5 py-4 rounded-xl text-xs sm:text-sm font-bold bg-[#16A34A] hover:bg-[#15803d] text-white flex items-center justify-center gap-2 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShare}
                    className="w-full sm:w-auto px-4 py-4 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 text-xs font-bold"
                    title="Share Product Link"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="sm:hidden">Share Product</span>
                  </button>
                </div>

                {/* Unique Shareable Product URL Bar */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Direct Product Link
                    </span>
                    <span className="text-xs font-mono font-bold text-[#061B45] block truncate">
                      {shareUrl}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyProductLink}
                    className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:border-[#FF7900] text-[#061B45] text-xs font-bold inline-flex items-center justify-center gap-1.5 shrink-0 transition-colors"
                  >
                    {linkCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#FF7900]" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Overview & Activation Notice */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-3">
            <h2 className="text-lg sm:text-xl font-black text-[#061B45]">
              Overview & Key Capabilities
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {activeProduct.detailedDescription || activeProduct.shortDescription}
            </p>
          </div>

          <div className="lg:col-span-5 space-y-6">
            {activeProduct.fulfillmentInstructions && (
              <div className="bg-amber-50/80 border border-amber-200 rounded-3xl p-6 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 text-xs font-extrabold uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Activation & Delivery Instructions</span>
                </div>
                <p className="text-xs sm:text-sm text-amber-950/90 leading-relaxed">
                  {activeProduct.fulfillmentInstructions}
                </p>
              </div>
            )}

            {/* Affiliate CTA (Clean — no auto 10%, no 30-day, no purchase policy leak) */}
            <div className="bg-[#061B45] text-white rounded-3xl p-6 border border-[#143977] space-y-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#FF9200] block">
                {settings.affiliateGuide?.promoEyebrow || 'Zeek Softwares Affiliate Programme'}
              </span>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {configuredProductRate > 0 ? (
                  <>
                    Share your personal referral link and earn{' '}
                    <strong className="text-white tabular-nums">{configuredProductRate}%</strong>{' '}
                    commission on eligible purchases of {activeProduct.name}.
                  </>
                ) : (
                  'Share your personal referral link across our entire software catalog and earn commissions on eligible customer purchases.'
                )}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={onBecomeAffiliate}
                  className="btn-zeek-orange px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Become an Affiliate</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenAffiliateGuide}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 inline-flex items-center gap-1.5 transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5 text-[#FF9200]" />
                  <span>{settings.affiliateGuide?.buttonText || 'How to Earn'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-12 space-y-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl sm:text-2xl font-black text-[#061B45]">
                Explore Related Software Plans
              </h2>
              <button
                type="button"
                onClick={onBackToProducts}
                className="text-xs font-extrabold text-[#FF7900] hover:underline uppercase tracking-wider"
              >
                View Full Catalog →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {relatedProducts.map((rel) => (
                <div
                  key={rel.id}
                  onClick={() => onSelectProduct(rel)}
                  className="group cursor-pointer bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-lg hover:border-[#FF7900]/50 transition-all flex flex-col justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 p-1.5 shrink-0 flex items-center justify-center">
                      <img
                        src={rel.image}
                        alt={rel.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-black text-[#061B45] group-hover:text-[#FF7900] transition-colors truncate">
                        {rel.name}
                      </h3>
                      <span className="text-[11px] font-semibold text-slate-500 block">
                        {rel.duration}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-base font-black text-[#FF7900] tabular-nums">
                      ₦{rel.price.toLocaleString('en-NG')}
                    </span>
                    <span className="text-xs font-bold text-[#061B45] inline-flex items-center gap-1">
                      <span>View Plan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
