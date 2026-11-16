import React, { useEffect, useState } from 'react';
import {
  CheckCircle,
  Download,
  ExternalLink,
  MessageCircle,
  Lock,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ArrowLeft,
  FileArchive,
  Clock,
} from 'lucide-react';
import { SiteSettings } from '../types';
import { api } from '../api/client';

interface ProductDeliveryPageProps {
  orderId: string;
  initialToken?: string;
  initialEmail?: string;
  settings: SiteSettings;
  onNavigateHome: () => void;
}

export const ProductDeliveryPage: React.FC<ProductDeliveryPageProps> = ({
  orderId,
  initialToken,
  initialEmail,
  settings,
  onNavigateHome,
}) => {
  const [token] = useState(initialToken || '');
  const [emailInput, setEmailInput] = useState(initialEmail || '');
  const [loading, setLoading] = useState(true);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [bundle, setBundle] = useState<Awaited<ReturnType<typeof api.getOrderDeliveryBundle>> | null>(
    null
  );

  const loadDelivery = async (verifyEmail?: string) => {
    setLoading(true);
    setErrorMsg('');
    setNeedsEmailVerification(false);
    try {
      const res = await api.getOrderDeliveryBundle(orderId, {
        token: token || undefined,
        email: verifyEmail || emailInput.trim() || undefined,
      });
      setBundle(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load order delivery access.';
      if (msg.toLowerCase().includes('verify your purchase email') && !verifyEmail) {
        setNeedsEmailVerification(true);
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDelivery(initialEmail);
  }, [orderId, initialToken]);

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    loadDelivery(emailInput.trim());
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const cleanWa = (settings.internationalWhatsApp || '2347045200361').replace(/\D/g, '');

  return (
    <div className="min-h-[75vh] bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <button
          type="button"
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#061B45] hover:text-[#FF7900] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {settings.storeName || 'Zeek Softwares'}</span>
        </button>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden">
          <div className="bg-[#061B45] text-white p-6 sm:p-8 border-b-4 border-[#FF7900]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#FF9200] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verified Order Delivery</span>
                </span>
                <h1 className="text-2xl sm:text-3xl font-black mt-1">
                  Order <span className="font-mono text-[#FF9200]">{orderId}</span>
                </h1>
              </div>

              {bundle?.paid && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
                  <CheckCircle className="w-4 h-4" />
                  <span>Payment Confirmed</span>
                </span>
              )}
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {loading && (
              <div className="py-12 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#FF7900] mx-auto" />
                <p className="text-xs text-slate-500 font-medium">
                  Verifying payment status & preparing your delivery access...
                </p>
              </div>
            )}

            {!loading && needsEmailVerification && (
              <form
                onSubmit={handleVerifySubmit}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 max-w-md mx-auto"
              >
                <div className="flex items-center gap-2 text-[#061B45] font-bold text-sm">
                  <Lock className="w-4 h-4 text-[#FF7900]" />
                  <span>Verify Purchase Email Address</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  For your security, enter the email address you used during checkout to unlock your
                  verified product delivery links and downloads.
                </p>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Purchase Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Enter your order email address..."
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7900]"
                  />
                </div>
                <button
                  type="submit"
                  className="btn-zeek-orange w-full py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider"
                >
                  Unlock Order Access
                </button>
              </form>
            )}

            {!loading && errorMsg && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs sm:text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
                <div className="space-y-1">
                  <p className="font-bold">Unable to unlock order delivery</p>
                  <p>{errorMsg}</p>
                </div>
              </div>
            )}

            {!loading && bundle && !bundle.paid && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 space-y-3 text-center">
                <Clock className="w-10 h-10 text-amber-600 mx-auto" />
                <h2 className="text-lg font-extrabold text-[#061B45]">{bundle.headline}</h2>
                <p className="text-xs sm:text-sm text-slate-700 max-w-md mx-auto">
                  {bundle.instructions}
                </p>
                <p className="text-xs text-slate-500">
                  Current Status: <strong className="uppercase">{bundle.order.paymentStatus}</strong>
                </p>
                <a
                  href={`https://wa.me/${cleanWa}?text=${encodeURIComponent(
                    `Hello Zeek Softwares, please confirm payment status for Order ${bundle.order.id}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803d] text-white text-xs font-bold mt-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Contact Support on WhatsApp</span>
                </a>
              </div>
            )}

            {!loading && bundle && bundle.paid && (
              <div className="space-y-6">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-1.5">
                  <h2 className="text-lg font-black text-[#061B45]">{bundle.headline}</h2>
                  <p className="text-xs sm:text-sm text-emerald-900">{bundle.instructions}</p>
                  <div className="pt-2 flex flex-wrap gap-4 text-xs text-slate-600">
                    <span>
                      Customer: <strong className="text-[#061B45]">{bundle.order.customerName}</strong>
                    </span>
                    <span>
                      Paid:{' '}
                      <strong className="text-[#FF7900]">
                        ₦{bundle.order.totalAmount.toLocaleString('en-NG')}
                      </strong>
                    </span>
                    <span>
                      Method: <strong className="text-[#061B45]">{bundle.order.paymentMethod}</strong>
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    Your Purchased Product Access ({bundle.items.length})
                  </h3>

                  {bundle.items.map((item) => (
                    <div
                      key={item.productId}
                      className="border border-slate-200 rounded-2xl p-5 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-black text-[#061B45]">
                            {item.productName}
                          </h4>
                          {item.duration && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                              {item.duration}
                            </span>
                          )}
                        </div>

                        {item.destinationType === 'digital_download' && item.digitalFileName && (
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                            <FileArchive className="w-4 h-4 text-[#FF7900]" />
                            <span className="font-mono font-semibold">{item.digitalFileName}</span>
                            {item.digitalFileSize ? (
                              <span className="text-slate-400">
                                ({formatFileSize(item.digitalFileSize)})
                              </span>
                            ) : null}
                          </div>
                        )}

                        <p className="text-[11px] text-slate-500">
                          {item.destinationType === 'digital_download' &&
                            `Protected direct download • Downloaded ${item.downloadCount} time(s)`}
                          {item.destinationType === 'custom_url' &&
                            'Verified external access portal'}
                          {item.destinationType === 'whatsapp' &&
                            'Direct WhatsApp activation support with prefilled order details'}
                        </p>
                      </div>

                      <div className="shrink-0">
                        {!item.downloadEnabled ? (
                          <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-100 text-red-700 text-xs font-bold">
                            <Lock className="w-3.5 h-3.5" />
                            <span>Access Revoked</span>
                          </span>
                        ) : item.destinationType === 'digital_download' ? (
                          <a
                            href={item.destinationUrl}
                            className="btn-zeek-orange px-5 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-2 shadow-md"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download File</span>
                          </a>
                        ) : item.destinationType === 'custom_url' ? (
                          <a
                            href={item.destinationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-zeek-orange px-5 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-2 shadow-md"
                          >
                            <span>Access Product Link</span>
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        ) : (
                          <a
                            href={item.destinationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-5 py-3 rounded-xl bg-[#16A34A] hover:bg-[#15803d] text-white text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-2 shadow-md transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>Continue to WhatsApp</span>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
