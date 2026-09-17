"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PaymentForm from "@/components/PaymentForm";

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

  useEffect(() => {
    if (!token) return;

    const fetchPayment = async () => {
      try {
        setLoading(true);
        setError(null);

        const apiBase =
          process.env.NEXT_PUBLIC_API_BASE_URL?.trim(); 

        const response = await fetch(`${apiBase}/payment-links/${token}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        const result: PaymentResponse = await response.json();

        if (!response.ok || !result.success) {
          setError(result.message || "Unable to load payment link.");
          return;
        }

        setPayment(result.data ?? null);
      } catch (err) {
        setError("Unable to connect to payment server. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchPayment();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111827] flex items-center justify-center">
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
        
        amount: payment.amount,
        currency: payment.currency,
        description: payment.description || `Invoice Ref: ${payment.reference}`,
        reference: payment.reference,
      }}
    />
  );
}