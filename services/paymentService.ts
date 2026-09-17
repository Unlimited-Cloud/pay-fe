// src/services/paymentService.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

export interface PaymentInitiatePayload {
  order_id: string;
  amount: number;
  name: string;
  email: string;
  mobile: string;
}

export interface PaymentInitiateResponse {
  success?: boolean;
  payment_url?: string;
  data?: {
    payment_url?: string;
    [key: string]: any;
  };
  message?: string;
  [key: string]: any;
}

// Generate unique random order ID (e.g., ORDER-839201)
export function generateOrderId(): string {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `ORDER-${randomNum}`;
}

// Khalti Initiate
export async function initiateKhaltiPayment(formData: {
  amount: string;
  name: string;
  email: string;
  phoneNumber: string;
}): Promise<PaymentInitiateResponse> {
  const token = localStorage.getItem("bearer_token");

  if (!token) {
    throw new Error("Authorization token not found. Please reload the page.");
  }

  const payload: PaymentInitiatePayload = {
    order_id: generateOrderId(),
    amount: parseFloat(formData.amount),
    name: formData.name,
    email: formData.email,
    mobile: formData.phoneNumber,
  };

  const response = await fetch(`${API_BASE_URL}/khalti/initiate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `Khalti payment initiation failed: ${response.statusText}`);
  }

  return data;
}

// eSewa Initiate
export async function initiateEsewaPayment(formData: {
  amount: string;
  name: string;
  email: string;
  phoneNumber: string;
}): Promise<PaymentInitiateResponse> {
  const token = localStorage.getItem("bearer_token");

  if (!token) {
    throw new Error("Authorization token not found. Please reload the page.");
  }

  const payload: PaymentInitiatePayload = {
    order_id: generateOrderId(),
    amount: parseFloat(formData.amount),
    name: formData.name,
    email: formData.email,
    mobile: formData.phoneNumber,
  };

  const response = await fetch(`${API_BASE_URL}/esewa/initiate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `eSewa payment initiation failed: ${response.statusText}`);
  }

  return data;
}

export async function initiateCyberSourcePayment(payload: {
  amount: string | number;
  currency: string;
}): Promise<{
  success: boolean;
  order_reference: string;
  capture_context: string;
  client_library: string;
  client_library_integrity?: string;
  message?: string;
}> {
  const token = localStorage.getItem('bearer_token');
  if (!token) {
    throw new Error('Authorization token not found. Please reload the page.');
  }

  const response = await fetch(`${API_BASE_URL}/checkout/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      amount: parseFloat(String(payload.amount)),
      currency: payload.currency,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to initialize CyberSource checkout session.');
  }
  return data;
}

export async function finalizeCyberSourcePayment(payload: {
  order_reference: string;
  result_jwt: string;
}): Promise<{
  success: boolean;
  cybersource_transaction_id?: string;
  message?: string;
  [key: string]: any;
}> {
  const token = localStorage.getItem('bearer_token');

  const response = await fetch(`${API_BASE_URL}/checkout/result`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      order_reference: payload.order_reference,
      result_jwt: payload.result_jwt,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Payment verification failed on the server.');
  }
  return data;
}