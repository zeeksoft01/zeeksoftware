import React, { useState } from 'react';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  X,
  ExternalLink,
  Lock,
  Building,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api/client';
import { Order } from '../types';

interface PaystackTestModalProps {
  reference: string;
  orderId: string;
  amount: number;
  onClose: () => void;
  onPaymentSuccess: (order: Order) => void;
}

export const PaystackTestModal: React.FC<PaystackTestModalProps> = ({
  reference,
  orderId,
  amount,
  onClose,
  onPaymentSuccess,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [channel, setChannel] = useState<'card' | 'transfer'>('card');

  const formattedAmount = amount.toLocaleString('en-NG');

  const handleSimulateSuccess = async () => {
    setIsProcessing(true);
    setErrorMsg('');

    try {
      // Calls server verify endpoint
      const result = await api.verifyPaystack(reference);

      if (result.status && result.order) {
        try {
          confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
        } catch {}
        onPaymentSuccess(result.order);
      } else {
        throw new Error(result.message || 'Payment verification returned false.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        
        {/* Paystack Test Branding Banner */}
        <div className="bg-[#001D4A] text-white p-5 border-b border-blue-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm border border-emerald-500/40">
              P
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 block">
                PAYSTACK SECURE GATEWAY
              </span>
              <h4 className="text-sm font-bold text-white">Test Mode Checkout</h4>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-left">
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-blue-950">
              <Lock className="w-3.5 h-3.5 text-blue-700" />
              <span>Paystack Interactive Test Sandbox</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              This sandbox validates your server-side order calculation, transaction reference generation, and database verification webhook logic without charging real bank accounts.
            </p>
          </div>

          {/* Amount Due Box */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Order Reference:</span>
              <strong className="text-slate-800 font-mono text-[11px]">{reference}</strong>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Order ID:</span>
              <strong className="text-slate-800">{orderId}</strong>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700">Total Charge:</span>
              <span className="text-xl font-black text-[#001D4A]">₦{formattedAmount}</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Payment channels */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setChannel('card')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                channel === 'card'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Test Card</span>
            </button>
            <button
              type="button"
              onClick={() => setChannel('transfer')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                channel === 'transfer'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              <Building className="w-4 h-4" />
              <span>Pay with Transfer</span>
            </button>
          </div>

          {channel === 'transfer' && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">
                Paystack Dynamic Virtual Account (Test):
              </span>
              <p className="font-mono font-bold text-slate-800">Wema Bank / Paystack: 9920192841</p>
              <p className="text-[10px] text-slate-400">Expires in 30 minutes</p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleSimulateSuccess}
              disabled={isProcessing}
              className="w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isProcessing ? 'Verifying with Backend...' : 'Simulate Successful Payment'}</span>
            </button>

            <button
              onClick={onClose}
              disabled={isProcessing}
              className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Cancel Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
