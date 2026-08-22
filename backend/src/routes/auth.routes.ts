import { Router } from "express";

import {
  login,
  me,
  logout,
  refresh,
  register,
} from "../controllers/auth.controller.js";

import { authenticate } from "../middlewares/authenticate.js";

import { validateBody } from "../middlewares/validate.js";

import {
  loginSchema,
  refreshSchema,
  registerSchema,
} from "../validators/auth.validator.js";

const authRouter = Router();

authRouter.post("/register", validateBody(registerSchema), register);

authRouter.post("/login", validateBody(loginSchema), login);

authRouter.post("/refresh", validateBody(refreshSchema), refresh);

authRouter.get("/me", authenticate, me);

authRouter.post("/logout", authenticate, logout);

export default authRouter;
