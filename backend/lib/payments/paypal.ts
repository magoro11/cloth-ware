export interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  environment: "sandbox" | "production";
  webhookId?: string;
}

export interface CreateOrderParams {
  intent: "CAPTURE" | "AUTHORIZE";
  purchaseUnits: Array<{
    amount: {
      currency_code: string;
      value: string;
    };
    reference_id?: string;
    description?: string;
    custom_id?: string;
    items?: Array<{
      name: string;
      unit_amount: {
        currency_code: string;
        value: string;
      };
      quantity: string;
      description?: string;
      sku?: string;
      category?: "PHYSICAL_GOODS" | "DIGITAL_GOODS";
    }>;
  }>;
  application_context?: {
    return_url: string;
    cancel_url: string;
    brand_name?: string;
    locale?: string;
    landing_page?: "BILLING" | "LOGIN" | "NO_PREFERENCE";
    shipping_preference?: "GET_FROM_FILE" | "NO_SHIPPING" | "SET_PROVIDED_ADDRESS";
    user_action?: "CONTINUE" | "PAY_NOW";
  };
}

export interface PayPalOrder {
  id: string;
  status: string;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{
        amount?: { currency_code?: string; value?: string };
      }>;
    };
  }>;
  payer?: { payer_id?: string };
}

export interface CaptureOrderResponse {
  id: string;
  status: string;
  purchase_units: Array<{
    payments: {
      captures: Array<{
        id: string;
        status: string;
        amount: {
          currency_code: string;
          value: string;
        }
      }>
    };
  }>;
  payer: {
    name: {
      given_name: string;
      surname: string;
    };
    email_address: string;
    payer_id: string;
  };
}

export interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  create_time: string;
  resource: Record<string, unknown>;
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function getBaseUrl(environment: "sandbox" | "production"): string {
  return environment === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

export async function getAccessToken(config: PayPalConfig): Promise<string> {
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt) {
    return cachedAccessToken.token;
  }

  const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
  const baseUrl = getBaseUrl(config.environment);

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get PayPal access token: ${error}`);
  }

  const data = await response.json();
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return data.access_token;
}

export async function createOrder(config: PayPalConfig, params: CreateOrderParams): Promise<PayPalOrder> {
  const token = await getAccessToken(config);
  const baseUrl = getBaseUrl(config.environment);

  const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": params.purchaseUnits[0]?.custom_id || crypto.randomUUID(),
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create PayPal order: ${error}`);
  }

  return response.json();
}

export async function captureOrder(config: PayPalConfig, orderId: string): Promise<CaptureOrderResponse> {
  const token = await getAccessToken(config);
  const baseUrl = getBaseUrl(config.environment);

  const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to capture PayPal order: ${error}`);
  }

  return response.json();
}

export async function getOrderDetails(config: PayPalConfig, orderId: string): Promise<PayPalOrder> {
  const token = await getAccessToken(config);
  const baseUrl = getBaseUrl(config.environment);

  const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get PayPal order details: ${error}`);
  }

  return response.json();
}

export async function refundCapture(config: PayPalConfig, captureId: string, amount?: { value: string; currency_code: string }): Promise<Record<string, unknown>> {
  const token = await getAccessToken(config);
  const baseUrl = getBaseUrl(config.environment);

  const response = await fetch(`${baseUrl}/v2/payments/captures/${captureId}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(amount ? { amount } : {}),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refund PayPal capture: ${error}`);
  }

  return response.json();
}

export async function verifyWebhookSignature(
  config: PayPalConfig,
  headers: Record<string, string>,
  body: string
): Promise<boolean> {
  const token = await getAccessToken(config);
  const baseUrl = getBaseUrl(config.environment);

  const webhookId = config.webhookId || process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.warn("PayPal webhook ID not configured");
    return false;
  }

  const response = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_algo: headers["paypal-auth-algo"],
      cert_url: headers["paypal-cert-url"],
      transmission_id: headers["paypal-transmission-id"],
      transmission_sig: headers["paypal-transmission-sig"],
      transmission_time: headers["paypal-transmission-time"],
      webhook_id: webhookId,
      webhook_event: JSON.parse(body),
    }),
  });

  if (!response.ok) {
    return false;
  }

  const data = await response.json();
  return data.verification_status === "SUCCESS";
}

export function getPayPalConfig(): PayPalConfig | null {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const environment = (process.env.PAYPAL_ENVIRONMENT as "sandbox" | "production") || "sandbox";
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;

  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    environment,
    webhookId,
  };
}

export function formatAmount(amount: number, currency: string = "USD"): string {
  return (amount / 100).toFixed(2);
}

export function parseAmount(value: string): number {
  return Math.round(parseFloat(value) * 100);
}