import type { Request, Response } from "express";
import {
  uploadCommunityMedia,
  removeCommunityMedia,
  findCommunityMentions,
  getCommunityPublishingOrganizations,
} from "../services/community-media.service.js";
import { createCommunityLinkPreview } from "../services/community-link.service.js";
import {
  blockCommunityUser as blockCommunityUserSafety,
  createCommunityReport as createCommunityReportSafety,
  getCommunityBlockStatus as getCommunityBlockStatusSafety,
  listCommunityModerationReports as listCommunityModerationReportsSafety,
  reviewCommunityReport as reviewCommunityReportSafety,
  searchCommunity as searchCommunitySafety,
  unblockCommunityUser as unblockCommunityUserSafety,
} from "../services/community-safety.service.js";

import {
  archiveCommunityPost as archiveCommunityPostService,
  bookmarkCommunityPost as bookmarkCommunityPostService,
  boostCommunityPost as boostCommunityPostService,
  createCommunityComment as createCommunityCommentService,
  createCommunityPost as createCommunityPostService,
  deleteCommunityComment as deleteCommunityCommentService,
  deleteCommunityPost as deleteCommunityPostService,
  getCommunityPost as getCommunityPostService,
  getCommunityPostComments,
  getCommunityPosts,
  getCommunityDiscovery as getCommunityDiscoveryService,
  getCommunityHighlights as getCommunityHighlightsService,
  getCommunityUserProfile as getCommunityUserProfileService,
  getCommunityOrganizationProfile as getCommunityOrganizationProfileService,
  followCommunityUser as followCommunityUserService,
  unfollowCommunityUser as unfollowCommunityUserService,
  getCommunitySurvey as getCommunitySurveyService,
  getCommunitySurveyResults as getCommunitySurveyResultsService,
  closeCommunitySurvey as closeCommunitySurveyService,
  publishCommunitySurveyResults as publishCommunitySurveyResultsService,
  restoreCommunityPost as restoreCommunityPostService,
  submitCommunitySurveyResponse as submitCommunitySurveyResponseService,
  likeCommunityPost as likeCommunityPostService,
  unbookmarkCommunityPost as unbookmarkCommunityPostService,
  unlikeCommunityPost as unlikeCommunityPostService,
  updateCommunityComment as updateCommunityCommentService,
  updateCommunityPost as updateCommunityPostService,
  getCommunityNotifications as getCommunityNotificationsService,
  markCommunityNotificationRead as markCommunityNotificationReadService,
  markAllCommunityNotificationsRead as markAllCommunityNotificationsReadService,
  getNextCommunityEvent as getNextCommunityEventService,
  listCommunityEvents as listCommunityEventsService,
  getCommunityEvent as getCommunityEventService,
  createCommunityEvent as createCommunityEventService,
  updateCommunityEvent as updateCommunityEventService,
  cancelCommunityEvent as cancelCommunityEventService,
  joinCommunityEvent as joinCommunityEventService,
  leaveCommunityEvent as leaveCommunityEventService,
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

function requireRouteParam(req: Request, name: string): string {
  const value = req.params[name];

  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new AppError(
      "Parâmetro de rota inválido.",
      400,
      "COMMUNITY_ROUTE_PARAM_INVALID",
    );
  }

  return value;
}

function requireAuthUserId(res: Response): string {
  const authUser = res.locals.authUser;

  if (!authUser?.id) {
    throw new AppError(
      "Authentication user was not found",
      401,
      "AUTH_USER_NOT_FOUND",
    );
  }

  return authUser.id;
}

const feedFilters = new Set([
  "all",
  "following",
  "projects",
  "opportunities",
  "discussions",
  "mine",
  "saved",
  "archived",
]);

const feedSorts = new Set(["recommended", "recent", "supported", "discussed"]);

function firstQueryValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export async function listCommunityPosts(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const rawFilter = firstQueryValue(req.query.filter);
    const rawSort = firstQueryValue(req.query.sort);
    const rawLimit = firstQueryValue(req.query.limit);
    const rawOffset = firstQueryValue(req.query.offset);

    const filter = rawFilter && feedFilters.has(rawFilter) ? rawFilter : "all";
    const sort = rawSort && feedSorts.has(rawSort) ? rawSort : "recent";
    const limit = rawLimit ? Number.parseInt(rawLimit, 10) : 8;
    const offset = rawOffset ? Number.parseInt(rawOffset, 10) : 0;

    const page = await getCommunityPosts(requireAuthUserId(res), {
      tag: (firstQueryValue(req.query.tag) ?? "").slice(0, 80),
      filter: filter as
        | "all"
        | "following"
        | "projects"
        | "opportunities"
        | "discussions"
        | "mine"
        | "saved"
        | "archived",
      sort: sort as "recommended" | "recent" | "supported" | "discussed",
      limit: Number.isFinite(limit) ? limit : 8,
      offset: Number.isFinite(offset) ? offset : 0,
    });

    res.status(200).json(page);
  } catch (error) {
    handleError(error, res);
  }
}

export async function getCommunityPost(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const post = await getCommunityPostService(
      requireAuthUserId(res),
      requireRouteParam(req, "postId"),
    );
    res.status(200).json({ post });
  } catch (error) {
    handleError(error, res);
  }
}

export async function createCommunityPost(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const post = await createCommunityPostService(
      requireAuthUserId(res),
      req.body,
    );

    res.status(201).json({
      message: "Community post created successfully",
      post,
    });
  } catch (error) {
    handleError(error, res);
  }
}

export async function updateCommunityPost(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const post = await updateCommunityPostService(
      requireAuthUserId(res),
      requireRouteParam(req, "postId"),
      req.body,
    );

    res.status(200).json({
      message: "Community post updated successfully",
      post,
    });
  } catch (error) {
    handleError(error, res);
  }
}

export async function archiveCommunityPost(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const post = await archiveCommunityPostService(
      requireAuthUserId(res),
      requireRouteParam(req, "postId"),
    );
    res.status(200).json({ post });
  } catch (error) {
    handleError(error, res);
  }
}

export async function restoreCommunityPost(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const post = await restoreCommunityPostService(
      requireAuthUserId(res),
      requireRouteParam(req, "postId"),
    );
    res.status(200).json({ post });
  } catch (error) {
    handleError(error, res);
  }
}

export async function boostCommunityPost(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const post = await boostCommunityPostService(
      requireAuthUserId(res),
      requireRouteParam(req, "postId"),
    );
    res.status(200).json({ post });
  } catch (error) {
    handleError(error, res);
  }
}

export async function deleteCommunityPost(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    await deleteCommunityPostService(
      requireAuthUserId(res),
      requireRouteParam(req, "postId"),
    );

    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
}

export async function likeCommunityPost(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const post = await likeCommunityPostService(
      requireAuthUserId(res),
      requireRouteParam(req, "postId"),
    );
    res.status(200).json({ post });
  } catch (error) {
    handleError(error, res);
  }
}

export async function unlikeCommunityPost(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const post = await unlikeCommunityPostService(
      requireAuthUserId(res),
      requireRouteParam(req, "postId"),
    );
    res.status(200).json({ post });
  } catch (error) {
    handleError(error, res);
  }
}

export async function bookmarkCommunityPost(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const post = await bookmarkCommunityPostService(
      requireAuthUserId(res),
      requireRouteParam(req, "postId"),
    );
    res.status(200).json({ post });
  } catch (error) {
    handleError(error, res);
  }
}

export async function unbookmarkCommunityPost(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const post = await unbookmarkCommunityPostService(
      requireAuthUserId(res),
      requireRouteParam(req, "postId"),
    );
    res.status(200).json({ post });
  } catch (error) {
    handleError(error, res);
  }
}

export async function listCommunityPostComments(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const comments = await getCommunityPostComments(
      requireAuthUserId(res),
      requireRouteParam(req, "postId"),
    );
    res.status(200).json({ comments });
  } catch (error) {
    handleError(error, res);
  }
}

export async function createCommunityComment(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const comment = await createCommunityCommentService(
      requireAuthUserId(res),
      requireRouteParam(req, "postId"),
      req.body,
    );

    res.status(201).json({
      message: "Community comment created successfully",
      comment,
    });
  } catch (error) {
    handleError(error, res);
  }
}

export async function updateCommunityComment(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const comment = await updateCommunityCommentService(
      requireAuthUserId(res),
      requireRouteParam(req, "commentId"),
      req.body,
    );

    res.status(200).json({
      message: "Community comment updated successfully",
      comment,
    });
  } catch (error) {
    handleError(error, res);
  }
}

export async function deleteCommunityComment(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    await deleteCommunityCommentService(
      requireAuthUserId(res),
      requireRouteParam(req, "commentId"),
    );
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
}

export async function getCommunitySurvey(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const survey = await getCommunitySurveyService(
      requireAuthUserId(res),
      requireRouteParam(req, "postId"),
    );
    res.status(200).json({ survey });
  } catch (error) {
    handleError(error, res);
  }
}

export async function submitCommunitySurveyResponse(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const survey = await submitCommunitySurveyResponseService(
      requireAuthUserId(res),
      requireRouteParam(req, "postId"),
      req.body,
    );
    res.status(201).json({ survey });
  } catch (error) {
    handleError(error, res);
  }
}

export async function getCommunitySurveyResults(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const results = await getCommunitySurveyResultsService(
      requireAuthUserId(res),
      requireRouteParam(req, "postId"),
    );
    res.status(200).json({ results });
  } catch (error) {
    handleError(error, res);
  }
}

export async function closeCommunitySurvey(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const survey = await closeCommunitySurveyService(
      requireAuthUserId(res),
      requireRouteParam(req, "postId"),
    );
    res.status(200).json({ survey });
  } catch (error) {
    handleError(error, res);
  }
}

export async function publishCommunitySurveyResults(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const post = await publishCommunitySurveyResultsService(
      requireAuthUserId(res),
      requireRouteParam(req, "postId"),
    );
    res.status(201).json({
      message: "Community survey results published successfully",
      post,
    });
  } catch (error) {
    handleError(error, res);
  }
}

export async function getCommunityDiscovery(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const discovery = await getCommunityDiscoveryService(
      requireAuthUserId(res),
    );
    res.status(200).json(discovery);
  } catch (error) {
    handleError(error, res);
  }
}

export async function getCommunityHighlights(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const highlights = await getCommunityHighlightsService(
      requireAuthUserId(res),
    );
    res.status(200).json(highlights);
  } catch (error) {
    handleError(error, res);
  }
}

export async function getCommunityUserProfile(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const profile = await getCommunityUserProfileService(
      requireAuthUserId(res),
      requireRouteParam(req, "userId"),
    );
    res.status(200).json({ profile });
  } catch (error) {
    handleError(error, res);
  }
}

export async function getCommunityOrganizationProfile(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const profile = await getCommunityOrganizationProfileService(
      requireAuthUserId(res),
      requireRouteParam(req, "organizationId"),
    );
    res.status(200).json({ profile });
  } catch (error) {
    handleError(error, res);
  }
}

export async function followCommunityUser(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    await followCommunityUserService(
      requireAuthUserId(res),
      requireRouteParam(req, "userId"),
    );
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
}

export async function unfollowCommunityUser(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    await unfollowCommunityUserService(
      requireAuthUserId(res),
      requireRouteParam(req, "userId"),
    );
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
}

export async function listCommunityNotifications(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    res
      .status(200)
      .json(await getCommunityNotificationsService(requireAuthUserId(res)));
  } catch (error) {
    handleError(error, res);
  }
}

export async function markCommunityNotificationRead(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    await markCommunityNotificationReadService(
      requireAuthUserId(res),
      requireRouteParam(req, "notificationId"),
    );
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
}

export async function markAllCommunityNotificationsRead(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    await markAllCommunityNotificationsReadService(requireAuthUserId(res));
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
}

export async function getNextCommunityEvent(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const event = await getNextCommunityEventService(requireAuthUserId(res));
    res.status(200).json({ event });
  } catch (error) {
    handleError(error, res);
  }
}

export async function listCommunityEvents(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const scope =
      typeof req.query.scope === "string" ? req.query.scope : "upcoming";
    const events = await listCommunityEventsService(
      requireAuthUserId(res),
      scope as "upcoming" | "past" | "mine",
    );
    res.status(200).json({ events });
  } catch (error) {
    handleError(error, res);
  }
}

export async function getCommunityEvent(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const event = await getCommunityEventService(
      requireAuthUserId(res),
      requireRouteParam(req, "eventId"),
    );
    res.status(200).json({ event });
  } catch (error) {
    handleError(error, res);
  }
}

export async function createCommunityEvent(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const event = await createCommunityEventService(
      requireAuthUserId(res),
      req.body,
    );
    res.status(201).json({ event });
  } catch (error) {
    handleError(error, res);
  }
}

export async function updateCommunityEvent(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const event = await updateCommunityEventService(
      requireAuthUserId(res),
      requireRouteParam(req, "eventId"),
      req.body,
    );
    res.status(200).json({ event });
  } catch (error) {
    handleError(error, res);
  }
}

export async function cancelCommunityEvent(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const event = await cancelCommunityEventService(
      requireAuthUserId(res),
      requireRouteParam(req, "eventId"),
    );
    res.status(200).json({ event });
  } catch (error) {
    handleError(error, res);
  }
}

export async function joinCommunityEvent(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const event = await joinCommunityEventService(
      requireAuthUserId(res),
      requireRouteParam(req, "eventId"),
    );
    res.status(200).json({ event });
  } catch (error) {
    handleError(error, res);
  }
}

export async function leaveCommunityEvent(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const event = await leaveCommunityEventService(
      requireAuthUserId(res),
      requireRouteParam(req, "eventId"),
    );
    res.status(200).json({ event });
  } catch (error) {
    handleError(error, res);
  }
}

export async function uploadCommunityAttachment(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    if (!req.file)
      throw new AppError(
        "Selecione um arquivo.",
        400,
        "COMMUNITY_FILE_REQUIRED",
      );
    res
      .status(201)
      .json(await uploadCommunityMedia(requireAuthUserId(res), req.file));
  } catch (error) {
    handleError(error, res);
  }
}
export async function deleteCommunityAttachment(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    await removeCommunityMedia(
      requireAuthUserId(res),
      requireRouteParam(req, "mediaId"),
    );
    res.sendStatus(204);
  } catch (error) {
    handleError(error, res);
  }
}
export async function searchCommunityMentions(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    res.json(
      await findCommunityMentions(
        requireAuthUserId(res),
        firstQueryValue(req.query.q) ?? "",
      ),
    );
  } catch (error) {
    handleError(error, res);
  }
}
export async function previewCommunityLink(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    if (typeof req.body?.url !== "string")
      throw new AppError("Informe um link.", 400, "INVALID_PREVIEW_URL");
    res.json(
      await createCommunityLinkPreview(requireAuthUserId(res), req.body.url),
    );
  } catch (error) {
    handleError(error, res);
  }
}
export async function listCommunityPublishingOrganizations(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    res.json(await getCommunityPublishingOrganizations(requireAuthUserId(res)));
  } catch (error) {
    handleError(error, res);
  }
}

export async function searchCommunity(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const q = firstQueryValue(req.query.q) ?? "";
    const rawLimit = Number.parseInt(
      firstQueryValue(req.query.limit) ?? "20",
      10,
    );
    const payload = await searchCommunitySafety(
      requireAuthUserId(res),
      q,
      Number.isFinite(rawLimit) ? rawLimit : 20,
    );
    res.status(200).json(payload);
  } catch (error) {
    handleError(error, res);
  }
}

export async function getCommunityBlockStatus(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    res
      .status(200)
      .json(
        await getCommunityBlockStatusSafety(
          requireAuthUserId(res),
          requireRouteParam(req, "userId"),
        ),
      );
  } catch (error) {
    handleError(error, res);
  }
}

export async function blockCommunityUser(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    await blockCommunityUserSafety(
      requireAuthUserId(res),
      requireRouteParam(req, "userId"),
    );
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
}

export async function unblockCommunityUser(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    await unblockCommunityUserSafety(
      requireAuthUserId(res),
      requireRouteParam(req, "userId"),
    );
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
}

export async function createCommunityReport(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const report = await createCommunityReportSafety(
      requireAuthUserId(res),
      req.body,
    );
    res.status(201).json({ report });
  } catch (error) {
    handleError(error, res);
  }
}

export async function listCommunityModerationReports(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const status = firstQueryValue(req.query.status) ?? "pending";
    const reports = await listCommunityModerationReportsSafety(
      requireAuthUserId(res),
      status,
    );
    res.status(200).json({ reports });
  } catch (error) {
    handleError(error, res);
  }
}

export async function reviewCommunityReport(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    await reviewCommunityReportSafety(
      requireAuthUserId(res),
      requireRouteParam(req, "reportId"),
      req.body.action,
      req.body.note,
    );
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
}
