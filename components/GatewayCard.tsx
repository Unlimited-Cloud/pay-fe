'use client';

import { PaymentGateway } from '@/types/payment';

interface GatewayCardProps {
  gateway: PaymentGateway;
  isSelected: boolean;
  onSelect: (id: PaymentGateway['id']) => void;
}

export default function GatewayCard({ gateway, isSelected, onSelect }: GatewayCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(gateway.id)}
      className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all cursor-pointer ${
        isSelected
          ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="h-10 w-24 flex items-center justify-center mb-2">
        <img
          src={gateway.logo}
          alt={gateway.name}
          className="max-h-8 max-w-full object-contain"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>
      <span className="text-sm font-semibold text-slate-800">{gateway.name}</span>
      <span className="text-[11px] text-slate-400 text-center line-clamp-1 mt-0.5">
        {gateway.subtitle}
      </span>

      {isSelected && (
        <span className="absolute top-2.5 right-2.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
        </span>
      )}
    </button>
  );
}