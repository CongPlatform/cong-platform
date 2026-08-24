import type {
  Request,
  Response,
} from "express";

import * as z from "zod";

import {
  createRepresentation,
  getMyRepresentations,
  requestRepresentation,
  searchOrganizations,
} from "../services/representation.service.js";

import {
  organizationTypeSchema,
} from "../validators/representation.validator.js";

import { AppError } from "../utils/app-error.js";

function handleError(
  error: unknown,
  res: Response,
): void {
  if (
    error instanceof AppError
  ) {
    res
      .status(error.statusCode)
      .json({
        error: error.message,
        code: error.code,
      });

    return;
  }

  if (
    error instanceof z.ZodError
  ) {
    res
      .status(400)
      .json({
        error:
          "Invalid representation data",
        code:
          "INVALID_REPRESENTATION_DATA",
        issues:
          error.issues,
      });

    return;
  }

  console.error(
    "Representation controller error:",
    error,
  );

  res
    .status(500)
    .json({
      error:
        "Internal server error",
      code:
        "INTERNAL_SERVER_ERROR",
    });
}

export async function listMyRepresentations(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const authUser =
      res.locals.authUser;

    const representations =
      await getMyRepresentations(
        authUser.id,
      );

    res.status(200).json({
      representations,
    });
  } catch (error) {
    handleError(
      error,
      res,
    );
  }
}

export async function searchRepresentationOrganizations(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authUser =
      res.locals.authUser;

    const type =
      organizationTypeSchema.parse(
        req.query.type,
      );

    const query =
      typeof req.query.q ===
        "string"
        ? req.query.q
        : "";

    const organizations =
      await searchOrganizations(
        authUser.id,
        type,
        query,
      );

    res.status(200).json({
      organizations,
    });
  } catch (error) {
    handleError(
      error,
      res,
    );
  }
}

export async function createMyRepresentation(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authUser =
      res.locals.authUser;

    const representation =
      await createRepresentation(
        authUser.id,
        req.body,
      );

    res.status(201).json({
      representation,
    });
  } catch (error) {
    handleError(
      error,
      res,
    );
  }
}

export async function requestMyRepresentation(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authUser =
      res.locals.authUser;

    const representation =
      await requestRepresentation(
        authUser.id,
        req.body.organizationId,
      );

    res.status(201).json({
      representation,
    });
  } catch (error) {
    handleError(
      error,
      res,
    );
  }
}