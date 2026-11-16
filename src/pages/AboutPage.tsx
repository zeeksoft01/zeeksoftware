import React from 'react';
import {
  Sparkles,
  Target,
  Compass,
  HeartHandshake,
  CheckCircle2,
  MessageCircle,
  Send,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { SiteSettings } from '../types';

interface AboutPageProps {
  settings: SiteSettings;
  onExploreProducts: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ settings, onExploreProducts }) => {
  return (
    <div className="bg-[#F8FAFC]">
      {/* Hero Banner */}
      <section className="bg-[#061B45] text-white py-20 relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-orange-500/20 text-[#FF7900] text-xs font-bold uppercase tracking-widest border border-orange-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>THE TOTAL SOFTWARE SOLUTION</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
            About Zeek Softwares
          </h1>
          <p className="text-lg sm:text-xl text-[#FF9200] font-semibold max-w-2xl mx-auto">
            Making Premium Digital Tools More Accessible.
          </p>
        </div>
      </section>

      {/* Main About Story */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200/90 shadow-sm space-y-6 text-slate-700 leading-relaxed text-base sm:text-lg">
            <p className="font-semibold text-slate-900 text-lg sm:text-xl">
              At Zeek Softwares, we believe that access to powerful digital tools should be practical and affordable.
            </p>

            <p>
              We specialize in helping students, creators, professionals, entrepreneurs, and businesses find premium AI tools and digital software that support their everyday goals.
            </p>

            <p>
              Whether you're designing social media content, editing videos, improving your writing, exploring artificial intelligence, or building your business online, our aim is to help you discover tools that support your growth.
            </p>

            <p>
              Our approach focuses on affordability, convenience, clear communication, and customer support.
            </p>

            <p>
              We understand how important the right technology can be in today's digital world. That's why we work to make useful software solutions easier to explore and access.
            </p>

            <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-4">
              <button
                onClick={onExploreProducts}
                className="btn-zeek-orange px-6 py-3 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider inline-flex items-center gap-2"
              >
                <span>Explore Available Plans</span>
              </button>
            </div>
          </div>

          {/* Mission, Vision & Commitment Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Mission */}
            <div className="bg-white p-7 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#061B45]">OUR MISSION</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                To make useful premium AI tools and digital software more affordable and accessible to people who want to learn, create, work, and grow.
              </p>
            </div>

            {/* Vision */}
            <div className="bg-white p-7 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#061B45]">OUR VISION</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                To become a recognized digital software brand known for accessibility, dependable service, and customer-focused technology solutions.
              </p>
            </div>

            {/* Commitment */}
            <div className="bg-white p-7 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#061B45]">OUR COMMITMENT</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                We are committed to making the customer journey simple—from discovering products and reviewing available plans to placing orders and receiving support.
              </p>
            </div>
          </div>

          {/* Why Choose Zeek Softwares? */}
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/90 shadow-sm space-y-8">
            <div className="text-center space-y-2">
              <span className="text-xs font-bold text-[#FF7900] uppercase tracking-wider">
                The Zeek Advantage
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#061B45]">
                WHY CHOOSE ZEEK SOFTWARES?
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
                <h4 className="text-base font-bold text-[#061B45] flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#FF7900]" />
                  <span>Affordable Options</span>
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-7">
                  Explore software and digital tools at subsidized rates without unnecessary financial barriers.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
                <h4 className="text-base font-bold text-[#061B45] flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#FF7900]" />
                  <span>Simple Ordering</span>
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-7">
                  Browse available plans and follow a straightforward, transparent purchase process.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
                <h4 className="text-base font-bold text-[#061B45] flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#FF7900]" />
                  <span>Multiple Payment Methods</span>
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-7">
                  Choose from supported payment channels including Paystack, Direct Bank Transfer, USDT, and exchange transfers with clear instructions.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
                <h4 className="text-base font-bold text-[#061B45] flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#FF7900]" />
                  <span>Customer Support</span>
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-7">
                  Connect with our team for order assistance, product enquiries, and renewal guidance whenever needed.
                </p>
              </div>
            </div>
          </div>

          {/* Join Our Community Section */}
          <div className="bg-[#061B45] text-white p-8 sm:p-12 rounded-3xl shadow-xl space-y-6 text-center">
            <span className="text-xs font-bold text-[#FF9200] uppercase tracking-wider block">
              Digital Community
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Join the Zeek Softwares Digital Community
            </h2>
            <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
              Connect with our growing community to discover product updates, digital tools, software offers, and useful technology information.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <a
                href={settings.whatsappCommunityUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3.5 rounded-xl text-xs sm:text-sm font-bold bg-[#16A34A] hover:bg-[#15803d] text-white flex items-center gap-2 shadow-lg transition-transform hover:scale-105"
              >
                <MessageCircle className="w-4 h-4" />
                <span>JOIN WHATSAPP COMMUNITY</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>

              <a
                href={settings.telegramChannelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3.5 rounded-xl text-xs sm:text-sm font-bold bg-[#0284c7] hover:bg-[#0369a1] text-white flex items-center gap-2 shadow-lg transition-transform hover:scale-105"
              >
                <Send className="w-4 h-4" />
                <span>JOIN TELEGRAM COMMUNITY</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
