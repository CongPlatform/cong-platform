import { Router } from "express";
import { searchStockMedia } from "../controllers/institutional-stock-media.controller.js";

import {
  addSection,
  createDesignPaletteItem,
  createImageFrameItem,
  createDesignerTemplateItem,
  createSite,
  createPage,
  syncSiteNavigation,
  updatePage,
  deletePage,
  createVariant,
  deleteSite,
  deleteSection,
  duplicateSection,
  getDesignerTemplateItem,
  getNativeDesignAccess,
  listDesignPaletteItems,
  listImageFrameItems,
  getSite,
  listDesignerTemplateItems,
  listSites,
  listTemplates,
  listVariants,
  publishDesignerTemplateItem,
  publishDesignPaletteItem,
  publishImageFrameItem,
  publishSite,
  publishVariant,
  unpublishSite,
  renameSite,
  reorderSections,
  updateBrand,
  updateSiteBrand,
  updateDesignPaletteItem,
  updateImageFrameItem,
  updateDesignerTemplateItem,
  updateSection,
  updateVariant,
  uploadMedia,
} from "../controllers/institutional.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { parseInstitutionalUpload } from "../middlewares/institutional-upload.js";
import { requireActiveCollaborationRole } from "../middlewares/require-active-collaboration-role.js";
import { requireOrganizationContext } from "../middlewares/organization-context.js";
import { requireInstitutionalPermission } from "../middlewares/require-institutional-permission.js";
import institutionalMemberAccessRouter from "../modules/institutional/institutional-member-access.routes.js";
import { validateBody } from "../middlewares/validate.js";
import {
  addInstitutionalSectionSchema,
  createInstitutionalDesignPaletteSchema,
  createInstitutionalImageFrameSchema,
  createDesignerTemplateSchema,
  createInstitutionalSiteSchema,
  createInstitutionalPageSchema,
  updateInstitutionalPageSchema,
  createVariantSchema,
  renameInstitutionalSiteSchema,
  reorderInstitutionalSectionsSchema,
  updateBrandProfileSchema,
  updateInstitutionalDesignPaletteSchema,
  updateInstitutionalImageFrameSchema,
  updateDesignerTemplateSchema,
  updateInstitutionalSectionSchema,
  updateVariantSchema,
} from "../validators/institutional.validator.js";

const institutionalRouter = Router();

institutionalRouter.use(authenticate);
institutionalRouter.use("/site-access", institutionalMemberAccessRouter);

institutionalRouter.get("/native-design-access", getNativeDesignAccess);
institutionalRouter.get("/templates", listTemplates);
institutionalRouter.get("/media/stock", searchStockMedia);
institutionalRouter.get("/variants", listVariants);

institutionalRouter.get("/design/palettes", listDesignPaletteItems);
institutionalRouter.get("/design/frames", listImageFrameItems);

institutionalRouter.post(
  "/design/palettes",
  requireActiveCollaborationRole("designer"),
  validateBody(createInstitutionalDesignPaletteSchema),
  createDesignPaletteItem,
);
institutionalRouter.patch(
  "/design/palettes/:paletteId",
  requireActiveCollaborationRole("designer"),
  validateBody(updateInstitutionalDesignPaletteSchema),
  updateDesignPaletteItem,
);
institutionalRouter.post(
  "/design/palettes/:paletteId/publish",
  requireActiveCollaborationRole("designer"),
  publishDesignPaletteItem,
);
institutionalRouter.post(
  "/design/frames",
  requireActiveCollaborationRole("designer"),
  validateBody(createInstitutionalImageFrameSchema),
  createImageFrameItem,
);
institutionalRouter.patch(
  "/design/frames/:frameId",
  requireActiveCollaborationRole("designer"),
  validateBody(updateInstitutionalImageFrameSchema),
  updateImageFrameItem,
);
institutionalRouter.post(
  "/design/frames/:frameId/publish",
  requireActiveCollaborationRole("designer"),
  publishImageFrameItem,
);

institutionalRouter.get(
  "/designer/templates",
  requireActiveCollaborationRole("designer"),
  listDesignerTemplateItems,
);
institutionalRouter.post(
  "/designer/templates",
  requireActiveCollaborationRole("designer"),
  validateBody(createDesignerTemplateSchema),
  createDesignerTemplateItem,
);
institutionalRouter.get(
  "/designer/templates/:templateId",
  requireActiveCollaborationRole("designer"),
  getDesignerTemplateItem,
);
institutionalRouter.patch(
  "/designer/templates/:templateId",
  requireActiveCollaborationRole("designer"),
  validateBody(updateDesignerTemplateSchema),
  updateDesignerTemplateItem,
);
institutionalRouter.post(
  "/designer/templates/:templateId/publish",
  requireActiveCollaborationRole("designer"),
  publishDesignerTemplateItem,
);

institutionalRouter.post(
  "/variants",
  requireActiveCollaborationRole("designer"),
  validateBody(createVariantSchema),
  createVariant,
);
institutionalRouter.patch(
  "/variants/:variantId",
  requireActiveCollaborationRole("designer"),
  validateBody(updateVariantSchema),
  updateVariant,
);
institutionalRouter.post(
  "/variants/:variantId/publish",
  requireActiveCollaborationRole("designer"),
  publishVariant,
);

institutionalRouter.get(
  "/sites",
  requireOrganizationContext,
  requireInstitutionalPermission("read"),
  listSites,
);
institutionalRouter.post(
  "/sites",
  requireOrganizationContext,
  requireInstitutionalPermission("edit"),
  validateBody(createInstitutionalSiteSchema),
  createSite,
);
institutionalRouter.get(
  "/sites/:siteId",
  requireOrganizationContext,
  requireInstitutionalPermission("read"),
  getSite,
);
institutionalRouter.patch(
  "/sites/:siteId",
  requireOrganizationContext,
  requireInstitutionalPermission("edit"),
  validateBody(renameInstitutionalSiteSchema),
  renameSite,
);
institutionalRouter.post(
  "/sites/:siteId/publish",
  requireOrganizationContext,
  requireInstitutionalPermission("publish"),
  publishSite,
);
institutionalRouter.post(
  "/sites/:siteId/unpublish",
  requireOrganizationContext,
  requireInstitutionalPermission("publish"),
  unpublishSite,
);
institutionalRouter.delete(
  "/sites/:siteId",
  requireOrganizationContext,
  requireInstitutionalPermission("edit"),
  deleteSite,
);

institutionalRouter.patch(
  "/sites/:siteId/brand",
  requireOrganizationContext,
  requireInstitutionalPermission("edit"),
  validateBody(updateBrandProfileSchema),
  updateSiteBrand,
);
institutionalRouter.post(
  "/sites/:siteId/navigation/sync",
  requireOrganizationContext,
  requireInstitutionalPermission("edit"),
  syncSiteNavigation,
);

institutionalRouter.post(
  "/sites/:siteId/pages",
  requireOrganizationContext,
  requireInstitutionalPermission("edit"),
  validateBody(createInstitutionalPageSchema),
  createPage,
);
institutionalRouter.patch(
  "/sites/:siteId/pages/:pageId",
  requireOrganizationContext,
  requireInstitutionalPermission("edit"),
  validateBody(updateInstitutionalPageSchema),
  updatePage,
);
institutionalRouter.delete(
  "/sites/:siteId/pages/:pageId",
  requireOrganizationContext,
  requireInstitutionalPermission("edit"),
  deletePage,
);

institutionalRouter.patch(
  "/brand",
  requireOrganizationContext,
  requireInstitutionalPermission("edit"),
  validateBody(updateBrandProfileSchema),
  updateBrand,
  updateSiteBrand,
);
institutionalRouter.post(
  "/media",
  requireOrganizationContext,
  requireInstitutionalPermission("edit"),
  parseInstitutionalUpload,
  uploadMedia,
);
institutionalRouter.post(
  "/pages/:pageId/sections",
  requireOrganizationContext,
  requireInstitutionalPermission("edit"),
  validateBody(addInstitutionalSectionSchema),
  addSection,
);
institutionalRouter.post(
  "/pages/:pageId/reorder-sections",
  requireOrganizationContext,
  requireInstitutionalPermission("edit"),
  validateBody(reorderInstitutionalSectionsSchema),
  reorderSections,
);
institutionalRouter.patch(
  "/sections/:sectionId",
  requireOrganizationContext,
  requireInstitutionalPermission("edit"),
  validateBody(updateInstitutionalSectionSchema),
  updateSection,
);
institutionalRouter.post(
  "/sections/:sectionId/duplicate",
  requireOrganizationContext,
  requireInstitutionalPermission("edit"),
  duplicateSection,
);
institutionalRouter.delete(
  "/sections/:sectionId",
  requireOrganizationContext,
  requireInstitutionalPermission("edit"),
  deleteSection,
);

export default institutionalRouter;
