import { Router } from "express";
import multer from "multer";

import { messageHandlers, getSettings, saveSettings, getIdentity, registerIdentity, resetIdentity } from "../controllers/messages.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { requireOrganizationContext } from "../middlewares/organization-context.js";
import { validateBody } from "../middlewares/validate.js";
import { communityRateLimit } from "../middlewares/community-rate-limit.js";
import {
  contactDecisionSchema, deleteMessageSchema, createDirectConversationSchema, sendMessageSchema, updateMessageSettingsSchema, registerIdentityKeySchema, resetIdentityKeySchema,
} from "../validators/messages.validator.js";

const router = Router();
// This file is encrypted on the device. MIME is intentionally opaque to the server.
const encryptedFileUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1_100_000, files: 1 } });
const searchLimit = communityRateLimit({ name: "messages-search", windowMs: 60_000, max: 30 });
const startLimit = communityRateLimit({ name: "messages-start", windowMs: 60_000, max: 12 });
const sendLimit = communityRateLimit({ name: "messages-send", windowMs: 60_000, max: 45 });
router.use(authenticate);
router.get("/identity", getIdentity);
router.post("/identity", validateBody(registerIdentityKeySchema), registerIdentity);
router.post("/identity/reset", validateBody(resetIdentityKeySchema), resetIdentity);

function mount(scopeRouter: Router, scope: "global" | "organization") {
  const handlers = messageHandlers(scope);
  scopeRouter.get("/people", searchLimit, handlers.recipients);
  scopeRouter.get("/conversations", handlers.conversations);
  scopeRouter.post("/conversations", startLimit, validateBody(createDirectConversationSchema), handlers.create);
  scopeRouter.get("/conversations/:conversationId/messages", handlers.messages);
  scopeRouter.get("/conversations/:conversationId/keys", handlers.keys);
  scopeRouter.post("/conversations/:conversationId/contact", validateBody(contactDecisionSchema), handlers.respond);
  scopeRouter.post("/conversations/:conversationId/messages/:messageId/delete", validateBody(deleteMessageSchema), handlers.remove);
  scopeRouter.post("/conversations/:conversationId/attachments", sendLimit, encryptedFileUpload.single("file"), handlers.uploadAttachment);
  scopeRouter.get("/conversations/:conversationId/attachments/:attachmentId", handlers.downloadAttachment);
  scopeRouter.post("/conversations/:conversationId/messages", sendLimit, validateBody(sendMessageSchema), handlers.send);
  scopeRouter.post("/conversations/:conversationId/read", handlers.read);
}

const global = Router();
mount(global, "global");
router.use("/global", global);

const organization = Router();
organization.use(requireOrganizationContext);
organization.get("/settings", getSettings);
organization.patch("/settings", validateBody(updateMessageSettingsSchema), saveSettings);
mount(organization, "organization");
router.use("/organization", organization);

export default router;
