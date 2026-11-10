import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      console.warn("STRIPE_SECRET_KEY not configured");
      return null;
    }
    stripe = new Stripe(secretKey, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    });
  }
  return stripe;
}

export interface CreatePaymentIntentParams {
  amount: number;
  currency: string;
  customerId?: string;
  metadata?: Record<string, string>;
  paymentMethodTypes?: string[];
}

export async function createPaymentIntent(params: CreatePaymentIntentParams): Promise<Stripe.PaymentIntent> {
  const client = getStripe();
  if (!client) throw new Error("Stripe not configured");

  return client.paymentIntents.create({
    amount: Math.round(params.amount * 100),
    currency: params.currency.toLowerCase(),
    customer: params.customerId,
    metadata: params.metadata,
    payment_method_types: params.paymentMethodTypes || ["card"],
    automatic_payment_methods: { enabled: true },
  });
}

export async function confirmPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  const client = getStripe();
  if (!client) throw new Error("Stripe not configured");

  return client.paymentIntents.confirm(paymentIntentId);
}

export async function retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  const client = getStripe();
  if (!client) throw new Error("Stripe not configured");

  return client.paymentIntents.retrieve(paymentIntentId);
}

export async function createCustomer(email: string, name?: string, metadata?: Record<string, string>): Promise<Stripe.Customer> {
  const client = getStripe();
  if (!client) throw new Error("Stripe not configured");

  return client.customers.create({
    email,
    name,
    metadata,
  });
}

export async function createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
  const client = getStripe();
  if (!client) throw new Error("Stripe not configured");

  return client.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
  });
}

export async function listPaymentMethods(customerId: string, type: "card" = "card"): Promise<Stripe.PaymentMethod[]> {
  const client = getStripe();
  if (!client) throw new Error("Stripe not configured");

  const paymentMethods = await client.paymentMethods.list({
    customer: customerId,
    type,
  });

  return paymentMethods.data;
}

export async function detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
  const client = getStripe();
  if (!client) throw new Error("Stripe not configured");

  return client.paymentMethods.detach(paymentMethodId);
}

export async function createRefund(paymentIntentId: string, amount?: number): Promise<Stripe.Refund> {
  const client = getStripe();
  if (!client) throw new Error("Stripe not configured");

  return client.refunds.create({
    payment_intent: paymentIntentId,
    amount: amount ? Math.round(amount * 100) : undefined,
  });
}

export async function constructWebhookEvent(payload: string | Buffer, signature: string): Promise<Stripe.Event> {
  const client = getStripe();
  if (!client) throw new Error("Stripe not configured");

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET not configured");

  return client.webhooks.constructEvent(payload, signature, webhookSecret);
}

export function getStripePublishableKey(): string | null {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null;
}