import type { NextFunction, Request, Response } from "express";

import { roleHasPermission } from "../services/authorization.service.js";

import { AppError } from "../utils/app-error.js";

export function requirePermission(permissionCode: string) {
  return async function permissionMiddleware(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const organizationContext = res.locals.organizationContext;

      if (!organizationContext) {
        throw new AppError(
          "Organization context is required",
          500,
          "ORGANIZATION_CONTEXT_NOT_INITIALIZED",
        );
      }

      const allowed = await roleHasPermission(
        organizationContext.roleId,
        permissionCode,
      );

      if (!allowed) {
        throw new AppError(
          "You do not have permission to perform this action",
          403,
          "ORGANIZATION_PERMISSION_DENIED",
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

      console.error("Permission middleware error:", error);

      res.status(500).json({
        error: "Internal server error",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  };
}
