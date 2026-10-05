import { Router } from "express";

import { getPublicSite } from "../controllers/institutional.controller.js";

const publicInstitutionalRouter = Router();

publicInstitutionalRouter.get("/sites/:slug", getPublicSite);

export default publicInstitutionalRouter;
