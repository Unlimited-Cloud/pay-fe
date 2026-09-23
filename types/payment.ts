// src/types/payment.ts
export type SupportedCurrency = 'NPR' | 'USD' | 'EUR' | 'GBP' | 'AUD' | 'INR';

export type GatewayId = 'esewa' | 'khalti' | 'cybersource' | 'bhimpay' | 'alipay';

export interface PaymentGateway {
  id: GatewayId;
  name: string;
  logo: string;
  subtitle: string;
  supportedCurrencies: SupportedCurrency[];
}

export interface PaymentFormData {
  name: string;
  email: string;
  phoneCode: string;
  phoneNumber: string;
  currency: SupportedCurrency | '';
  amount: string;
  description: string;
  selectedGateway: GatewayId | '';
}