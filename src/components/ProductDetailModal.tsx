import React, { useEffect, useState } from 'react';
import {
  X,
  Clock,
  ArrowRight,
  MessageCircle,
  ShieldCheck,
  CheckCircle2,
  PackageCheck,
  Share2,
  ShoppingBag,
  UserPlus,
  BookOpen,
} from 'lucide-react';
import { Product, SiteSettings } from '../types';
import { api } from '../api/client';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onBuyNow: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  onBecomeAffiliate?: () => void;
  onOpenAffiliateGuide?: () => void;
  settings: SiteSettings;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onBuyNow,
  onAddToCart,
  onBecomeAffiliate,
  onOpenAffiliateGuide,
  settings,
}) => {
  const [liveProduct, setLiveProduct] = useState<Product | null>(product);

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
  if (!activeProduct) return null;

  const formattedPrice = activeProduct.price.toLocaleString('en-NG');
  const cleanNumber = settings.internationalWhatsApp.replace(/\D/g, '');

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${activeProduct.name} (${activeProduct.duration}) - Zeek Softwares`,
        text: `Check out ${activeProduct.name} (${activeProduct.duration}) for ₦${formattedPrice} on Zeek Softwares!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleWhatsAppInquiry = () => {
    const msg = `Hello Zeek Softwares, I am interested in ${activeProduct.name} (${activeProduct.duration}) priced at ₦${formattedPrice}. Can you provide more details about activation?`;
    window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 pb-24 sm:pb-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl relative overflow-hidden border border-slate-200 my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-[#FF7900] text-white flex items-center justify-center transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Logo Showcase Banner */}
        <div className="relative bg-gradient-to-b from-slate-50 to-white border-b border-slate-200 p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl bg-white border border-slate-200 shadow-md p-2.5 sm:p-3 shrink-0 flex items-center justify-center">
            <img
              src={activeProduct.image}
              alt={activeProduct.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain drop-shadow-sm"
            />
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2 pr-0 sm:pr-8">
            <span className="inline-block px-2.5 py-1 rounded-md text-xs font-bold uppercase bg-[#061B45] text-white">
              {activeProduct.category}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#061B45] tracking-tight">
              {activeProduct.name}
            </h2>
            <div className="flex flex-wrap items-baseline justify-center sm:justify-start gap-2">
              <span className="text-2xl sm:text-3xl font-black text-[#FF7900] tabular-nums">
                ₦{formattedPrice}
              </span>
              <span className="text-xs text-slate-600 font-semibold">
                / {activeProduct.duration}
              </span>
              {activeProduct.priceSourceCurrency === 'USD' && activeProduct.usdPrice ? (
                <span className="text-[11px] text-slate-500 font-semibold tabular-nums">
                  (${activeProduct.usdPrice} USD)
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Key plan highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-[#FF7900] shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Duration</span>
                <span className="text-xs font-bold text-[#061B45]">{activeProduct.duration}</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Licensing</span>
                <span className="text-xs font-bold text-[#061B45]">Authorized Subsidized</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-2.5 col-span-2 sm:col-span-1">
              <PackageCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Delivery</span>
                <span className="text-xs font-bold text-[#061B45]">Email & WhatsApp</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#061B45]">
              Overview & Capabilities
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed">
              {activeProduct.shortDescription}
            </p>
            <p className="text-xs text-slate-600 leading-relaxed pt-1">
              {activeProduct.detailedDescription}
            </p>
          </div>

          {/* Fulfillment / Activation Notice */}
          {activeProduct.fulfillmentInstructions && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-800 text-xs font-bold uppercase">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Activation & Delivery Notice</span>
              </div>
              <p className="text-xs text-amber-900/90 leading-relaxed">
                {activeProduct.fulfillmentInstructions}
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => {
                onClose();
                onBuyNow(activeProduct);
              }}
              className="btn-zeek-orange w-full sm:flex-1 py-3.5 px-6 rounded-xl text-xs sm:text-sm font-extrabold tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg"
            >
              <span>BUY NOW (₦{formattedPrice})</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {onAddToCart && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAddToCart(activeProduct);
                }}
                className="w-full sm:w-auto px-4 py-3.5 rounded-xl text-xs font-bold bg-[#061B45] hover:bg-[#0c2a63] text-white flex items-center justify-center gap-2 transition-colors"
              >
                <ShoppingBag className="w-4 h-4 text-[#FF9200]" />
                <span>Add to Cart</span>
              </button>
            )}

            <button
              onClick={handleWhatsAppInquiry}
              className="w-full sm:w-auto px-5 py-3.5 rounded-xl text-xs font-bold bg-[#16A34A] hover:bg-[#15803d] text-white flex items-center justify-center gap-2 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp Enquiry</span>
            </button>

            <button
              onClick={handleShare}
              className="w-full sm:w-auto p-3.5 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center"
              title="Share Product"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Prominent Affiliate CTA on Individual Product View */}
          {(onBecomeAffiliate || onOpenAffiliateGuide) && (
            <div className="bg-[#061B45] text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#143977]">
              <div className="space-y-0.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#FF9200] block">
                  Earn Promoting Zeek Softwares
                </span>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {(() => {
                    const rate =
                      activeProduct.commissionRateOverride ??
                      settings.productCommissionRates?.[activeProduct.id] ??
                      settings.defaultCommissionRate ??
                      0;
                    return rate > 0 ? (
                      <>
                        Share one personal referral link across all products and earn{' '}
                        <strong className="text-white tabular-nums">{rate}%</strong>{' '}
                        commission on eligible sales.
                      </>
                    ) : (
                      'Share one personal referral link across all products and earn commissions on eligible sales.'
                    );
                  })()}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {onBecomeAffiliate && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onBecomeAffiliate();
                    }}
                    className="btn-zeek-orange px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Become an Affiliate</span>
                  </button>
                )}
                {onOpenAffiliateGuide && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAffiliateGuide();
                    }}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 inline-flex items-center gap-1.5 transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[#FF9200]" />
                    <span>{settings.affiliateGuide?.buttonText || 'How to Earn'}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
