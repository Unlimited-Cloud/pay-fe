// src/services/authService.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

export interface TokenResponse {
  success?: boolean;
  token?: string;
  access_token?: string;
  message?: string;
  [key: string]: any;
}

export async function fetchAuthToken(): Promise<string> {
  const payload = {
    client_name: "paymentorchestrationplatform",
    client_id: "paymentorchestrationplatform-20260318052728",
    client_secret: "2d7c8855-7661-4066-a8bb-b64391ebf501",
  };

  const response = await fetch(`${API_BASE_URL}/get-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch auth token: ${response.statusText}`);
  }

  const data: TokenResponse = await response.json();

  // Support typical token field names (token, access_token, or nested)
  const token = data.token || data.access_token || data.data?.token || data.data?.access_token;

  if (!token) {
    throw new Error("No token returned from server");
  }

  // Store in localStorage
  localStorage.setItem("bearer_token", token);
  return token;
}