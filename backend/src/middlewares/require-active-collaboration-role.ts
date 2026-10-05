import type { NextFunction, Request, Response } from "express";

import pool from "../config/database.js";
import { AppError } from "../utils/app-error.js";

export function requireActiveCollaborationRole(role: string) {
  return async function activeCollaborationRoleMiddleware(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const authUser = res.locals.authUser;

      if (!authUser) {
        throw new AppError(
          "Authenticated user context is required",
          401,
          "AUTH_USER_CONTEXT_REQUIRED",
        );
      }

      const result = await pool.query<{ allowed: boolean }>(
        `
          select exists (
            select 1
            from public.users u
            join public.collaboration_profiles cp
              on cp.user_id = u.id
            where u.auth_user_id = $1
              and u.active = true
              and cp.role = $2
              and cp.is_active = true
          ) as allowed
        `,
        [authUser.id, role],
      );

      if (!result.rows[0]?.allowed) {
        throw new AppError(
          "The required collaboration profile is not active",
          403,
          "COLLABORATION_ROLE_REQUIRED",
        );
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          error: error.message,
          code: error.code,
        });

        return;
      }

      console.error("Collaboration role middleware error:", error);

      res.status(500).json({
        error: "Internal server error",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  };
}
