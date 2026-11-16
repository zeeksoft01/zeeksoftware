import React, { useEffect, useState } from 'react';
import {
  Shield,
  RefreshCw,
  RotateCcw,
  Clock,
  Mail,
  MessageCircle,
  FileText,
  Users,
} from 'lucide-react';
import { LegalPolicies, SiteSettings } from '../types';

interface PolicyPageProps {
  policies: LegalPolicies;
  settings: SiteSettings;
  initialTab?: string;
}

const renderFormattedPolicy = (rawText: string) => {
  const blocks = (rawText || '')
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return (
      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
        Policy details are currently being updated by our team. Contact customer support for immediate assistance.
      </p>
    );
  }

  return blocks.map((block, idx) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 1 && (lines[0].endsWith(':') || lines[0].length < 48)) {
      return (
        <h3 key={idx} className="text-base font-bold text-[#061B45] pt-2">
          {lines[0].replace(/:$/, '')}
        </h3>
      );
    }

    const bulletLines = lines.filter((l) => /^[-•*]\s+/.test(l) || /^\d+\.\s+/.test(l));
    if (bulletLines.length > 0 && bulletLines.length === lines.length) {
      return (
        <ul key={idx} className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600">
          {lines.map((line, lIdx) => (
            <li key={lIdx}>{line.replace(/^([-•*]|\d+\.)\s+/, '')}</li>
          ))}
        </ul>
      );
    }

    const firstIsHeading =
      lines.length > 1 && (lines[0].endsWith(':') || /^[A-Z][A-Za-z\s&]+$/.test(lines[0]));

    if (firstIsHeading) {
      const rest = lines.slice(1);
      const restAreBullets = rest.every((l) => /^[-•*]\s+/.test(l) || /^\d+\.\s+/.test(l));
      return (
        <div key={idx} className="space-y-2">
          <h3 className="text-base font-bold text-[#061B45]">
            {lines[0].replace(/:$/, '')}
          </h3>
          {restAreBullets ? (
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600">
              {rest.map((line, lIdx) => (
                <li key={lIdx}>{line.replace(/^([-•*]|\d+\.)\s+/, '')}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {rest.join('\n')}
            </p>
          )}
        </div>
      );
    }

    return (
      <p key={idx} className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
        {block}
      </p>
    );
  });
};

export const PolicyPage: React.FC<PolicyPageProps> = ({
  policies,
  settings,
  initialTab = 'privacy',
}) => {
  const resolveTab = (tab?: string): 'privacy' | 'refund' | 'renewal' | 'affiliate' => {
    if (tab === 'refund') return 'refund';
    if (tab === 'renewal') return 'renewal';
    if (tab === 'affiliate') return 'affiliate';
    return 'privacy';
  };

  const [activeTab, setActiveTab] = useState<'privacy' | 'refund' | 'renewal' | 'affiliate'>(
    resolveTab(initialTab)
  );

  useEffect(() => {
    setActiveTab(resolveTab(initialTab));
  }, [initialTab]);

  const cleanNumber = (settings.internationalWhatsApp || '2347045200361').replace(/\D/g, '');

  const tabContentMap: Record<
    'privacy' | 'refund' | 'renewal' | 'affiliate',
    { eyebrow: string; title: string; body: string }
  > = {
    privacy: {
      eyebrow: 'Legal Document',
      title: 'Privacy Policy',
      body: policies.privacyPolicy,
    },
    refund: {
      eyebrow: 'Customer Assurance',
      title: 'Refund Policy',
      body: policies.refundPolicy,
    },
    renewal: {
      eyebrow: 'Plan Continuity',
      title: 'Subscription Renewal Guidelines',
      body: policies.renewalGuidelines,
    },
    affiliate: {
      eyebrow: 'Partner Guidelines',
      title: 'Affiliate Programme Terms',
      body:
        policies.affiliateTerms ||
        'Zeek Softwares affiliates promote software plans using a single personal referral link across all products.',
    },
  };

  const activeContent = tabContentMap[activeTab];

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      {/* Header Banner */}
      <section className="bg-[#061B45] text-white py-14 sm:py-16 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 text-[#FF7900] text-xs font-bold uppercase tracking-widest border border-orange-500/30">
            <Shield className="w-3.5 h-3.5" />
            <span>Customer Protection & Guidelines</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
            Policies & Guidelines
          </h1>

          <p className="text-sm text-slate-300 max-w-xl mx-auto">
            Clear, transparent policies regarding data protection, refund reviews, subscription renewals, and affiliate guidelines.
          </p>

          <div className="pt-2 text-xs text-slate-400 flex items-center justify-center gap-2">
            <Clock className="w-3.5 h-3.5 text-orange-400" />
            <span>Last Updated: {policies.lastUpdated || '2026-11-15'}</span>
          </div>
        </div>
      </section>

      {/* Main Content & Navigation Tabs */}
      <section className="py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Responsive Tabs Navigation */}
          <div className="flex flex-wrap items-center justify-center gap-2 border-b border-slate-200 pb-4">
            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold tracking-wider uppercase transition-all flex items-center gap-2 ${
                activeTab === 'privacy'
                  ? 'bg-[#061B45] text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <FileText className="w-4 h-4 text-[#FF7900]" />
              <span>Privacy Policy</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('refund')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold tracking-wider uppercase transition-all flex items-center gap-2 ${
                activeTab === 'refund'
                  ? 'bg-[#061B45] text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <RotateCcw className="w-4 h-4 text-[#FF7900]" />
              <span>Refund Policy</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('renewal')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold tracking-wider uppercase transition-all flex items-center gap-2 ${
                activeTab === 'renewal'
                  ? 'bg-[#061B45] text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <RefreshCw className="w-4 h-4 text-[#FF7900]" />
              <span>Renewal Guidelines</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('affiliate')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold tracking-wider uppercase transition-all flex items-center gap-2 ${
                activeTab === 'affiliate'
                  ? 'bg-[#061B45] text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Users className="w-4 h-4 text-[#FF7900]" />
              <span>Affiliate Terms</span>
            </button>
          </div>

          {/* Dynamic Admin-Managed Policy Content */}
          <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200/90 shadow-sm space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-[#FF7900] uppercase tracking-wider">
                {activeContent.eyebrow}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#061B45] mt-1">
                {activeContent.title}
              </h2>
            </div>

            <div className="space-y-4">
              {renderFormattedPolicy(activeContent.body)}
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 mt-6">
              <h3 className="text-sm font-bold text-[#061B45]">Need Assistance?</h3>
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <a
                  href={`https://wa.me/${cleanNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-bold text-[#16A34A] hover:underline"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp: {settings.supportWhatsApp}</span>
                </a>
                <a
                  href={`mailto:${settings.supportEmail}`}
                  className="inline-flex items-center gap-1.5 font-bold text-[#FF7900] hover:underline"
                >
                  <Mail className="w-4 h-4" />
                  <span>Email: {settings.supportEmail}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
