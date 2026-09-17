'use client';

import { PaymentGateway, GatewayId } from '@/types/payment';
import GatewayCard from './GatewayCard';

interface GatewaySelectorProps {
  gateways: PaymentGateway[];
  selectedGateway: GatewayId;
  onSelectGateway: (id: GatewayId) => void;
}

export default function GatewaySelector({
  gateways,
  selectedGateway,
  onSelectGateway,
}: GatewaySelectorProps) {
  return (
    <div className="pt-2">
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2.5">
        Select Payment Method
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {gateways.map((gw) => (
          <GatewayCard
            key={gw.id}
            gateway={gw}
            isSelected={selectedGateway === gw.id}
            onSelect={onSelectGateway}
          />
        ))}
      </div>
    </div>
  );
}