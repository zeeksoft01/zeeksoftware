import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  Copy,
  Check,
  LogOut,
  Wallet,
  Shield,
  Key,
  Lock,
  Mail,
  Send,
  MessageCircle,
  ArrowRight,
  Loader2,
  BookOpen,
} from 'lucide-react';
import {
  SiteSettings,
  SystemUser,
  Affiliate,
  AffiliateCommission,
  AffiliateWithdrawal,
  ReferralAttribution,
} from '../types';
import { api } from '../api/client';

interface AuthPortalModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register';
  initialRegisterRole?: 'affiliate' | 'user';
  authToken: string | null;
  authUser: SystemUser | null;
  settings: SiteSettings;
  onAuthSuccess: (payload: {
    token: string;
    user: SystemUser;
    affiliate?: Affiliate | null;
  }) => void;
  onLogout: () => void;
  onOpenAdminDashboard: () => void;
  onOpenAffiliateGuide?: () => void;
  onClose: () => void;
}

export const AuthPortalModal: React.FC<AuthPortalModalProps> = ({
  isOpen,
  initialMode = 'login',
  authToken,
  authUser,
  settings,
  onAuthSuccess,
  onLogout,
  onOpenAdminDashboard,
  onOpenAffiliateGuide,
  onClose,
}) => {
  const [authTab, setAuthTab] = useState<'login' | 'register'>(initialMode);
  const [useMasterKey, setUseMasterKey] = useState(false);

  // General Sign In fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Become Affiliate Registration fields (default role: 'affiliate')
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);

  // Become-affiliate fields if an inactive 'user' account signs in
  const [becomeBankName, setBecomeBankName] = useState('');
  const [becomeAccountNumber, setBecomeAccountNumber] = useState('');
  const [becomeAccountName, setBecomeAccountName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // Affiliate dashboard state when user.role === 'affiliate'
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalAffiliate, setPortalAffiliate] = useState<Affiliate | null>(null);
  const [portalCommissions, setPortalCommissions] = useState<AffiliateCommission[]>([]);
  const [portalWithdrawals, setPortalWithdrawals] = useState<AffiliateWithdrawal[]>([]);
  const [portalReferredCustomers, setPortalReferredCustomers] = useState<ReferralAttribution[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAuthTab(initialMode);
      setErrorMessage('');
      setNoticeMessage('');
      setUseMasterKey(false);
    }
  }, [isOpen, initialMode]);

  const loadAffiliatePortal = async (tok: string) => {
    setPortalLoading(true);
    setErrorMessage('');
    try {
      const data = await api.getAffiliateDashboard(tok);
      setPortalAffiliate(data.affiliate);
      setPortalCommissions(data.commissions || []);
      setPortalWithdrawals(data.withdrawals || []);
      setPortalReferredCustomers(data.referredCustomers || []);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load affiliate dashboard.');
    } finally {
      setPortalLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && authToken && authUser?.role === 'affiliate') {
      loadAffiliatePortal(authToken);
    } else {
      setPortalAffiliate(null);
    }
  }, [isOpen, authToken, authUser?.role]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setNoticeMessage('');
    setIsSubmitting(true);
    try {
      const res = await api.authLogin(
        loginPassword,
        useMasterKey ? undefined : loginEmail.trim()
      );
      onAuthSuccess({
        token: res.token,
        user: res.user,
        affiliate: res.affiliate,
      });
      setLoginPassword('');
      if (res.affiliate) {
        setPortalAffiliate(res.affiliate);
      }
      if (res.user.role === 'admin') {
        onClose();
        onOpenAdminDashboard();
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setNoticeMessage('');
    setIsSubmitting(true);
    try {
      const res = await api.authRegister({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        role: 'affiliate',
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
        marketingConsent,
      });
      onAuthSuccess({
        token: res.token,
        user: res.user,
        affiliate: res.affiliate,
      });
      if (res.affiliate) {
        setPortalAffiliate(res.affiliate);
      }
      setNoticeMessage('Welcome! Your Affiliate Partner account is now active.');
      setPassword('');
      setMarketingConsent(false);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBecomeAffiliate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    setErrorMessage('');
    setNoticeMessage('');
    setIsSubmitting(true);
    try {
      const res = await api.becomeAffiliate(authToken, {
        bankName: becomeBankName.trim(),
        accountNumber: becomeAccountNumber.trim(),
        accountName: becomeAccountName.trim(),
      });
      onAuthSuccess({
        token: res.token,
        user: res.user,
        affiliate: res.affiliate,
      });
      setPortalAffiliate(res.affiliate);
      setNoticeMessage('Your Affiliate Partner profile is now active!');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not activate affiliate profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    setErrorMessage('');
    setNoticeMessage('');
    const amt = Number(withdrawAmount);
    if (!amt || amt <= 0) {
      setErrorMessage('Enter a valid withdrawal amount.');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.requestAffiliateWithdrawal(authToken, amt);
      setWithdrawAmount('');
      setNoticeMessage('Withdrawal request submitted successfully.');
      await loadAffiliatePortal(authToken);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to submit withdrawal request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyReferralLink = (code: string) => {
    const link = `${window.location.origin}/?ref=${code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const openWhatsAppApproval = (aff: Affiliate) => {
    const cleanNum = (settings.internationalWhatsApp || '2347045200361').replace(/\D/g, '');
    const msg = `Hello Zeek Softwares Admin, I registered as an Affiliate!\n\nName: ${aff.fullName}\nEmail: ${aff.email}\nReferral Code: ${aff.referralCode}\nUser ID: ${aff.userId}\nBank: ${aff.bankName} (${aff.accountNumber} - ${aff.accountName})`;
    window.open(`https://wa.me/${cleanNum}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 pb-24 sm:pb-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden relative my-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#061B45] text-white p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#FF7900] mb-2">
            <Sparkles className="w-4 h-4 text-[#FF7900]" />
            <span>Zeek Softwares Account</span>
          </div>

          <h3 className="text-2xl font-black tracking-tight text-white">
            {authToken && authUser
              ? `Welcome, ${authUser.fullName || authUser.name || authUser.email}`
              : authTab === 'login'
              ? 'Sign In to Your Account'
              : settings.affiliateGuide?.registerTitle?.trim() || 'Become Affiliate'}
          </h3>
          <p className="text-xs text-slate-300 mt-1 max-w-md">
            {authToken && authUser
              ? 'Unified account access for affiliate partners and verified administrators.'
              : authTab === 'login'
              ? 'General sign in for all Zeek Softwares affiliates and verified admins.'
              : settings.affiliateGuide?.registerSubtitle?.trim() ||
                'Join the Zeek Softwares Affiliate Programme and earn commissions on eligible referrals.'}
          </p>

          {!authToken && (
            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage('');
                  setNoticeMessage('');
                  setAuthTab('login');
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  authTab === 'login'
                    ? 'bg-[#FF7900] text-white'
                    : 'bg-white/10 text-slate-200 hover:bg-white/20'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setErrorMessage('');
                  setNoticeMessage('');
                  setAuthTab('register');
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  authTab === 'register'
                    ? 'bg-[#FF7900] text-white'
                    : 'bg-white/10 text-slate-200 hover:bg-white/20'
                }`}
              >
                Become Affiliate
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {errorMessage}
            </div>
          )}
          {noticeMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              {noticeMessage}
            </div>
          )}

          {/* SIGNED IN VIEW */}
          {authToken && authUser ? (
            <div className="space-y-5">
              {/* Account Summary Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-[#061B45]">
                      {authUser.fullName || authUser.name}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#061B45] text-white text-[10px] font-bold uppercase">
                      {authUser.role}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                      {authUser.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">{authUser.email}</p>
                  <p className="text-[10px] text-slate-400 font-mono">User _id: {authUser._id}</p>
                </div>

                <button
                  type="button"
                  onClick={onLogout}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>

              {/* ADMIN ROLE ACTION */}
              {authUser.role === 'admin' && (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black text-[#061B45] flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-[#FF7900]" />
                      <span>Administrator Access Verified</span>
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Manage products, orders, users, affiliates, and site settings.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAdminDashboard();
                    }}
                    className="btn-zeek-orange px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0"
                  >
                    <span>Open Admin</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* AFFILIATE ROLE PORTAL */}
              {authUser.role === 'affiliate' && (
                portalLoading || !portalAffiliate ? (
                  <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#FF7900]" />
                    <span>Loading your affiliate earnings dashboard...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Referral Link */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase text-slate-600">
                          Your Personal Storewide Referral Link ({portalAffiliate.referralCode})
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-slate-300">
                        <span className="text-xs font-mono font-bold text-[#061B45] truncate">
                          {window.location.origin}/?ref={portalAffiliate.referralCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyReferralLink(portalAffiliate.referralCode)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#061B45] hover:bg-[#0c2a63] text-white text-[11px] font-bold flex items-center gap-1 transition-colors shrink-0"
                          title="Copy Link"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-[#FF7900]" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        One link works for every product in the store and tracks your referred customers across repeat visits.
                      </p>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Available</span>
                        <span className="text-sm font-black text-emerald-700 tabular-nums">
                          ₦{portalAffiliate.availableBalance.toLocaleString('en-NG')}
                        </span>
                      </div>
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Earned</span>
                        <span className="text-sm font-black text-[#061B45] tabular-nums">
                          ₦{portalAffiliate.totalEarned.toLocaleString('en-NG')}
                        </span>
                      </div>
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Clicks / Sales</span>
                        <span className="text-sm font-black text-[#FF7900] tabular-nums">
                          {portalAffiliate.totalClicks} / {portalAffiliate.totalReferredSalesCount}
                        </span>
                      </div>
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Referred Users</span>
                        <span className="text-sm font-black text-[#061B45] tabular-nums">
                          {portalReferredCustomers.length}
                        </span>
                      </div>
                    </div>

                    {onOpenAffiliateGuide && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenAffiliateGuide();
                        }}
                        className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#061B45] text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-[#FF7900]" />
                        <span>{settings.affiliateGuide?.buttonText || 'How to Earn From Our Affiliate'}</span>
                      </button>
                    )}

                    {/* Request Payout */}
                    <form
                      onSubmit={handleRequestWithdrawal}
                      className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2"
                    >
                      <label className="text-[11px] font-bold uppercase text-[#061B45] flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-[#FF7900]" />
                        <span>
                          Request Payout (Min ₦{(settings.minWithdrawalAmount || 100).toLocaleString('en-NG')})
                        </span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          name="withdrawAmount"
                          autoComplete="off"
                          min={settings.minWithdrawalAmount || 100}
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder="Amount in NGN"
                          className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                        />
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="btn-zeek-orange px-4 py-2 rounded-xl text-xs font-bold uppercase disabled:opacity-50"
                        >
                          Withdraw
                        </button>
                      </div>
                    </form>

                    {/* Recent Commissions & Withdrawals */}
                    <div className="text-xs space-y-1.5 max-h-36 overflow-y-auto">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Recent Commissions ({portalCommissions.length}) & Withdrawals ({portalWithdrawals.length})
                      </span>
                      {portalWithdrawals.map((w) => (
                        <div
                          key={w.id}
                          className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-200"
                        >
                          <span className="font-mono text-[11px]">{w.id}</span>
                          <span className="font-bold">₦{w.amount.toLocaleString('en-NG')}</span>
                          <span className="text-[10px] font-semibold text-slate-600">{w.status}</span>
                        </div>
                      ))}
                      {portalCommissions.map((c) => (
                        <div
                          key={c.id}
                          className="flex justify-between p-2 rounded-lg bg-emerald-50/50 border border-emerald-100"
                        >
                          <span>{c.productName}</span>
                          <span className="font-bold text-emerald-700">
                            +₦{c.commissionAmount.toLocaleString('en-NG')}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => openWhatsAppApproval(portalAffiliate)}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Contact Admin on WhatsApp</span>
                    </button>
                  </div>
                )
              )}

              {/* LEGACY/INACTIVE 'user' ROLE: CAN ACTIVATE AFFILIATE PROFILE */}
              {authUser.role === 'user' && (
                <form
                  onSubmit={handleBecomeAffiliate}
                  className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3"
                >
                  <div>
                    <h4 className="text-xs font-black text-[#061B45] uppercase tracking-wider">
                      Become Affiliate
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Standard user features are currently inactive. Link your Nigerian bank account below to activate your Affiliate Partner profile (User _id: {authUser._id}).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      name="bankName"
                      autoComplete="on"
                      required
                      value={becomeBankName}
                      onChange={(e) => setBecomeBankName(e.target.value)}
                      placeholder="Bank Name *"
                      className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                    />
                    <input
                      type="text"
                      name="accountNumber"
                      autoComplete="on"
                      required
                      value={becomeAccountNumber}
                      onChange={(e) => setBecomeAccountNumber(e.target.value)}
                      placeholder="Account Number *"
                      className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                    />
                    <input
                      type="text"
                      name="accountName"
                      autoComplete="name"
                      required
                      value={becomeAccountName}
                      onChange={(e) => setBecomeAccountName(e.target.value)}
                      placeholder="Account Name *"
                      className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-zeek-orange w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                  >
                    {isSubmitting ? 'Activating...' : 'Become Affiliate'}
                  </button>
                </form>
              )}
            </div>
          ) : authTab === 'login' ? (
            /* GENERAL LOGIN FORM */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {!useMasterKey && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      name="email"
                      autoComplete="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FF7900]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  {useMasterKey ? 'Master Secret Key (.env)' : 'Password'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  {useMasterKey ? (
                    <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  )}
                  <input
                    type="password"
                    name={useMasterKey ? 'adminKey' : 'password'}
                    autoComplete={useMasterKey ? 'off' : 'current-password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder={
                      useMasterKey
                        ? 'Enter ADMIN_SECRET_KEY from .env...'
                        : 'Enter your account password'
                    }
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FF7900]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-zeek-orange w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50"
              >
                {isSubmitting ? 'Signing In...' : 'Sign In'}
              </button>

              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                <button
                  type="button"
                  onClick={() => {
                    setUseMasterKey(!useMasterKey);
                    setErrorMessage('');
                  }}
                  className="hover:text-[#061B45] underline"
                >
                  {useMasterKey ? 'Sign in with Email & Password' : 'Admin Master Key (.env)'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('register');
                    setErrorMessage('');
                  }}
                  className="font-bold text-[#FF7900] hover:underline"
                >
                  New partner? Become Affiliate
                </button>
              </div>
            </form>
          ) : (
            /* GENERAL REGISTRATION FORM (BECOME AFFILIATE - DEFAULT ROLE: AFFILIATE) */
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <TrendingUp className="w-4 h-4 text-[#FF7900] mx-auto mb-0.5" />
                  <span className="block text-xs font-extrabold text-[#061B45]">
                    {(settings.defaultCommissionRate ?? 0) > 0
                      ? `${settings.defaultCommissionRate}% Base`
                      : 'Per-Product'}
                  </span>
                  <span className="text-[10px] text-slate-500">Commission</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <DollarSign className="w-4 h-4 text-emerald-600 mx-auto mb-0.5" />
                  <span className="block text-xs font-extrabold text-[#061B45] tabular-nums">
                    ₦{(settings.minWithdrawalAmount ?? 100).toLocaleString('en-NG')} Min
                  </span>
                  <span className="text-[10px] text-slate-500">Bank Payout</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <ShieldCheck className="w-4 h-4 text-blue-600 mx-auto mb-0.5" />
                  <span className="block text-xs font-extrabold text-[#061B45]">
                    1 Unique Link
                  </span>
                  <span className="text-[10px] text-slate-500">All Store Products</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Babatunde Adeyemi"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    WhatsApp / Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="tel"
                    autoComplete="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234 812 345 6789"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Password (min 6 chars) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#061B45] block mb-2">
                  Payout Bank Account Details <span className="text-red-500">*</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    name="bankName"
                    autoComplete="on"
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Bank Name (OPay / GTBank)"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                  <input
                    type="text"
                    name="accountNumber"
                    autoComplete="on"
                    required
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Account Number"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                  <input
                    type="text"
                    name="accountName"
                    autoComplete="name"
                    required
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Account Name"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2 text-[11px] text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={(e) => setMarketingConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-[#FF7900] focus:ring-[#FF7900]"
                />
                <span>
                  Send me partner tips, campaign updates, and promotional announcements via email (optional).
                </span>
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-zeek-orange w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Creating Account...' : 'Become Affiliate'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
