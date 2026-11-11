import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ItemRedirectPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  redirect(`/product/${id}`);
}
