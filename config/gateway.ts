import { PaymentGateway, SupportedCurrency } from '@/types/payment';

export const PAYMENT_GATEWAYS: Record<string, PaymentGateway> = {
  esewa: {
    id: 'esewa',
    name: 'eSewa',
    logo: 'https://cdn.brandfetch.io/esewa.com.np/w/400/h/400/logo',
    subtitle: 'Pay via eSewa digital wallet',
    supportedCurrencies: ['NPR'],
  },
  khalti: {
    id: 'khalti',
    name: 'Khalti',
    logo: 'https://cdn.brandfetch.io/khalti.com/w/400/h/400/logo',
    subtitle: 'Pay via Khalti digital wallet',
    supportedCurrencies: ['NPR'],
  },
  
  cybersource: {
    id: 'cybersource',
    name: 'Debit/Credit Card',
    logo: 'https://cdn.brandfetch.io/cybersource.com/w/400/h/400/logo',
    subtitle: 'Credit / Debit Card (Visa, Mastercard)',
    supportedCurrencies: ['NPR', 'USD', 'EUR', 'GBP', 'AUD', 'INR'],
  },
  bhimpay: {
    id: 'bhimpay',
    name: 'BHIM Pay',
    logo: 'https://cdn.brandfetch.io/bhimupi.org.in/w/400/h/400/logo',
    subtitle: 'Pay via BHIM UPI',
    supportedCurrencies: [ 'USD', 'EUR', 'GBP', 'AUD', 'INR'],
  },
  alipay: {
    id: 'alipay',
    name: 'Ali Pay',
    logo: 'https://cdn.brandfetch.io/alipay.com/w/400/h/400/logo',
    subtitle: 'Pay via AliPay',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'AUD', 'INR'],
  },
};

export const getAvailableGateways = (currency: SupportedCurrency): PaymentGateway[] => {
  return Object.values(PAYMENT_GATEWAYS).filter((gateway) =>
    gateway.supportedCurrencies.includes(currency)
  );
};