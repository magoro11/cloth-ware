import { APP_NAME } from "@/lib/constants";

export const metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 md:px-8">
      <h1 className="font-serif text-4xl">Terms of Service</h1>
      <p className="mt-3 text-sm opacity-75">
        These terms govern use of {APP_NAME}, including rentals, resale orders, deposits, and payouts.
      </p>
      <div className="mt-8 space-y-6 text-sm leading-6 opacity-90">
        <section>
          <h2 className="font-semibold">1. Eligibility and Accounts</h2>
          <p>Users must provide accurate information and are responsible for securing account credentials.</p>
        </section>
        <section>
          <h2 className="font-semibold">2. Rentals and Deposits</h2>
          <p>Rental deposits are held during active rentals and released after return confirmation minus approved deductions.</p>
        </section>
        <section>
          <h2 className="font-semibold">3. Seller Obligations</h2>
          <p>Sellers must provide authentic listings, accurate condition details, and timely dispatch/hand-off.</p>
        </section>
        <section>
          <h2 className="font-semibold">4. Platform Fees</h2>
          <p>A 10% platform commission applies to rental revenue before seller payout release.</p>
        </section>
      </div>
    </main>
  );
}
