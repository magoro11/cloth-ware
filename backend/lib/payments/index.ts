import { getStripe, createPaymentIntent, retrievePaymentIntent, createCustomer, createRefund, getStripePublishableKey } from "./stripe";
import { getMpesaConfig, initiateSTKPush, querySTKPush, formatPhoneNumber, validatePhoneNumber, parseCallbackMetadata, MpesaCallback } from "./mpesa";
import { getPayPalConfig, createOrder, captureOrder, getOrderDetails, verifyWebhookSignature, PayPalConfig, PayPalOrder, CaptureOrderResponse, PayPalWebhookEvent } from "./paypal";

export type PaymentMethod = "stripe" | "mpesa" | "paypal" | "cod";

export interface PaymentRequest {
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  orderId: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  metadata?: Record<string, string>;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  clientSecret?: string;
  redirectUrl?: string;
  checkoutRequestId?: string;
  error?: string;
}

export interface PaymentVerificationResult {
  success: boolean;
  paymentId?: string;
  amount?: number;
  currency?: string;
  status: "pending" | "completed" | "failed" | "refunded";
  metadata?: Record<string, string>;
}

export async function processPayment(request: PaymentRequest): Promise<PaymentResponse> {
  switch (request.paymentMethod) {
    case "stripe":
      return processStripePayment(request);
    case "mpesa":
      return processMpesaPayment(request);
    case "paypal":
      return processPayPalPayment(request);
    case "cod":
      return { success: true, paymentId: `cod-${request.orderId}` };
    default:
      return { success: false, error: "Unsupported payment method" };
  }
}

async function processStripePayment(request: PaymentRequest): Promise<PaymentResponse> {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return { success: false, error: "Stripe not configured" };
    }

    let customerId: string | undefined;
    if (request.customerEmail) {
      const customer = await createCustomer(request.customerEmail, request.customerName, request.metadata);
      customerId = customer.id;
    }

    const paymentIntent = await createPaymentIntent({
      amount: request.amount,
      currency: request.currency,
      customerId,
      metadata: {
        orderId: request.orderId,
        ...request.metadata,
      },
    });

    return {
      success: true,
      paymentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret || undefined,
    };
  } catch (error) {
    console.error("Stripe payment error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Stripe payment failed" };
  }
}

async function processMpesaPayment(request: PaymentRequest): Promise<PaymentResponse> {
  try {
    const config = getMpesaConfig();
    if (!config) {
      return { success: false, error: "M-Pesa not configured" };
    }

    if (!request.customerPhone) {
      return { success: false, error: "Phone number required for M-Pesa" };
    }

    if (!validatePhoneNumber(request.customerPhone)) {
      return { success: false, error: "Invalid phone number format" };
    }

    const response = await initiateSTKPush(config, {
      phoneNumber: request.customerPhone,
      amount: request.amount,
      accountReference: request.orderId,
      transactionDesc: `Order ${request.orderId}`,
    });

    if (response.ResponseCode !== "0") {
      return { success: false, error: response.ResponseDescription };
    }

    return {
      success: true,
      paymentId: response.CheckoutRequestID,
      checkoutRequestId: response.CheckoutRequestID,
    };
  } catch (error) {
    console.error("M-Pesa payment error:", error);
    return { success: false, error: error instanceof Error ? error.message : "M-Pesa payment failed" };
  }
}

async function processPayPalPayment(request: PaymentRequest): Promise<PaymentResponse> {
  try {
    const config = getPayPalConfig();
    if (!config) {
      return { success: false, error: "PayPal not configured" };
    }

    const order = await createOrder(config, {
      intent: "CAPTURE",
      purchaseUnits: [
        {
          amount: {
            currency_code: request.currency,
            value: (request.amount / 100).toFixed(2),
          },
          reference_id: request.orderId,
          custom_id: request.orderId,
          description: `Order ${request.orderId}`,
        },
      ],
      application_context: {
        return_url: request.returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success`,
        cancel_url: request.cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/checkout`,
        brand_name: "Cloth Marketplace",
        user_action: "PAY_NOW",
      },
    });

    const approveLink = order.links.find((link) => link.rel === "approve");

    return {
      success: true,
      paymentId: order.id,
      redirectUrl: approveLink?.href,
    };
  } catch (error) {
    console.error("PayPal payment error:", error);
    return { success: false, error: error instanceof Error ? error.message : "PayPal payment failed" };
  }
}

export async function verifyPayment(paymentMethod: PaymentMethod, paymentId: string, orderId: string): Promise<PaymentVerificationResult> {
  switch (paymentMethod) {
    case "stripe":
      return verifyStripePayment(paymentId);
    case "mpesa":
      return verifyMpesaPayment(paymentId);
    case "paypal":
      return verifyPayPalPayment(paymentId);
    case "cod":
      return { success: true, paymentId, status: "pending" };
    default:
      return { success: false, status: "failed" };
  }
}

async function verifyStripePayment(paymentIntentId: string): Promise<PaymentVerificationResult> {
  try {
    const paymentIntent = await retrievePaymentIntent(paymentIntentId);
    
    let status: PaymentVerificationResult["status"] = "pending";
    if (paymentIntent.status === "succeeded") status = "completed";
    else if (paymentIntent.status === "canceled") status = "failed";

    return {
      success: true,
      paymentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      status,
      metadata: paymentIntent.metadata,
    };
  } catch (error) {
    console.error("Stripe verification error:", error);
    return { success: false, status: "failed" };
  }
}

async function verifyMpesaPayment(checkoutRequestId: string): Promise<PaymentVerificationResult> {
  try {
    const config = getMpesaConfig();
    if (!config) {
      return { success: false, status: "failed" };
    }

    const response = await querySTKPush(config, checkoutRequestId);

    let status: PaymentVerificationResult["status"] = "pending";
    if (response.ResultCode === "0") status = "completed";
    else if (response.ResultCode && response.ResultCode !== "0") status = "failed";

    const metadata = parseCallbackMetadata(undefined);

    return {
      success: true,
      paymentId: checkoutRequestId,
      status,
      metadata,
    };
  } catch (error) {
    console.error("M-Pesa verification error:", error);
    return { success: false, status: "failed" };
  }
}

async function verifyPayPalPayment(orderId: string): Promise<PaymentVerificationResult> {
  try {
    const config = getPayPalConfig();
    if (!config) {
      return { success: false, status: "failed" };
    }

    const order = await getOrderDetails(config, orderId);

    let status: PaymentVerificationResult["status"] = "pending";
    if (order.status === "COMPLETED") status = "completed";
    else if (order.status === "CANCELLED" || order.status === "EXPIRED") status = "failed";

    const capture = order.purchase_units?.[0]?.payments?.captures?.[0];

    return {
      success: true,
      paymentId: order.id,
      amount: capture?.amount ? parseFloat(capture.amount.value ?? "0") * 100 : undefined,
      currency: capture?.amount?.currency_code,
      status,
      metadata: { payerId: order.payer?.payer_id ?? "" },
    };
  } catch (error) {
    console.error("PayPal verification error:", error);
    return { success: false, status: "failed" };
  }
}

export async function handleMpesaCallback(callback: MpesaCallback): Promise<PaymentVerificationResult> {
  const stkCallback = callback.Body.stkCallback;
  const checkoutRequestId = stkCallback.CheckoutRequestID;
  const resultCode = stkCallback.ResultCode;
  const resultDesc = stkCallback.ResultDesc;

  let status: PaymentVerificationResult["status"] = "pending";
  if (resultCode === 0) status = "completed";
  else status = "failed";

  const metadata = stkCallback.CallbackMetadata 
    ? parseCallbackMetadata(stkCallback.CallbackMetadata)
    : {};

  return {
    success: true,
    paymentId: checkoutRequestId,
    amount: Number(metadata.Amount),
    currency: "KES",
    status,
    metadata: {
      ...metadata,
      ResultCode: String(resultCode),
      ResultDesc: resultDesc,
    },
  };
}

export async function handlePayPalWebhook(
  config: PayPalConfig,
  headers: Record<string, string>,
  body: string
): Promise<{ verified: boolean; event?: PayPalWebhookEvent }> {
  const verified = await verifyWebhookSignature(config, headers, body);
  
  if (!verified) {
    return { verified: false };
  }

  const event = JSON.parse(body) as PayPalWebhookEvent;
  return { verified: true, event };
}

export function getAvailablePaymentMethods(): PaymentMethod[] {
  const methods: PaymentMethod[] = ["cod"];
  
  if (getStripePublishableKey()) methods.push("stripe");
  if (getMpesaConfig()) methods.push("mpesa");
  if (getPayPalConfig()) methods.push("paypal");
  
  return methods;
}

export function getPaymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case "stripe": return "Card Payment (Stripe)";
    case "mpesa": return "M-Pesa";
    case "paypal": return "PayPal";
    case "cod": return "Cash on Delivery";
    default: return method;
  }
}

export { constructWebhookEvent } from "./stripe";
export { getStripe } from "./stripe";
export { getPayPalConfig, verifyWebhookSignature } from "./paypal";