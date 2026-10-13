import { z } from "zod";

export const messageIdSchema = z.uuid();
export const createDirectConversationSchema = z
  .object({ recipientUserId: messageIdSchema })
  .strict();

// JWK public keys only: reject private "d" and unsupported curves.
export const ecdhPublicKeySchema = z
  .object({
    kty: z.literal("EC"),
    crv: z.literal("P-256"),
    x: z.base64url(),
    y: z.base64url(),
    ext: z.boolean().optional(),
    key_ops: z.array(z.string()).optional(),
  })
  .strict()
  .refine((key) => key.x.length === 43 && key.y.length === 43);

const cipherTextSchema = z.base64().max(10000);
const encryptedBoxSchema = z
  .object({
    userId: messageIdSchema,
    keyVersion: z.number().int().positive(),
    iv: z.base64().max(64),
    wrappedKey: cipherTextSchema,
  })
  .strict();
export const encryptedPayloadSchema = z
  .object({
    version: z.literal(1),
    nonce: messageIdSchema,
    iv: z.base64().max(64),
    ciphertext: cipherTextSchema,
    ephemeralPublicKey: ecdhPublicKeySchema,
    hkdfSalt: z.base64().max(64),
    boxes: z.array(encryptedBoxSchema).length(2),
  })
  .strict();
export const sendMessageSchema = z
  .object({
    clientMessageId: messageIdSchema,
    encryptedPayload: encryptedPayloadSchema,
    attachmentId: messageIdSchema.optional(),
  })
  .strict();
export const contactDecisionSchema = z
  .object({ decision: z.enum(["accepted", "rejected"]) })
  .strict();
export const deleteMessageSchema = z
  .object({ mode: z.enum(["me", "everyone"]) })
  .strict();
export const registerIdentityKeySchema = z
  .object({ publicKey: ecdhPublicKeySchema })
  .strict();
export const updateMessageSettingsSchema = z
  .object({
    enabled: z.boolean().optional(),
    directMessagesEnabled: z.boolean().optional(),
    readReceiptsEnabled: z.boolean().optional(),
  })
  .strict()
  .refine((settings) => Object.keys(settings).length > 0);

export const resetIdentityKeySchema = z
  .object({
    publicKey: ecdhPublicKeySchema,
    confirmation: z.literal("PERDER_HISTORICO"),
  })
  .strict();
