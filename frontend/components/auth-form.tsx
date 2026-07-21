"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import styles from "./auth-form.module.css";

type AuthFormProps = {
  googleEnabled?: boolean;
  initialMode?: "signin" | "signup";
};

export function AuthForm({ googleEnabled = true, initialMode = "signin" }: AuthFormProps) {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
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
    <div className={styles.card}>
      <h1 className={styles.title}>{mode === "signin" ? "Welcome back" : "Create account"}</h1>
      <p className={styles.subtitle}>Luxury rental and resale, built for modern wardrobes.</p>
      <div className={styles.welcomeNote}>
        {welcomeNote}
      </div>
      <form className={`${styles.form} ${styles.fieldStack}`} onSubmit={handleSubmit}>
        {mode === "signup" ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className={styles.field}
            required
          />
        ) : null}
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Email"
          className={styles.field}
          required
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Password"
          className={styles.field}
          required
        />
        {mode === "signup" ? (
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "CUSTOMER" | "LENDER")}
            className={styles.field}
          >
            <option value="CUSTOMER">Buyer</option>
            <option value="LENDER">Seller</option>
          </select>
        ) : null}
        <button
          type="submit"
          className={styles.primaryButton}
          disabled={loading}
        >
          {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
      {googleEnabled ? (
        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className={styles.googleButton}
        >
          Continue with Google
        </button>
      ) : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      <button
        className={styles.switchButton}
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
      >
        {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
