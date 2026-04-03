import { AuthForm } from "@/components/auth-form";

type SignInPageProps = {
  searchParams?: Promise<{ mode?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const params = await searchParams;
  const initialMode = params?.mode === "signup" ? "signup" : "signin";

  return (
    <main className="grid min-h-[calc(100vh-4rem)] place-items-center px-4 py-10">
      <AuthForm googleEnabled={googleEnabled} initialMode={initialMode} />
    </main>
  );
}
