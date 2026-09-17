// components/PaymentForm.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { SupportedCurrency, GatewayId, PaymentFormData } from '@/types/payment';
import { getAvailableGateways, PAYMENT_GATEWAYS } from '@/config/gateway';
import { countries, Country } from '@/config/countries';
import { fetchAuthToken } from '@/services/authService';
import {
  initiateKhaltiPayment,
  initiateEsewaPayment,
  initiateCyberSourcePayment,
  finalizeCyberSourcePayment,
} from '@/services/paymentService';
import { submitEsewaForm } from '@/utils/esewaForm';
import { mountCyberSourceCheckout } from '@/utils/cybersourceLoader';

const CURRENCIES: { code: SupportedCurrency; symbol: string }[] = [
  { code: 'NPR', symbol: 'Rs' },
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'AUD', symbol: 'A$' },
  { code: 'INR', symbol: '₹' },
];

export interface InitialPaymentData {
  name?: string;
  email?: string;
  phoneCode?: string;
  phoneNumber?: string;
  amount?: string;
  currency?: SupportedCurrency | string;
  description?: string;
  reference?: string;
}

export interface PaymentFormProps {
  initialData?: InitialPaymentData;
  isReadOnlyInvoice?: boolean;
}

export default function PaymentForm({
  initialData,
  isReadOnlyInvoice = false,
}: PaymentFormProps) {
  const [formData, setFormData] = useState<PaymentFormData>({
    name: initialData?.name || '',
    email: initialData?.email || '',
    phoneCode: initialData?.phoneCode || '',
    phoneNumber: initialData?.phoneNumber || '',
    currency: (initialData?.currency as SupportedCurrency) || '',
    amount: initialData?.amount || '',
    description:
      initialData?.description ||
      (initialData?.reference ? `Ref: ${initialData.reference}` : ''),
    selectedGateway: '',
  });

  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isPhoneCodeOpen, setIsPhoneCodeOpen] = useState(false);
  const [phoneSearch, setPhoneSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [amountError, setAmountError] = useState<string | null>(null);

  const [cyberSourceActive, setCyberSourceActive] = useState(false);
  const [cyberSourceMounting, setCyberSourceMounting] = useState(false);
  const cyberSourceContainerRef = useRef<HTMLDivElement>(null);

  const currencyDropdownRef = useRef<HTMLDivElement>(null);
  const phoneDropdownRef = useRef<HTMLDivElement>(null);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const initSession = async () => {
      try {
        setIsInitializing(true);
        setInitError(null);
        await fetchAuthToken();
      } catch (error) {
        console.error('Session Token Error:', error);
        setInitError(
          error instanceof Error ? error.message : 'Failed to initialize session'
        );
      } finally {
        setIsInitializing(false);
      }
    };

    initSession();
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        name: initialData.name || prev.name,
        email: initialData.email || prev.email,
        phoneCode: initialData.phoneCode || prev.phoneCode,
        phoneNumber: initialData.phoneNumber || prev.phoneNumber,
        currency: (initialData.currency as SupportedCurrency) || prev.currency,
        amount: initialData.amount || prev.amount,
        description:
          initialData.description ||
          (initialData.reference ? `Ref: ${initialData.reference}` : prev.description),
      }));
    }
  }, [initialData]);

  const availableGateways = formData.currency
    ? getAvailableGateways(formData.currency as SupportedCurrency)
    : [];

  useEffect(() => {
    if (formData.amount === '') {
      setAmountError(null);
      return;
    }
    setAmountError(
      Number(formData.amount) < 10 ? 'Amount must be at least 10.' : null
    );
  }, [formData.amount]);

  const selectedCurrencySymbol = CURRENCIES.find(
    (c) => c.code === formData.currency
  )?.symbol;

  const filteredCountries = countries.filter(
    (c) =>
      c.name.toLowerCase().includes(phoneSearch.toLowerCase()) ||
      c.phone_code.includes(phoneSearch) ||
      c.country_code.toLowerCase().includes(phoneSearch.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        currencyDropdownRef.current &&
        !currencyDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCurrencyOpen(false);
      }
      if (
        phoneDropdownRef.current &&
        !phoneDropdownRef.current.contains(event.target as Node)
      ) {
        setIsPhoneCodeOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (isReadOnlyInvoice) return;
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCurrencySelect = (currency: SupportedCurrency) => {
    if (isReadOnlyInvoice) return;
    const gateways = getAvailableGateways(currency);
    const defaultGateway: GatewayId | '' =
      gateways.length === 1 ? gateways[0].id : '';

    setFormData((prev) => ({
      ...prev,
      currency,
      selectedGateway: defaultGateway,
    }));
    setIsCurrencyOpen(false);
  };

  const handlePhoneCodeSelect = (country: Country) => {
    if (isReadOnlyInvoice) return;
    setFormData((prev) => ({ ...prev, phoneCode: country.phone_code }));
    setIsPhoneCodeOpen(false);
    setPhoneSearch('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.phoneCode) {
      alert('Please select a country code.');
      return;
    }
    if (!formData.currency) {
      alert('Please select a currency.');
      return;
    }
    if (!formData.description.trim()) {
      alert('Please enter a description.');
      return;
    }
    if (Number(formData.amount) < 10) {
      alert('Amount must be at least 10.');
      return;
    }
    if (!formData.selectedGateway) {
      alert('Please select a payment method.');
      return;
    }

    setLoading(true);

    setLoading(true);

    try {
      const activeOrderId = initialData?.reference;

      if (formData.selectedGateway === 'khalti') {
        const result = await initiateKhaltiPayment({
          orderId: activeOrderId,
          amount: formData.amount,
          name: formData.name,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
        });

        const redirectUrl = result.payment_url || result.data?.payment_url;
        if (redirectUrl) {
          window.location.href = redirectUrl;
        } else {
          console.log('Khalti Response:', result);
          alert('Khalti payment initiated successfully.');
        }
      } else if (formData.selectedGateway === 'esewa') {
        const result = await initiateEsewaPayment({
          orderId: activeOrderId,
          amount: formData.amount,
          name: formData.name,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
        });

        const esewaData = result.data || result;

        if (esewaData && esewaData.signature) {
          submitEsewaForm(esewaData);
        } else {
          console.log('eSewa Response:', result);
          alert(result.message || 'Failed to initiate eSewa payment.');
        }
      } else if (formData.selectedGateway === 'cybersource') {
        const sessionData = await initiateCyberSourcePayment({
          orderId: activeOrderId,
          amount: formData.amount,
          currency: formData.currency,
        });

        if (
          sessionData.success &&
          sessionData.capture_context &&
          sessionData.client_library
        ) {
          setCyberSourceActive(true);
          setCyberSourceMounting(true);

          setTimeout(async () => {
            try {
              if (!cyberSourceContainerRef.current) return;

              const resultJwt = await mountCyberSourceCheckout(
                cyberSourceContainerRef.current,
                sessionData.capture_context,
                sessionData.client_library,
                sessionData.client_library_integrity
              );

              setCyberSourceMounting(true);

              const verification = await finalizeCyberSourcePayment({
                order_reference: sessionData.order_reference,
                result_jwt: resultJwt,
              });

              if (verification.success) {
                alert(
                  `Payment successful! Transaction ID: ${verification.cybersource_transaction_id || 'Approved'
                  }`
                );
                window.location.reload();
              } else {
                alert(verification.message || 'Payment verification failed.');
              }
            } catch (mountErr) {
              console.error('CyberSource Checkout Error:', mountErr);
              alert(
                mountErr instanceof Error
                  ? mountErr.message
                  : 'Error mounting CyberSource checkout.'
              );
              setCyberSourceActive(false);
            } finally {
              setCyberSourceMounting(false);
            }
          }, 100);
        } else {
          alert(
            sessionData.message || 'Failed to initialize CyberSource session.'
          );
        }
      } else {
        alert('Unsupported payment method selected.');
      }
    } catch (error) {
      console.error('Payment Error:', error);
      alert(error instanceof Error ? error.message : 'Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };

  const fontStyles = (
    <style jsx global>{`
      @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Manrope:wght@400;500;600;700&display=swap');
      .font-display {
        font-family: 'Sora', sans-serif;
      }
      .font-body,
      .font-body input,
      .font-body button {
        font-family: 'Manrope', sans-serif;
      }
    `}</style>
  );

  if (isInitializing) {
    return (
      <div className="font-body relative min-h-screen w-full flex items-start justify-center py-10 px-4 overflow-hidden bg-[#111827]">
        {fontStyles}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F1B2E] via-[#16243B] to-[#1B1220]" />
        <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-black/40 border border-slate-100 p-10 flex flex-col items-center justify-center min-h-[420px]">
          <div className="animate-spin rounded-full h-9 w-9 border-[3px] border-[#1E3A5F] border-t-transparent mb-4" />
          <h2 className="font-display text-sm font-semibold text-slate-800">
            Initiating session
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Connecting to secure gateway server
          </p>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="font-body relative min-h-screen w-full flex items-start justify-center py-10 px-4 overflow-hidden bg-[#111827]">
        {fontStyles}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F1B2E] via-[#16243B] to-[#1B1220]" />
        <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-black/40 border border-red-100 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3 font-bold text-lg">
            !
          </div>
          <h2 className="font-display text-base font-semibold text-slate-900 mb-1">
            Session error
          </h2>
          <p className="text-xs text-red-500 mb-5">{initError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="font-display px-5 py-2.5 bg-[#1E3A5F] text-white rounded-xl text-xs font-semibold hover:bg-[#16304D] transition-colors cursor-pointer"
          >
            Retry connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="font-body relative min-h-screen w-full flex items-start justify-center py-10 px-4 bg-[#111827]">
      {fontStyles}

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F1B2E] via-[#16243B] to-[#1B1220]" />
        <div className="absolute -top-40 -left-32 w-[32rem] h-[32rem] rounded-full bg-[#3B6EA5]/30 blur-[100px]" />
        <div className="absolute -bottom-40 -right-24 w-[30rem] h-[30rem] rounded-full bg-[#C8102E]/25 blur-[100px]" />
        <div className="absolute top-1/4 right-1/4 w-72 h-72 rounded-full bg-[#4F7CAC]/20 blur-[90px]" />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
            backgroundSize: '26px 26px',
          }}
        />
        <div className="absolute w-[36rem] h-[36rem] rounded-full bg-white/5 blur-[80px]" />
      </div>

      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-black/40 border border-slate-100 overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#1E3A5F] via-[#3B6EA5] to-[#C8102E]" />

        <div className="p-7">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="font-display text-xl font-bold text-[#12131A] tracking-tight">
                {cyberSourceActive ? 'Card Payment' : 'Payment details'}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {cyberSourceActive
                  ? 'Complete your card transfer securely via CyberSource'
                  : 'Fill in your details to complete the transfer'}
              </p>
            </div>
            <div className="font-display shrink-0 flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2.5 py-1 rounded-full mt-1">
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              Encrypted
            </div>
          </div>

          {cyberSourceActive ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs text-slate-500 font-medium">
                  Amount:{' '}
                  <strong className="text-slate-800">
                    {formData.currency} {formData.amount}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCyberSourceActive(false);
                    setCyberSourceMounting(false);
                  }}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
                >
                  ← Back to form
                </button>
              </div>

              {cyberSourceMounting && (
                <div className="flex items-center justify-center py-6 text-slate-500 text-xs gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-[#1E3A5F] border-t-transparent" />
                  Loading secure checkout...
                </div>
              )}

              <div
                ref={cyberSourceContainerRef}
                id="payment-buttons"
                className="min-h-[300px] w-full"
              />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Contact details */}
              <div className="space-y-3">
                <p className="font-display text-[11px] font-bold uppercase tracking-wider text-slate-800">
                  Contact details
                </p>

                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Full name <span className="text-[#C8102E]">*</span>
                  </label>
                  <div className="relative">
                    <svg
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <input
                      type="text"
                      name="name"
                      required
                      readOnly={isReadOnlyInvoice}
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Jane Doe"
                      className={`w-full pl-10 pr-3.5 py-2.5 border rounded-xl text-sm text-slate-800 transition-colors focus:outline-none ${isReadOnlyInvoice
                          ? 'bg-slate-100/80 border-slate-200 text-slate-600 cursor-not-allowed select-none'
                          : 'bg-slate-50/60 border-slate-200 focus:bg-white focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/10'
                        }`}
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email address <span className="text-[#C8102E]">*</span>
                  </label>
                  <div className="relative">
                    <svg
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <input
                      type="email"
                      name="email"
                      required
                      readOnly={isReadOnlyInvoice}
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="jane@example.com"
                      className={`w-full pl-10 pr-3.5 py-2.5 border rounded-xl text-sm text-slate-800 transition-colors focus:outline-none ${isReadOnlyInvoice
                          ? 'bg-slate-100/80 border-slate-200 text-slate-600 cursor-not-allowed select-none'
                          : 'bg-slate-50/60 border-slate-200 focus:bg-white focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/10'
                        }`}
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Phone number <span className="text-[#C8102E]">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative shrink-0" ref={phoneDropdownRef}>
                      <button
                        type="button"
                        disabled={isReadOnlyInvoice}
                        onClick={() => setIsPhoneCodeOpen(!isPhoneCodeOpen)}
                        className={`h-[42px] px-3.5 border rounded-xl flex items-center gap-1.5 text-sm font-medium transition-colors focus:outline-none ${isReadOnlyInvoice
                            ? 'bg-slate-100/80 border-slate-200 text-slate-600 cursor-not-allowed select-none'
                            : 'bg-slate-50/60 border-slate-200 text-slate-800 hover:border-slate-300 focus:bg-white focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/10 cursor-pointer'
                          }`}
                      >
                        <span>
                          {formData.phoneCode || (
                            <span className="text-xs text-slate-400 font-normal">
                              Code
                            </span>
                          )}
                        </span>
                        {!isReadOnlyInvoice && (
                          <svg
                            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isPhoneCodeOpen ? 'rotate-180' : ''
                              }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        )}
                      </button>

                      {isPhoneCodeOpen && !isReadOnlyInvoice && (
                        <div className="absolute left-0 z-50 mt-1.5 w-64 max-h-60 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/70 overflow-hidden flex flex-col">
                          <div className="p-2 border-b border-slate-100 bg-slate-50">
                            <input
                              type="text"
                              value={phoneSearch}
                              onChange={(e) => setPhoneSearch(e.target.value)}
                              placeholder="Search country or code..."
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
                              autoFocus
                            />
                          </div>
                          <div className="overflow-y-auto flex-1 py-1">
                            {filteredCountries.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => handlePhoneCodeSelect(c)}
                                className={`w-full px-3 py-1.5 flex items-center justify-between text-left text-xs cursor-pointer ${formData.phoneCode === c.phone_code
                                    ? 'bg-[#1E3A5F]/5 font-semibold text-[#1E3A5F]'
                                    : 'text-slate-700 hover:bg-slate-50'
                                  }`}
                              >
                                <span className="truncate mr-2">{c.name}</span>
                                <span className="text-slate-400 font-mono text-[11px] shrink-0">
                                  {c.phone_code}
                                </span>
                              </button>
                            ))}
                            {filteredCountries.length === 0 && (
                              <div className="px-3 py-3 text-center text-xs text-slate-400">
                                No country found
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="relative flex-1">
                      <svg
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      <input
                        type="tel"
                        name="phoneNumber"
                        required
                        readOnly={isReadOnlyInvoice}
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        placeholder="XXXXXXXXXX"
                        className={`w-full h-[42px] pl-10 pr-3.5 border rounded-xl text-sm text-slate-800 transition-colors focus:outline-none ${isReadOnlyInvoice
                            ? 'bg-slate-100/80 border-slate-200 text-slate-600 cursor-not-allowed select-none'
                            : 'bg-slate-50/60 border-slate-200 focus:bg-white focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/10'
                          }`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Transfer details */}
              <div className="space-y-3">
                <p className="font-display text-[11px] font-bold uppercase tracking-wider text-slate-800">
                  Transfer details
                </p>

                <div className="grid grid-cols-3 gap-3">
                  {/* Currency */}
                  <div className="relative" ref={currencyDropdownRef}>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Currency <span className="text-[#C8102E]">*</span>
                    </label>
                    <button
                      type="button"
                      disabled={isReadOnlyInvoice}
                      onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
                      className={`w-full h-[42px] px-3.5 border rounded-xl flex items-center justify-between text-sm font-medium transition-colors focus:outline-none ${isReadOnlyInvoice
                          ? 'bg-slate-100/80 border-slate-200 text-slate-600 cursor-not-allowed select-none'
                          : 'bg-slate-50/60 border-slate-200 text-slate-800 hover:border-slate-300 focus:bg-white focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/10 cursor-pointer'
                        }`}
                    >
                      <span>
                        {formData.currency || (
                          <span className="text-xs text-slate-400 font-normal">
                            Select
                          </span>
                        )}
                      </span>
                      {!isReadOnlyInvoice && (
                        <svg
                          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isCurrencyOpen ? 'rotate-180' : ''
                            }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      )}
                    </button>

                    {isCurrencyOpen && !isReadOnlyInvoice && (
                      <div className="absolute left-0 z-50 mt-1.5 w-40 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/70 py-1">
                        {CURRENCIES.map((c) => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => handleCurrencySelect(c.code)}
                            className={`w-full px-3 py-2 flex items-center justify-between text-left text-xs sm:text-sm cursor-pointer ${formData.currency === c.code
                                ? 'bg-[#1E3A5F]/5 text-[#1E3A5F] font-semibold'
                                : 'text-slate-700 hover:bg-slate-50'
                              }`}
                          >
                            <span>
                              {c.code}{' '}
                              <span className="text-slate-400 text-xs">
                                ({c.symbol})
                              </span>
                            </span>
                            {formData.currency === c.code && (
                              <span className="text-[#1E3A5F] font-bold">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Amount <span className="text-[#C8102E]">*</span>
                    </label>
                    <div className="relative">
                      {selectedCurrencySymbol && (
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400 select-none">
                          {selectedCurrencySymbol}
                        </span>
                      )}
                      <input
                        type="number"
                        name="amount"
                        step="0.01"
                        min="10"
                        required
                        readOnly={isReadOnlyInvoice}
                        value={formData.amount}
                        onChange={handleChange}
                        placeholder="100.00"
                        className={`w-full h-[42px] ${selectedCurrencySymbol ? 'pl-8' : 'pl-3.5'
                          } pr-3.5 border rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors ${isReadOnlyInvoice
                            ? 'bg-slate-100/80 border-slate-200 text-slate-600 cursor-not-allowed select-none'
                            : 'bg-slate-50/60 focus:bg-white focus:ring-2'
                          } ${amountError
                            ? 'border-[#C8102E] focus:border-[#C8102E] focus:ring-[#C8102E]/10'
                            : 'border-slate-200 focus:border-[#1E3A5F] focus:ring-[#1E3A5F]/10'
                          }`}
                      />
                    </div>
                    {amountError && (
                      <p className="text-xs text-[#C8102E] mt-1.5">{amountError}</p>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Description <span className="text-[#C8102E]">*</span>
                  </label>
                  <div className="relative">
                    <svg
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M7 7h.01M7 3h5.586a1 1 0 01.707.293l6.414 6.414a1 1 0 010 1.414l-8.586 8.586a1 1 0 01-1.414 0l-6.414-6.414A1 1 0 013 12.586V7a4 4 0 014-4z"
                      />
                    </svg>
                    <input
                      type="text"
                      name="description"
                      required
                      readOnly={isReadOnlyInvoice}
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Invoice / order ref"
                      className={`w-full pl-10 pr-3.5 py-2.5 border rounded-xl text-sm text-slate-800 transition-colors focus:outline-none ${isReadOnlyInvoice
                          ? 'bg-slate-100/80 border-slate-200 text-slate-600 cursor-not-allowed select-none'
                          : 'bg-slate-50/60 border-slate-200 focus:bg-white focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/10'
                        }`}
                    />
                  </div>
                </div>
              </div>

              {/* Payment method (Always clickable) */}
              <div className="space-y-3">
                <p className="font-display text-[11px] font-bold uppercase tracking-wider text-slate-800">
                  Payment method
                </p>

                {!formData.currency ? (
                  <div className="p-4 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                    Choose a currency above to view payment options
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {availableGateways.map((gw) => {
                      const isSelected = formData.selectedGateway === gw.id;
                      return (
                        <button
                          key={gw.id}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, selectedGateway: gw.id })
                          }
                          className={`relative flex flex-col items-center justify-center py-3 px-2 rounded-xl border transition-all duration-150 cursor-pointer ${isSelected
                              ? 'border-[#1E3A5F] bg-[#1E3A5F]/[0.04] shadow-md shadow-[#1E3A5F]/10 -translate-y-0.5'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-sm'
                            }`}
                        >
                          <span
                            className={`absolute top-2 left-2 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-[#1E3A5F]' : 'border-slate-300'
                              }`}
                          >
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#1E3A5F]" />
                            )}
                          </span>

                          <div className="h-7 w-20 flex items-center justify-center mb-1.5 mt-1">
                            <img
                              src={gw.logo}
                              alt={gw.name}
                              className="max-h-6 max-w-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-700">
                            {gw.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Pay Button (Always active) */}
              <button
                type="submit"
                disabled={
                  loading ||
                  !formData.phoneCode ||
                  !formData.currency ||
                  !formData.description.trim() ||
                  !formData.selectedGateway ||
                  Boolean(amountError)
                }
                className="font-display w-full mt-1 bg-[#C8102E] hover:bg-[#A80D26] text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/50 border-t-white" />
                    Processing
                  </>
                ) : formData.selectedGateway ? (
                  <>
                    {`Pay ${formData.amount
                        ? `${formData.currency} ${formData.amount}`
                        : ''
                      } via ${PAYMENT_GATEWAYS[formData.selectedGateway]?.name}`}
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </>
                ) : (
                  'Select a payment method'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}