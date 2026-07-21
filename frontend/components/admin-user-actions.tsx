"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/toast-provider";

type Props = {
  userId: string;
  isBanned: boolean;
  role: "CUSTOMER" | "LENDER" | "ADMIN";
};

export function AdminUserActions({ userId, isBanned, role }: Props) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function updateUser(payload: Record<string, unknown>, message: string) {
    setBusy(message);
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    setBusy(null);
    if (!response.ok) {
      pushToast(data.error || "Unable to update user");
      return;
    }
    pushToast(message);
    router.refresh();
  }

  async function deleteUser() {
    setBusy("delete");
    const response = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    const data = await response.json();
    setBusy(null);
    if (!response.ok) {
      pushToast(data.error || "Unable to delete user");
      return;
    }
    pushToast("User deleted");
    router.refresh();
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" onClick={() => updateUser({ isBanned: !isBanned }, isBanned ? "User unbanned" : "User banned")} disabled={busy !== null} className="rounded-lg border border-black/15 px-3 py-1.5 text-xs hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10">
        {busy === "User banned" || busy === "User unbanned" ? "Saving..." : isBanned ? "Unban user" : "Ban user"}
      </button>
      {role !== "LENDER" ? (
        <button type="button" onClick={() => updateUser({ role: "LENDER" }, "User promoted to lender")} disabled={busy !== null} className="rounded-lg border border-black/15 px-3 py-1.5 text-xs hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10">
          Promote to lender
        </button>
      ) : null}
      <button type="button" onClick={deleteUser} disabled={busy !== null} className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500/40 dark:text-rose-200 dark:hover:bg-rose-500/10">
        {busy === "delete" ? "Deleting..." : "Delete"}
      </button>
    </div>
  );
}
