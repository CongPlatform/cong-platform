import { Router } from "express";

import authRouter from "./auth.routes.js";
import securityAuditRouter from "./security-audit.routes.js";
import accountRouter from "./account.routes.js";
import organizationRouter from "./organization.routes.js";
import communityRouter from "./community.routes.js";
import institutionalRouter from "./institutional.routes.js";
import publicInstitutionalRouter from "./public-institutional.routes.js";
import messagesRouter from "./messages.routes.js";
import {organizationMembershipRouter,operationalAccessRouter} from "../modules/operational/operational.access.routes.js";
import operationalRouter from "../modules/operational/operational.routes.js";
import {publicPortalRouter,memberPortalRouter,managementPortalRouter} from "../modules/operational/operational.portal.routes.js";

import {publicFormRouter,managementFormRouter} from "../modules/operational/operational.forms.routes.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    message: "CONG backend is running",
  });
});

router.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "cong-api",
  });
});

router.use("/api/auth", authRouter);
router.use("/api/admin/security-audit", securityAuditRouter);
router.use("/api/account", accountRouter);
router.use("/api/organizations", organizationRouter);
router.use("/api/organizations/current",organizationMembershipRouter);
router.use("/api/community", communityRouter);
router.use("/api/institutional", institutionalRouter);
router.use("/api/public", publicInstitutionalRouter);
router.use("/api/public", publicPortalRouter);
router.use("/api/public", publicFormRouter);
router.use("/api/portal", memberPortalRouter);
router.use("/api/operational", managementPortalRouter);
router.use("/api/operational", managementFormRouter);
router.use("/api/messages", messagesRouter);
router.use("/api/operational", operationalAccessRouter);
router.use("/api/operational", operationalRouter);

export default router;
