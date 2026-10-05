import { Router } from "express";

import {
  addSection,
  createDesignPaletteItem,
  createImageFrameItem,
  createDesignerTemplateItem,
  createSite,
  createVariant,
  deleteSite,
  deleteSection,
  duplicateSection,
  getDesignerTemplateItem,
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
import { requirePermission } from "../middlewares/require-permission.js";
import { validateBody } from "../middlewares/validate.js";
import {
  addInstitutionalSectionSchema,
  createInstitutionalDesignPaletteSchema,
  createInstitutionalImageFrameSchema,
  createDesignerTemplateSchema,
  createInstitutionalSiteSchema,
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

institutionalRouter.get("/templates", listTemplates);
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
  requirePermission("institutional.read"),
  listSites,
);
institutionalRouter.post(
  "/sites",
  requireOrganizationContext,
  requirePermission("institutional.edit"),
  validateBody(createInstitutionalSiteSchema),
  createSite,
);
institutionalRouter.get(
  "/sites/:siteId",
  requireOrganizationContext,
  requirePermission("institutional.read"),
  getSite,
);
institutionalRouter.patch(
  "/sites/:siteId",
  requireOrganizationContext,
  requirePermission("institutional.edit"),
  validateBody(renameInstitutionalSiteSchema),
  renameSite,
);
institutionalRouter.post(
  "/sites/:siteId/publish",
  requireOrganizationContext,
  requirePermission("institutional.publish"),
  publishSite,
);
institutionalRouter.post(
  "/sites/:siteId/unpublish",
  requireOrganizationContext,
  requirePermission("institutional.publish"),
  unpublishSite,
);
institutionalRouter.delete(
  "/sites/:siteId",
  requireOrganizationContext,
  requirePermission("institutional.edit"),
  deleteSite,
);

institutionalRouter.patch(
  "/brand",
  requireOrganizationContext,
  requirePermission("institutional.edit"),
  validateBody(updateBrandProfileSchema),
  updateBrand,
);
institutionalRouter.post(
  "/media",
  requireOrganizationContext,
  requirePermission("institutional.edit"),
  parseInstitutionalUpload,
  uploadMedia,
);
institutionalRouter.post(
  "/pages/:pageId/sections",
  requireOrganizationContext,
  requirePermission("institutional.edit"),
  validateBody(addInstitutionalSectionSchema),
  addSection,
);
institutionalRouter.post(
  "/pages/:pageId/reorder-sections",
  requireOrganizationContext,
  requirePermission("institutional.edit"),
  validateBody(reorderInstitutionalSectionsSchema),
  reorderSections,
);
institutionalRouter.patch(
  "/sections/:sectionId",
  requireOrganizationContext,
  requirePermission("institutional.edit"),
  validateBody(updateInstitutionalSectionSchema),
  updateSection,
);
institutionalRouter.post(
  "/sections/:sectionId/duplicate",
  requireOrganizationContext,
  requirePermission("institutional.edit"),
  duplicateSection,
);
institutionalRouter.delete(
  "/sections/:sectionId",
  requireOrganizationContext,
  requirePermission("institutional.edit"),
  deleteSection,
);

export default institutionalRouter;
