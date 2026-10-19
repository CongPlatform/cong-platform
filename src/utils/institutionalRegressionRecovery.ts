import type { InstitutionalSite } from "../services/institutionalService";

type JsonObject = Record<string, unknown>;

export type InstitutionalSettingsRepair = {
  sectionId: string;
  settings: Record<string, unknown>;
};

function isRecord(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getObject(parent: JsonObject, key: string): JsonObject | null {
  const value = parent[key];
  return isRecord(value) ? value : null;
}

function getArray(parent: JsonObject, key: string): unknown[] | null {
  const value = parent[key];
  return Array.isArray(value) ? value : null;
}

function clearResponsiveMigrationMetadata(style: JsonObject): void {
  delete style.positionMode;
  delete style.offsetReferenceWidth;
  delete style.anchorSource;
  delete style.anchorIndex;
  delete style.anchorXPercent;
  delete style.anchorYPercent;
}

const PROJECTS_SECTION_ID = "2447b133-d179-4941-b3b4-1ea7fe6eff65";
const IMPACT_SECTION_ID = "50698ecb-28f6-4e5f-acee-1ff47ec58d57";
const PROJECT_BUTTON_ONE_ID = "4b909483-3ea0-4a41-bcbd-9503fc850058";
const PROJECT_BUTTON_TWO_ID = "cab09191-e029-4f7c-a879-a7936975c32c";

const PROJECT_IMAGE_STYLE_RECOVERY: Record<string, JsonObject> = {
  "layout-1-0-0::instance::items/0": {
    focalX: 47.9,
    focalY: 31.5,
    offsetX: -5,
    offsetY: 4,
    heightPx: 143,
    imageFit: "cover",
    imageZoom: 1,
    imageFrame: "rectangle",
    imageAspect: "auto",
  },
  "layout-1-0-0::instance::items/1": {
    focalX: 39,
    focalY: 57.2,
    offsetX: 0,
    offsetY: 6,
    heightPx: 145,
    imageFrame: "rectangle",
    imageAspect: "auto",
  },
  "layout-1-0-0::instance::items/2": {
    focalX: 100,
    focalY: 8.4,
    offsetX: 0,
    offsetY: 6,
    heightPx: 147,
    imageFit: "cover",
    imageFrame: "rectangle",
    imageAspect: "auto",
    widthPercent: 34.05,
  },
  "layout-1-0-0::instance::items/3": {
    offsetX: 0,
    offsetY: 2,
    heightPx: 142,
    imageFrame: "rectangle",
    imageAspect: "auto",
  },
  "layout-1-0-0::instance::items/4": {
    focalX: 39.5,
    focalY: 37.8,
    offsetX: 0,
    offsetY: 4,
    heightPx: 148,
    imageFrame: "rectangle",
    imageAspect: "auto",
  },
  "layout-1-0-0::instance::items/5": {
    focalX: 40.4,
    focalY: 36.3,
    offsetX: 6,
    offsetY: 12,
    heightPx: 145,
    imageFrame: "rectangle",
    imageAspect: "auto",
  },
};

function repairProjectsSettings(settings: Record<string, unknown>): {
  settings: Record<string, unknown>;
  changed: boolean;
} {
  const next = cloneJson(settings);
  const root = next as JsonObject;
  const layoutOverride = getObject(root, "layoutOverride");
  const instanceStyles = getObject(root, "instanceElementStyles");
  if (!layoutOverride || !instanceStyles) return { settings, changed: false };

  const children = getArray(layoutOverride, "children");
  if (!children) return { settings, changed: false };

  const buttonOne = children.find(
    (child) => isRecord(child) && child.id === PROJECT_BUTTON_ONE_ID,
  );
  const buttonTwo = children.find(
    (child) => isRecord(child) && child.id === PROJECT_BUTTON_TWO_ID,
  );
  const buttonOneStyle = isRecord(buttonOne)
    ? getObject(buttonOne, "style")
    : null;
  const buttonTwoStyle = isRecord(buttonTwo)
    ? getObject(buttonTwo, "style")
    : null;

  const migrationDetected = Boolean(
    (buttonOneStyle &&
      (buttonOneStyle.positionMode === "anchored" ||
        buttonOneStyle.anchorSource === "items")) ||
    (buttonTwoStyle &&
      (buttonTwoStyle.positionMode === "anchored" ||
        buttonTwoStyle.anchorSource === "items")) ||
    Object.values(instanceStyles).some(
      (value) => isRecord(value) && "offsetReferenceWidth" in value,
    ),
  );

  if (!migrationDetected) return { settings, changed: false };

  if (buttonOneStyle) {
    clearResponsiveMigrationMetadata(buttonOneStyle);
    buttonOneStyle.offsetX = 458;
    buttonOneStyle.offsetY = -473;
    buttonOneStyle.heightPx = 57;
    buttonOneStyle.backgroundColor = "#ffffff";
  }

  if (buttonTwoStyle) {
    clearResponsiveMigrationMetadata(buttonTwoStyle);
    buttonTwoStyle.radius = "small";
    buttonTwoStyle.offsetX = 886;
    buttonTwoStyle.offsetY = -241;
    buttonTwoStyle.backgroundColor = "#ffffff";
  }

  Object.entries(PROJECT_IMAGE_STYLE_RECOVERY).forEach(([key, restored]) => {
    const current = instanceStyles[key];
    if (!isRecord(current)) return;
    instanceStyles[key] = { ...current, ...restored };
    const repaired = instanceStyles[key];
    if (isRecord(repaired)) clearResponsiveMigrationMetadata(repaired);
  });

  return { settings: next, changed: true };
}

function repairImpactSettings(settings: Record<string, unknown>): {
  settings: Record<string, unknown>;
  changed: boolean;
} {
  const next = cloneJson(settings);
  const root = next as JsonObject;
  const instanceStyles = getObject(root, "instanceElementStyles");
  if (!instanceStyles) return { settings, changed: false };

  const key = "layout-1-0-1::instance::items/0";
  const metricStyle = instanceStyles[key];
  if (!isRecord(metricStyle)) return { settings, changed: false };

  const migrationDetected =
    metricStyle.positionMode === "flow" ||
    "offsetReferenceWidth" in metricStyle;
  if (!migrationDetected) return { settings, changed: false };

  clearResponsiveMigrationMetadata(metricStyle);
  metricStyle.offsetX = -850;
  metricStyle.offsetY = -70;
  return { settings: next, changed: true };
}

/**
 * Repairs the two exact layout mutations introduced by the first Phase 2
 * responsive migration. It only runs when the migration metadata is still
 * present, so after the corrected settings are persisted it becomes a no-op.
 * Content is never changed.
 */
export function repairPhase2LayoutRegression(site: InstitutionalSite): {
  site: InstitutionalSite;
  repairs: InstitutionalSettingsRepair[];
} {
  const repairs: InstitutionalSettingsRepair[] = [];
  let changed = false;

  const pages = site.pages.map((page) => {
    let pageChanged = false;
    const sections = page.sections.map((section) => {
      if (
        section.id === PROJECTS_SECTION_ID &&
        section.settings.visualStyle === "profundezas-projects"
      ) {
        const repaired = repairProjectsSettings(section.settings);
        if (repaired.changed) {
          pageChanged = true;
          changed = true;
          repairs.push({ sectionId: section.id, settings: repaired.settings });
          return { ...section, settings: repaired.settings };
        }
      }

      if (
        section.id === IMPACT_SECTION_ID &&
        section.settings.visualStyle === "profundezas-impact"
      ) {
        const repaired = repairImpactSettings(section.settings);
        if (repaired.changed) {
          pageChanged = true;
          changed = true;
          repairs.push({ sectionId: section.id, settings: repaired.settings });
          return { ...section, settings: repaired.settings };
        }
      }

      return section;
    });

    return pageChanged ? { ...page, sections } : page;
  });

  return {
    site: changed ? { ...site, pages } : site,
    repairs,
  };
}
