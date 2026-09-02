import type { Request, Response } from "express";

import { getAccessibleOrganizations } from "../services/organization.service.js";

import { AppError } from "../utils/app-error.js";

function handleError(error: unknown, res: Response): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
    });

    return;
  }

  console.error("Organization controller error:", error);

  res.status(500).json({
    error: "Internal server error",
    code: "INTERNAL_SERVER_ERROR",
  });
}

export async function listAccessibleOrganizations(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const authUser = res.locals.authUser;

    const organizations = await getAccessibleOrganizations(authUser.id);

    res.status(200).json({
      organizations,
    });
  } catch (error) {
    handleError(error, res);
  }
}

export function getCurrentOrganizationContext(
  _req: Request,
  res: Response,
): void {
  res.status(200).json({
    organization: res.locals.organizationContext,
  });
}
