"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

type AuthFormProps = {
  googleEnabled?: boolean;
};

export function AuthForm({ googleEnabled = true }: AuthFormProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"CUSTOMER" | "LENDER">("CUSTOMER");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === "signup") {
      const register = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const payload = await register.json();
      if (!register.ok) {
        setLoading(false);
        setError(payload.error || "Registration failed");
        return;
      }
    }

    const login = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/dashboard",
    });
    setLoading(false);
    if (login?.error) {
      if (login.error === "CredentialsSignin") {
        return setError("Invalid email or password.");
      }
      return setError(login.error);
    }
    window.location.href = "/dashboard";
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-black/10 bg-white/80 p-6 shadow-xl dark:border-white/10 dark:bg-[#171a24]/90">
      <h1 className="font-serif text-3xl">{mode === "signin" ? "Welcome back" : "Create account"}</h1>
      <p className="mt-2 text-sm opacity-70">Luxury rental and resale, built for modern wardrobes.</p>
      <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
        {mode === "signup" ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="w-full rounded-lg border border-black/15 bg-transparent p-2.5"
            required
          />
        ) : null}
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Email"
          className="w-full rounded-lg border border-black/15 bg-transparent p-2.5"
          required
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Password"
          className="w-full rounded-lg border border-black/15 bg-transparent p-2.5"
          required
        />
        {mode === "signup" ? (
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "CUSTOMER" | "LENDER")}
            className="w-full rounded-lg border border-black/15 bg-transparent p-2.5"
          >
            <option value="CUSTOMER">Buyer</option>
            <option value="LENDER">Seller</option>
          </select>
        ) : null}
        <button
          type="submit"
          className="w-full rounded-lg bg-black px-4 py-2.5 text-white disabled:opacity-50 dark:bg-white dark:text-black"
          disabled={loading}
        >
          {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
      {googleEnabled ? (
        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="mt-3 w-full rounded-lg border border-black/20 px-4 py-2.5 transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          Continue with Google
        </button>
      ) : null}
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <button
        className="mt-4 text-sm underline opacity-75"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
      >
        {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
