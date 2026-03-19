import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/access";
import { getMessageStore } from "@/lib/message-store";

const schema = z.object({
  recipientId: z.string().min(2),
  content: z.string().min(1).max(1000),
});

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const recipientId = searchParams.get("recipientId");
    if (!recipientId) {
      return NextResponse.json({ messages: [] });
    }

    const messages = getMessageStore().filter(
      (message) =>
        (message.senderId === user.id && message.recipientId === recipientId) ||
        (message.senderId === recipientId && message.recipientId === user.id),
    );

    return NextResponse.json({ messages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const payload = schema.parse(await request.json());
    const message = {
      id: crypto.randomUUID(),
      senderId: user.id,
      recipientId: payload.recipientId,
      content: payload.content,
      createdAt: new Date().toISOString(),
    };

    getMessageStore().push(message);
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send message";
    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
