import React from 'react';
import { Sparkles, ShoppingBag, CreditCard, Headphones } from 'lucide-react';
import { BenefitCard } from '../types';

interface BenefitsSectionProps {
  cards: BenefitCard[];
}

export const BenefitsSection: React.FC<BenefitsSectionProps> = ({ cards }) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShoppingBag':
        return <ShoppingBag className="w-7 h-7 text-[#FF7900]" />;
      case 'CreditCard':
        return <CreditCard className="w-7 h-7 text-[#FF7900]" />;
      case 'Headphones':
        return <Headphones className="w-7 h-7 text-[#FF7900]" />;
      case 'Sparkles':
      default:
        return <Sparkles className="w-7 h-7 text-[#FF7900]" />;
    }
  };

  return (
    <section className="py-16 bg-[#F0F5FC] relative overflow-hidden border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card, idx) => (
            <div
              key={card.id || idx}
              className="group bg-white rounded-2xl p-7 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1.5 border border-slate-100 relative overflow-hidden flex flex-col justify-between"
            >
              {/* Subtle top orange indicator on hover */}
              <div className="absolute top-0 left-0 w-full h-1 bg-transparent group-hover:bg-gradient-to-r group-hover:from-[#FF7900] group-hover:to-[#FF9200] transition-colors duration-300" />

              <div>
                <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center mb-5 group-hover:bg-orange-500/10 transition-colors duration-300 border border-orange-100">
                  {getIcon(card.iconName)}
                </div>

                <h3 className="text-lg font-extrabold text-[#061B45] mb-2 group-hover:text-[#FF7900] transition-colors duration-200">
                  {card.title}
                </h3>

                <p className="text-sm text-slate-600 leading-relaxed font-normal">
                  {card.text}
                </p>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-100/80 flex items-center gap-1.5 text-xs font-bold text-slate-400 group-hover:text-[#FF7900] transition-colors">
                <span>0{idx + 1}</span>
                <span className="w-8 h-0.5 bg-slate-200 group-hover:bg-[#FF7900] transition-colors" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
