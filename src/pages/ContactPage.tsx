import React, { useState } from 'react';
import {
  MessageCircle,
  Send,
  Mail,
  PhoneCall,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { SiteSettings } from '../types';
import { api } from '../api/client';

interface ContactPageProps {
  settings: SiteSettings;
}

export const ContactPage: React.FC<ContactPageProps> = ({ settings }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsApp, setWhatsApp] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const cleanNumber = (settings.internationalWhatsApp || '2347045200361').replace(/\D/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!fullName.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.submitContact({
        fullName: fullName.trim(),
        email: email.trim(),
        whatsApp: whatsApp.trim() || undefined,
        subject: subject.trim(),
        message: message.trim(),
        marketingConsent,
      });

      setSuccessMsg(res.message);
      setFullName('');
      setEmail('');
      setWhatsApp('');
      setSubject('');
      setMessage('');
      setMarketingConsent(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#F8FAFC]">
      {/* Header Banner */}
      <section className="bg-[#061B45] text-white py-20 relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-orange-500/20 text-[#FF7900] text-xs font-bold uppercase tracking-widest border border-orange-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dedicated Customer Service</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
            Let's Connect.
          </h1>

          <p className="text-lg sm:text-xl text-[#FF9200] font-semibold max-w-2xl mx-auto">
            We're Here to Help You Find the Right Digital Tools.
          </p>

          <p className="text-sm text-slate-300 max-w-2xl mx-auto pt-2 leading-relaxed">
            Have questions about our software plans, payment options, activation process, or subscription renewals? Contact Zeek Softwares through your preferred channel. We're happy to assist with product enquiries, order information, and available support options.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* Left Column: Direct Support Channels */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <span className="text-xs font-bold text-[#FF7900] uppercase tracking-wider block mb-1">
                  Immediate Assistance
                </span>
                <h2 className="text-2xl font-extrabold text-[#061B45]">
                  Direct Support Options
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Connect instantly via WhatsApp, Telegram, or email with our team.
                </p>
              </div>

              {/* Card 1: WhatsApp Support */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-3 hover:border-emerald-300 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-500 block uppercase">
                      Chat With Us on WhatsApp
                    </span>
                    <span className="text-base font-extrabold text-[#061B45]">
                      {settings.supportWhatsApp}
                    </span>
                  </div>
                </div>

                <a
                  href={`https://wa.me/${cleanNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#16A34A] hover:bg-[#15803d] text-white flex items-center justify-center gap-2 transition-colors shadow-md"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Start WhatsApp Chat</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Card 2: Telegram Support */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-3 hover:border-sky-300 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-200">
                    <Send className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-500 block uppercase">
                      Contact Us on Telegram
                    </span>
                    <span className="text-base font-extrabold text-[#061B45]">
                      {settings.telegramUsername}
                    </span>
                  </div>
                </div>

                <a
                  href={`https://t.me/${settings.telegramUsername.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#0284c7] hover:bg-[#0369a1] text-white flex items-center justify-center gap-2 transition-colors shadow-md"
                >
                  <Send className="w-4 h-4" />
                  <span>Message Us on Telegram</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Card 3: Email Support */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-3 hover:border-orange-300 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-200">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-500 block uppercase">
                      Send Us an Email
                    </span>
                    <span className="text-base font-extrabold text-[#061B45] break-all">
                      {settings.supportEmail}
                    </span>
                  </div>
                </div>

                <a
                  href={`mailto:${settings.supportEmail}`}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#061B45] hover:bg-[#0c2a63] text-white flex items-center justify-center gap-2 transition-colors shadow-md"
                >
                  <Mail className="w-4 h-4" />
                  <span>Send Email</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Operational Guarantee info */}
              <div className="bg-slate-100/80 p-5 rounded-2xl border border-slate-200 space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2 font-bold text-[#061B45]">
                  <Clock className="w-4 h-4 text-[#FF7900]" />
                  <span>Customer Support Hours</span>
                </div>
                <p>
                  Active 7 days a week: 8:00 AM – 10:00 PM (WAT / Nigerian Time). Verification requests submitted outside working hours are prioritized on the next business cycle.
                </p>
              </div>
            </div>

            {/* Right Column: Working Contact Form */}
            <div className="lg:col-span-7">
              <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/90 shadow-sm space-y-6">
                <div>
                  <span className="text-xs font-bold text-[#FF7900] uppercase tracking-wider block mb-1">
                    Send a Message
                  </span>
                  <h3 className="text-2xl font-extrabold text-[#061B45]">
                    Contact Form
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Your inquiry is saved securely to our database and notified to our support agents.
                  </p>
                </div>

                {successMsg && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {errorMsg && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        autoComplete="name"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Nwokporo Ezekiel"
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FF7900]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. you@example.com"
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FF7900]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        WhatsApp Number (Optional)
                      </label>
                      <input
                        type="tel"
                        name="tel"
                        autoComplete="tel"
                        value={whatsApp}
                        onChange={(e) => setWhatsApp(e.target.value)}
                        placeholder="e.g. 07045200361"
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FF7900]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Subject <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="subject"
                        autoComplete="on"
                        required
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g. Canva Pro Renewal Inquiry"
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FF7900]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="message"
                      autoComplete="on"
                      required
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Write your question or request in detail..."
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FF7900]"
                    />
                  </div>

                  <label className="flex items-start gap-2.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={marketingConsent}
                      onChange={(e) => setMarketingConsent(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-[#FF7900] focus:ring-[#FF7900]"
                    />
                    <span>
                      Receive promotional updates, productivity software tips, and special offers from{' '}
                      {settings.storeName || 'Zeek Softwares'} by email (optional — you can unsubscribe anytime).
                    </span>
                  </label>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-zeek-orange w-full py-3.5 rounded-xl text-xs sm:text-sm font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                    >
                      <span>{isSubmitting ? 'Sending Message...' : 'Send Message'}</span>
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
