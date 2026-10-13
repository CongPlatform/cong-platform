/** CONG experimental single-device E2EE v1.
 * Native WebCrypto ECDH(P-256) + HKDF(SHA-256) + AES-256-GCM.
 * Does not provide Signal-style forward secrecy or multi-device support.
 * Trust-on-first-use keys MUST be verified out of band for strong peer authentication.
 */
export interface MessagePublicKey {
  kty: "EC";
  crv: "P-256";
  x: string;
  y: string;
  ext?: boolean;
  key_ops?: string[];
}
export interface MessageParticipantKey {
  userId: string;
  publicKey: MessagePublicKey | null;
  keyVersion: number | null;
}
export interface EncryptedPayload {
  version: 1;
  nonce: string;
  iv: string;
  ciphertext: string;
  ephemeralPublicKey: MessagePublicKey;
  hkdfSalt: string;
  boxes: {
    userId: string;
    keyVersion: number;
    iv: string;
    wrappedKey: string;
  }[];
}
interface LocalIdentity {
  privateKey: CryptoKey;
  publicKey: MessagePublicKey;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const databaseName = "cong-message-device-keys-v1";
function bytes(value: ArrayBuffer): Uint8Array<ArrayBuffer> {
  return new Uint8Array(value);
}
function random(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length));
}
function toB64(value: ArrayBuffer | Uint8Array<ArrayBuffer>): string {
  const buffer = value instanceof Uint8Array ? value : bytes(value);
  let raw = "";
  for (const b of buffer) raw += String.fromCharCode(b);
  return btoa(raw);
}
function fromB64(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}
function normalize(key: JsonWebKey): MessagePublicKey {
  if (key.kty !== "EC" || key.crv !== "P-256" || !key.x || !key.y || key.d) {
    throw new Error("Chave pública de mensagens inválida.");
  }
  return { kty: "EC", crv: "P-256", x: key.x, y: key.y };
}
function keyMatch(first: MessagePublicKey, second: MessagePublicKey) {
  return first.x === second.x && first.y === second.y;
}
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("identity"))
        db.createObjectStore("identity");
      if (!db.objectStoreNames.contains("trust")) db.createObjectStore("trust");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function storageGet<T>(storeName: string, id: string): Promise<T | null> {
  const db = await openDatabase();
  try {
    return await new Promise<T | null>((resolve, reject) => {
      const request = db
        .transaction(storeName, "readonly")
        .objectStore(storeName)
        .get(id);
      request.onsuccess = () =>
        resolve((request.result as T | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}
async function storagePut(
  storeName: string,
  id: string,
  value: unknown,
): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).put(value, id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}
export async function generateDeviceIdentity(): Promise<LocalIdentity> {
  // Private key is non-extractable and stored as a structured-clone CryptoKey.
  const pair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveBits"],
  );
  return {
    privateKey: pair.privateKey,
    publicKey: normalize(await crypto.subtle.exportKey("jwk", pair.publicKey)),
  };
}
export const readDeviceIdentity = (userId: string) =>
  storageGet<LocalIdentity>("identity", userId);
export const saveDeviceIdentity = (userId: string, key: LocalIdentity) =>
  storagePut("identity", userId, key);
export function identityMatches(a: MessagePublicKey, b: MessagePublicKey) {
  return keyMatch(a, b);
}

export async function fingerprint(key: MessagePublicKey): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`CONG-E2EE-v1:${key.crv}:${key.x}:${key.y}`),
  );
  return [...bytes(digest)]
    .map((part) => part.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}
export async function checkPeerTrust(
  myId: string,
  peerId: string,
  key: MessagePublicKey,
) {
  const next = await fingerprint(key);
  const pinned = await storageGet<string>("trust", `${myId}:${peerId}`);
  if (pinned && pinned !== next) return { trusted: false, fingerprint: next };
  if (!pinned) await storagePut("trust", `${myId}:${peerId}`, next);
  return { trusted: true, fingerprint: next };
}
export async function acceptPeerTrust(
  myId: string,
  peerId: string,
  key: MessagePublicKey,
) {
  await storagePut("trust", `${myId}:${peerId}`, await fingerprint(key));
}
async function deriveWrappingKey(
  privateKey: CryptoKey,
  publicKey: MessagePublicKey,
  salt: Uint8Array<ArrayBuffer>,
  aad: string,
): Promise<CryptoKey> {
  const remote = await crypto.subtle.importKey(
    "jwk",
    publicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const secret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: remote },
    privateKey,
    256,
  );
  const material = await crypto.subtle.importKey("raw", secret, "HKDF", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt,
      info: encoder.encode(`CONG-E2EE-v1-box:${aad}`),
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptMessage(
  body: string,
  conversationId: string,
  nonce: string,
  keys: MessageParticipantKey[],
): Promise<EncryptedPayload> {
  if (
    keys.length !== 2 ||
    keys.some((key) => !key.publicKey || !key.keyVersion)
  ) {
    throw new Error(
      "Ambos os participantes precisam ativar as mensagens seguras antes de enviar.",
    );
  }
  const ephemeral = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveBits"],
  );
  const ephemeralPublicKey = normalize(
    await crypto.subtle.exportKey("jwk", ephemeral.publicKey),
  );
  const secret = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  const rawKey = await crypto.subtle.exportKey("raw", secret);
  const iv = random(12);
  const aad = `${conversationId}:${nonce}`;
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(aad) },
    secret,
    encoder.encode(body),
  );
  const salt = random(32);
  const boxes = await Promise.all(
    keys.map(async (person) => {
      const wrapping = await deriveWrappingKey(
        ephemeral.privateKey,
        person.publicKey!,
        salt,
        `${aad}:${person.userId}`,
      );
      const boxIv = random(12);
      const wrapped = await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: boxIv,
          additionalData: encoder.encode(`${aad}:${person.userId}`),
        },
        wrapping,
        rawKey,
      );
      return {
        userId: person.userId,
        keyVersion: person.keyVersion!,
        iv: toB64(boxIv),
        wrappedKey: toB64(wrapped),
      };
    }),
  );
  return {
    version: 1,
    nonce,
    iv: toB64(iv),
    ciphertext: toB64(ciphertext),
    ephemeralPublicKey,
    hkdfSalt: toB64(salt),
    boxes,
  };
}
export async function decryptMessage(
  payload: EncryptedPayload,
  conversationId: string,
  userId: string,
  privateKey: CryptoKey,
): Promise<string> {
  if (payload.version !== 1)
    throw new Error("Formato de mensagem desconhecido.");
  const box = payload.boxes.find((item) => item.userId === userId);
  if (!box) throw new Error("Mensagem não destinada a esta conta.");
  const aad = `${conversationId}:${payload.nonce}`;
  const wrapping = await deriveWrappingKey(
    privateKey,
    payload.ephemeralPublicKey,
    fromB64(payload.hkdfSalt),
    `${aad}:${userId}`,
  );
  const rawKey = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromB64(box.iv),
      additionalData: encoder.encode(`${aad}:${userId}`),
    },
    wrapping,
    fromB64(box.wrappedKey),
  );
  const messageKey = await crypto.subtle.importKey(
    "raw",
    rawKey,
    "AES-GCM",
    false,
    ["decrypt"],
  );
  const plain = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromB64(payload.iv),
      additionalData: encoder.encode(aad),
    },
    messageKey,
    fromB64(payload.ciphertext),
  );
  return decoder.decode(plain);
}
