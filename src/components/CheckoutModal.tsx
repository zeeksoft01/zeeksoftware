import React, { useEffect, useState } from 'react';
import {
  X,
  CreditCard,
  Building,
  Coins,
  Send,
  Copy,
  Check,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Product, Order, PaymentMethod, SiteSettings } from '../types';
import { api } from '../api/client';

interface CheckoutItem {
  product: Product;
  quantity: number;
}

interface CheckoutModalProps {
  product?: Product;
  quantity?: number;
  items?: CheckoutItem[];
  onClose: () => void;
  onOrderSuccess: (order: Order) => void;
  settings: SiteSettings;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  product,
  quantity = 1,
  items,
  onClose,
  onOrderSuccess,
  settings,
}) => {
  const checkoutItems: CheckoutItem[] =
    items && items.length > 0
      ? items
      : product
      ? [{ product, quantity }]
      : [];

  const primaryProduct = checkoutItems[0]?.product;

  // Step: 'details' -> 'payment' -> 'confirmed'
  const [step, setStep] = useState<'details' | 'payment' | 'confirmed'>('details');

  // Customer form inputs
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerWhatsApp, setCustomerWhatsApp] = useState('');
  const [proofNote, setProofNote] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);

  // Selected payment method
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Paystack');

  // Manual payment inputs
  const [transactionRef, setTransactionRef] = useState('');
  const [selectedUsdtNetwork, setSelectedUsdtNetwork] = useState(
    settings.usdtNetworks?.[0]?.network || 'USDT (TRC20)'
  );

  useEffect(() => {
    const nets = settings.usdtNetworks || [];
    if (nets.length > 0 && !nets.some((n) => n.network === selectedUsdtNetwork)) {
      setSelectedUsdtNetwork(nets[0].network);
    }
  }, [settings.usdtNetworks, selectedUsdtNetwork]);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const totalAmount = checkoutItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const formattedTotal = totalAmount.toLocaleString('en-NG');
  const summaryTitle =
    checkoutItems.length === 1 && primaryProduct
      ? `${primaryProduct.name} (${primaryProduct.duration})`
      : `${checkoutItems.length} Software Plans (${checkoutItems.reduce((c, i) => c + i.quantity, 0)} items)`;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Step 1: Create Order on backend (server validates price)
  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!customerName.trim() || !customerEmail.trim() || !customerWhatsApp.trim()) {
      setErrorMessage('Please provide your name, valid email, and WhatsApp number.');
      return;
    }

    try {
      setIsLoading(true);
      let storedReferralCode: string | undefined;
      try {
        storedReferralCode = localStorage.getItem('zeek_referral_code') || undefined;
        if (!storedReferralCode && typeof document !== 'undefined') {
          const match = document.cookie
            .split(';')
            .map((c) => c.trim())
            .find((c) => c.startsWith('zeek_ref='));
          if (match) {
            storedReferralCode = decodeURIComponent(match.split('=')[1] || '').trim() || undefined;
          }
        }
      } catch {}

      const newOrder = await api.createOrder({
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerWhatsApp: customerWhatsApp.trim(),
        items: checkoutItems.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        paymentMethod,
        proofNote: proofNote.trim() || undefined,
        referralCode: storedReferralCode,
        marketingConsent,
      });

      setCreatedOrder(newOrder);
      setStep('payment');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2A: Paystack Checkout Flow
  const handlePaystackPayment = async () => {
    if (!createdOrder) return;
    setErrorMessage('');
    setIsLoading(true);

    try {
      const initResult = await api.initializePaystack(createdOrder.id);

      if (initResult.authorizationUrl) {
        if (initResult.authorizationUrl.startsWith('/paystack-test-checkout')) {
          // Open simulation modal / tab
          window.location.href = initResult.authorizationUrl;
        } else {
          // Open official Paystack hosted checkout
          window.location.href = initResult.authorizationUrl;
        }
      } else {
        throw new Error('No checkout authorization URL returned from Paystack API.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setIsLoading(false);
    }
  };

  // Step 2B: Manual Payment Notification (Bank, USDT, Bybit, Binance)
  const handleManualPaymentNotification = async () => {
    if (!createdOrder) return;
    setErrorMessage('');
    setIsLoading(true);

    try {
      const result = await api.submitManualPayment(createdOrder.id, {
        paymentMethod,
        transactionReference: transactionRef.trim() || undefined,
        transactionHash: paymentMethod === 'USDT' ? transactionRef.trim() : undefined,
        proofNote: `Customer selected ${paymentMethod}. Network: ${selectedUsdtNetwork}`,
      });

      setCreatedOrder(result.order);
      setStep('confirmed');

      // Trigger Confetti
      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch {
        // ignore if not supported
      }

      // Open WhatsApp chat in new window
      if (result.whatsappUrl) {
        window.open(result.whatsappUrl, '_blank');
      }

      onOrderSuccess(result.order);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // USDT Calculation
  const usdtRate = settings.usdtNgnRate || 1550;
  const usdtAmount = (totalAmount / usdtRate).toFixed(2);
  const selectedWallet = settings.usdtNetworks?.find((n) => n.network === selectedUsdtNetwork) || settings.usdtNetworks?.[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 pb-24 sm:pb-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl relative overflow-hidden border border-slate-200 my-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-[#061B45] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-300 hover:text-white rounded-lg hover:bg-[#0c2a63] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs font-bold text-orange-400 uppercase tracking-widest mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Secure Checkout</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            {step === 'details' && 'Enter Customer Information'}
            {step === 'payment' && 'Select Your Payment Method'}
            {step === 'confirmed' && 'Order Submitted for Verification'}
          </h3>

          <p className="text-xs text-slate-300 mt-1">
            Order: <strong className="text-white">{summaryTitle}</strong> — <span className="text-[#FF9200] font-bold">₦{formattedTotal}</span>
          </p>
        </div>

        {/* Body Content */}
        <div className="p-6 sm:p-8">
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Customer Details */}
          {step === 'details' && (
            <form onSubmit={handleProceedToPayment} className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 mb-4">
                {checkoutItems.map((item) => (
                  <div key={item.product.id} className="flex justify-between gap-2 text-xs text-slate-600">
                    <span>
                      <strong className="text-[#061B45] font-black">{item.product.name}</strong> ({item.product.duration}) × {item.quantity}
                    </span>
                    <span className="font-bold text-slate-800 shrink-0 tabular-nums">
                      ₦{(item.product.price * item.quantity).toLocaleString('en-NG')}
                    </span>
                  </div>
                ))}
                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-[#061B45]">
                  <span>Total Due (NGN):</span>
                  <span className="text-[#FF7900] text-base">₦{formattedTotal}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  autoComplete="name"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Nwokporo Ezekiel"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FF7900]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Email Address <span className="text-red-500">*</span> (Activation details sent here)
                </label>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="e.g. yourname@example.com"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FF7900]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  WhatsApp Phone Number <span className="text-red-500">*</span> (For fast verification & updates)
                </label>
                <input
                  type="tel"
                  name="tel"
                  autoComplete="tel"
                  required
                  value={customerWhatsApp}
                  onChange={(e) => setCustomerWhatsApp(e.target.value)}
                  placeholder="e.g. 07045200361 or +234..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FF7900]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Special Notes / Account Email for Activation (Optional)
                </label>
                <input
                  type="text"
                  name="activationNote"
                  autoComplete="on"
                  value={proofNote}
                  onChange={(e) => setProofNote(e.target.value)}
                  placeholder="e.g. Canva or CapCut account email to invite"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FF7900]"
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
                  Email me exclusive software deals, helpful tips, and renewal offers from{' '}
                  {settings.storeName || 'Zeek Softwares'} (optional — unsubscribe anytime).
                </span>
              </label>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-zeek-orange w-full py-3.5 rounded-xl text-xs sm:text-sm font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                >
                  <span>{isLoading ? 'Creating Order...' : 'Proceed to Payment (₦' + formattedTotal + ')'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Payment Methods Selection */}
          {step === 'payment' && createdOrder && (
            <div className="space-y-6">
              <div className="bg-orange-50/60 border border-orange-200/80 p-3.5 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block">Generated Order ID:</span>
                  <strong className="text-[#061B45] text-sm">{createdOrder.id}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">Amount Due:</span>
                  <strong className="text-[#FF7900] text-sm">₦{formattedTotal}</strong>
                </div>
              </div>

              {/* Payment Methods Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('Paystack')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    paymentMethod === 'Paystack'
                      ? 'border-[#FF7900] bg-orange-50/40 text-[#061B45] shadow-sm ring-1 ring-[#FF7900]'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-[#FF7900] mb-1.5" />
                  <span className="text-xs font-bold block">Paystack</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">Instant / Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('Direct Bank Transfer')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    paymentMethod === 'Direct Bank Transfer'
                      ? 'border-[#FF7900] bg-orange-50/40 text-[#061B45] shadow-sm ring-1 ring-[#FF7900]'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Building className="w-5 h-5 text-blue-600 mb-1.5" />
                  <span className="text-xs font-bold block">Bank Transfer</span>
                  <span className="text-[10px] text-slate-500 font-semibold">Sterling Bank</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('USDT')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    paymentMethod === 'USDT'
                      ? 'border-[#FF7900] bg-orange-50/40 text-[#061B45] shadow-sm ring-1 ring-[#FF7900]'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Coins className="w-5 h-5 text-emerald-600 mb-1.5" />
                  <span className="text-xs font-bold block">USDT Crypto</span>
                  <span className="text-[10px] text-slate-500 font-semibold">TRC20 / BEP20</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('Bybit')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    paymentMethod === 'Bybit'
                      ? 'border-[#FF7900] bg-orange-50/40 text-[#061B45] shadow-sm ring-1 ring-[#FF7900]'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Send className="w-5 h-5 text-purple-600 mb-1.5" />
                  <span className="text-xs font-bold block">Bybit / Binance</span>
                  <span className="text-[10px] text-slate-500 font-semibold">UID Transfer</span>
                </button>
              </div>

              {/* METHOD 1: PAYSTACK */}
              {paymentMethod === 'Paystack' && (
                <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-100/60 px-3 py-1.5 rounded-lg">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Recommended & Automated Payment</span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Pay securely using your Debit Card, USSD, Apple Pay, or Bank Transfer. If Pay with Transfer is enabled on your merchant account, Paystack generates a temporary dedicated account number during checkout.
                  </p>

                  <div className="pt-2">
                    <button
                      onClick={handlePaystackPayment}
                      disabled={isLoading}
                      className="btn-zeek-orange w-full py-4 rounded-xl text-xs sm:text-sm font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>{isLoading ? 'Connecting to Paystack...' : 'Pay Securely with Paystack (₦' + formattedTotal + ')'}</span>
                      <ExternalLink className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                </div>
              )}

              {/* METHOD 2: DIRECT BANK TRANSFER */}
              {paymentMethod === 'Direct Bank Transfer' && (
                <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[#061B45]">
                      Pay by Direct Bank Transfer
                    </h4>
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                      Manual Verification
                    </span>
                  </div>

                  {/* Bank Account Details Card */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Bank Name:</span>
                      <strong className="text-slate-900">{settings.bankName}</strong>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Account Number:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-extrabold text-[#061B45] tracking-wider">
                          {settings.accountNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(settings.accountNumber, 'account')}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1"
                        >
                          {copiedField === 'account' ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Account Name:</span>
                      <strong className="text-slate-900">{settings.accountName}</strong>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex justify-between text-xs font-bold text-[#061B45]">
                      <span>Exact Amount to Transfer:</span>
                      <span className="text-[#FF7900] text-sm">₦{formattedTotal}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 italic">
                    "Transfer the exact order amount to the bank account above. After making payment, click I've Paid to submit your order details for verification."
                  </p>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Bank Transaction Reference / Session ID (Optional)
                    </label>
                    <input
                      type="text"
                      name="bankReference"
                      autoComplete="off"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      placeholder="e.g. 000013284918239..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#FF7900]"
                    />
                  </div>

                  <button
                    onClick={handleManualPaymentNotification}
                    disabled={isLoading}
                    className="w-full py-3.5 rounded-xl text-xs sm:text-sm font-extrabold uppercase tracking-wider bg-[#16A34A] hover:bg-[#15803d] text-white flex items-center justify-center gap-2 shadow-lg transition-colors disabled:opacity-50"
                  >
                    <span>I'VE PAID — NOTIFY SUPPORT</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* METHOD 3: USDT CRYPTO */}
              {paymentMethod === 'USDT' && (
                <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[#061B45]">
                      USDT Crypto Payment
                    </h4>
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                      Manual Verification Required
                    </span>
                  </div>

                  {/* Network selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Select Blockchain Network:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {settings.usdtNetworks?.map((net) => (
                        <button
                          key={net.network}
                          type="button"
                          onClick={() => setSelectedUsdtNetwork(net.network)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                            selectedUsdtNetwork === net.network
                              ? 'bg-[#061B45] text-white border-[#061B45]'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {net.network}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Address Display */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">USDT Equivalent:</span>
                      <strong className="text-emerald-700 font-mono text-sm">${usdtAmount} USDT</strong>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Rate: 1 USDT = ₦{usdtRate.toLocaleString('en-NG')}
                    </div>

                    <div className="min-w-0">
                      <span className="text-[11px] text-slate-500 block mb-1">
                        Receiving Address ({selectedWallet?.network || selectedUsdtNetwork}):
                      </span>
                      <div className="flex items-stretch gap-2">
                        <div className="flex-1 min-w-0 font-mono text-[11px] bg-slate-50 px-2.5 py-2 rounded-lg border border-slate-200 text-[#061B45] font-bold break-all select-all">
                          {selectedWallet?.address || 'Contact Support for Address'}
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(selectedWallet?.address || '', 'usdt')}
                          className="px-3 py-2 rounded-lg bg-[#061B45] hover:bg-[#0c2a63] text-white text-xs font-bold shrink-0 flex items-center gap-1 transition-colors"
                          title="Copy Wallet Address"
                        >
                          {copiedField === 'usdt' ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="hidden sm:inline">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-[#FF9200]" />
                              <span className="hidden sm:inline">Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 italic">
                    "Only send USDT using the exact blockchain network and receiving address confirmed for this order."
                  </p>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Transaction Hash (TxID) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="transactionHash"
                      autoComplete="off"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      placeholder="Paste your transfer transaction hash here..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#FF7900]"
                    />
                  </div>

                  <button
                    onClick={handleManualPaymentNotification}
                    disabled={isLoading}
                    className="w-full py-3.5 rounded-xl text-xs sm:text-sm font-extrabold uppercase tracking-wider bg-[#16A34A] hover:bg-[#15803d] text-white flex items-center justify-center gap-2 shadow-lg transition-colors disabled:opacity-50"
                  >
                    <span>I'VE PAID — NOTIFY SUPPORT</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* METHOD 4: BYBIT / BINANCE */}
              {paymentMethod === 'Bybit' && (
                <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[#061B45]">
                      Bybit & Binance UID Transfer
                    </h4>
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                      Manual Verification
                    </span>
                  </div>

                  <div className="space-y-3">
                    {/* Bybit UID */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Bybit UID</span>
                        <span className="font-mono text-sm font-extrabold text-[#061B45]">{settings.bybitUid}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(settings.bybitUid, 'bybit')}
                        className="px-2.5 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1"
                      >
                        {copiedField === 'bybit' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copy Bybit</span>
                      </button>
                    </div>

                    {/* Binance UID */}
                    {settings.binanceEnabled && (
                      <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Binance UID</span>
                          <span className="font-mono text-sm font-extrabold text-[#061B45]">{settings.binanceUid}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(settings.binanceUid, 'binance')}
                          className="px-2.5 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1"
                        >
                          {copiedField === 'binance' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>Copy Binance</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-600">
                    Contact Zeek Softwares to confirm the supported Bybit or Binance transfer method and instructions for your order.
                  </p>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Sender Name / UID / Reference
                    </label>
                    <input
                      type="text"
                      name="senderReference"
                      autoComplete="off"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      placeholder="e.g. Sent from Bybit UID 8291..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#FF7900]"
                    />
                  </div>

                  <button
                    onClick={handleManualPaymentNotification}
                    disabled={isLoading}
                    className="w-full py-3.5 rounded-xl text-xs sm:text-sm font-extrabold uppercase tracking-wider bg-[#16A34A] hover:bg-[#15803d] text-white flex items-center justify-center gap-2 shadow-lg transition-colors disabled:opacity-50"
                  >
                    <span>I'VE PAID — NOTIFY SUPPORT</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setStep('details')}
                className="text-xs text-slate-500 hover:text-slate-800 underline block text-center pt-2"
              >
                ← Back to Customer Details
              </button>
            </div>
          )}

          {/* STEP 3: Confirmed / Awaiting Verification Screen */}
          {step === 'confirmed' && createdOrder && (
            <div className="text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <h4 className="text-xl font-extrabold text-[#061B45]">
                  Payment Submitted for Verification!
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  Thank you, <strong>{createdOrder.customerName}</strong>! Your order has been registered in our database. We have opened WhatsApp with your prefilled details so our support team can verify your payment immediately.
                </p>
              </div>

              {/* Order summary box */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Order ID:</span>
                  <strong className="text-[#061B45] font-mono">{createdOrder.id}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Product(s):</span>
                  <span className="font-semibold text-right">{summaryTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount:</span>
                  <span className="font-bold text-[#FF7900]">₦{formattedTotal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                    Awaiting Verification
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <a
                  href={`https://wa.me/${settings.internationalWhatsApp.replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Hello Zeek Softwares,\n\nI have submitted payment for order ${createdOrder.id} (${summaryTitle} - ₦${formattedTotal}). Please verify and activate.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 rounded-xl text-xs sm:text-sm font-bold bg-[#16A34A] hover:bg-[#15803d] text-white flex items-center justify-center gap-2 shadow-lg transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>I'VE PAID — CHAT ON WHATSAPP</span>
                </a>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Close Window
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
