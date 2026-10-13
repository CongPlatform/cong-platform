/** File bytes and metadata are encrypted before upload. The server sees only ciphertext. */
export interface SecureAttachment {
  kind: "attachment";
  id: string;
  name: string;
  mime: string;
  size: number;
  caption?: string;
  key: string;
  iv: string;
}
export const MAX_MESSAGE_ATTACHMENT_BYTES = 1_000_000;

const b64 = (bytes: Uint8Array) => {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
};
const fromB64 = (value: string) => Uint8Array.from(atob(value), (item) => item.charCodeAt(0));

export function readSecureAttachment(value: string): SecureAttachment | null {
  try {
    const meta: unknown = JSON.parse(value);
    if (!meta || typeof meta !== "object") return null;
    const item = meta as Partial<SecureAttachment>;
    if (
      item.kind !== "attachment" || typeof item.id !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(item.id) || typeof item.name !== "string" || item.name.length > 255 ||
      typeof item.mime !== "string" || typeof item.size !== "number" ||
      typeof item.key !== "string" || typeof item.iv !== "string"
    ) return null;
    if (item.caption !== undefined && (typeof item.caption !== "string" || item.caption.length > 4000)) return null;
    return item as SecureAttachment;
  } catch { return null; }
}

export async function encryptAttachment(file: File): Promise<{
  bytes: Blob;
  metadata: Omit<SecureAttachment, "id">;
}> {
  if (!file.size || file.size > MAX_MESSAGE_ATTACHMENT_BYTES) {
    throw new Error("O anexo deve ter até 1 MB.");
  }
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, await file.arrayBuffer());
  const rawKey = await crypto.subtle.exportKey("raw", key);
  return {
    bytes: new Blob([cipher], { type: "application/octet-stream" }),
    metadata: {
      kind: "attachment", name: file.name.slice(0, 255),
      mime: file.type || "application/octet-stream", size: file.size,
      key: b64(new Uint8Array(rawKey)), iv: b64(iv),
    },
  };
}

export async function decryptAttachment(ciphertextB64: string, meta: SecureAttachment): Promise<Blob> {
  const key = await crypto.subtle.importKey("raw", fromB64(meta.key), "AES-GCM", false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(meta.iv) }, key, fromB64(ciphertextB64),
  );
  // Unsafe active-content formats are downloaded as opaque binary, not rendered by the app.
  const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain", "audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg", "audio/wav", "video/webm", "video/mp4", "video/quicktime"];
  const baseMime = meta.mime.split(";")[0].trim().toLowerCase();
  return new Blob([plain], { type: allowed.includes(baseMime) ? baseMime : "application/octet-stream" });
}
