import { Router } from "express";

import {
  activateMyCollaborationProfile,
  createMyCollaborationProfile,
  deleteMyCollaborationProfile,
  listMyCollaborationProfiles,
  updateMyCollaborationProfile,
} from "../controllers/collaboration-profile.controller.js";

import {
  activateCollaborationProfileSchema,
  createCollaborationProfileSchema,
  updateCollaborationProfileSchema,
} from "../validators/collaboration-profile.validator.js";

import { validateBody } from "../middlewares/validate.js";

const collaborationProfileRouter = Router();

/* ==================================================
   READ
   ================================================== */

collaborationProfileRouter.get(
  "/",
  listMyCollaborationProfiles,
);

/* ==================================================
   CREATE
   ================================================== */

collaborationProfileRouter.post(
  "/",
  validateBody(createCollaborationProfileSchema),
  createMyCollaborationProfile,
);

/* ==================================================
   ACTIVE PROFILE
   ================================================== */

collaborationProfileRouter.patch(
  "/active",
  validateBody(activateCollaborationProfileSchema),
  activateMyCollaborationProfile,
);

/* ==================================================
   UPDATE
   ================================================== */

collaborationProfileRouter.patch(
  "/:profileId",
  validateBody(updateCollaborationProfileSchema),
  updateMyCollaborationProfile,
);

/* ==================================================
   DELETE
   ================================================== */

collaborationProfileRouter.delete(
  "/:profileId",
  deleteMyCollaborationProfile,
);

export default collaborationProfileRouter;