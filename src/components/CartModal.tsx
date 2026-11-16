import React from 'react';
import { X, Trash2, ArrowRight, ShoppingBag, Plus, Minus, Clock } from 'lucide-react';
import { Product } from '../types';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartModalProps {
  items: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: () => void;
  onBrowseProducts: () => void;
}

export const CartModal: React.FC<CartModalProps> = ({
  items,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  onBrowseProducts,
}) => {
  const totalAmount = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const formattedTotal = totalAmount.toLocaleString('en-NG');

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-5 bg-[#061B45] text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#FF7900]" />
            <h3 className="text-base font-extrabold tracking-tight">
              Your Software Cart ({items.reduce((c, i) => c + i.quantity, 0)})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#0c2a63] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 text-slate-500">
              <div className="w-16 h-16 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-800">Your Cart is Empty</h4>
              <p className="text-xs text-slate-500 max-w-xs">
                Explore our collection of premium AI tools, productivity apps, and creative software at subsidized rates.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onBrowseProducts();
                }}
                className="btn-zeek-orange px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider"
              >
                Browse Products
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.product.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex gap-3 relative group"
              >
                <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 p-2 shrink-0 flex items-center justify-center">
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="text-sm font-black text-[#061B45] line-clamp-1">
                        {item.product.name}
                      </h4>
                      <button
                        onClick={() => onRemoveItem(item.product.id)}
                        className="text-slate-400 hover:text-red-500 p-1"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium mt-0.5">
                      <Clock className="w-3 h-3 text-[#FF7900]" />
                      <span>{item.product.duration}</span>
                      <span>•</span>
                      <span className="text-[#FF7900] font-bold">₦{item.product.price.toLocaleString('en-NG')}</span>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden">
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, -1)}
                        className="p-1 hover:bg-slate-100 text-slate-600"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2.5 text-xs font-bold text-slate-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, 1)}
                        className="p-1 hover:bg-slate-100 text-slate-600"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="text-xs font-extrabold text-[#061B45]">
                      ₦{(item.product.price * item.quantity).toLocaleString('en-NG')}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Checkout Summary */}
        {items.length > 0 && (
          <div className="p-5 bg-white border-t border-slate-200 space-y-4">
            <div className="flex justify-between items-center text-sm font-bold text-slate-700">
              <span>Subtotal:</span>
              <span className="text-xl font-black text-[#061B45]">
                ₦{formattedTotal}
              </span>
            </div>

            <p className="text-[11px] text-slate-400">
              Taxes included. Digital license credentials or activation invitation delivered securely after payment verification.
            </p>

            <button
              onClick={() => {
                onClose();
                onCheckout();
              }}
              className="btn-zeek-orange w-full py-3.5 rounded-xl text-xs sm:text-sm font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
