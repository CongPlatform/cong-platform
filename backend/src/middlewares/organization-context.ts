import type { NextFunction, Request, Response } from "express";

import { getOrganizationContext } from "../services/organization.service.js";

import { AppError } from "../utils/app-error.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function requireOrganizationContext(
  req: Request,
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

    const organizationId = req.header("x-organization-id")?.trim();

    if (!organizationId) {
      throw new AppError(
        "Organization identifier is required",
        400,
        "ORGANIZATION_ID_REQUIRED",
      );
    }

    if (!UUID_PATTERN.test(organizationId)) {
      throw new AppError(
        "Invalid organization identifier",
        400,
        "INVALID_ORGANIZATION_ID",
      );
    }

    const organizationContext = await getOrganizationContext(
      authUser.id,
      organizationId,
    );

    res.locals.organizationContext = organizationContext;

    next();
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });

      return;
    }

    console.error("Organization context middleware error:", error);

    res.status(500).json({
      error: "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
}
