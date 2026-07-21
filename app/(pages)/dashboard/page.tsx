import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function DashboardEntryPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  if (session.user.role === "ADMIN") redirect("/dashboard/admin");
  if (session.user.role === "LENDER") redirect("/dashboard/seller");
  redirect("/dashboard/user");
}
