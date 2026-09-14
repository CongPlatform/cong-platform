import { Router } from "express";
import { parseCommunityUpload } from "../middlewares/community-upload.js";
import {
  uploadCommunityAttachment,
  deleteCommunityAttachment,
  searchCommunityMentions,
  previewCommunityLink,
  listCommunityPublishingOrganizations,
} from "../controllers/community.controller.js";

import {
  archiveCommunityPost,
  bookmarkCommunityPost,
  boostCommunityPost,
  createCommunityComment,
  createCommunityPost,
  deleteCommunityComment,
  deleteCommunityPost,
  likeCommunityPost,
  listCommunityPostComments,
  listCommunityPosts,
  getCommunityPost,
  getCommunitySurvey,
  getCommunityDiscovery,
  getCommunityHighlights,
  getCommunityUserProfile,
  getCommunityOrganizationProfile,
  followCommunityUser,
  unfollowCommunityUser,
  getCommunitySurveyResults,
  closeCommunitySurvey,
  publishCommunitySurveyResults,
  restoreCommunityPost,
  submitCommunitySurveyResponse,
  unbookmarkCommunityPost,
  unlikeCommunityPost,
  updateCommunityComment,
  updateCommunityPost,
  listCommunityNotifications,
  markCommunityNotificationRead,
  markAllCommunityNotificationsRead,
  getNextCommunityEvent,
  listCommunityEvents,
  getCommunityEvent,
  createCommunityEvent,
  updateCommunityEvent,
  cancelCommunityEvent,
  joinCommunityEvent,
  leaveCommunityEvent,
  searchCommunity,
  getCommunityBlockStatus,
  blockCommunityUser,
  unblockCommunityUser,
  createCommunityReport,
  listCommunityModerationReports,
  reviewCommunityReport,
} from "../controllers/community.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import {
  communityHeavyWriteRateLimit,
  communityInteractionRateLimit,
  communityReportRateLimit,
  communitySearchRateLimit,
  communityWriteRateLimit,
} from "../middlewares/community-rate-limit.js";
import { validateBody } from "../middlewares/validate.js";
import {
  createCommunityCommentSchema,
  createCommunityPostSchema,
  updateCommunityCommentSchema,
  updateCommunityPostSchema,
  submitCommunitySurveyResponseSchema,
  createCommunityEventSchema,
  communityReportSchema,
  communityModerationReviewSchema,
} from "../validators/community.validator.js";

const communityRouter = Router();

communityRouter.use(authenticate);
communityRouter.get("/search", communitySearchRateLimit, searchCommunity);
communityRouter.get("/users/:userId/block-status", getCommunityBlockStatus);
communityRouter.put(
  "/users/:userId/block",
  communityInteractionRateLimit,
  blockCommunityUser,
);
communityRouter.delete(
  "/users/:userId/block",
  communityInteractionRateLimit,
  unblockCommunityUser,
);
communityRouter.post(
  "/reports",
  communityReportRateLimit,
  validateBody(communityReportSchema),
  createCommunityReport,
);
communityRouter.get("/moderation/reports", listCommunityModerationReports);
communityRouter.patch(
  "/moderation/reports/:reportId",
  communityWriteRateLimit,
  validateBody(communityModerationReviewSchema),
  reviewCommunityReport,
);
communityRouter.post(
  "/media",
  communityHeavyWriteRateLimit,
  parseCommunityUpload,
  uploadCommunityAttachment,
);
communityRouter.delete(
  "/media/:mediaId",
  communityWriteRateLimit,
  deleteCommunityAttachment,
);
communityRouter.get("/mentions", searchCommunityMentions);
communityRouter.post(
  "/link-preview",
  communitySearchRateLimit,
  previewCommunityLink,
);
communityRouter.get(
  "/publishing-organizations",
  listCommunityPublishingOrganizations,
);

communityRouter.get("/notifications", listCommunityNotifications);
communityRouter.patch(
  "/notifications/:notificationId/read",
  markCommunityNotificationRead,
);
communityRouter.post(
  "/notifications/read-all",
  markAllCommunityNotificationsRead,
);

communityRouter.get("/events/next", getNextCommunityEvent);
communityRouter.get("/events", listCommunityEvents);
communityRouter.get("/events/:eventId", getCommunityEvent);
communityRouter.post(
  "/events",
  communityHeavyWriteRateLimit,
  validateBody(createCommunityEventSchema),
  createCommunityEvent,
);
communityRouter.patch(
  "/events/:eventId",
  communityHeavyWriteRateLimit,
  validateBody(createCommunityEventSchema),
  updateCommunityEvent,
);
communityRouter.delete(
  "/events/:eventId",
  communityHeavyWriteRateLimit,
  cancelCommunityEvent,
);
communityRouter.put(
  "/events/:eventId/participation",
  communityInteractionRateLimit,
  joinCommunityEvent,
);
communityRouter.delete(
  "/events/:eventId/participation",
  communityInteractionRateLimit,
  leaveCommunityEvent,
);

communityRouter.get("/posts", listCommunityPosts);
communityRouter.get("/posts/:postId", getCommunityPost);
communityRouter.get("/discovery", getCommunityDiscovery);
communityRouter.get("/highlights", getCommunityHighlights);
communityRouter.get("/users/:userId/profile", getCommunityUserProfile);
communityRouter.get(
  "/organizations/:organizationId/profile",
  getCommunityOrganizationProfile,
);
communityRouter.put(
  "/users/:userId/follow",
  communityInteractionRateLimit,
  followCommunityUser,
);
communityRouter.delete(
  "/users/:userId/follow",
  communityInteractionRateLimit,
  unfollowCommunityUser,
);
communityRouter.post(
  "/posts",
  communityHeavyWriteRateLimit,
  validateBody(createCommunityPostSchema),
  createCommunityPost,
);
communityRouter.patch(
  "/posts/:postId",
  communityHeavyWriteRateLimit,
  validateBody(updateCommunityPostSchema),
  updateCommunityPost,
);
communityRouter.delete(
  "/posts/:postId",
  communityHeavyWriteRateLimit,
  deleteCommunityPost,
);
communityRouter.post(
  "/posts/:postId/archive",
  communityWriteRateLimit,
  archiveCommunityPost,
);
communityRouter.post(
  "/posts/:postId/restore",
  communityWriteRateLimit,
  restoreCommunityPost,
);
communityRouter.post(
  "/posts/:postId/boost",
  communityWriteRateLimit,
  boostCommunityPost,
);

communityRouter.put(
  "/posts/:postId/like",
  communityInteractionRateLimit,
  likeCommunityPost,
);
communityRouter.delete(
  "/posts/:postId/like",
  communityInteractionRateLimit,
  unlikeCommunityPost,
);

communityRouter.put(
  "/posts/:postId/bookmark",
  communityInteractionRateLimit,
  bookmarkCommunityPost,
);
communityRouter.delete(
  "/posts/:postId/bookmark",
  communityInteractionRateLimit,
  unbookmarkCommunityPost,
);

communityRouter.get("/posts/:postId/survey", getCommunitySurvey);
communityRouter.post(
  "/posts/:postId/survey/responses",
  communityWriteRateLimit,
  validateBody(submitCommunitySurveyResponseSchema),
  submitCommunitySurveyResponse,
);
communityRouter.get("/posts/:postId/survey/results", getCommunitySurveyResults);
communityRouter.post(
  "/posts/:postId/survey/close",
  communityWriteRateLimit,
  closeCommunitySurvey,
);
communityRouter.post(
  "/posts/:postId/survey/publish-results",
  communityWriteRateLimit,
  publishCommunitySurveyResults,
);

communityRouter.get("/posts/:postId/comments", listCommunityPostComments);
communityRouter.post(
  "/posts/:postId/comments",
  communityWriteRateLimit,
  validateBody(createCommunityCommentSchema),
  createCommunityComment,
);
communityRouter.patch(
  "/comments/:commentId",
  communityWriteRateLimit,
  validateBody(updateCommunityCommentSchema),
  updateCommunityComment,
);
communityRouter.delete(
  "/comments/:commentId",
  communityWriteRateLimit,
  deleteCommunityComment,
);

export default communityRouter;
