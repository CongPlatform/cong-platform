import { Router } from "express";

import {
  finishOnboarding,
  saveIdentity,
  saveParticipation,
} from "../controllers/onboarding.controller.js";

import { validateBody } from "../middlewares/validate.js";

import {
  onboardingIdentitySchema,
  onboardingParticipationSchema,
} from "../validators/onboarding.validator.js";

const onboardingRouter = Router();

/* ==================================================
   IDENTIDADE
   ================================================== */

onboardingRouter.patch(
  "/identity",
  validateBody(onboardingIdentitySchema),
  saveIdentity,
);

/* ==================================================
   PARTICIPAÇÃO
   ================================================== */

onboardingRouter.put(
  "/participation",
  validateBody(onboardingParticipationSchema),
  saveParticipation,
);

/* ==================================================
   CONCLUSÃO
   ================================================== */

onboardingRouter.post("/complete", finishOnboarding);

export default onboardingRouter;
