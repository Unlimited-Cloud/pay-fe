"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import PaymentForm from "@/components/PaymentForm";
import { fetchAuthToken } from "@/services/authService";

interface PaymentData {
  uuid: string;
  reference: string;
  amount: string;
  currency: string;
  description: string | null;
  expires_at: string | null;
  customer_user: {
    uuid: string;
    name: string;
    email?: string;
    phone_code?: string;
    phone?: string;
    mobile?: string;
  };
}

interface PaymentResponse {
  success: boolean;
  status: string;
  message: string;
  data?: PaymentData;
}

export default function PaymentPage() {
  const params = useParams();
  const token = params?.token as string;

  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    if (!token || isFetchingRef.current) return;
    isFetchingRef.current = true;

    const initializeAndFetchPayment = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Always call auth token first
        const bearerToken = await fetchAuthToken();

        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

        // 2. Fetch payment link with Bearer authorization header
        const response = await fetch(`${apiBase}/payment-links/${token}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${bearerToken}`,
          },
        });

        const result: PaymentResponse = await response.json();

        if (!response.ok || !result.success) {
          setError(result.message || "Unable to load payment link.");
          return;
        }

        setPayment(result.data ?? null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to connect to payment server. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    initializeAndFetchPayment();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111827] flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/30 border-t-white" />
        <p className="text-white text-sm">Loading invoice details...</p>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen bg-[#111827] flex items-center justify-center text-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-lg">
          <p className="text-red-600 font-semibold mb-2">Error</p>
          <p className="text-slate-600 text-sm mb-4">{error || "Payment not found"}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#1E3A5F] text-white text-xs rounded-lg cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <PaymentForm
      isReadOnlyInvoice={true}
      initialData={{
        name: payment.customer_user?.name || "",
        email: payment.customer_user?.email || "",
        phoneCode: payment.customer_user?.phone_code || "",
        phoneNumber: payment.customer_user?.phone || payment.customer_user?.mobile || "",
        amount: payment.amount,
        currency: payment.currency,
        description: payment.description || `Invoice Ref: ${payment.reference}`,
        reference: payment.reference,
      }}
    />
  );
}