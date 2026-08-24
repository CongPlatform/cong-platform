import * as z from "zod";

export const collaborationRoles = [
  "developer",
  "designer",
  "translator",
  "volunteer",
] as const;

export const collaborationRoleSchema = z.enum(collaborationRoles);

export type CollaborationRole = z.infer<typeof collaborationRoleSchema>;

const textItemSchema = z.string().trim().min(1).max(60);

/* ==================================================
   DADOS POR TIPO DE PERFIL
   ================================================== */

const developerProfileDataSchema = z
  .object({
    technologies: z.array(textItemSchema).min(1).max(20),

    experienceLevel: z
      .enum(["beginner", "intermediate", "advanced"])
      .optional(),

    portfolioUrl: z.url().optional(),
  })
  .strict();

const designerProfileDataSchema = z
  .object({
    specialties: z.array(textItemSchema).min(1).max(20),

    tools: z.array(textItemSchema).max(20).default([]),

    portfolioUrl: z.url().optional(),
  })
  .strict();

const translatorProfileDataSchema = z
  .object({
    languages: z.array(textItemSchema).min(1).max(10),

    notes: z.string().trim().max(300).optional(),
  })
  .strict();

const volunteerProfileDataSchema = z
  .object({
    interestAreas: z.array(textItemSchema).min(1).max(10),

    availability: z.string().trim().max(120).optional(),
  })
  .strict();

/* ==================================================
   MAPA ROLE → SCHEMA
   ================================================== */

const profileDataSchemas = {

  developer: developerProfileDataSchema,

  designer: designerProfileDataSchema,

  translator: translatorProfileDataSchema,

  volunteer: volunteerProfileDataSchema,
} satisfies Record<CollaborationRole, z.ZodType>;

export type CollaborationProfileData =
  | z.infer<typeof developerProfileDataSchema>
  | z.infer<typeof designerProfileDataSchema>
  | z.infer<typeof translatorProfileDataSchema>
  | z.infer<typeof volunteerProfileDataSchema>

/* ==================================================
   ENTRADAS DA API
   ================================================== */

const rawProfileDataSchema = z.record(z.string(), z.unknown());

export const createCollaborationProfileSchema = z.object({
  role: collaborationRoleSchema,

  profileData: rawProfileDataSchema.optional(),
});

export const updateCollaborationProfileSchema = z.object({
  profileData: rawProfileDataSchema,
});

export const activateCollaborationProfileSchema = z.object({
  profileId: z.uuid(),
});

/* ==================================================
   VALIDAÇÃO POR ROLE
   ================================================== */

export function parseCollaborationProfileData(
  role: CollaborationRole,
  profileData: unknown,
): CollaborationProfileData {
  return profileDataSchemas[role].parse(
    profileData,
  ) as CollaborationProfileData;
}
