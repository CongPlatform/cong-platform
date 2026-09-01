import { Router } from "express";

import authRouter from "./auth.routes.js";
import accountRouter from "./account.routes.js";

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
router.use("/api/account", accountRouter);

export default router;
