import type { NextFunction, Request, Response } from "express";

import { createSupabaseAuthClient } from "../config/supabase.js";
import pool from "../config/database.js";

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Authentication token is required",
      code: "AUTH_TOKEN_REQUIRED",
    });

    return;
  }

  const accessToken = authorization.slice("Bearer ".length).trim();

  if (!accessToken) {
    res.status(401).json({
      error: "Authentication token is required",
      code: "AUTH_TOKEN_REQUIRED",
    });

    return;
  }

  const supabaseAuth = createSupabaseAuthClient();

  const { data, error } = await supabaseAuth.auth.getUser(accessToken);

  if (error || !data.user) {
    res.status(401).json({
      error: "Invalid or expired authentication token",
      code: "INVALID_AUTH_TOKEN",
    });

    return;
  }

  // Autenticação Supabase por si só não invalida sessões após desativar
  // o perfil local. Bloqueie todas as rotas autenticadas imediatamente,
  // exceto a finalização do login OAuth (que reativa APENAS autodesativações)
  // e a operação de sair da sessão.
  const allowAccountBootstrap =
    req.originalUrl.startsWith("/api/auth/oauth/complete") ||
    req.originalUrl.startsWith("/api/auth/logout");
  if (!allowAccountBootstrap) {
    try {
      const local = await pool.query<{
        active: boolean;
        selfDeactivated: boolean;
        status: "suspended" | "banned" | null;
        suspendedUntil: Date | null;
        reason: string | null;
      }>(
        `select u.active, (u.self_deactivated_at is not null) as "selfDeactivated", s.status, s.suspended_until as "suspendedUntil", s.reason
          from public.users u
          left join public.community_user_sanctions s on s.user_id = u.id
          where u.auth_user_id = $1 limit 1`,
        [data.user.id],
      );
      const access = local.rows[0];
      if (access && !access.active) {
        res.status(403).json({
          error: access.selfDeactivated
            ? "Sua conta está desativada. Entre novamente para reativá-la."
            : "Esta conta não está ativa.",
          code: access.selfDeactivated
            ? "ACCOUNT_DEACTIVATED"
            : "USER_INACTIVE",
        });
        return;
      }
      if (access?.status === "banned") {
        res.status(403).json({
          error: "Sua conta foi banida da CONG.",
          code: "ACCOUNT_BANNED",
          restriction: {
            kind: "banned",
            reason: access.reason ?? "Violação das regras da comunidade.",
            until: null,
          },
        });
        return;
      }
      if (
        access?.status === "suspended" &&
        access.suspendedUntil &&
        new Date(access.suspendedUntil).getTime() > Date.now()
      ) {
        res.status(403).json({
          error: "Sua conta está temporariamente suspensa.",
          code: "ACCOUNT_SUSPENDED",
          restriction: {
            kind: "suspended",
            reason: access.reason ?? "Violação das regras da comunidade.",
            until: access.suspendedUntil,
          },
        });
        return;
      }
    } catch (error) {
      next(error);
      return;
    }
  }
  res.locals.authUser = data.user;
  res.locals.accessToken = accessToken;
  next();
}
