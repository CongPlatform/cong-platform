import type { Request, Response } from "express";

import {
  addInstitutionalSection,
  createInstitutionalSite,
  deleteInstitutionalSite,
  deleteInstitutionalSection,
  duplicateInstitutionalSection,
  getInstitutionalSite,
  getPublishedInstitutionalSite,
  listInstitutionalSites,
  publishInstitutionalSite,
  renameInstitutionalSite,
  unpublishInstitutionalSite,
  reorderInstitutionalSections,
  updateInstitutionalBrand,
  updateInstitutionalSection,
} from "../services/institutional-site.service.js";
import {
  createDesignerTemplate,
  getDesignerTemplate,
  listDesignerTemplates,
  listInstitutionalTemplates,
  publishDesignerTemplate,
  updateDesignerTemplate,
} from "../services/institutional-template.service.js";
import {
  createInstitutionalVariant,
  listInstitutionalVariants,
  publishInstitutionalVariant,
  updateInstitutionalVariant,
} from "../services/institutional-variant.service.js";
import { uploadInstitutionalMedia } from "../services/institutional-media.service.js";
import {
  createDesignPalette,
  createImageFrame,
  listDesignPalettes,
  listImageFrames,
  publishDesignPalette,
  publishImageFrame,
  updateDesignPalette,
  updateImageFrame,
} from "../services/institutional-design.service.js";
import { AppError } from "../utils/app-error.js";
import { institutionalSectionTypeSchema } from "../validators/institutional.validator.js";

function handleError(error: unknown, res: Response): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message, code: error.code });
    return;
  }

  console.error("Institutional controller error:", error);
  res.status(500).json({
    error: "Internal server error",
    code: "INTERNAL_SERVER_ERROR",
  });
}

function paramString(req: Request, key: string, code: string): string {
  const value = req.params[key];
  if (typeof value !== "string" || !value) {
    throw new AppError("Identificador inválido.", 400, code);
  }
  return value;
}

export async function listTemplates(_req: Request, res: Response): Promise<void> {
  try {
    const templates = await listInstitutionalTemplates();
    res.status(200).json({ templates });
  } catch (error) {
    handleError(error, res);
  }
}

export async function listDesignerTemplateItems(req: Request, res: Response): Promise<void> {
  try {
    const templates = await listDesignerTemplates(res.locals.authUser.id);
    res.status(200).json({ templates });
  } catch (error) {
    handleError(error, res);
  }
}

export async function getDesignerTemplateItem(req: Request, res: Response): Promise<void> {
  try {
    const templateId = paramString(req, "templateId", "TEMPLATE_ID_REQUIRED");
    const template = await getDesignerTemplate(res.locals.authUser.id, templateId);
    res.status(200).json({ template });
  } catch (error) {
    handleError(error, res);
  }
}

export async function createDesignerTemplateItem(req: Request, res: Response): Promise<void> {
  try {
    const template = await createDesignerTemplate(res.locals.authUser.id, req.body);
    res.status(201).json({ template });
  } catch (error) {
    handleError(error, res);
  }
}

export async function updateDesignerTemplateItem(req: Request, res: Response): Promise<void> {
  try {
    const templateId = paramString(req, "templateId", "TEMPLATE_ID_REQUIRED");
    const template = await updateDesignerTemplate(res.locals.authUser.id, templateId, req.body);
    res.status(200).json({ template });
  } catch (error) {
    handleError(error, res);
  }
}

export async function publishDesignerTemplateItem(req: Request, res: Response): Promise<void> {
  try {
    const templateId = paramString(req, "templateId", "TEMPLATE_ID_REQUIRED");
    const template = await publishDesignerTemplate(res.locals.authUser.id, templateId);
    res.status(200).json({ template });
  } catch (error) {
    handleError(error, res);
  }
}

export async function listVariants(req: Request, res: Response): Promise<void> {
  try {
    const rawSectionType = typeof req.query.sectionType === "string" ? req.query.sectionType : undefined;
    const parsedSectionType = rawSectionType ? institutionalSectionTypeSchema.safeParse(rawSectionType) : null;

    if (parsedSectionType && !parsedSectionType.success) {
      throw new AppError(
        "Tipo de seção inválido.",
        400,
        "INSTITUTIONAL_SECTION_TYPE_INVALID",
      );
    }

    const variants = await listInstitutionalVariants(
      res.locals.authUser.id,
      parsedSectionType?.data,
      req.query.includeOwnedDrafts === "true",
    );
    res.status(200).json({ variants });
  } catch (error) {
    handleError(error, res);
  }
}

export async function createVariant(req: Request, res: Response): Promise<void> {
  try {
    const variant = await createInstitutionalVariant(res.locals.authUser.id, req.body);
    res.status(201).json({ variant });
  } catch (error) {
    handleError(error, res);
  }
}

export async function updateVariant(req: Request, res: Response): Promise<void> {
  try {
    const variantId = paramString(req, "variantId", "VARIANT_ID_REQUIRED");
    const variant = await updateInstitutionalVariant(res.locals.authUser.id, variantId, req.body);
    res.status(200).json({ variant });
  } catch (error) {
    handleError(error, res);
  }
}

export async function publishVariant(req: Request, res: Response): Promise<void> {
  try {
    const variantId = paramString(req, "variantId", "VARIANT_ID_REQUIRED");
    await publishInstitutionalVariant(res.locals.authUser.id, variantId);
    res.status(204).end();
  } catch (error) {
    handleError(error, res);
  }
}

export async function listDesignPaletteItems(req: Request, res: Response): Promise<void> {
  try {
    const palettes = await listDesignPalettes(
      res.locals.authUser.id,
      req.query.includeOwnedDrafts === "true",
    );
    res.status(200).json({ palettes });
  } catch (error) { handleError(error, res); }
}

export async function createDesignPaletteItem(req: Request, res: Response): Promise<void> {
  try {
    const palette = await createDesignPalette(res.locals.authUser.id, req.body);
    res.status(201).json({ palette });
  } catch (error) { handleError(error, res); }
}

export async function updateDesignPaletteItem(req: Request, res: Response): Promise<void> {
  try {
    const paletteId = paramString(req, "paletteId", "PALETTE_ID_REQUIRED");
    const palette = await updateDesignPalette(res.locals.authUser.id, paletteId, req.body);
    res.status(200).json({ palette });
  } catch (error) { handleError(error, res); }
}

export async function publishDesignPaletteItem(req: Request, res: Response): Promise<void> {
  try {
    const paletteId = paramString(req, "paletteId", "PALETTE_ID_REQUIRED");
    const palette = await publishDesignPalette(res.locals.authUser.id, paletteId);
    res.status(200).json({ palette });
  } catch (error) { handleError(error, res); }
}

export async function listImageFrameItems(req: Request, res: Response): Promise<void> {
  try {
    const frames = await listImageFrames(
      res.locals.authUser.id,
      req.query.includeOwnedDrafts === "true",
    );
    res.status(200).json({ frames });
  } catch (error) { handleError(error, res); }
}

export async function createImageFrameItem(req: Request, res: Response): Promise<void> {
  try {
    const frame = await createImageFrame(res.locals.authUser.id, req.body);
    res.status(201).json({ frame });
  } catch (error) { handleError(error, res); }
}

export async function updateImageFrameItem(req: Request, res: Response): Promise<void> {
  try {
    const frameId = paramString(req, "frameId", "FRAME_ID_REQUIRED");
    const frame = await updateImageFrame(res.locals.authUser.id, frameId, req.body);
    res.status(200).json({ frame });
  } catch (error) { handleError(error, res); }
}

export async function publishImageFrameItem(req: Request, res: Response): Promise<void> {
  try {
    const frameId = paramString(req, "frameId", "FRAME_ID_REQUIRED");
    const frame = await publishImageFrame(res.locals.authUser.id, frameId);
    res.status(200).json({ frame });
  } catch (error) { handleError(error, res); }
}

export async function listSites(_req: Request, res: Response): Promise<void> {
  try {
    const organizationId = res.locals.organizationContext.organizationId;
    const sites = await listInstitutionalSites(organizationId);
    res.status(200).json({ sites });
  } catch (error) {
    handleError(error, res);
  }
}

export async function getSite(req: Request, res: Response): Promise<void> {
  try {
    const organizationId = res.locals.organizationContext.organizationId;
    const siteId = paramString(req, "siteId", "SITE_ID_REQUIRED");
    const site = await getInstitutionalSite(organizationId, siteId);
    res.status(200).json({ site });
  } catch (error) {
    handleError(error, res);
  }
}

export async function createSite(req: Request, res: Response): Promise<void> {
  try {
    const organizationId = res.locals.organizationContext.organizationId;
    const site = await createInstitutionalSite(
      res.locals.authUser.id,
      organizationId,
      req.body,
    );
    res.status(201).json({ site });
  } catch (error) {
    handleError(error, res);
  }
}

export async function renameSite(req: Request, res: Response): Promise<void> {
  try {
    const organizationId = res.locals.organizationContext.organizationId;
    const siteId = paramString(req, "siteId", "SITE_ID_REQUIRED");
    const site = await renameInstitutionalSite(organizationId, siteId, req.body.name);
    res.status(200).json({ site });
  } catch (error) {
    handleError(error, res);
  }
}

export async function updateBrand(req: Request, res: Response): Promise<void> {
  try {
    const organizationId = res.locals.organizationContext.organizationId;
    const brand = await updateInstitutionalBrand(organizationId, {
      logoAssetId: req.body.logoAssetId ?? null,
      primaryColor: req.body.primaryColor,
      secondaryColor: req.body.secondaryColor,
      accentColor: req.body.accentColor,
      backgroundColor: req.body.backgroundColor,
      textColor: req.body.textColor,
      headingFont: req.body.headingFont,
      bodyFont: req.body.bodyFont,
    });
    res.status(200).json({ brand });
  } catch (error) {
    handleError(error, res);
  }
}

export async function uploadMedia(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      throw new AppError("Image file is required", 400, "INSTITUTIONAL_FILE_REQUIRED");
    }

    const asset = await uploadInstitutionalMedia(
      res.locals.authUser.id,
      res.locals.organizationContext.organizationId,
      req.file,
    );
    res.status(201).json({ asset });
  } catch (error) {
    handleError(error, res);
  }
}

export async function addSection(req: Request, res: Response): Promise<void> {
  try {
    const pageId = paramString(req, "pageId", "PAGE_ID_REQUIRED");
    const site = await addInstitutionalSection(
      res.locals.organizationContext.organizationId,
      pageId,
      req.body,
    );
    res.status(201).json({ site });
  } catch (error) {
    handleError(error, res);
  }
}

export async function updateSection(req: Request, res: Response): Promise<void> {
  try {
    const sectionId = paramString(req, "sectionId", "SECTION_ID_REQUIRED");
    const site = await updateInstitutionalSection(
      res.locals.organizationContext.organizationId,
      sectionId,
      req.body,
    );
    res.status(200).json({ site });
  } catch (error) {
    handleError(error, res);
  }
}

export async function duplicateSection(req: Request, res: Response): Promise<void> {
  try {
    const sectionId = paramString(req, "sectionId", "SECTION_ID_REQUIRED");
    const site = await duplicateInstitutionalSection(
      res.locals.organizationContext.organizationId,
      sectionId,
    );
    res.status(201).json({ site });
  } catch (error) {
    handleError(error, res);
  }
}

export async function deleteSection(req: Request, res: Response): Promise<void> {
  try {
    const sectionId = paramString(req, "sectionId", "SECTION_ID_REQUIRED");
    const site = await deleteInstitutionalSection(
      res.locals.organizationContext.organizationId,
      sectionId,
    );
    res.status(200).json({ site });
  } catch (error) {
    handleError(error, res);
  }
}

export async function reorderSections(req: Request, res: Response): Promise<void> {
  try {
    const pageId = paramString(req, "pageId", "PAGE_ID_REQUIRED");
    const site = await reorderInstitutionalSections(
      res.locals.organizationContext.organizationId,
      pageId,
      req.body.sectionIds,
    );
    res.status(200).json({ site });
  } catch (error) {
    handleError(error, res);
  }
}

export async function publishSite(req: Request, res: Response): Promise<void> {
  try {
    const siteId = paramString(req, "siteId", "SITE_ID_REQUIRED");
    const publication = await publishInstitutionalSite(
      res.locals.authUser.id,
      res.locals.organizationContext.organizationId,
      siteId,
    );
    res.status(201).json({ publication });
  } catch (error) {
    handleError(error, res);
  }
}


export async function unpublishSite(req: Request, res: Response): Promise<void> {
  try {
    const siteId = paramString(req, "siteId", "SITE_ID_REQUIRED");
    await unpublishInstitutionalSite(
      res.locals.organizationContext.organizationId,
      siteId,
    );
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
}

export async function deleteSite(req: Request, res: Response): Promise<void> {
  try {
    const siteId = paramString(req, "siteId", "SITE_ID_REQUIRED");
    await deleteInstitutionalSite(
      res.locals.organizationContext.organizationId,
      siteId,
    );
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
}

export async function getPublicSite(req: Request, res: Response): Promise<void> {
  try {
    const slug = paramString(req, "slug", "SITE_SLUG_REQUIRED");
    const site = await getPublishedInstitutionalSite(slug);
    res.status(200).json({ site });
  } catch (error) {
    handleError(error, res);
  }
}
