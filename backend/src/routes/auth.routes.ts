import { Router } from "express";

import {
  emailVerificationStatus,
  login,
  logout,
  me,
  refresh,
  register,
  resendConfirmation,
  completeOAuth,
} from "../controllers/auth.controller.js";

import { authenticate } from "../middlewares/authenticate.js";

import { validateBody } from "../middlewares/validate.js";

import {
  loginSchema,
  refreshSchema,
  registerSchema,
  resendConfirmationSchema,
} from "../validators/auth.validator.js";

const authRouter = Router();

/* ==================================================
   REGISTER / VERIFICATION
================================================== */

authRouter.post("/register", validateBody(registerSchema), register);

authRouter.post(
  "/resend-confirmation",
  validateBody(resendConfirmationSchema),
  resendConfirmation,
);

authRouter.get("/email-verification/status", emailVerificationStatus);

/* ==================================================
SESSION
================================================== */

authRouter.post("/login", validateBody(loginSchema), login);

authRouter.post("/refresh", validateBody(refreshSchema), refresh);

authRouter.post("/oauth/complete", authenticate, completeOAuth);

authRouter.get("/me", authenticate, me);

authRouter.post("/logout", authenticate, logout);

export default authRouter;
