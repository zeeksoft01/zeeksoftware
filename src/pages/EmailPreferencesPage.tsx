import React, { useEffect, useState } from 'react';
import {
  Mail,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  BellOff,
  BellRing,
  ShieldCheck,
} from 'lucide-react';
import { MarketingConsentStatus, SiteSettings } from '../types';
import { api } from '../api/client';

interface EmailPreferencesPageProps {
  token: string;
  settings: SiteSettings;
  onNavigateHome: () => void;
}

export const EmailPreferencesPage: React.FC<EmailPreferencesPageProps> = ({
  token,
  settings,
  onNavigateHome,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [noticeMsg, setNoticeMsg] = useState('');
  const [reason, setReason] = useState('');
  const [contact, setContact] = useState<{
    email: string;
    fullName: string;
    marketingConsent: MarketingConsentStatus;
    unsubscribedAt?: string;
  } | null>(null);

  useEffect(() => {
    if (!token) {
      setErrorMsg('Invalid email preference link.');
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .getEmailPreferences(token)
      .then((c) => {
        setContact(c);
      })
      .catch((err: unknown) => {
        setErrorMsg(err instanceof Error ? err.message : 'Unable to load preference settings.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleAction = async (action: 'unsubscribe' | 'resubscribe') => {
    setSaving(true);
    setErrorMsg('');
    setNoticeMsg('');
    try {
      const res = await api.updateEmailPreferences(token, { action, reason });
      setContact(res.contact);
      setNoticeMsg(res.message);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[75vh] bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto space-y-6">
        <button
          type="button"
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#061B45] hover:text-[#FF7900] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to {settings.storeName || 'Zeek Softwares'}</span>
        </button>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden">
          <div className="bg-[#061B45] text-white p-6 sm:p-8 border-b-4 border-[#FF7900]">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#FF9200] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Email Subscription & Preferences</span>
            </span>
            <h1 className="text-2xl font-black mt-1">Manage Your Email Preferences</h1>
          </div>

          <div className="p-6 sm:p-8 space-y-5">
            {loading && (
              <div className="py-10 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#FF7900] mx-auto" />
                <p className="text-xs text-slate-500">Loading your subscription preferences...</p>
              </div>
            )}

            {!loading && errorMsg && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {!loading && noticeMsg && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 font-semibold">
                <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
                <span>{noticeMsg}</span>
              </div>
            )}

            {!loading && contact && (
              <div className="space-y-5">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 font-bold text-[#061B45]">
                    <Mail className="w-4 h-4 text-[#FF7900]" />
                    <span>{contact.email}</span>
                  </div>
                  {contact.fullName && (
                    <p className="text-slate-600">Subscriber: {contact.fullName}</p>
                  )}
                  <p className="pt-1">
                    Current Status:{' '}
                    <span
                      className={`inline-block px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                        contact.marketingConsent === 'subscribed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : contact.marketingConsent === 'unsubscribed'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {contact.marketingConsent}
                    </span>
                  </p>
                </div>

                {contact.marketingConsent !== 'unsubscribed' ? (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Unsubscribing stops all promotional campaigns and automated daily tips from{' '}
                      {settings.storeName || 'Zeek Softwares'}. Essential transactional emails about
                      your paid orders or withdrawal requests will still be delivered.
                    </p>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        Optional Feedback Reason
                      </label>
                      <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g. Too frequent, no longer needed..."
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleAction('unsubscribe')}
                      className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <BellOff className="w-4 h-4" />
                      <span>{saving ? 'Updating...' : 'Unsubscribe From Promotional Emails'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      You are currently unsubscribed from promotional campaigns and daily tips.
                      Changed your mind? You can re-subscribe at any time below.
                    </p>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleAction('resubscribe')}
                      className="btn-zeek-orange w-full py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <BellRing className="w-4 h-4" />
                      <span>{saving ? 'Updating...' : 'Re-subscribe to Updates & Offers'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
