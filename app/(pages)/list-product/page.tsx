import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ListProductForm } from "@/frontend/components/list-product-form";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ id?: string }>;

export default async function ListProductPage(props: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");
  const searchParams = await props.searchParams;

  if (!["LENDER", "ADMIN"].includes(session.user.role)) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 md:px-8">
        <div className="rounded-2xl border border-black/10 p-6 dark:border-white/10">
          <h1 className="font-serif text-3xl">Upgrade to Vendor</h1>
          <p className="mt-2 text-sm opacity-80">
            Listing products requires a vendor account. Contact support to upgrade your account.
          </p>
          <Link href="/dashboard" className="mt-4 inline-block rounded-lg bg-black px-4 py-2 text-white dark:bg-white dark:text-black">
            Go to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const product =
    searchParams.id
      ? await prisma.product.findFirst({
          where: {
            id: searchParams.id,
            vendorId: session.user.role === "ADMIN" ? undefined : session.user.id,
          },
          include: {
            variants: true,
            images: { orderBy: { sortOrder: "asc" } },
            category: true,
          },
        })
      : null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <ListProductForm initialProduct={(product ?? undefined) as any} />
    </main>
  );
}