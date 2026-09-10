import { Router } from "express";

import {
  createCommunityPost,
  listCommunityPosts,
} from "../controllers/community.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { validateBody } from "../middlewares/validate.js";
import { createCommunityPostSchema } from "../validators/community.validator.js";

const communityRouter = Router();

communityRouter.use(authenticate);

communityRouter.get("/posts", listCommunityPosts);
communityRouter.post(
  "/posts",
  validateBody(createCommunityPostSchema),
  createCommunityPost,
);

export default communityRouter;
