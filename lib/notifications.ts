type NotificationPayload = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmailNotification(payload: NotificationPayload) {
  // Replace with Resend/Postmark/Supabase Edge Function integration in production.
  console.info("[email]", payload.to, payload.subject);
}
