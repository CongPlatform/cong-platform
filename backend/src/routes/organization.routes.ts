import { Router } from "express";

import {
  getCurrentOrganizationContext,
  listAccessibleOrganizations,
} from "../controllers/organization.controller.js";

import { authenticate } from "../middlewares/authenticate.js";
import { requireOrganizationContext } from "../middlewares/organization-context.js";
import { requirePermission } from "../middlewares/require-permission.js";

const organizationRouter = Router();

organizationRouter.use(authenticate);

organizationRouter.get("/", listAccessibleOrganizations);

organizationRouter.get(
  "/current",
  requireOrganizationContext,
  requirePermission("organization.read"),
  getCurrentOrganizationContext,
);

export default organizationRouter;
