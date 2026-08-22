import type { Request, Response } from "express";

import { getAccount, updateAccount } from "../services/account.service.js";

import {
  removeAccountAvatar,
  uploadAccountAvatar,
} from "../services/avatar.service.js";

import { AppError } from "../utils/app-error.js";

export async function me(_req: Request, res: Response): Promise<void> {
  try {
    const authUser = res.locals.authUser;

    if (!authUser?.email) {
      throw new AppError(
        "Authenticated user email was not found",
        401,
        "AUTH_USER_EMAIL_NOT_FOUND",
      );
    }

    const user = await getAccount(authUser.id, authUser.email);

    res.status(200).json({
      user,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });

      return;
    }

    res.status(500).json({
      error: "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  try {
    const authUser = res.locals.authUser;

    if (!authUser?.email) {
      throw new AppError(
        "Authenticated user email was not found",
        401,
        "AUTH_USER_EMAIL_NOT_FOUND",
      );
    }

    const user = await updateAccount(authUser.id, authUser.email, req.body);

    res.status(200).json({
      message: "Account updated successfully",
      user,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });

      return;
    }

    res.status(500).json({
      error: "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
}

export async function uploadAvatar(req: Request, res: Response): Promise<void> {
  try {
    const authUser = res.locals.authUser;

    if (!req.file) {
      res.status(400).json({
        message: "Selecione uma imagem.",
        code: "AVATAR_REQUIRED",
      });

      return;
    }

    const result = await uploadAccountAvatar(authUser.id, req.file);

    res.status(200).json({
      message: "Foto de perfil atualizada com sucesso.",
      avatarPath: result.avatarPath,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        message: error.message,
        code: error.code,
      });

      return;
    }

    console.error("Erro ao atualizar avatar:", error);

    res.status(500).json({
      message: "Erro interno do servidor.",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
}

export async function removeAvatar(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const authUser = res.locals.authUser;

    const result = await removeAccountAvatar(authUser.id);

    res.status(200).json({
      message: "Avatar padrão restaurado com sucesso.",
      avatarPath: result.avatarPath,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        message: error.message,
        code: error.code,
      });

      return;
    }

    console.error("Erro ao remover avatar:", error);

    res.status(500).json({
      message: "Erro interno do servidor.",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
}
