import { AuthForm } from "@/components/auth-form";

export default function SignInPage() {
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  return (
    <main className="grid min-h-[calc(100vh-4rem)] place-items-center px-4 py-10">
      <AuthForm googleEnabled={googleEnabled} />
    </main>
  );
}
