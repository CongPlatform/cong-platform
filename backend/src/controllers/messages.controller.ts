import type { Request, Response } from "express";
import { z } from "zod";

import {
  findMessageRecipients,
  getMessageModuleSettings,
  getMessageViewer,
  getOwnMessageIdentity,
  registerMessageIdentity,
  resetMessageIdentity,
  getConversationKeys,
  listConversationMessages,
  listMessageConversations,
  respondToContactRequest,
  deleteConversationMessage,
  uploadEncryptedMessageAttachment,
  downloadEncryptedMessageAttachment,
  markConversationRead,
  sendConversationMessage,
  startDirectConversation,
  updateMessageModuleSettings,
  type MessageContext,
} from "../services/messages.service.js";
import { AppError } from "../utils/app-error.js";
import { messageIdSchema } from "../validators/messages.validator.js";

function routeId(req: Request): string {
  const rawId = req.params.conversationId;
  const parsed = messageIdSchema.safeParse(rawId);
  if (!parsed.success)
    throw new AppError("Identificador inválido.", 400, "MESSAGE_INVALID_ID");
  return parsed.data;
}

function context(
  res: Response,
  scope: "global" | "organization",
): MessageContext {
  if (scope === "global") return { scope: "global" };
  const organization = res.locals.organizationContext;
  if (!organization)
    throw new AppError(
      "Organização não selecionada.",
      400,
      "MESSAGE_ORGANIZATION_REQUIRED",
    );
  return { scope: "organization", organization };
}

function handle(error: unknown, response: Response) {
  if (error instanceof AppError) {
    response
      .status(error.statusCode)
      .json({ error: error.message, code: error.code });
    return;
  }
  console.error("Messages API error", error);
  response
    .status(500)
    .json({
      error: "Erro interno ao processar mensagens.",
      code: "MESSAGE_INTERNAL_ERROR",
    });
}

// Todos os handlers são usados APÓS authenticate. Os institucionais também
// passam pelo requireOrganizationContext, garantindo acesso a uma ONG ativa.
export function messageHandlers(scope: "global" | "organization") {
  return {
    async recipients(req: Request, res: Response) {
      try {
        const viewer = await getMessageViewer(res.locals.authUser.id);
        const query = z
          .string()
          .max(100)
          .safeParse(req.query.q ?? "");
        if (!query.success)
          throw new AppError("Busca inválida.", 400, "MESSAGE_INVALID_SEARCH");
        res.json({
          users: await findMessageRecipients(
            viewer.id,
            context(res, scope),
            query.data,
          ),
        });
      } catch (error) {
        handle(error, res);
      }
    },
    async conversations(_req: Request, res: Response) {
      try {
        const viewer = await getMessageViewer(res.locals.authUser.id);
        res.json({
          viewerId: viewer.id,
          conversations: await listMessageConversations(
            viewer.id,
            context(res, scope),
          ),
        });
      } catch (error) {
        handle(error, res);
      }
    },
    async create(req: Request, res: Response) {
      try {
        const viewer = await getMessageViewer(res.locals.authUser.id);
        const conversation = await startDirectConversation(
          viewer.id,
          req.body.recipientUserId,
          context(res, scope),
        );
        res.status(201).json({ conversation });
      } catch (error) {
        handle(error, res);
      }
    },
    async messages(req: Request, res: Response) {
      try {
        const viewer = await getMessageViewer(res.locals.authUser.id);
        res.json(
          await listConversationMessages(
            viewer.id,
            routeId(req),
            context(res, scope),
          ),
        );
      } catch (error) {
        handle(error, res);
      }
    },
    async send(req: Request, res: Response) {
      try {
        const viewer = await getMessageViewer(res.locals.authUser.id);
        res
          .status(201)
          .json({
            message: await sendConversationMessage(
              viewer.id,
              routeId(req),
              req.body.clientMessageId,
              req.body.encryptedPayload,
              context(res, scope),
              req.body.attachmentId,
            ),
          });
      } catch (error) {
        handle(error, res);
      }
    },
    async keys(req: Request, res: Response) {
      try {
        const viewer = await getMessageViewer(res.locals.authUser.id);
        res.json({
          keys: await getConversationKeys(
            viewer.id,
            routeId(req),
            context(res, scope),
          ),
        });
      } catch (error) {
        handle(error, res);
      }
    },
    async respond(req: Request, res: Response) {
      try {
        const viewer = await getMessageViewer(res.locals.authUser.id);
        res.json(
          await respondToContactRequest(
            viewer.id,
            routeId(req),
            req.body.decision,
            context(res, scope),
          ),
        );
      } catch (error) {
        handle(error, res);
      }
    },
    async remove(req: Request, res: Response) {
      try {
        const viewer = await getMessageViewer(res.locals.authUser.id);
        const parsed = messageIdSchema.safeParse(req.params.messageId);
        if (!parsed.success)
          throw new AppError("Mensagem inválida.", 400, "MESSAGE_INVALID_ID");
        res.json(
          await deleteConversationMessage(
            viewer.id,
            routeId(req),
            parsed.data,
            req.body.mode,
            context(res, scope),
          ),
        );
      } catch (error) {
        handle(error, res);
      }
    },
    async uploadAttachment(req: Request, res: Response) {
      try {
        const viewer = await getMessageViewer(res.locals.authUser.id);
        if (!req.file)
          throw new AppError(
            "Anexo ausente.",
            400,
            "MESSAGE_ATTACHMENT_REQUIRED",
          );
        res
          .status(201)
          .json(
            await uploadEncryptedMessageAttachment(
              viewer.id,
              routeId(req),
              req.file.buffer,
              context(res, scope),
            ),
          );
      } catch (error) {
        handle(error, res);
      }
    },
    async downloadAttachment(req: Request, res: Response) {
      try {
        const viewer = await getMessageViewer(res.locals.authUser.id);
        const parsed = messageIdSchema.safeParse(req.params.attachmentId);
        if (!parsed.success)
          throw new AppError(
            "Anexo inválido.",
            400,
            "MESSAGE_ATTACHMENT_INVALID_ID",
          );
        res.json(
          await downloadEncryptedMessageAttachment(
            viewer.id,
            routeId(req),
            parsed.data,
            context(res, scope),
          ),
        );
      } catch (error) {
        handle(error, res);
      }
    },
    async read(req: Request, res: Response) {
      try {
        const viewer = await getMessageViewer(res.locals.authUser.id);
        res.json(
          await markConversationRead(
            viewer.id,
            routeId(req),
            context(res, scope),
          ),
        );
      } catch (error) {
        handle(error, res);
      }
    },
  };
}

export async function getSettings(_req: Request, res: Response) {
  try {
    res.json({
      settings: await getMessageModuleSettings(res.locals.organizationContext),
    });
  } catch (error) {
    handle(error, res);
  }
}

export async function saveSettings(req: Request, res: Response) {
  try {
    res.json({
      settings: await updateMessageModuleSettings(
        res.locals.organizationContext,
        req.body,
      ),
    });
  } catch (error) {
    handle(error, res);
  }
}

export async function getIdentity(_req: Request, res: Response) {
  try {
    const viewer = await getMessageViewer(res.locals.authUser.id);
    res.json({
      identity: await getOwnMessageIdentity(viewer.id),
      viewerId: viewer.id,
    });
  } catch (error) {
    handle(error, res);
  }
}
export async function registerIdentity(req: Request, res: Response) {
  try {
    const viewer = await getMessageViewer(res.locals.authUser.id);
    res.json({
      identity: await registerMessageIdentity(viewer.id, req.body.publicKey),
    });
  } catch (error) {
    handle(error, res);
  }
}

export async function resetIdentity(req: Request, res: Response) {
  try {
    if (req.body.confirmation !== "PERDER_HISTORICO") {
      throw new AppError(
        "Confirmação de recuperação inválida.",
        400,
        "MESSAGE_CONFIRMATION_REQUIRED",
      );
    }
    const viewer = await getMessageViewer(res.locals.authUser.id);
    res.json({
      identity: await resetMessageIdentity(viewer.id, req.body.publicKey),
    });
  } catch (error) {
    handle(error, res);
  }
}
