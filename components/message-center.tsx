"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useToast } from "@/components/toast-provider";
import { createClient as createSupabaseClient } from "@/utils/supabase/client";

type Contact = {
  id: string;
  label: string;
  role: "BUYER" | "SELLER";
};

type Message = {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
};

type RealtimePayload = {
  message?: Message;
};

function getConversationChannelName(userA: string, userB: string) {
  return ["messages", userA, userB].sort().join(":");
}

export function MessageCenter({
  currentUserId,
  contacts,
  initialActiveId,
}: {
  currentUserId: string;
  contacts: Contact[];
  initialActiveId?: string;
}) {
  const { pushToast } = useToast();
  const [activeId, setActiveId] = useState<string>(initialActiveId || contacts[0]?.id || "");
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const activeContact = useMemo(() => contacts.find((contact) => contact.id === activeId), [contacts, activeId]);

  useEffect(() => {
    if (!contacts.length) return;
    if (initialActiveId && contacts.some((contact) => contact.id === initialActiveId)) {
      setActiveId(initialActiveId);
      return;
    }
    if (!activeId) setActiveId(contacts[0].id);
  }, [activeId, contacts, initialActiveId]);

  useEffect(() => {
    if (!activeId) return;

    let mounted = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function loadMessages() {
      const response = await fetch(`/api/messages?recipientId=${activeId}`);
      const payload = await response.json();
      if (mounted && response.ok) {
        setMessages(payload.messages || []);
      }
    }

    void loadMessages();

    try {
      const supabase = createSupabaseClient();
      const channel = supabase
        .channel(getConversationChannelName(currentUserId, activeId))
        .on("broadcast", { event: "message:created" }, ({ payload }: { payload: RealtimePayload }) => {
          const message = payload.message;
          if (!message || !mounted) return;

          setMessages((prev) => (prev.some((entry) => entry.id === message.id) ? prev : [...prev, message]));
        })
        .subscribe((status) => {
          if (!mounted) return;
          setRealtimeEnabled(status === "SUBSCRIBED");
        });

      channelRef.current = channel;
    } catch {
      setRealtimeEnabled(false);
      intervalId = setInterval(() => {
        void loadMessages();
      }, 2500);
    }

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
      if (channelRef.current) {
        void channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      setRealtimeEnabled(false);
    };
  }, [activeId, currentUserId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeId || !content.trim()) return;
    setSending(true);
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId: activeId, content }),
    });
    const payload = await response.json();
    setSending(false);

    if (!response.ok) {
      pushToast(payload.error || "Unable to send message");
      return;
    }

    setContent("");
    setMessages((prev) => (prev.some((message) => message.id === payload.message.id) ? prev : [...prev, payload.message]));

    if (channelRef.current) {
      await channelRef.current.send({
        type: "broadcast",
        event: "message:created",
        payload: { message: payload.message },
      });
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[260px,1fr]">
      <aside className="rounded-2xl border border-black/10 p-3 dark:border-white/10">
        <h2 className="text-sm font-semibold">Conversations</h2>
        <div className="mt-3 space-y-2">
          {contacts.length === 0 ? <p className="text-sm opacity-65">No active contacts yet.</p> : null}
          {contacts.map((contact) => (
            <button
              key={contact.id}
              onClick={() => setActiveId(contact.id)}
              className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                activeId === contact.id
                  ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-black/10 dark:border-white/10"
              }`}
            >
              <p className="font-medium">{contact.label}</p>
              <p className="text-xs opacity-75">{contact.role}</p>
            </button>
          ))}
        </div>
      </aside>

      <section className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
        <div className="border-b border-black/10 pb-3 dark:border-white/10">
          <p className="font-semibold">{activeContact?.label || "Select a conversation"}</p>
          <p className="mt-1 text-xs opacity-60">{realtimeEnabled ? "Live updates connected" : "Realtime unavailable, using refresh fallback"}</p>
        </div>
        <div className="mt-3 h-[340px] space-y-2 overflow-y-auto rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.03]">
          {messages.length === 0 ? <p className="text-sm opacity-65">No messages yet.</p> : null}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                message.senderId === currentUserId
                  ? "ml-auto bg-black text-white dark:bg-white dark:text-black"
                  : "bg-white dark:bg-[#1b2030]"
              }`}
            >
              <p>{message.content}</p>
              <p className="mt-1 text-[10px] opacity-70">{new Date(message.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
          <input
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={activeId ? "Type your message..." : "Select a conversation first"}
            disabled={!activeId}
            className="w-full rounded-lg border border-black/15 bg-transparent p-2.5"
          />
          <button
            disabled={sending || !activeId}
            className="rounded-lg bg-black px-4 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            Send
          </button>
        </form>
      </section>
    </div>
  );
}
