import type { Request, Response } from "express";
import type { User as SupabaseUser } from "@supabase/supabase-js";

import {
  checkUsernameAvailability,
  getAccount,
  updateAccount,
  type AccountAuthentication,
  type AccountAuthProvider,
} from "../services/account.service.js";

import {
  removeAccountAvatar,
  uploadAccountAvatar,
} from "../services/avatar.service.js";

import { AppError } from "../utils/app-error.js";

const accountAuthProviderOrder: AccountAuthProvider[] = [
  "email",
  "google",
  "github",
];

function isAccountAuthProvider(value: unknown): value is AccountAuthProvider {
  return value === "email" || value === "google" || value === "github";
}

function getAccountAuthentication(
  authUser: SupabaseUser,
): AccountAuthentication {
  if (!authUser.email) {
    throw new AppError(
      "Authenticated user email was not found",
      401,
      "AUTH_USER_EMAIL_NOT_FOUND",
    );
  }

  const identityProviders = (authUser.identities ?? []).map(
    (identity) => identity.provider,
  );

  const metadataProviders = Array.isArray(authUser.app_metadata.providers)
    ? authUser.app_metadata.providers
    : [];

  const primaryMetadataProvider = authUser.app_metadata.provider;

  const providerSet = new Set<AccountAuthProvider>(
    [
      ...identityProviders,
      ...metadataProviders,
      primaryMetadataProvider,
    ].filter(isAccountAuthProvider),
  );

  return {
    email: authUser.email,
    emailVerified: Boolean(authUser.email_confirmed_at),
    providers: accountAuthProviderOrder.filter((provider) =>
      providerSet.has(provider),
    ),
  };
}

export async function me(_req: Request, res: Response): Promise<void> {
  try {
    const authUser = res.locals.authUser;

    const authentication = getAccountAuthentication(authUser);

    const user = await getAccount(authUser.id, authentication);

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

    console.error("Erro ao carregar conta:", error);

    res.status(500).json({
      error: "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
}

export async function usernameAvailability(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authUser = res.locals.authUser;

    const rawUsername =
      typeof req.query.username === "string" ? req.query.username : "";

    const username = rawUsername.trim().replace(/^@+/, "").toLowerCase();

    if (
      username.length < 3 ||
      username.length > 30 ||
      !/^[A-Za-z0-9._]+$/.test(username)
    ) {
      res.status(400).json({
        error: "Invalid username",
        code: "USERNAME_INVALID",
      });

      return;
    }

    const result = await checkUsernameAvailability(authUser.id, username);

    res.status(200).json(result);
  } catch (error) {
    console.error("Erro ao consultar disponibilidade de username:", error);

    res.status(500).json({
      error: "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  try {
    const authUser = res.locals.authUser;

    const authentication = getAccountAuthentication(authUser);

    const user = await updateAccount(authUser.id, authentication, req.body);

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

    console.error("Erro ao atualizar conta:", error);

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
