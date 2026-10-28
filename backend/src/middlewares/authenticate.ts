import type { NextFunction, Request, Response } from "express";

import { createSupabaseAuthClient } from "../config/supabase.js";

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

  // Contas temporarias geradas para a pesquisa permanecem bloqueadas.
  // Nao dependemos mais das tabelas ou variaveis de ambiente do experimento.
  if (data.user.app_metadata?.cong_study_workspace === true) {
    res.status(403).json({
      code: "STUDY_ACCOUNT_DISABLED",
      error: "Esta conta temporaria da pesquisa nao esta mais disponivel.",
    });
    return;
  }

  res.locals.authUser = data.user;

  res.locals.accessToken = accessToken;

  next();
}
