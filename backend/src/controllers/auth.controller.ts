import type { Request, Response } from "express";

import {
  completeOAuthUser,
  getCurrentUser,
  loginUser,
  resendSignupConfirmation,
  refreshUserSession,
  registerUser,
  logoutUserSession,
} from "../services/auth.service.js";

import { getEmailVerificationStatus } from "../services/email-verification.service.js";

import { AppError } from "../utils/app-error.js";

/* ==================================================
   EMAIL VERIFICATION COOKIE
================================================== */

const isProduction = process.env.NODE_ENV === "production";

const VERIFICATION_COOKIE_NAME = isProduction
  ? "__Host-cong-email-verification"
  : "cong-email-verification";

function clearVerificationCookie(res: Response): void {
  res.clearCookie(VERIFICATION_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
  });
}

function getCookie(req: Request, name: string): string | null {
  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) {
    return null;
  }

  for (const cookie of cookieHeader.split(";")) {
    const [cookieName, ...cookieValueParts] = cookie.trim().split("=");

    if (cookieName !== name) {
      continue;
    }

    const cookieValue = cookieValueParts.join("=");

    if (!cookieValue) {
      return null;
    }

    try {
      return decodeURIComponent(cookieValue);
    } catch {
      return null;
    }
  }

  return null;
}

/* ==================================================
   ERROR HANDLER
================================================== */

function handleControllerError(error: unknown, res: Response): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
    });

    return;
  }

  console.error("Unexpected authentication controller error:", error);

  res.status(500).json({
    error: "Internal server error",
    code: "INTERNAL_SERVER_ERROR",
  });
}

/* ==================================================
   REGISTER
================================================== */

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password } = req.body;

    const result = await registerUser({
      name,
      email,
      password,
    });

    /*
     * O token de acompanhamento NÃO
     * é devolvido no JSON.
     *
     * O navegador o recebe somente
     * em cookie HttpOnly.
     */
    res.cookie(VERIFICATION_COOKIE_NAME, result.verification.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      path: "/",
      expires: result.verification.expiresAt,
    });

    res.status(201).json({
      message: "User created successfully",

      user: result.user,
    });
  } catch (error) {
    handleControllerError(error, res);
  }
}

/* ==================================================
   EMAIL VERIFICATION STATUS
================================================== */

export async function emailVerificationStatus(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    /*
     * O status não deve ser servido
     * de cache.
     */
    res.setHeader("Cache-Control", "no-store");

    const token = getCookie(req, VERIFICATION_COOKIE_NAME);

    /*
     * Sem cookie não revelamos nenhuma
     * informação sobre usuários.
     */
    if (!token) {
      res.status(200).json({
        status: "unavailable",
      });

      return;
    }

    const status = await getEmailVerificationStatus(token);

    /*
     * NÃO apagamos o cookie quando
     * confirmado.
     *
     * A aba /auth/confirm ainda pode
     * precisar reconhecer que este é
     * o navegador que iniciou o cadastro.
     */
    if (status === "expired" || status === "unavailable") {
      clearVerificationCookie(res);
    }

    res.status(200).json({
      status,
    });
  } catch (error) {
    handleControllerError(error, res);
  }
}

/* ==================================================
   LOGIN
================================================== */

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    const result = await loginUser({
      email,
      password,
    });

    res.status(200).json(result);
  } catch (error) {
    handleControllerError(error, res);
  }
}

/* ==================================================
   OAuth
================================================== */

export async function completeOAuth(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const authUser = res.locals.authUser;

    if (!authUser) {
      throw new AppError(
        "Authenticated user was not found",
        401,
        "AUTH_USER_NOT_FOUND",
      );
    }

    const user = await completeOAuthUser(authUser);

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

    console.error("Unexpected OAuth completion error:", error);

    res.status(500).json({
      error: "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
}

/* ==================================================
   CURRENT USER
================================================== */

export async function me(_req: Request, res: Response): Promise<void> {
  try {
    const authUser = res.locals.authUser;

    if (!authUser?.id) {
      throw new AppError(
        "Authenticated user was not found",
        401,
        "AUTH_USER_NOT_FOUND",
      );
    }

    if (!authUser.email) {
      throw new AppError(
        "Authenticated user email was not found",
        401,
        "AUTH_USER_EMAIL_NOT_FOUND",
      );
    }

    const user = await getCurrentUser(authUser.id, authUser.email);

    res.status(200).json({
      user,
    });
  } catch (error) {
    handleControllerError(error, res);
  }
}

/* ==================================================
   REFRESH
================================================== */

export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;

    const session = await refreshUserSession(refreshToken);

    res.status(200).json(session);
  } catch (error) {
    handleControllerError(error, res);
  }
}

/* ==================================================
   LOGOUT
================================================== */

export async function logout(_req: Request, res: Response): Promise<void> {
  try {
    const accessToken = res.locals.accessToken;

    if (!accessToken) {
      throw new AppError(
        "Authentication token was not found",
        401,
        "AUTH_TOKEN_REQUIRED",
      );
    }

    await logoutUserSession(accessToken);

    res.status(204).send();
  } catch (error) {
    handleControllerError(error, res);
  }
}

/* ==================================================
   RESEND CONFIRMATION
================================================== */

export async function resendConfirmation(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { email } = req.body;

    await resendSignupConfirmation(email);

    /*
     * Resposta propositalmente genérica.
     * Não revelamos se o endereço existe.
     */
    res.status(200).json({
      message:
        "If the account is awaiting confirmation, a new email has been sent.",
    });
  } catch (error) {
    handleControllerError(error, res);
  }
}
