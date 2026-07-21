import { APP_NAME } from "@/lib/constants";

export const metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 md:px-8">
      <h1 className="font-serif text-4xl">Privacy Policy</h1>
      <p className="mt-3 text-sm opacity-75">
        This policy explains how {APP_NAME} collects, uses, and protects data across marketplace, payments, and messaging.
      </p>
      <div className="mt-8 space-y-6 text-sm leading-6 opacity-90">
        <section>
          <h2 className="font-semibold">Data We Collect</h2>
          <p>Account identity, listing metadata, transaction history, and operational logs for fraud prevention.</p>
        </section>
        <section>
          <h2 className="font-semibold">Payments and Payouts</h2>
          <p>Payment methods are processed by Stripe. Sensitive payment data is not stored directly in this app.</p>
        </section>
        <section>
          <h2 className="font-semibold">Storage and Access</h2>
          <p>Only authorized users and admins can access protected data using role-based access controls and policy checks.</p>
        </section>
        <section>
          <h2 className="font-semibold">Contact</h2>
          <p>For privacy requests, contact support through your dashboard profile support channel.</p>
        </section>
      </div>
    </main>
  );
}
