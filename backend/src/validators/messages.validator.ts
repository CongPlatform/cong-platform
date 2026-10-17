import { z } from "zod";

export const messageIdSchema = z.uuid();
export const createDirectConversationSchema = z.object({ recipientUserId: messageIdSchema }).strict();
export const createGroupSchema = z.object({
  title: z.string().trim().min(2).max(100),
  participantUserIds: z.array(messageIdSchema).min(1).max(49),
  description: z.string().trim().max(500).optional(),
}).strict();
export const renameGroupSchema = z.object({ title: z.string().trim().min(2).max(100) }).strict();
export const groupMemberSchema = z.object({ userId: messageIdSchema }).strict();
export const sendMessageSchema = z.object({
  clientMessageId: messageIdSchema,
  body: z.string().trim().max(4000).default(""),
  attachmentId: messageIdSchema.optional(),
  replyToId: messageIdSchema.optional(),
}).strict().refine((p) => p.body.length > 0 || !!p.attachmentId, "Mensagem vazia.");
export const reactMessageSchema = z.object({ emoji: z.enum(["❤️","👍","😂","😮","😢","🙏"]) }).strict();
export const contactDecisionSchema = z.object({ decision: z.enum(["accepted","rejected"]) }).strict();
export const deleteMessageSchema = z.object({ mode: z.enum(["me","everyone"]) }).strict();
export const createAttachmentSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().min(1).max(128),
  size: z.number().int().min(1).max(25_000_000),
}).strict();
export const updateMessageSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  directMessagesEnabled: z.boolean().optional(),
  readReceiptsEnabled: z.boolean().optional(),
}).strict().refine((changes) => Object.keys(changes).length > 0);
