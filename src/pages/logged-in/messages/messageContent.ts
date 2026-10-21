/** This envelope is encrypted before it reaches the server. Legacy plaintext messages still render unchanged. */
export type ChatReply = { id: string; preview: string; author: string };
export type ChatReaction = {
  kind: "cong-reaction-v1";
  target: string;
  emoji: string;
  remove?: boolean;
};
export type ChatText = {
  kind: "cong-text-v1";
  text: string;
  reply?: ChatReply;
};

export const MESSAGE_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🙏"] as const;
const isId = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);

export function parseChatContent(value: string): {
  text: string;
  reply: ChatReply | null;
  reaction: ChatReaction | null;
} {
  try {
    const entry: unknown = JSON.parse(value);
    if (!entry || typeof entry !== "object") throw new Error("legacy");
    const data = entry as Record<string, unknown>;
    if (
      data.kind === "cong-reaction-v1" &&
      isId(data.target) &&
      typeof data.emoji === "string" &&
      MESSAGE_EMOJIS.includes(data.emoji as (typeof MESSAGE_EMOJIS)[number])
    ) {
      return {
        text: "",
        reply: null,
        reaction: {
          kind: "cong-reaction-v1",
          target: data.target,
          emoji: data.emoji,
          remove: data.remove === true,
        },
      };
    }
    if (
      data.kind === "cong-text-v1" &&
      typeof data.text === "string" &&
      data.text.length <= 4000
    ) {
      return { text: data.text, reply: parseReply(data.reply), reaction: null };
    }
    // Attachment metadata may contain an optional encrypted reply reference.
    if (data.kind === "attachment")
      return { text: value, reply: parseReply(data.reply), reaction: null };
  } catch {
    /* Backwards compatible with the existing plaintext payload format. */
  }
  return { text: value, reply: null, reaction: null };
}

function parseReply(value: unknown): ChatReply | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Record<string, unknown>;
  if (
    !isId(entry.id) ||
    typeof entry.preview !== "string" ||
    typeof entry.author !== "string"
  )
    return null;
  return {
    id: entry.id,
    preview: entry.preview.slice(0, 180),
    author: entry.author.slice(0, 90),
  };
}

export function serializeText(text: string, reply: ChatReply | null): string {
  return reply
    ? JSON.stringify({ kind: "cong-text-v1", text, reply } satisfies ChatText)
    : text;
}
