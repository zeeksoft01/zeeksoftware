import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { FloatingWhatsApp } from './components/FloatingWhatsApp';
import { FloatingAffiliateButton } from './components/FloatingAffiliateButton';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderLookupModal } from './components/OrderLookupModal';
import { CartModal, CartItem } from './components/CartModal';
import { PaystackTestModal } from './components/PaystackTestModal';
import { AuthPortalModal } from './components/AuthPortalModal';
import { HomePage } from './pages/HomePage';
import { ProductsPage } from './pages/ProductsPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { PolicyPage } from './pages/PolicyPage';
import { AffiliateGuidePage } from './pages/AffiliateGuidePage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { ProductDeliveryPage } from './pages/ProductDeliveryPage';
import { EmailPreferencesPage } from './pages/EmailPreferencesPage';
import { AdminPage } from './pages/AdminPage';
import { Product, Order, SystemUser, Affiliate } from './types';
import { api, BootstrapResponse } from './api/client';
import { findProductByIdentifier, getProductPath } from './utils/productUrl';
import { Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<
    'home' | 'products' | 'product' | 'about' | 'policies' | 'contact' | 'affiliate-guide' | 'delivery' | 'preferences'
  >('home');
  const [selectedProductIdentifier, setSelectedProductIdentifier] = useState<string>('');
  const [deliveryRoute, setDeliveryRoute] = useState<{
    orderId: string;
    token?: string;
    email?: string;
  } | null>(null);
  const [preferencesToken, setPreferencesToken] = useState<string>('');
  const [policySubTab, setPolicySubTab] = useState<string>('privacy');
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('All Tools');

  // Bootstrap Data State
  const [data, setData] = useState<BootstrapResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Cart State (Persisted in localStorage)
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('zeek_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modals
  const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null);
  const [checkoutItems, setCheckoutItems] = useState<CartItem[] | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [authRegisterRole, setAuthRegisterRole] = useState<'affiliate' | 'user'>('affiliate');

  // Unified Auth State (single token & user for Affiliate and Admin)
  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('zeek_auth_token') || null;
    } catch {
      return null;
    }
  });
  const [authUser, setAuthUser] = useState<SystemUser | null>(() => {
    try {
      const saved = localStorage.getItem('zeek_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleAuthSuccess = (payload: {
    token: string;
    user: SystemUser;
    affiliate?: Affiliate | null;
  }) => {
    setAuthToken(payload.token);
    setAuthUser(payload.user);
    try {
      localStorage.setItem('zeek_auth_token', payload.token);
      localStorage.setItem('zeek_auth_user', JSON.stringify(payload.user));
      localStorage.removeItem('zeek_admin_token');
      localStorage.removeItem('zeek_admin_user');
      localStorage.removeItem('zeek_affiliate_token');
    } catch {}
  };

  const handleLogout = () => {
    setAuthToken(null);
    setAuthUser(null);
    setIsAdminOpen(false);
    try {
      localStorage.removeItem('zeek_auth_token');
      localStorage.removeItem('zeek_auth_user');
      localStorage.removeItem('zeek_admin_token');
      localStorage.removeItem('zeek_admin_user');
      localStorage.removeItem('zeek_affiliate_token');
    } catch {}
  };

  useEffect(() => {
    if (!authToken) return;
    api
      .authMe(authToken)
      .then((res) => {
        setAuthUser(res.user);
        try {
          localStorage.setItem('zeek_auth_user', JSON.stringify(res.user));
        } catch {}
      })
      .catch(() => {
        handleLogout();
      });
  }, []);

  // Dynamically update document favicon when custom faviconUrl is provided
  useEffect(() => {
    if (data?.settings?.faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = data.settings.faviconUrl;
    }
  }, [data?.settings?.faviconUrl]);

  // Paystack Test Simulation Modal
  const [paystackTestModal, setPaystackTestModal] = useState<{
    reference: string;
    orderId: string;
    amount: number;
  } | null>(null);

  // Live Paystack Return Verification Modal
  const [paystackVerifyState, setPaystackVerifyState] = useState<{
    status: 'verifying' | 'success' | 'error';
    message: string;
    order?: Order;
  } | null>(null);

  // Load Bootstrap Store Data
  const loadStoreData = async () => {
    try {
      const bootstrap = await api.getBootstrap();
      setData(bootstrap);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLoadError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const syncRouteFromLocation = () => {
    try {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      const queryProduct = params.get('product');
      const productMatch = path.match(/^\/product\/([^/]+)\/?$/i);
      const deliveryMatch = path.match(/^\/delivery\/([^/]+)\/?$/i);
      const prefsMatch = path.match(/^\/preferences\/([^/]+)\/?$/i);

      if (deliveryMatch?.[1]) {
        setDeliveryRoute({
          orderId: decodeURIComponent(deliveryMatch[1]),
          token: params.get('token') || undefined,
          email: params.get('email') || undefined,
        });
        setCurrentTab('delivery');
      } else if (prefsMatch?.[1]) {
        setPreferencesToken(decodeURIComponent(prefsMatch[1]));
        setCurrentTab('preferences');
      } else if (productMatch?.[1]) {
        setSelectedProductIdentifier(decodeURIComponent(productMatch[1]));
        setCurrentTab('product');
      } else if (queryProduct) {
        setSelectedProductIdentifier(queryProduct);
        setCurrentTab('product');
      } else if (path === '/affiliate-guide') {
        setCurrentTab('affiliate-guide');
      } else if (path === '/products') {
        setCurrentTab('products');
      }
    } catch {}
  };

  useEffect(() => {
    loadStoreData();
    syncRouteFromLocation();

    const handlePopState = () => {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      if (
        path.match(/^\/product\/([^/]+)\/?$/i) ||
        path.match(/^\/delivery\/([^/]+)\/?$/i) ||
        path.match(/^\/preferences\/([^/]+)\/?$/i) ||
        params.get('product')
      ) {
        syncRouteFromLocation();
      } else if (path === '/products') {
        setCurrentTab('products');
      } else if (path === '/affiliate-guide') {
        setCurrentTab('affiliate-guide');
      } else {
        setCurrentTab('home');
      }
    };
    window.addEventListener('popstate', handlePopState);

    // Check URL parameters for Paystack return, test checkout, or affiliate referral code
    const urlParams = new URLSearchParams(window.location.search);
    const path = window.location.pathname;

    const refCode = urlParams.get('ref');
    if (refCode && refCode.trim().length >= 3) {
      const cleanRef = refCode.trim().toUpperCase();
      try {
        localStorage.setItem('zeek_referral_code', cleanRef);
        const days = data?.settings?.referralCookieDays || 30;
        document.cookie = `zeek_ref=${encodeURIComponent(cleanRef)}; max-age=${days * 86400}; path=/; SameSite=Lax`;
      } catch {}
      api.trackReferralClick(cleanRef, path).catch(() => {});
    }

    const txRef = urlParams.get('reference') || urlParams.get('trxref') || '';
    if (path === '/paystack-test-checkout' && txRef) {
      const orderId = urlParams.get('orderId') || '';
      const amt = Number(urlParams.get('amount')) || 4000;
      setPaystackTestModal({ reference: txRef, orderId, amount: amt });
    } else if ((path === '/payment-verify' || urlParams.has('reference') || urlParams.has('trxref')) && txRef) {
      setPaystackVerifyState({
        status: 'verifying',
        message: 'Confirming your Paystack transaction with our backend...',
      });
      api
        .verifyPaystack(txRef)
        .then((res) => {
          if (res.status && res.order) {
            setPaystackVerifyState({
              status: 'success',
              message: res.message || 'Payment verified and confirmed!',
              order: res.order,
            });
            try {
              window.history.replaceState({}, '', '/');
            } catch {}
          } else {
            setPaystackVerifyState({
              status: 'error',
              message: res.message || 'Payment verification could not be completed.',
            });
          }
        })
        .catch((err: unknown) => {
          setPaystackVerifyState({
            status: 'error',
            message: err instanceof Error ? err.message : 'Payment verification failed.',
          });
        });
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Reconcile Cart Prices whenever store bootstrap products update (e.g. Admin updates USD exchange rate)
  useEffect(() => {
    if (!data?.allProducts?.length) return;
    const productMap = new Map(data.allProducts.map((p) => [p.id, p]));
    setCartItems((prev) => {
      let changed = false;
      const next = prev.map((item) => {
        const fresh = productMap.get(item.product.id);
        if (fresh && (fresh.price !== item.product.price || fresh.usdPrice !== item.product.usdPrice)) {
          changed = true;
          return { ...item, product: fresh };
        }
        return item;
      });
      return changed ? next : prev;
    });
  }, [data?.allProducts]);

  // Sync Cart to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('zeek_cart', JSON.stringify(cartItems));
    } catch {}
  }, [cartItems]);

  // Cart Handlers
  const handleAddToCart = (product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const handleUpdateCartQuantity = (productId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((i) => {
          if (i.product.id === productId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  // Open Dedicated Product Page with unique shareable URL
  const handleOpenProductPage = (prod: Product) => {
    setDetailProduct(null);
    setSelectedProductIdentifier(prod.id);
    setCurrentTab('product');
    try {
      const nextPath = getProductPath(prod);
      if (window.location.pathname !== nextPath) {
        window.history.pushState({ productId: prod.id }, '', nextPath);
      }
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Open Verified Order Delivery Page (Admin-configured destination & digital downloads)
  const openOrderDelivery = (orderId: string, email?: string, token?: string) => {
    setIsLookupOpen(false);
    setPaystackVerifyState(null);
    setPaystackTestModal(null);
    setDeliveryRoute({ orderId, email, token });
    setCurrentTab('delivery');
    try {
      const qs = new URLSearchParams();
      if (token) qs.set('token', token);
      if (email) qs.set('email', email);
      const nextPath = `/delivery/${encodeURIComponent(orderId)}${qs.toString() ? `?${qs.toString()}` : ''}`;
      window.history.pushState({ orderId }, '', nextPath);
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Navigation Handler
  const handleNavigate = (tab: string, sub?: string) => {
    try {
      if (
        window.location.pathname.startsWith('/product/') ||
        window.location.pathname.startsWith('/delivery/') ||
        window.location.pathname.startsWith('/preferences/') ||
        new URLSearchParams(window.location.search).has('product')
      ) {
        const cleanUrl = tab === 'products' ? '/products' : '/';
        window.history.pushState({}, '', cleanUrl);
      }
    } catch {}

    if (tab === 'policies') {
      setCurrentTab('policies');
      if (sub) setPolicySubTab(sub);
    } else if (tab === 'products') {
      setCurrentTab('products');
      if (sub) setProductCategoryFilter(sub);
      else setProductCategoryFilter('All Tools');
    } else {
      setCurrentTab(tab as any);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Unified Become an Affiliate destination across all client pages
  const openAffiliatePortal = () => {
    setAuthModalMode(authToken ? 'login' : 'register');
    setAuthRegisterRole('affiliate');
    setIsAuthOpen(true);
  };

  // WhatsApp Enquiry on Product
  const handleWhatsAppEnquiry = (product: Product) => {
    if (!data?.settings) return;
    const cleanNum = (data.settings.internationalWhatsApp || '2347045200361').replace(/\D/g, '');
    const msg = `Hello Zeek Softwares, I am interested in ${product.name} (${product.duration}) for ₦${product.price.toLocaleString('en-NG')}. Please assist me with order activation.`;
    window.open(`https://wa.me/${cleanNum}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#061B45] text-white flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF7900] to-[#FF9200] flex items-center justify-center shadow-xl shadow-orange-500/30 animate-pulse">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
        <h2 className="text-xl font-black tracking-tight">ZEEK SOFTWARES</h2>
        <p className="text-xs text-slate-400">Loading catalog & subsidized digital tools...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <h2 className="text-xl font-bold text-red-600">Failed to connect to store services</h2>
        <p className="text-xs text-slate-500">{loadError || 'Could not load bootstrap database records.'}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-zeek-orange px-5 py-2 rounded-xl text-xs font-bold uppercase"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const { products, allProducts, categories, heroSlides, benefitCards, reviews, settings, faqs, policies } = data;
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const activeRouteProduct =
    currentTab === 'product'
      ? findProductByIdentifier(allProducts?.length ? allProducts : products, selectedProductIdentifier)
      : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] overflow-x-hidden">
      
      {/* 1. Sticky Navigation Header */}
      <Header
        currentTab={
          currentTab === 'product'
            ? 'products'
            : currentTab === 'delivery' || currentTab === 'preferences'
            ? 'home'
            : currentTab
        }
        onNavigate={handleNavigate}
        cartCount={cartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenLookup={() => setIsLookupOpen(true)}
        onOpenAdmin={() => {
          if (authToken && authUser?.role === 'admin') {
            setIsAdminOpen(true);
          } else {
            setAuthModalMode('login');
            setAuthRegisterRole('affiliate');
            setIsAuthOpen(true);
          }
        }}
        onOpenAuth={(mode = 'login') => {
          setAuthModalMode(mode);
          setAuthRegisterRole('affiliate');
          setIsAuthOpen(true);
        }}
        authUser={authUser}
        settings={settings}
      />

      {/* 2. Main Page View */}
      <main className="flex-1 w-full">
        {currentTab === 'home' && (
          <HomePage
            products={products}
            heroSlides={heroSlides}
            benefitCards={benefitCards}
            reviews={reviews}
            faqs={faqs}
            settings={settings}
            onNavigate={handleNavigate}
            onBuyNow={(prod) => setCheckoutProduct(prod)}
            onViewDetails={handleOpenProductPage}
            onWhatsAppEnquiry={handleWhatsAppEnquiry}
            onAddToCart={handleAddToCart}
            onOpenAffiliate={openAffiliatePortal}
            onOpenAffiliateGuide={() => handleNavigate('affiliate-guide')}
          />
        )}

        {currentTab === 'products' && (
          <ProductsPage
            products={products}
            categories={categories}
            initialCategory={productCategoryFilter}
            onBuyNow={(prod) => setCheckoutProduct(prod)}
            onViewDetails={handleOpenProductPage}
            onWhatsAppEnquiry={handleWhatsAppEnquiry}
            onAddToCart={handleAddToCart}
          />
        )}

        {currentTab === 'product' && activeRouteProduct && (
          <ProductDetailPage
            product={activeRouteProduct}
            allProducts={products}
            settings={settings}
            onBackToProducts={() => handleNavigate('products')}
            onSelectProduct={handleOpenProductPage}
            onBuyNow={(prod) => setCheckoutProduct(prod)}
            onAddToCart={handleAddToCart}
            onWhatsAppEnquiry={handleWhatsAppEnquiry}
            onBecomeAffiliate={openAffiliatePortal}
            onOpenAffiliateGuide={() => handleNavigate('affiliate-guide')}
          />
        )}

        {currentTab === 'product' && !activeRouteProduct && (
          <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
            <h1 className="text-2xl font-black text-[#061B45]">Product Plan Not Found</h1>
            <p className="text-sm text-slate-600">
              This product link may have been updated or removed. Browse all active software plans in our catalog.
            </p>
            <button
              type="button"
              onClick={() => handleNavigate('products')}
              className="btn-zeek-orange px-6 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider"
            >
              Browse Software Catalog
            </button>
          </div>
        )}

        {currentTab === 'about' && (
          <AboutPage
            settings={settings}
            onExploreProducts={() => handleNavigate('products')}
          />
        )}

        {currentTab === 'contact' && (
          <ContactPage settings={settings} />
        )}

        {currentTab === 'policies' && (
          <PolicyPage
            policies={policies}
            settings={settings}
            initialTab={policySubTab}
          />
        )}

        {currentTab === 'affiliate-guide' && (
          <AffiliateGuidePage
            settings={settings}
            onBecomeAffiliate={openAffiliatePortal}
            onSignInAffiliate={() => {
              setAuthModalMode('login');
              setIsAuthOpen(true);
            }}
            onNavigateHome={() => handleNavigate('home')}
          />
        )}

        {currentTab === 'delivery' && deliveryRoute && (
          <ProductDeliveryPage
            orderId={deliveryRoute.orderId}
            initialToken={deliveryRoute.token}
            initialEmail={deliveryRoute.email}
            settings={settings}
            onNavigateHome={() => handleNavigate('home')}
          />
        )}

        {currentTab === 'preferences' && (
          <EmailPreferencesPage
            token={preferencesToken}
            settings={settings}
            onNavigateHome={() => handleNavigate('home')}
          />
        )}
      </main>

      {/* 3. Global Dark Navy Footer */}
      <Footer
        onNavigate={handleNavigate}
        settings={settings}
      />

      {/* 4. Fixed Floating Client CTAs (WhatsApp Bottom-Left & Become an Affiliate Bottom-Right) */}
      {!(isAdminOpen && authToken && authUser?.role === 'admin') && (
        <>
          <FloatingWhatsApp settings={settings} />
          <FloatingAffiliateButton onBecomeAffiliate={openAffiliatePortal} />
        </>
      )}

      {/* --- MODALS --- */}

      {/* Product Detail Modal */}
      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
          onBuyNow={(prod) => {
            setDetailProduct(null);
            setCheckoutProduct(prod);
          }}
          onAddToCart={handleAddToCart}
          onBecomeAffiliate={openAffiliatePortal}
          onOpenAffiliateGuide={() => handleNavigate('affiliate-guide')}
          settings={settings}
        />
      )}

      {/* Checkout Modal (supports single-product Buy Now or multi-item Cart checkout) */}
      {(checkoutProduct || (checkoutItems && checkoutItems.length > 0)) && (
        <CheckoutModal
          product={checkoutProduct || undefined}
          items={checkoutItems || undefined}
          onClose={() => {
            setCheckoutProduct(null);
            setCheckoutItems(null);
          }}
          onOrderSuccess={(order) => {
            const orderedIds = new Set(order.items.map((i) => i.productId));
            setCartItems((prev) => prev.filter((item) => !orderedIds.has(item.product.id)));
          }}
          settings={settings}
        />
      )}

      {/* Shopping Cart Drawer */}
      {isCartOpen && (
        <CartModal
          items={cartItems}
          onClose={() => setIsCartOpen(false)}
          onUpdateQuantity={handleUpdateCartQuantity}
          onRemoveItem={handleRemoveFromCart}
          onCheckout={() => {
            if (cartItems.length > 0) {
              setCheckoutItems(cartItems);
            }
          }}
          onBrowseProducts={() => handleNavigate('products')}
        />
      )}

      {/* Order Lookup Modal */}
      {isLookupOpen && (
        <OrderLookupModal
          onClose={() => setIsLookupOpen(false)}
          settings={settings}
          onOpenOrderDelivery={(orderId, customerEmail) => openOrderDelivery(orderId, customerEmail)}
        />
      )}

      {/* Paystack Test Checkout Modal */}
      {paystackTestModal && (
        <PaystackTestModal
          reference={paystackTestModal.reference}
          orderId={paystackTestModal.orderId}
          amount={paystackTestModal.amount}
          onClose={() => {
            setPaystackTestModal(null);
            try {
              window.history.replaceState({}, '', '/');
            } catch {}
          }}
          onPaymentSuccess={(order) => {
            openOrderDelivery(order.id, order.customerEmail);
          }}
        />
      )}

      {/* Live Paystack Callback Verification Modal */}
      {paystackVerifyState && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 pb-24 sm:pb-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative text-center space-y-4 my-6">
            <button
              onClick={() => setPaystackVerifyState(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            {paystackVerifyState.status === 'verifying' && (
              <>
                <Loader2 className="w-10 h-10 text-[#FF7900] animate-spin mx-auto" />
                <h3 className="text-lg font-extrabold text-[#061B45]">Verifying Payment...</h3>
                <p className="text-xs text-slate-500">{paystackVerifyState.message}</p>
              </>
            )}

            {paystackVerifyState.status === 'success' && (
              <>
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-extrabold text-[#061B45]">Payment Verified!</h3>
                <p className="text-xs text-slate-600">{paystackVerifyState.message}</p>
                {paystackVerifyState.order && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Order ID:</span>
                      <strong className="font-mono text-[#061B45]">{paystackVerifyState.order.id}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Amount Paid:</span>
                      <strong className="text-[#FF7900]">
                        ₦{paystackVerifyState.order.totalAmount.toLocaleString('en-NG')}
                      </strong>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  {paystackVerifyState.order && (
                    <button
                      onClick={() =>
                        openOrderDelivery(
                          paystackVerifyState.order!.id,
                          paystackVerifyState.order!.customerEmail
                        )
                      }
                      className="btn-zeek-orange w-full py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider"
                    >
                      Access Your Product / Delivery
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setPaystackVerifyState(null);
                      setIsLookupOpen(true);
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                  >
                    View Order Status
                  </button>
                </div>
              </>
            )}

            {paystackVerifyState.status === 'error' && (
              <>
                <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-extrabold text-[#061B45]">Verification Issue</h3>
                <p className="text-xs text-red-600">{paystackVerifyState.message}</p>
                <button
                  onClick={() => setPaystackVerifyState(null)}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Unified Account, Registration, Sign In & Affiliate Portal Modal */}
      {isAuthOpen && (
        <AuthPortalModal
          isOpen={isAuthOpen}
          initialMode={authModalMode}
          initialRegisterRole={authRegisterRole}
          authToken={authToken}
          authUser={authUser}
          settings={settings}
          onAuthSuccess={handleAuthSuccess}
          onLogout={handleLogout}
          onOpenAdminDashboard={() => setIsAdminOpen(true)}
          onOpenAffiliateGuide={() => handleNavigate('affiliate-guide')}
          onClose={() => setIsAuthOpen(false)}
        />
      )}

      {/* Admin Dashboard View (only accessible once authenticated as admin) */}
      {isAdminOpen && authToken && authUser?.role === 'admin' && (
        <AdminPage
          authToken={authToken}
          authUser={authUser}
          onLogout={handleLogout}
          onClose={() => setIsAdminOpen(false)}
          onRefreshPublicData={loadStoreData}
        />
      )}
    </div>
  );
}
