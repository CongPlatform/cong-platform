import { Router } from "express";

import {
  me,
  removeAvatar,
  updateMe,
  uploadAvatar,
  usernameAvailability,
} from "../controllers/account.controller.js";

import { authenticate } from "../middlewares/authenticate.js";
import { parseAvatarUpload } from "../middlewares/avatar-upload.js";
import { validateBody } from "../middlewares/validate.js";

import { updateAccountSchema } from "../validators/account.validator.js";

import collaborationProfileRouter from "./collaboration-profile.routes.js";
import onboardingRouter from "./onboarding.routes.js";
import representationRouter from "./representation.routes.js";

const accountRouter = Router();

accountRouter.use(authenticate);

/* ==================================================
   CONTA
   ================================================== */

accountRouter.get("/me", me);

accountRouter.get("/me/username-availability", usernameAvailability);

accountRouter.patch("/me", validateBody(updateAccountSchema), updateMe);

/* ==================================================
   AVATAR
   ================================================== */

accountRouter.post("/me/avatar", parseAvatarUpload, uploadAvatar);

accountRouter.delete("/me/avatar", removeAvatar);

/* ==================================================
   PERFIS DE COLABORAÇÃO
   ================================================== */

accountRouter.use("/me/collaboration-profiles", collaborationProfileRouter);

/* ==================================================
   ONBOARDING
   ================================================== */

accountRouter.use("/me/onboarding", onboardingRouter);

/* ==================================================
   REPRESENTAÇÕES INSTITUCIONAIS
   ================================================== */

accountRouter.use("/me/representations", representationRouter);

export default accountRouter;
