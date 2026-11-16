import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  SlidersHorizontal,
  Clock,
  Sparkles,
  ArrowUpDown,
  ShoppingBag,
  X,
  Filter,
} from 'lucide-react';
import { Product } from '../types';
import { ProductCard } from '../components/ProductCard';
import { api } from '../api/client';

interface ProductsPageProps {
  products: Product[];
  categories: string[];
  initialCategory?: string;
  onBuyNow: (product: Product) => void;
  onViewDetails: (product: Product) => void;
  onWhatsAppEnquiry: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({
  products,
  categories,
  initialCategory,
  onBuyNow,
  onViewDetails,
  onWhatsAppEnquiry,
  onAddToCart,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'All Tools');
  const [selectedDuration, setSelectedDuration] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'name'>('featured');

  const durations = ['all', '1 Month', '6 Months', '1 Year', '18 Months', 'Lifetime'];

  const [remoteProducts, setRemoteProducts] = useState<Product[]>(products);

  useEffect(() => {
    setRemoteProducts(products);
  }, [products]);

  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  // Query backend /api/products when category or search changes
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const fetched = await api.getProducts(
          selectedCategory !== 'All Tools' ? selectedCategory : undefined,
          searchQuery.trim() || undefined
        );
        if (active) {
          setRemoteProducts(fetched);
        }
      } catch {
        // Retain current catalog if request is aborted or offline
      }
    }, 180);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [selectedCategory, searchQuery]);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    return remoteProducts.filter((p) => {
      // Category filter
      if (selectedCategory !== 'All Tools' && p.category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }

      // Duration filter
      if (selectedDuration !== 'all' && p.duration.toLowerCase() !== selectedDuration.toLowerCase()) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesDesc = p.shortDescription.toLowerCase().includes(q);
        const matchesCat = p.category.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesCat) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
    });
  }, [remoteProducts, selectedCategory, selectedDuration, searchQuery, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All Tools');
    setSelectedDuration('all');
    setSortBy('featured');
  };

  const hasActiveFilters =
    searchQuery || selectedCategory !== 'All Tools' || selectedDuration !== 'all' || sortBy !== 'featured';

  return (
    <div className="py-12 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-orange-100/70 text-[#FF7900] text-xs font-extrabold uppercase tracking-widest border border-orange-200">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Digital Marketplace</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#061B45] tracking-tight">
            Find Your Next Premium Digital Tool.
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Browse our available collection of AI tools, creative software, productivity applications, and digital subscriptions at subsidized rates.
          </p>
        </div>

        {/* Filter & Search Bar Toolbar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            
            {/* Search Input */}
            <div className="md:col-span-6 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tools by name, features, or keywords..."
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FF7900]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Duration Filter Dropdown */}
            <div className="md:col-span-3 relative">
              <select
                value={selectedDuration}
                onChange={(e) => setSelectedDuration(e.target.value)}
                className="w-full py-2.5 px-3 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7900] text-slate-700 font-medium"
              >
                <option value="all">Duration: All Plans</option>
                <option value="1 Month">1 Month Access</option>
                <option value="6 Months">6 Months Access</option>
                <option value="1 Year">1 Year Plan</option>
                <option value="18 Months">18 Months Access</option>
                <option value="Lifetime">Lifetime License</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="md:col-span-3 relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full py-2.5 px-3 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7900] text-slate-700 font-medium"
              >
                <option value="featured">Sort: Popular & Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name">Alphabetical (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2 scrollbar-none">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#061B45] text-white shadow-sm ring-2 ring-orange-500/30'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Active Filters Clear Bar */}
          {hasActiveFilters && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Showing {filteredProducts.length} matching plans</span>
              <button
                onClick={resetFilters}
                className="text-[#FF7900] hover:text-[#FF9200] font-bold flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset all filters</span>
              </button>
            </div>
          )}
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-lg mx-auto space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Filter className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#061B45]">No Software Plans Match Your Criteria</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              We couldn't find any products with your current search or category filters. Try resetting the filters or enquire on WhatsApp for custom software arrangements.
            </p>
            <button
              onClick={resetFilters}
              className="btn-zeek-orange px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider inline-flex"
            >
              Show All Available Plans
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product, idx) => (
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
        )}
      </div>
    </div>
  );
};
