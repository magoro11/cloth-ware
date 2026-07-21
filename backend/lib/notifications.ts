type NotificationPayload = {
  to: string;
  subject: string;
  html: string;
};

/**
 * Send a transactional email.
 *
 * Uses Resend when RESEND_API_KEY is set.
 * Falls back to a console log in development / when the key is absent.
 *
 * Add your key to .env.local:
 *   RESEND_API_KEY=re_xxxxxxxxxxxx
 *   EMAIL_FROM="AdvanceReWear <noreply@youromain.com>"
 */
export async function sendEmailNotification(payload: NotificationPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Development / missing key – log only, never throw
    console.info("[email:fallback]", payload.to, "|", payload.subject);
    return;
  }

  const from =
    process.env.EMAIL_FROM ?? "AdvanceReWear <noreply@advancerewear.com>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[email:resend] Failed to send email", res.status, body);
    }
  } catch (error) {
    // Never crash the caller because of a failed email
    console.error("[email:resend] Unexpected error", error);
  }
}
