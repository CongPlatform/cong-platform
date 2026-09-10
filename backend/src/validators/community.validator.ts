import * as z from "zod";

export const communityAreas = [
  "desenvolvimento",
  "design",
  "pesquisa",
  "documentacao",
  "voluntariado",
  "ongs",
] as const;

export const communityPostKinds = [
  "general",
  "question",
  "request",
  "research",
  "update",
  "resource",
  "announcement",
] as const;

export const communityTargetRoles = [
  "all",
  "organization",
  "developer",
  "designer",
  "translator",
  "volunteer",
  "supporter",
] as const;

export const communityAreaSchema = z.enum(communityAreas);
export const communityPostKindSchema = z.enum(communityPostKinds);
export const communityTargetRoleSchema = z.enum(communityTargetRoles);

const idSchema = z.union([z.string().uuid(), z.null()]).optional();
const optionalUrlSchema = z
  .union([z.string().trim().url().max(1000), z.literal(""), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

const optionalDateSchema = z
  .union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform((value) => (value ? value : null));

const shortListSchema = z
  .array(z.string().trim().min(1).max(80))
  .max(12)
  .default([]);

const targetRolesSchema = z
  .array(communityTargetRoleSchema)
  .min(1)
  .max(7)
  .refine((roles) => new Set(roles).size === roles.length, {
    message: "Target roles cannot be duplicated",
  })
  .refine((roles) => !(roles.includes("all") && roles.length > 1), {
    message: '"all" cannot be combined with other target roles',
  });

const basePostShape = {
  area: communityAreaSchema,
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(500),
  content: z.string().trim().min(1).max(5000),
  targetRoles: targetRolesSchema,
  authorCollaborationProfileId: idSchema,
  authorOrganizationId: idSchema,
};

const generalDetailsSchema = z
  .object({
    generalType: z.enum(["comment", "idea", "experience"]),
    tags: shortListSchema,
  })
  .strict();

const questionDetailsSchema = z
  .object({
    topic: z.string().trim().min(1).max(120),
  })
  .strict();

const requestCommonShape = {
  deadline: optionalDateSchema,
  engagementMode: z.enum(["remote", "in_person", "hybrid", "flexible"]),
  peopleNeeded: z.number().int().min(1).max(50).nullable().optional(),
  skills: shortListSchema,
};

const requestDetailsSchema = z.discriminatedUnion("requestType", [
  z
    .object({
      requestType: z.literal("module"),
      ...requestCommonShape,
      problem: z.string().trim().min(1).max(1200),
      users: z.string().trim().min(1).max(600),
      essentialFeatures: z
        .array(z.string().trim().min(1).max(160))
        .min(1)
        .max(12),
      currentProcess: z.string().trim().max(1200).optional().default(""),
    })
    .strict(),
  z
    .object({
      requestType: z.literal("development"),
      ...requestCommonShape,
      scope: z.string().trim().min(1).max(1600),
      stack: shortListSchema,
      repositoryUrl: optionalUrlSchema,
    })
    .strict(),
  z
    .object({
      requestType: z.literal("design"),
      ...requestCommonShape,
      designNeed: z.string().trim().min(1).max(1600),
      deliverables: z
        .array(z.string().trim().min(1).max(120))
        .min(1)
        .max(10),
      existingMaterialUrl: optionalUrlSchema,
    })
    .strict(),
  z
    .object({
      requestType: z.literal("marketing"),
      ...requestCommonShape,
      objective: z.string().trim().min(1).max(1200),
      channels: z
        .array(z.string().trim().min(1).max(80))
        .min(1)
        .max(10),
      audience: z.string().trim().max(600).optional().default(""),
    })
    .strict(),
  z
    .object({
      requestType: z.literal("translation"),
      ...requestCommonShape,
      sourceLanguage: z.string().trim().min(1).max(80),
      targetLanguages: z
        .array(z.string().trim().min(1).max(80))
        .min(1)
        .max(8),
      contentType: z.string().trim().min(1).max(100),
      approximateVolume: z.string().trim().min(1).max(160),
    })
    .strict(),
  z
    .object({
      requestType: z.literal("documentation"),
      ...requestCommonShape,
      documentationType: z.string().trim().min(1).max(120),
      audience: z.string().trim().min(1).max(600),
      existingMaterialUrl: optionalUrlSchema,
    })
    .strict(),
  z
    .object({
      requestType: z.literal("research_support"),
      ...requestCommonShape,
      researchGoal: z.string().trim().min(1).max(1200),
      method: z.string().trim().max(300).optional().default(""),
      targetAudience: z.string().trim().max(600).optional().default(""),
    })
    .strict(),
  z
    .object({
      requestType: z.literal("volunteering"),
      ...requestCommonShape,
      activity: z.string().trim().min(1).max(1200),
      location: z.string().trim().max(240).optional().default(""),
      schedule: z.string().trim().max(500).optional().default(""),
    })
    .strict(),
  z
    .object({
      requestType: z.literal("other"),
      ...requestCommonShape,
      context: z.string().trim().min(1).max(1600),
    })
    .strict(),
]);

const researchDetailsSchema = z
  .object({
    researchType: z.enum([
      "questionnaire",
      "interview",
      "usability_test",
      "validation",
      "field_research",
    ]),
    estimatedMinutes: z.number().int().min(1).max(240).nullable().optional(),
    deadline: optionalDateSchema,
    responseUrl: optionalUrlSchema,
    criteria: z.string().trim().max(1200).optional().default(""),
  })
  .strict();

const updateDetailsSchema = z
  .object({
    entityType: z.enum(["project", "module", "organization", "other"]),
    entityLabel: z.string().trim().min(1).max(160),
    version: z.string().trim().max(80).optional().default(""),
    progress: z.number().int().min(0).max(100).nullable().optional(),
    referenceUrl: optionalUrlSchema,
  })
  .strict();

const resourceDetailsSchema = z
  .object({
    resourceType: z.enum([
      "template",
      "guide",
      "document",
      "toolkit",
      "code",
      "link",
      "other",
    ]),
    resourceUrl: optionalUrlSchema,
    version: z.string().trim().max(80).optional().default(""),
    license: z.string().trim().max(120).optional().default(""),
    tags: shortListSchema,
  })
  .strict();

const announcementDetailsSchema = z
  .object({
    priority: z.enum(["normal", "important"]),
  })
  .strict();

export const createCommunityPostSchema = z
  .discriminatedUnion("kind", [
    z
      .object({
        ...basePostShape,
        kind: z.literal("general"),
        details: generalDetailsSchema,
      })
      .strict(),
    z
      .object({
        ...basePostShape,
        kind: z.literal("question"),
        details: questionDetailsSchema,
      })
      .strict(),
    z
      .object({
        ...basePostShape,
        kind: z.literal("request"),
        details: requestDetailsSchema,
      })
      .strict(),
    z
      .object({
        ...basePostShape,
        kind: z.literal("research"),
        details: researchDetailsSchema,
      })
      .strict(),
    z
      .object({
        ...basePostShape,
        kind: z.literal("update"),
        details: updateDetailsSchema,
      })
      .strict(),
    z
      .object({
        ...basePostShape,
        kind: z.literal("resource"),
        details: resourceDetailsSchema,
      })
      .strict(),
    z
      .object({
        ...basePostShape,
        kind: z.literal("announcement"),
        details: announcementDetailsSchema,
      })
      .strict(),
  ])
  .refine(
    (data) =>
      !(
        data.authorCollaborationProfileId &&
        data.authorOrganizationId
      ),
    {
      message:
        "A post cannot use a collaboration profile and an organization at the same time",
      path: ["authorOrganizationId"],
    },
  );

export type CommunityArea = z.infer<typeof communityAreaSchema>;
export type CommunityPostKind = z.infer<typeof communityPostKindSchema>;
export type CommunityTargetRole = z.infer<typeof communityTargetRoleSchema>;
export type CreateCommunityPostInput = z.infer<
  typeof createCommunityPostSchema
>;
