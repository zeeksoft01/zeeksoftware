import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Eye,
  Clock,
  Flame,
} from 'lucide-react';
import { Product } from '../types';

interface ProductCarouselProps {
  products: Product[];
  onBuyNow: (product: Product) => void;
  onViewDetails: (product: Product) => void;
  onNavigateToProducts: () => void;
}

export const ProductCarousel: React.FC<ProductCarouselProps> = ({
  products,
  onBuyNow,
  onViewDetails,
  onNavigateToProducts,
}) => {
  const [startIndex, setStartIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Responsive items per page
  const [itemsPerPage, setItemsPerPage] = useState(4);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) setItemsPerPage(1);
      else if (window.innerWidth < 1024) setItemsPerPage(2);
      else if (window.innerWidth < 1280) setItemsPerPage(3);
      else setItemsPerPage(4);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const total = products.length;

  const handleNext = () => {
    if (total <= itemsPerPage) return;
    setStartIndex((prev) => (prev + 1) % total);
  };

  const handlePrev = () => {
    if (total <= itemsPerPage) return;
    setStartIndex((prev) => (prev - 1 + total) % total);
  };

  useEffect(() => {
    if (total <= itemsPerPage || isPaused) return;

    const timer = setInterval(() => {
      handleNext();
    }, 4500);

    return () => clearInterval(timer);
  }, [startIndex, isPaused, total, itemsPerPage]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 50) handleNext();
    else if (diff < -50) handlePrev();
    touchStartX.current = null;
  };

  if (!products.length) return null;

  // Compute circular slice of visible products
  const visibleProducts: Product[] = [];
  for (let i = 0; i < Math.min(itemsPerPage, total); i++) {
    const idx = (startIndex + i) % total;
    visibleProducts.push(products[idx]);
  }

  return (
    <section
      className="py-20 bg-[#071C3F] text-white relative overflow-hidden select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background ambient highlights */}
      <div className="absolute top-1/2 left-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/30 text-xs font-bold uppercase tracking-wider">
              <Flame className="w-3.5 h-3.5 animate-pulse text-[#FF7900]" />
              <span>Trending Subscriptions</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Explore Our Premium Digital Tools
            </h2>

            <p className="text-slate-300 text-sm sm:text-base max-w-2xl font-normal">
              Find the software that fits your goals, your workflow, and your budget. All available subscriptions dynamically loaded from database.
            </p>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateToProducts}
              className="text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors uppercase tracking-wider mr-2 hidden sm:inline"
            >
              Browse All ({total}) →
            </button>

            <button
              onClick={handlePrev}
              className="w-10 h-10 rounded-full bg-[#0c2a63] hover:bg-[#FF7900] text-white flex items-center justify-center transition-all duration-200 border border-slate-700/60 shadow-md"
              aria-label="Previous Product"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={handleNext}
              className="w-10 h-10 rounded-full bg-[#0c2a63] hover:bg-[#FF7900] text-white flex items-center justify-center transition-all duration-200 border border-slate-700/60 shadow-md"
              aria-label="Next Product"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dynamic Multi-Card Slider */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 transition-all duration-500">
          {visibleProducts.map((product, idx) => {
            const formattedPrice = product.price.toLocaleString('en-NG');

            return (
              <div
                key={`${product.id}-${idx}`}
                className="group bg-[#061B45] rounded-2xl border border-slate-700/80 shadow-xl hover:shadow-2xl hover:border-orange-500/50 transition-all duration-300 flex flex-col justify-between overflow-hidden relative"
              >
                {/* Clean Original Logo Display & Badges */}
                <div
                  onClick={() => onViewDetails(product)}
                  className="relative h-48 sm:h-52 w-full overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50 border-b border-slate-200/20 cursor-pointer flex items-center justify-center px-5 pt-11 pb-4"
                >
                  <div className="w-full max-w-[82%] h-[86%] rounded-2xl bg-white border border-slate-200/90 shadow-sm p-2.5 sm:p-3 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                    <img
                      src={product.image}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain drop-shadow-sm"
                      loading="lazy"
                    />
                  </div>

                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase bg-[#061B45] text-white shadow-sm truncate max-w-[55%]">
                      {product.category}
                    </span>

                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-orange-100 text-orange-800 border border-orange-200 flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {product.duration}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => onViewDetails(product)}
                      className="text-left focus:outline-none block w-full"
                    >
                      <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-[#FF9200] transition-colors leading-tight tracking-tight">
                        {product.name}
                      </h3>
                    </button>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-black text-[#FF9200] tabular-nums">
                        ₦{formattedPrice}
                      </span>
                      <span className="text-[11px] font-medium text-slate-300">
                        / {product.duration}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {product.shortDescription}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <button
                      type="button"
                      onClick={() => onBuyNow(product)}
                      className="btn-zeek-orange w-full py-2.5 px-3 rounded-xl text-xs font-extrabold tracking-wider uppercase flex items-center justify-center gap-1.5"
                    >
                      <span>BUY NOW</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onViewDetails(product)}
                      className="w-full py-2 px-3 rounded-lg text-xs font-bold text-slate-200 bg-[#0c2a63] hover:bg-[#12367d] transition-colors text-center flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#FF9200]" />
                      <span>VIEW PRODUCT</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination Dots */}
        <div className="mt-10 flex items-center justify-center gap-2">
          {Array.from({ length: Math.ceil(total / itemsPerPage) }).map((_, idx) => {
            const pageIndex = idx * itemsPerPage;
            const isActive = Math.floor(startIndex / itemsPerPage) === idx;
            return (
              <button
                key={idx}
                onClick={() => setStartIndex(pageIndex)}
                className={`transition-all duration-300 h-2 rounded-full ${
                  isActive ? 'w-8 bg-[#FF7900]' : 'w-2 bg-slate-700 hover:bg-slate-500'
                }`}
                title={`Page ${idx + 1}`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
};
