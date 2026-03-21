const MPESA_BASE_URL =
  process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

async function getAccessToken() {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;

  if (!key || !secret) {
    throw new Error("Missing M-Pesa credentials (MPESA_CONSUMER_KEY/MPESA_CONSUMER_SECRET)");
  }

  const auth = Buffer.from(`${key}:${secret}`).toString("base64");

  const res = await fetch(
    `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
      },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get M-Pesa access token: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { access_token?: string };

  if (!data.access_token) {
    throw new Error("M-Pesa response missing access_token");
  }

  return data.access_token;
}

function generatePassword() {
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;

  if (!shortcode || !passkey) {
    throw new Error("Missing M-Pesa shortcode or passkey (MPESA_SHORTCODE/MPESA_PASSKEY)");
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[-T:\.Z]/g, "")
    .slice(0, 14);

  const password = Buffer.from(shortcode + passkey + timestamp).toString("base64");

  return { password, timestamp, shortcode };
}

export type MpesaStkParams = {
  phone: string;
  amount: number;
  accountReference?: string;
  description?: string;
};

export class MpesaStkError extends Error {
  readonly details: unknown;

  constructor(message: string, details: unknown) {
    super(message);
    this.name = "MpesaStkError";
    this.details = details;
  }
}

export async function initiateMpesaStk({
  phone,
  amount,
  accountReference,
  description,
}: MpesaStkParams) {
  if (!phone || !amount || amount <= 0) {
    throw new Error("Invalid phone or amount");
  }

  const callbackUrl = process.env.MPESA_CALLBACK_URL;

  if (!callbackUrl) {
    throw new Error("Missing MPESA_CALLBACK_URL env var");
  }

  const token = await getAccessToken();
  const { password, timestamp, shortcode } = generatePassword();

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: phone,
    PartyB: shortcode,
    PhoneNumber: phone,
    CallBackURL: callbackUrl,
    AccountReference: accountReference || "ADVANCEREWEAR",
    TransactionDesc: description || "Payment via M-Pesa STK",
  };

  const res = await fetch(
    `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  const data = await res.json();

  if (!res.ok) {
    throw new MpesaStkError("M-Pesa STK failed", data);
  }

  return data;
}

