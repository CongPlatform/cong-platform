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

  res.locals.authUser = data.user;

  res.locals.accessToken = accessToken;

  next();
}
