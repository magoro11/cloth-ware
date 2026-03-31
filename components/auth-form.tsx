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

  const welcomeNote =
    mode === "signin"
      ? "Welcome back to your wardrobe dashboard. Sign in to continue browsing, renting, and managing your picks."
      : "Welcome to Cloth Ware. Create your account to start renting, reselling, and managing your style in one place.";

  async function readErrorMessage(response: Response, fallback: string) {
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as { error?: string };
      return payload.error || fallback;
    }

    const text = await response.text();
    return text.trim() || fallback;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const register = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, role }),
        });

        if (!register.ok) {
          const message = await readErrorMessage(register, "Registration failed");
          setLoading(false);
          setError(message);
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

      if (!login?.ok) {
        setLoading(false);
        setError("Sign in failed. Please check your connection and database configuration.");
        return;
      }

      const welcomeMessage =
        mode === "signup"
          ? `Welcome to Cloth Ware, ${name.trim() || "there"}! Your account is ready.`
          : "Welcome back to Cloth Ware. You're now signed in.";
      window.sessionStorage.setItem("auth-welcome-message", welcomeMessage);
      window.location.href = "/dashboard";
    } catch (error) {
      setLoading(false);
      setError(error instanceof Error ? error.message : "Authentication failed");
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-black/10 bg-white/80 p-6 shadow-xl dark:border-white/10 dark:bg-[#171a24]/90">
      <h1 className="font-serif text-3xl">{mode === "signin" ? "Welcome back" : "Create account"}</h1>
      <p className="mt-2 text-sm opacity-70">Luxury rental and resale, built for modern wardrobes.</p>
      <div className="mt-4 rounded-xl border border-[color:var(--accent)]/20 bg-[color:var(--accent)]/8 px-4 py-3 text-sm leading-6 text-[color:var(--foreground)]">
        {welcomeNote}
      </div>
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
