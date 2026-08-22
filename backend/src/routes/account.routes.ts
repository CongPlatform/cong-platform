import { Router } from "express";

import {
  me,
  removeAvatar,
  updateMe,
  uploadAvatar,
} from "../controllers/account.controller.js";

import { authenticate } from "../middlewares/authenticate.js";

import {
  parseAvatarUpload,
} from "../middlewares/avatar-upload.js";

import {
  validateBody,
} from "../middlewares/validate.js";

import {
  updateAccountSchema,
} from "../validators/account.validator.js";

import collaborationProfileRouter from "./collaboration-profile.routes.js";


const accountRouter =
  Router();

accountRouter.use(
  authenticate,
);

/* ==================================================
   CONTA
   ================================================== */

accountRouter.get(
  "/me",
  me,
);

accountRouter.patch(
  "/me",
  validateBody(
    updateAccountSchema,
  ),
  updateMe,
);

/* ==================================================
   AVATAR
   ================================================== */

accountRouter.post(
  "/me/avatar",
  parseAvatarUpload,
  uploadAvatar,
);

accountRouter.delete(
  "/me/avatar",
  removeAvatar,
);

/* ==================================================
   COLLABORATION PROFILES
   ================================================== */

accountRouter.use(
  "/me/collaboration-profiles",
  collaborationProfileRouter,
);

export default accountRouter;