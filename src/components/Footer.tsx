import React from 'react';
import {
  MessageCircle,
  Send,
  Mail,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  PhoneCall,
  Clock,
} from 'lucide-react';
import { SiteSettings } from '../types';

interface FooterProps {
  onNavigate: (tab: string, subSection?: string) => void;
  settings: SiteSettings;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, settings }) => {
  const currentYear = new Date().getFullYear();
  const cleanWhatsApp = settings.internationalWhatsApp.replace(/\D/g, '');

  return (
    <footer className="bg-[#041230] text-slate-300 border-t border-[#0b2762] pt-16 pb-24 sm:pb-16 relative overflow-hidden">
      {/* Decorative ambient background */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-14">
          {/* Brand Column */}
          <div className="space-y-4">
            <div
              className="flex items-center gap-3 cursor-pointer group inline-flex"
              onClick={() => onNavigate('home')}
            >
              {settings.logoUrl || settings.lightLogoUrl ? (
                <img
                  src={settings.lightLogoUrl || settings.logoUrl}
                  alt={settings.storeName || 'Zeek Softwares'}
                  style={{ maxWidth: `${settings.logoWidth || 160}px` }}
                  className="max-h-11 w-auto object-contain group-hover:scale-105 transition-transform"
                />
              ) : (
                <>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF7900] to-[#FF9200] flex items-center justify-center shadow-lg border border-orange-400/30">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-xl font-extrabold tracking-tight text-white group-hover:text-orange-400 transition-colors">
                      ZEEK <span className="text-[#FF7900]">SOFTWARES</span>
                    </span>
                    <p className="text-[10px] font-bold text-orange-400 tracking-wider uppercase">
                      {settings.slogan || 'THE TOTAL SOFTWARE SOLUTION'}
                    </p>
                  </div>
                </>
              )}
            </div>

            <p className="text-sm font-semibold text-white">
              {settings.tagline}
            </p>

            <p className="text-xs text-slate-400 leading-relaxed">
              Helping creators, students, professionals, and businesses discover useful digital tools and premium AI applications at affordable, subsidized prices.
            </p>

            <div className="pt-2 flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#081e4b] text-orange-400 border border-orange-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Merchant
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#081e4b] text-emerald-400 border border-emerald-500/20">
                <Clock className="w-3.5 h-3.5" />
                Fast Activation
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider border-l-2 border-[#FF7900] pl-2.5">
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm font-medium">
              <li>
                <button
                  onClick={() => onNavigate('home')}
                  className="hover:text-[#FF7900] transition-colors"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('products')}
                  className="hover:text-[#FF7900] transition-colors"
                >
                  Products
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('about')}
                  className="hover:text-[#FF7900] transition-colors"
                >
                  About Us
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('policies', 'privacy')}
                  className="hover:text-[#FF7900] transition-colors"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('policies', 'refund')}
                  className="hover:text-[#FF7900] transition-colors"
                >
                  Refund Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('policies', 'renewal')}
                  className="hover:text-[#FF7900] transition-colors"
                >
                  Renewal Guidelines
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('affiliate-guide')}
                  className="hover:text-[#FF7900] transition-colors text-left"
                >
                  {settings.affiliateGuide?.buttonText || 'How to Earn From Our Affiliate'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('contact')}
                  className="hover:text-[#FF7900] transition-colors"
                >
                  Contact Us
                </button>
              </li>
            </ul>
          </div>

          {/* Connect With Us */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider border-l-2 border-[#FF7900] pl-2.5">
              Connect With Us
            </h4>
            <ul className="space-y-2.5 text-sm font-medium">
              <li>
                <a
                  href={`https://wa.me/${cleanWhatsApp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-[#FF7900] transition-colors group"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span>WhatsApp Support</span>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              </li>
              <li>
                <a
                  href={`https://t.me/${settings.telegramUsername.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-[#FF7900] transition-colors group"
                >
                  <Send className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
                  <span>Telegram Support</span>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              </li>
              <li>
                <a
                  href={settings.whatsappCommunityUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-[#FF7900] transition-colors group"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span>WhatsApp Community</span>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              </li>
              <li>
                <a
                  href={settings.telegramChannelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-[#FF7900] transition-colors group"
                >
                  <Send className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
                  <span>Telegram Community</span>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${settings.supportEmail}`}
                  className="flex items-center gap-2 hover:text-[#FF7900] transition-colors group"
                >
                  <Mail className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform" />
                  <span>Email Support</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Details Column */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider border-l-2 border-[#FF7900] pl-2.5">
              Contact Details
            </h4>
            <div className="space-y-3 text-xs leading-relaxed">
              <div className="bg-[#061b45] p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-start gap-2.5">
                  <PhoneCall className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                      WhatsApp Support
                    </span>
                    <a
                      href={`https://wa.me/${cleanWhatsApp}`}
                      className="text-white hover:text-orange-400 font-bold text-sm"
                    >
                      {settings.supportWhatsApp}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 pt-2 border-t border-slate-800">
                  <Send className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                      Telegram Username
                    </span>
                    <a
                      href={`https://t.me/${settings.telegramUsername.replace('@', '')}`}
                      className="text-white hover:text-orange-400 font-bold"
                    >
                      {settings.telegramUsername}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 pt-2 border-t border-slate-800">
                  <Mail className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                      Support Email
                    </span>
                    <a
                      href={`mailto:${settings.supportEmail}`}
                      className="text-white hover:text-orange-400 font-bold"
                    >
                      {settings.supportEmail}
                    </a>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 pt-1">
                Business Currency: <span className="text-white font-bold">Nigerian Naira (NGN / ₦)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#0b2762] pt-8 space-y-4">
          {/* Trademark Notice */}
          <p className="text-[11px] text-slate-400 leading-relaxed text-center max-w-4xl mx-auto">
            Third-party product names, logos, and trademarks remain the property of their respective owners. Zeek Softwares does not claim official affiliation or endorsement unless expressly stated and verified. Plan durations represent merchant-described subscription arrangements.
          </p>

          {/* Copyright */}
          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 pt-2 gap-3">
            <p>© {currentYear} Zeek Softwares. All rights reserved.</p>
            <div className="flex items-center gap-6 text-slate-400">
              <button
                onClick={() => onNavigate('policies', 'privacy')}
                className="hover:text-white transition-colors"
              >
                Privacy
              </button>
              <button
                onClick={() => onNavigate('policies', 'refund')}
                className="hover:text-white transition-colors"
              >
                Refunds
              </button>
              <button
                onClick={() => onNavigate('policies', 'renewal')}
                className="hover:text-white transition-colors"
              >
                Renewals
              </button>
              <button
                onClick={() => onNavigate('contact')}
                className="hover:text-white transition-colors"
              >
                Help Desk
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
