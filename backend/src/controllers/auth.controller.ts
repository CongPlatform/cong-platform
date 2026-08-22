import type { Request, Response } from "express";

import {
  getCurrentUser,
  loginUser,
  refreshUserSession,
  registerUser,
  logoutUserSession,
} from "../services/auth.service.js";
import { AppError } from "../utils/app-error.js";

export async function register(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { name, email, password } = req.body;

    const user = await registerUser({
      name,
      email,
      password,
    });

    res.status(201).json({
      message: "User created successfully",
      user,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });

      return;
    }

    res.status(500).json({
      error: "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
}

export async function login(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { email, password } = req.body;

    const result = await loginUser({
      email,
      password,
    });

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });

      return;
    }

    res.status(500).json({
      error: "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
}

export async function me(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const authUser = res.locals.authUser;

    if (!authUser?.email) {
      throw new AppError(
        "Authenticated user email was not found",
        401,
        "AUTH_USER_EMAIL_NOT_FOUND",
      );
    }

    const user = await getCurrentUser(
      authUser.id,
      authUser.email,
    );

    res.status(200).json({
      user,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });

      return;
    }

    res.status(500).json({
      error: "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
}

export async function refresh(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { refreshToken } = req.body;

    const session =
      await refreshUserSession(
        refreshToken,
      );

    res.status(200).json(session);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });

      return;
    }

    res.status(500).json({
      error: "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
}

export async function logout(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const accessToken =
      res.locals.accessToken;

    if (!accessToken) {
      throw new AppError(
        "Authentication token was not found",
        401,
        "AUTH_TOKEN_REQUIRED",
      );
    }

    await logoutUserSession(
      accessToken,
    );

    res.status(204).send();
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });

      return;
    }

    res.status(500).json({
      error: "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
}