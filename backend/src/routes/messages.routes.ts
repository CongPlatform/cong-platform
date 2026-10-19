import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";
import { requireOrganizationContext } from "../middlewares/organization-context.js";
import { validateBody } from "../middlewares/validate.js";
import { communityRateLimit } from "../middlewares/community-rate-limit.js";
import {
  messageHandlers,
  getSettings,
  saveSettings,
} from "../controllers/messages.controller.js";
import {
  createDirectConversationSchema,
  createGroupSchema,
  contactDecisionSchema,
  sendMessageSchema,
  deleteMessageSchema,
  reactMessageSchema,
  createAttachmentSchema,
  updateMessageSettingsSchema,
} from "../validators/messages.validator.js";
import { z } from "zod";
import { parseAvatarUpload } from "../middlewares/avatar-upload.js";

const router = Router();
router.use(authenticate);
const searchLimit = communityRateLimit({
  name: "chat-search",
  windowMs: 60_000,
  max: 30,
});
const startLimit = communityRateLimit({
  name: "chat-create",
  windowMs: 60_000,
  max: 10,
});
const sendLimit = communityRateLimit({
  name: "chat-send",
  windowMs: 60_000,
  max: 40,
});
function mount(r: Router, scope: "global" | "organization") {
  const h = messageHandlers(scope);
  r.get("/people", searchLimit, h.people);
  r.get("/conversations", h.conversations);
  r.post(
    "/conversations",
    startLimit,
    validateBody(createDirectConversationSchema),
    h.create,
  );
  r.post("/groups", startLimit, validateBody(createGroupSchema), h.createGroup);
  r.post(
    "/conversations/:conversationId/group",
    validateBody(
      z.discriminatedUnion("action", [
        z.object({ action: z.literal("add"), userId: z.uuid() }),
        z.object({ action: z.literal("remove"), userId: z.uuid() }),
        z.object({ action: z.literal("leave") }),
        z.object({
          action: z.literal("rename"),
          title: z.string().trim().min(2).max(100),
        }),
        z.object({
          action: z.literal("describe"),
          description: z.string().trim().max(500),
        }),
        z.object({ action: z.literal("promote"), userId: z.uuid() }),
        z.object({ action: z.literal("demote"), userId: z.uuid() }),
      ]),
    ),
    h.manageGroup,
  );
  r.get("/conversations/:conversationId/messages", h.messages);
  r.get("/conversations/:conversationId/media", h.media);
  r.post(
    "/conversations/:conversationId/group/photo",
    parseAvatarUpload,
    h.photo,
  );
  r.delete("/conversations/:conversationId/group/photo", h.removePhoto);
  r.post(
    "/conversations/:conversationId/messages",
    sendLimit,
    validateBody(sendMessageSchema),
    h.send,
  );
  r.post(
    "/conversations/:conversationId/contact",
    validateBody(contactDecisionSchema),
    h.respond,
  );
  r.post(
    "/conversations/:conversationId/messages/:messageId/delete",
    validateBody(deleteMessageSchema),
    h.remove,
  );
  r.post(
    "/conversations/:conversationId/messages/:messageId/reaction",
    sendLimit,
    validateBody(reactMessageSchema),
    h.reaction,
  );
  r.post("/conversations/:conversationId/read", h.read);
  r.post(
    "/conversations/:conversationId/attachments/prepare",
    sendLimit,
    validateBody(createAttachmentSchema),
    h.createUpload,
  );
  r.get("/conversations/:conversationId/attachments/:attachmentId", h.download);
}
const global = Router();
mount(global, "global");
router.use("/global", global);
const org = Router();
org.use(requireOrganizationContext);
org.get("/settings", getSettings);
org.patch("/settings", validateBody(updateMessageSettingsSchema), saveSettings);
mount(org, "organization");
router.use("/organization", org);
export default router;
