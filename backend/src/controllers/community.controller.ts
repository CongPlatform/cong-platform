import type { Request, Response } from "express";

import {
  createCommunityPost as createCommunityPostService,
  getCommunityPosts,
} from "../services/community.service.js";
import { AppError } from "../utils/app-error.js";

function handleError(error: unknown, res: Response): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
    });
    return;
  }

  console.error("Community controller error:", error);

  res.status(500).json({
    error: "Internal server error",
    code: "INTERNAL_SERVER_ERROR",
  });
}

export async function listCommunityPosts(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const posts = await getCommunityPosts();
    res.status(200).json({ posts });
  } catch (error) {
    handleError(error, res);
  }
}

export async function createCommunityPost(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authUser = res.locals.authUser;

    if (!authUser?.id) {
      throw new AppError(
        "Authentication user was not found",
        401,
        "AUTH_USER_NOT_FOUND",
      );
    }

    const post = await createCommunityPostService(authUser.id, req.body);

    res.status(201).json({
      message: "Community post created successfully",
      post,
    });
  } catch (error) {
    handleError(error, res);
  }
}
