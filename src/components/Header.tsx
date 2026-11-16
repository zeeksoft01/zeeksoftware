import React, { useState } from 'react';
import {
  ShoppingBag,
  Menu,
  X,
  Search,
  Shield,
  MessageCircle,
  Sparkles,
  Zap,
  User as UserIcon,
} from 'lucide-react';
import { SiteSettings, SystemUser } from '../types';

interface HeaderProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  cartCount: number;
  onOpenCart: () => void;
  onOpenLookup: () => void;
  onOpenAdmin: () => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  authUser?: SystemUser | null;
  settings: SiteSettings;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNavigate,
  cartCount,
  onOpenCart,
  onOpenLookup,
  onOpenAdmin,
  onOpenAuth,
  authUser,
  settings,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { id: 'home', label: 'HOME' },
    { id: 'products', label: 'PRODUCTS' },
    { id: 'about', label: 'ABOUT US' },
    { id: 'policies', label: 'PRIVACY POLICY' },
    { id: 'contact', label: 'CONTACT US' },
  ];

  const handleNavClick = (id: string) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Top Announcement Bar */}
      {settings.announcementActive && settings.announcementText && (
        <div className="w-full bg-gradient-to-r from-[#FF7900] via-[#FF9200] to-[#FF7900] text-white py-2 px-4 text-xs sm:text-sm font-semibold tracking-wide text-center flex items-center justify-center gap-2 shadow-inner">
          <Zap className="w-4 h-4 shrink-0 animate-pulse" />
          <span>{settings.announcementText}</span>
        </div>
      )}

      {/* Main Sticky Header */}
      <header className="sticky top-0 z-40 w-full bg-[#061B45] text-white border-b border-[#0f2e6e] shadow-xl backdrop-blur-md">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14">
          <div className="flex items-center justify-between gap-4 lg:gap-6 h-20 w-full">
            {/* Logo & Brand Identity */}
            <div
              className="flex items-center gap-3 cursor-pointer group shrink-0"
              onClick={() => handleNavClick('home')}
            >
              {settings.lightLogoUrl || settings.logoUrl ? (
                <img
                  src={settings.lightLogoUrl || settings.logoUrl}
                  alt={settings.storeName || 'Zeek Softwares'}
                  style={{ maxWidth: `${settings.logoWidth || 160}px` }}
                  className="max-h-12 w-auto object-contain group-hover:scale-105 transition-transform"
                />
              ) : (
                <>
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF7900] to-[#FF9200] flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-105 transition-transform duration-300 border border-orange-400/40 shrink-0">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex flex-col whitespace-nowrap">
                    <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-white group-hover:text-orange-400 transition-colors">
                      ZEEK <span className="text-[#FF7900]">SOFTWARES</span>
                    </span>
                    <span className="text-[10px] font-semibold tracking-widest text-slate-300 uppercase">
                      {settings.slogan || 'THE TOTAL SOFTWARE SOLUTION'}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Desktop Navigation Links (Centered across full width) */}
            <nav className="hidden lg:flex flex-1 items-center justify-center gap-5 xl:gap-8 min-w-0">
              {navLinks.map((link) => {
                const isActive = currentTab === link.id;
                return (
                  <button
                    key={link.id}
                    onClick={() => handleNavClick(link.id)}
                    className={`text-xs xl:text-sm font-bold tracking-wider uppercase transition-all duration-200 relative py-2 whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? 'text-[#FF7900]'
                        : 'text-slate-200 hover:text-white'
                    }`}
                  >
                    {link.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#FF7900] rounded-full shadow-sm shadow-orange-500/50" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Right Action Cluster */}
            <div className="flex items-center justify-end gap-2 lg:gap-2.5 shrink-0">
              {/* Desktop & Tablet Action Buttons */}
              <div className="hidden sm:flex items-center gap-2 lg:gap-2.5 shrink-0">
                {/* Order Lookup */}
                <button
                  onClick={onOpenLookup}
                  title="Lookup Order Status"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#0c2a63] hover:bg-[#133883] text-slate-200 border border-slate-700/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span>Track Order</span>
                </button>

                {/* Unified Account / Sign In */}
                <button
                  onClick={() => onOpenAuth('login')}
                  title="Sign In / Account"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#0c2a63] hover:bg-[#133883] text-slate-200 border border-slate-700/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <UserIcon className="w-3.5 h-3.5 text-[#FF7900] shrink-0" />
                  {authUser ? (
                    <span className="max-w-[110px] truncate">
                      {authUser.fullName || authUser.name || authUser.email}
                    </span>
                  ) : (
                    <span>Sign In</span>
                  )}
                </button>

                {!authUser && (
                  <button
                    onClick={() => onOpenAuth('register')}
                    title="Become an Affiliate Partner"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-[#FF7900] hover:bg-[#e66d00] text-white transition-colors shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Become Affiliate</span>
                  </button>
                )}

                {/* Shopping Cart */}
                <button
                  onClick={onOpenCart}
                  className="relative p-2.5 rounded-lg bg-[#0c2a63] hover:bg-[#133883] text-white border border-slate-700/60 transition-colors shrink-0 cursor-pointer"
                  title="View Cart"
                >
                  <ShoppingBag className="w-5 h-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#FF7900] text-white text-[11px] font-bold rounded-full flex items-center justify-center animate-bounce shadow-md">
                      {cartCount}
                    </span>
                  )}
                </button>

                {/* Admin Dashboard Shortcut (shown only when signed in as admin) */}
                {authUser?.role === 'admin' && (
                  <button
                    onClick={onOpenAdmin}
                    className="p-2.5 rounded-lg bg-[#081f4d] hover:bg-[#102d6b] text-orange-400 border border-slate-700/80 transition-colors shrink-0 cursor-pointer"
                    title="Admin Dashboard"
                  >
                    <Shield className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Mobile Quick Icons (< 640px) */}
              <div className="flex sm:hidden items-center gap-2 shrink-0">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="p-2 rounded-lg bg-[#0c2a63] text-white"
                  title="Account Sign In"
                >
                  <UserIcon className="w-5 h-5 text-[#FF7900]" />
                </button>

                <button
                  onClick={onOpenCart}
                  className="relative p-2 rounded-lg bg-[#0c2a63] text-white"
                  title="View Cart"
                >
                  <ShoppingBag className="w-5 h-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF7900] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Mobile & Tablet Menu Drawer Toggle (< 1024px) */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg bg-[#0c2a63] hover:bg-[#133883] text-white border border-slate-700/60 shrink-0 cursor-pointer"
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#071C3F] border-b border-[#143977] px-5 py-6 space-y-4 shadow-2xl animate-in slide-in-from-top duration-200">
            <nav className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.id)}
                  className={`text-left py-2 px-3 rounded-lg text-sm font-bold tracking-wider ${
                    currentTab === link.id
                      ? 'bg-[#FF7900] text-white'
                      : 'text-slate-200 hover:bg-[#0c2a63]'
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </nav>

            <div className="pt-4 border-t border-slate-800 flex flex-col gap-3">
              <div className={`grid gap-2 ${authUser?.role === 'admin' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenLookup();
                  }}
                  className="py-2.5 px-2 rounded-lg text-xs font-semibold bg-[#0c2a63] text-slate-200 text-center flex items-center justify-center gap-1"
                >
                  <Search className="w-3.5 h-3.5 text-orange-400" />
                  Track
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('login');
                  }}
                  className="py-2.5 px-2 rounded-lg text-xs font-semibold bg-[#0c2a63] text-slate-200 text-center flex items-center justify-center gap-1"
                >
                  <UserIcon className="w-3.5 h-3.5 text-orange-400" />
                  {authUser ? 'Account' : 'Sign In'}
                </button>

                {authUser?.role === 'admin' && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenAdmin();
                    }}
                    className="py-2.5 px-2 rounded-lg text-xs font-semibold bg-[#081f4d] text-orange-400 text-center flex items-center justify-center gap-1"
                  >
                    <Shield className="w-3.5 h-3.5 text-orange-400" />
                    Admin
                  </button>
                )}
              </div>

              <a
                href={`https://wa.me/${settings.internationalWhatsApp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-lg text-xs font-bold bg-[#16A34A] hover:bg-[#15803d] text-white flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Chat WhatsApp: {settings.supportWhatsApp}
              </a>
            </div>
          </div>
        )}
      </header>
    </>
  );
};
