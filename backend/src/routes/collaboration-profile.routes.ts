import { Router } from "express";

import {
  activateMyCollaborationProfile,
  createMyCollaborationProfile,
  listMyCollaborationProfiles,
} from "../controllers/collaboration-profile.controller.js";

import {
  activateCollaborationProfileSchema,
  createCollaborationProfileSchema,
} from "../validators/collaboration-profile.validator.js";

import { validateBody } from "../middlewares/validate.js";

const collaborationProfileRouter =
  Router();

collaborationProfileRouter.get(
  "/",
  listMyCollaborationProfiles,
);

collaborationProfileRouter.post(
  "/",
  validateBody(
    createCollaborationProfileSchema,
  ),
  createMyCollaborationProfile,
);

collaborationProfileRouter.patch(
  "/active",
  validateBody(
    activateCollaborationProfileSchema,
  ),
  activateMyCollaborationProfile,
);

export default collaborationProfileRouter;