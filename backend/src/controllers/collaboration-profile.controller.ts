import type {
  Request,
  Response,
} from "express";

import * as z from "zod";

import {
  activateCollaborationProfile,
  createCollaborationProfile,
  deleteCollaborationProfile,
  getCollaborationProfiles,
  updateCollaborationProfile,
} from "../services/collaboration-profile.service.js";

import type {
  CollaborationRole,
} from "../validators/collaboration-profile.validator.js";

import { AppError } from "../utils/app-error.js";

/* ==================================================
   HELPERS
   ================================================== */

function sendControllerError(
  res: Response,
  error: unknown,
): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
    });

    return;
  }

  if (error instanceof z.ZodError) {
    res.status(400).json({
      error:
        "Invalid collaboration profile data",
      code:
        "INVALID_COLLABORATION_PROFILE_DATA",
      issues: error.issues,
    });

    return;
  }

  console.error(
    "Collaboration profile controller error:",
    error,
  );

  res.status(500).json({
    error: "Internal server error",
    code: "INTERNAL_SERVER_ERROR",
  });
}

function getProfileId(
  req: Request,
): string {
  const result = z
    .uuid()
    .safeParse(req.params.profileId);

  if (!result.success) {
    throw new AppError(
      "Invalid collaboration profile id",
      400,
      "INVALID_COLLABORATION_PROFILE_ID",
    );
  }

  return result.data;
}

/* ==================================================
   READ
   ================================================== */

export async function listMyCollaborationProfiles(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const authUser =
      res.locals.authUser;

    const profiles =
      await getCollaborationProfiles(
        authUser.id,
      );

    res.status(200).json({
      profiles,
    });
  } catch (error) {
    sendControllerError(
      res,
      error,
    );
  }
}

/* ==================================================
   CREATE
   ================================================== */

export async function createMyCollaborationProfile(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authUser =
      res.locals.authUser;

    const profile =
      await createCollaborationProfile(
        authUser.id,
        req.body.role as CollaborationRole,
        req.body.profileData,
      );

    res.status(201).json({
      profile,
    });
  } catch (error) {
    sendControllerError(
      res,
      error,
    );
  }
}

/* ==================================================
   UPDATE
   ================================================== */

export async function updateMyCollaborationProfile(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authUser =
      res.locals.authUser;

    const profileId =
      getProfileId(req);

    const profile =
      await updateCollaborationProfile(
        authUser.id,
        profileId,
        req.body.profileData,
      );

    res.status(200).json({
      profile,
    });
  } catch (error) {
    sendControllerError(
      res,
      error,
    );
  }
}

/* ==================================================
   DELETE
   ================================================== */

export async function deleteMyCollaborationProfile(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authUser =
      res.locals.authUser;

    const profileId =
      getProfileId(req);

    await deleteCollaborationProfile(
      authUser.id,
      profileId,
    );

    res.status(204).end();
  } catch (error) {
    sendControllerError(
      res,
      error,
    );
  }
}

/* ==================================================
   ACTIVATE
   ================================================== */

export async function activateMyCollaborationProfile(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authUser =
      res.locals.authUser;

    const profile =
      await activateCollaborationProfile(
        authUser.id,
        req.body.profileId,
      );

    res.status(200).json({
      profile,
    });
  } catch (error) {
    sendControllerError(
      res,
      error,
    );
  }
}