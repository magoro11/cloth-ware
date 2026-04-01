import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CartList } from "@/components/cart-list";
import { databaseErrorMessage, isDatabaseUnavailable, logDatabaseIssue } from "@/lib/errors";

export const dynamic = "force-dynamic";

type CartItemWithRelations = Prisma.CartItemGetPayload<{
  include: {
    item: {
      include: {
        images: { orderBy: { sortOrder: "asc" } };
        owner: { select: { name: true; email: true } };
      };
    };
  };
}>;

export default async function CartPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  let cartItems: CartItemWithRelations[] = [];
  let dbError = false;
  let dbErrorMessage = "Database is currently unavailable.";

  try {
    cartItems = await prisma.cartItem.findMany({
      where: { userId: session.user.id },
      include: {
        item: {
          include: {
            images: { orderBy: { sortOrder: "asc" } },
            owner: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    dbError = isDatabaseUnavailable(error);
    dbErrorMessage = databaseErrorMessage(error);
    logDatabaseIssue("CartPage database query failed", error);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="font-serif text-4xl">Cart</h1>
      <p className="mt-2 text-sm opacity-70">Collect buy-now pieces here before we wire in purchase checkout.</p>
      {dbError ? (
        <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          {dbErrorMessage} Run <code>npm run db:push</code> to create the new cart tables.
        </div>
      ) : null}
      <div className="mt-6">
        <CartList initialItems={cartItems} />
      </div>
    </main>
  );
}
