import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ListItemForm } from "@/components/list-item-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ id?: string }>;

export default async function ListItemPage(props: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");
  const searchParams = await props.searchParams;

  if (!["LENDER", "ADMIN"].includes(session.user.role)) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 md:px-8">
        <div className="rounded-2xl border border-black/10 p-6 dark:border-white/10">
          <h1 className="font-serif text-3xl">Upgrade role to lender</h1>
          <p className="mt-2 text-sm opacity-80">
            Listing items requires a lender account. Create a lender account from sign-up or ask admin to upgrade your role.
          </p>
          <Link href="/dashboard" className="mt-4 inline-block rounded-lg bg-black px-4 py-2 text-white dark:bg-white dark:text-black">
            Go to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const item =
    searchParams.id
      ? await prisma.item.findFirst({
          where: {
            id: searchParams.id,
            ownerId: session.user.role === "ADMIN" ? undefined : session.user.id,
          },
          include: {
            images: { orderBy: { sortOrder: "asc" } },
          },
        })
      : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <ListItemForm initialItem={item ?? undefined} />
    </main>
  );
}
