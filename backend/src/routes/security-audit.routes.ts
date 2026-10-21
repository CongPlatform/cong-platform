import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";
import {
  events,
  cases,
  identity,
  resolveCase,
} from "../controllers/security-audit.controller.js";

const securityAuditRouter = Router();
securityAuditRouter.use(authenticate);
// A exigência de platform_admin é revalidada no serviço, em todas as rotas.
securityAuditRouter.get("/events", events);
securityAuditRouter.get("/cases", cases);
securityAuditRouter.post("/identities/:userId/reveal", identity);
securityAuditRouter.post("/cases/:reportId/review", resolveCase);
export default securityAuditRouter;
