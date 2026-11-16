import React, { useState } from 'react';
import {
  Clock,
  Sparkles,
  ArrowRight,
  Eye,
  MessageCircle,
  ShoppingBag,
  Link2,
  Check,
} from 'lucide-react';
import { Product } from '../types';
import { copyTextSafe, getProductUrl } from '../utils/productUrl';

interface ProductCardProps {
  product: Product;
  onBuyNow: (product: Product) => void;
  onViewDetails: (product: Product) => void;
  onWhatsAppEnquiry: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onBuyNow,
  onViewDetails,
  onWhatsAppEnquiry,
  onAddToCart,
}) => {
  const [linkCopied, setLinkCopied] = useState(false);
  const formattedPrice = product.price.toLocaleString('en-NG');

  const getDurationColor = (duration: string) => {
    if (duration.includes('Lifetime')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (duration.includes('Year') || duration.includes('18 Months')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (duration.includes('6 Months')) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  };

  const handleCopyProductLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await copyTextSafe(getProductUrl(product));
    if (ok) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  return (
    <div className="group bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col justify-between overflow-hidden relative">
      {/* Top Original Product Logo Showcase */}
      <div
        onClick={() => onViewDetails(product)}
        className="relative h-52 sm:h-56 w-full overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50 border-b border-slate-100 cursor-pointer flex items-center justify-center px-5 pt-12 pb-8"
      >
        <div className="w-full max-w-[82%] h-[84%] rounded-2xl bg-white/95 border border-slate-200/80 shadow-sm p-2.5 sm:p-3 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
          <img
            src={product.image}
            alt={product.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain drop-shadow-sm"
            loading="lazy"
          />
        </div>

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
          <span className="px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-bold bg-[#061B45] text-white shadow-sm truncate max-w-[55%]">
            {product.category}
          </span>

          <span
            className={`px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-extrabold border flex items-center gap-1 shadow-sm shrink-0 ${getDurationColor(
              product.duration
            )}`}
          >
            <Clock className="w-3 h-3" />
            {product.duration}
          </span>
        </div>

        {/* Quick Copy Unique Link button */}
        <button
          type="button"
          onClick={handleCopyProductLink}
          className="absolute bottom-2.5 right-2.5 px-2.5 py-1.5 rounded-lg bg-white/95 hover:bg-[#061B45] text-[#061B45] hover:text-white border border-slate-200 shadow-sm transition-colors flex items-center gap-1 text-[10px] font-bold"
          title="Copy Unique Product Link"
        >
          {linkCopied ? (
            <>
              <Check className="w-3 h-3 text-emerald-500" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Link2 className="w-3 h-3 text-[#FF7900]" />
              <span>Copy Link</span>
            </>
          )}
        </button>
      </div>

      {/* Body Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div className="space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={() => onViewDetails(product)}
              className="text-left focus:outline-none"
            >
              <h3 className="text-lg sm:text-xl font-black text-[#061B45] group-hover:text-[#FF7900] transition-colors leading-tight tracking-tight">
                {product.name}
              </h3>
            </button>
            {product.isFeatured && (
              <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wider bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full flex items-center gap-1 border border-orange-200">
                <Sparkles className="w-2.5 h-2.5" />
                Popular
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-[#FF7900] tabular-nums">
              ₦{formattedPrice}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              / {product.duration}
            </span>
            {product.priceSourceCurrency === 'USD' && product.usdPrice ? (
              <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                (${product.usdPrice} USD)
              </span>
            ) : null}
          </div>

          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {product.shortDescription}
          </p>
        </div>

        {/* Action Controls */}
        <div className="pt-4 mt-4 border-t border-slate-100 space-y-2.5">
          {/* Main Vibrant Orange BUY NOW + Cart Row */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onBuyNow(product)}
              className="btn-zeek-orange flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold tracking-wider uppercase flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#FF7900]/50"
            >
              <span>BUY NOW</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            {onAddToCart && (
              <button
                type="button"
                onClick={() => onAddToCart(product)}
                className="py-3 px-3.5 rounded-xl bg-[#061B45] hover:bg-[#0c2a63] text-white transition-colors flex items-center justify-center shadow-sm"
                title="Add to Cart"
              >
                <ShoppingBag className="w-4 h-4 text-[#FF9200]" />
              </button>
            )}
          </div>

          {/* Secondary Actions: Product Page & WhatsApp Enquiry */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onViewDetails(product)}
              className="py-2 px-3 rounded-lg text-xs font-bold text-[#061B45] bg-slate-100 hover:bg-slate-200 transition-colors text-center flex items-center justify-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-[#FF7900]" />
              <span>View Product</span>
            </button>

            <button
              type="button"
              onClick={() => onWhatsAppEnquiry(product)}
              className="py-2 px-3 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors text-center flex items-center justify-center gap-1.5 border border-emerald-200"
              title="Enquire on WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Enquire</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
