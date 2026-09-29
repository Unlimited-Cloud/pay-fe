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
    mobile_banking: {
      id: 'mobile_banking',
      name: 'Mobile Banking',
      logo: 'https://khalti-static.s3.ap-south-1.amazonaws.com/media/kpg/mbanking.svg',
      subtitle: 'Pay via Mobile Banking (Khalti)',
      supportedCurrencies: ['NPR'],
    },
    sct_card: {
      id: 'sct_card',
      name: 'SCT Card',
      logo: 'https://khalti-static.s3.ap-south-1.amazonaws.com/media/kpg/sct.svg',
      subtitle: 'Pay via SCT Card (Khalti)',
      supportedCurrencies: ['NPR'],
    },
    connect_ips: {
      id: 'connect_ips',
      name: 'Connect IPS',
      logo: 'https://khalti-static.s3.ap-south-1.amazonaws.com/media/kpg/connect-ips.svg',
      subtitle: 'Pay via Connect IPS (Khalti)',
      supportedCurrencies: ['NPR'],
    },
    ebanking: {
      id: 'ebanking',
      name: 'E-Banking',
      logo: 'https://khalti-static.s3.ap-south-1.amazonaws.com/media/kpg/ebanking.svg',
      subtitle: 'Pay via E-Banking (Khalti)',
      supportedCurrencies: ['NPR'],
    },
    khalti_wallet: {
      id: 'khalti_wallet',
      name: 'Khalti Wallet',
      logo: 'https://khalti-static.s3.ap-south-1.amazonaws.com/media/kpg/wallet.svg',
      subtitle: 'Pay via Khalti Wallet',
      supportedCurrencies: ['NPR'],
    },
    cybersource: {
      id: 'cybersource',
      name: 'Debit/Credit Card',
      logo: 'https://cdn.brandfetch.io/cybersource.com/w/400/h/400/logo',
      subtitle: 'Credit / Debit Card (Visa, Mastercard)',
      supportedCurrencies: ['NPR', 'USD', 'EUR', 'GBP', 'AUD', 'INR','CNY'],
    },
    bhimpay: {
      id: 'bhimpay',
      name: 'BHIM Pay',
      logo: 'https://cdn.brandfetch.io/bhimupi.org.in/w/400/h/400/logo',
      subtitle: 'Pay via BHIM UPI',
      supportedCurrencies: ['INR'],
    },
    alipay: {
      id: 'alipay',
      name: 'Ali Pay',
      logo: 'https://cdn.brandfetch.io/alipay.com/w/400/h/400/logo',
      subtitle: 'Pay via AliPay',
      supportedCurrencies: ['CNY'],
    },
  };

  export const getAvailableGateways = (currency: SupportedCurrency): PaymentGateway[] => {
    return Object.values(PAYMENT_GATEWAYS).filter((gateway) =>
      gateway.supportedCurrencies.includes(currency)
    );
  };