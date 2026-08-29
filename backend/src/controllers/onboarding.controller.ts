import type { Request, Response } from "express";

import * as z from "zod";

import {
  completeOnboarding,
  saveOnboardingIdentity,
  saveOnboardingParticipation,
} from "../services/onboarding.service.js";

import { AppError } from "../utils/app-error.js";

/* ==================================================
   ERROS
   ================================================== */

function handleOnboardingError(error: unknown, res: Response): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: error.message,

      code: error.code,
    });

    return;
  }

  if (error instanceof z.ZodError) {
    res.status(400).json({
      error: "Invalid onboarding data",

      code: "INVALID_ONBOARDING_DATA",

      issues: error.issues,
    });

    return;
  }

  console.error("Onboarding controller error:", error);

  res.status(500).json({
    error: "Internal server error",

    code: "INTERNAL_SERVER_ERROR",
  });
}

/* ==================================================
   IDENTIDADE
   ================================================== */

export async function saveIdentity(req: Request, res: Response): Promise<void> {
  try {
    const authUser = res.locals.authUser;

    await saveOnboardingIdentity(authUser.id, req.body);

    res.status(200).json({
      message: "Onboarding identity saved successfully",
    });
  } catch (error) {
    handleOnboardingError(error, res);
  }
}

/* ==================================================
   PARTICIPAÇÃO
   ================================================== */

export async function saveParticipation(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authUser = res.locals.authUser;

    await saveOnboardingParticipation(authUser.id, req.body);

    res.status(200).json({
      message: "Onboarding participation saved successfully",
    });
  } catch (error) {
    handleOnboardingError(error, res);
  }
}

/* ==================================================
   CONCLUSÃO
   ================================================== */

export async function finishOnboarding(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const authUser = res.locals.authUser;

    await completeOnboarding(authUser.id);

    res.status(200).json({
      message: "Onboarding completed successfully",
    });
  } catch (error) {
    handleOnboardingError(error, res);
  }
}
