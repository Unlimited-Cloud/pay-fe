const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

export interface PaymentInitiatePayload {
  order_id?: string;
  reference?: string;
  amount: number;
  name: string;
  email: string;
  phone_code: string;
  mobile: string;
  description?: string;
  payment_method: string;
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

export interface CyberSourceSessionResponse {
  success: boolean;
  order_reference: string;
  capture_context: string;
  client_library: string;
  client_library_integrity?: string;
  message?: string;
}

export interface CyberSourceFinalizeResponse {
  success: boolean;
  order_reference?: string;
  transaction_id?: string;
  gateway_status?: string;
  requires_reconciliation?: boolean;
  message?: string;
  [key: string]: any;
}

function getApiBaseUrl(): string {
  if (!API_BASE_URL) {
    throw new Error('API base URL is not configured.');
  }

  return API_BASE_URL.replace(/\/+$/, '');
}

function getBearerToken(): string {
  if (typeof window === 'undefined') {
    throw new Error('This payment operation requires a browser.');
  }

  const token = localStorage.getItem('bearer_token');

  if (!token) {
    throw new Error(
      'Authorization token not found. Please log in again.'
    );
  }

  return token;
}

async function readResponse<T>(response: Response): Promise<T> {
  return response.json().catch(() => ({} as T));
}

function getFirstValidationError(data: any): string | null {
  if (!data?.errors) {
    return null;
  }

  const firstValue = Object.values(data.errors).flat()[0];
  return typeof firstValue === 'string' ? firstValue : null;
}

// Generate a unique merchant order ID.
// The backend must still enforce uniqueness.
export function generateOrderId(): string {
  const now = new Date();

  const dateTimeStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('') + '-' + [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomStr = '';

  for (let i = 0; i < 8; i++) {
    randomStr += chars.charAt(
      Math.floor(Math.random() * chars.length)
    );
  }

  return `PL-${dateTimeStr}-${randomStr}`;
}

// Khalti Initiate
export async function initiateKhaltiPayment(formData: {
  reference?: string;
  amount: string;
  name: string;
  email: string;
  phoneCode: string;
  phoneNumber: string;
  description?: string;
  paymentMethod: string;
}): Promise<PaymentInitiateResponse> {
  const token = getBearerToken();

  const payload: PaymentInitiatePayload = {
    ...(formData.reference
      ? { reference: formData.reference }
      : { order_id: generateOrderId() }),
    amount: Number.parseFloat(formData.amount),
    name: formData.name,
    email: formData.email,
    phone_code: formData.phoneCode,
    mobile: formData.phoneNumber,
    description: formData.description,
    payment_method: formData.paymentMethod,
  };

  if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
    throw new Error('Please provide a valid payment amount.');
  }

  const response = await fetch(
    `${getApiBaseUrl()}/khalti/initiate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await readResponse<PaymentInitiateResponse>(response);

  if (!response.ok) {
    throw new Error(
      getFirstValidationError(data) ||
        data.message ||
        `Khalti initiation failed (${response.status}).`
    );
  }

  return data;
}

// eSewa Initiate
export async function initiateEsewaPayment(formData: {
  reference?: string;
  amount: string;
  name: string;
  email: string;
  phoneCode: string;
  phoneNumber: string;
  description?: string;
  paymentMethod: string;
}): Promise<PaymentInitiateResponse> {
  const token = getBearerToken();

  const payload: PaymentInitiatePayload = {
    ...(formData.reference
      ? { reference: formData.reference }
      : { order_id: generateOrderId() }),
    amount: Number.parseFloat(formData.amount),
    name: formData.name,
    email: formData.email,
    phone_code: formData.phoneCode,
    mobile: formData.phoneNumber,
    description: formData.description,
    payment_method: formData.paymentMethod,
  };

  if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
    throw new Error('Please provide a valid payment amount.');
  }

  const response = await fetch(
    `${getApiBaseUrl()}/esewa/initiate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await readResponse<PaymentInitiateResponse>(response);

  if (!response.ok) {
    throw new Error(
      getFirstValidationError(data) ||
        data.message ||
        `eSewa initiation failed (${response.status}).`
    );
  }

  return data;
}

// CyberSource Session Initiate
export async function initiateCyberSourcePayment(payload: {
  reference?: string;
  amount: string | number;
  currency: string;
  name: string;
  email: string;
  phoneCode: string;
  phoneNumber: string;
  description?: string;
  paymentMethod: string;
}): Promise<CyberSourceSessionResponse> {
  const token = getBearerToken();
  const amount = Number(payload.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Please provide a valid payment amount.');
  }

  const response = await fetch(
    `${getApiBaseUrl()}/checkout/session`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...(payload.reference
          ? { reference: payload.reference }
          : { order_id: generateOrderId() }),
        amount,
        currency: payload.currency,
        name: payload.name,
        email: payload.email,
        phone_code: payload.phoneCode,
        mobile: payload.phoneNumber,
        description: payload.description,
        payment_method: payload.paymentMethod,
      }),
    }
  );

  const data = await readResponse<CyberSourceSessionResponse>(response);

  if (!response.ok || !data.success) {
    throw new Error(
      data.message ||
        `Failed to initialize CyberSource checkout (${response.status}).`
    );
  }

  return data;
}

// CyberSource Verification Finalize
export async function finalizeCyberSourcePayment(payload: {
  order_reference: string;
  result_jwt: string;
}): Promise<CyberSourceFinalizeResponse> {
  const token = getBearerToken();

  const response = await fetch(
    `${getApiBaseUrl()}/checkout/result`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await readResponse<CyberSourceFinalizeResponse>(response);

  // A reconciliation response must not be treated as a normal exception.
  if (data.requires_reconciliation === true) {
    return data;
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
        `CyberSource verification failed (${response.status}).`
    );
  }

  return data;
} 