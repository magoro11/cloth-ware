type MessageRecord = {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
};

declare global {
  var __advance_rewear_messages__: MessageRecord[] | undefined;
}

export function getMessageStore() {
  if (!globalThis.__advance_rewear_messages__) {
    globalThis.__advance_rewear_messages__ = [];
  }
  return globalThis.__advance_rewear_messages__;
}

export type { MessageRecord };
