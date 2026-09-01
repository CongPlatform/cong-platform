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
const optionalUrlSchema = z.string().trim().url().optional();

const developerProfileDataSchema = z
  .object({
    technologies: z.array(textItemSchema).min(1).max(20),
    experienceLevel: z.enum(["beginner", "intermediate", "advanced"]),
    portfolioUrl: optionalUrlSchema,
  })
  .strict();

const designerProfileDataSchema = z
  .object({
    specialties: z.array(textItemSchema).min(1).max(20),
    tools: z.array(textItemSchema).min(1).max(20),
    portfolioUrl: optionalUrlSchema,
  })
  .strict();

const translatorProfileDataSchema = z
  .object({
    /* Idioma deixa de ser obrigatório quando existe contribuição de acessibilidade. */
    languages: z.array(textItemSchema).max(10).default([]),
    accessibilitySkills: z.array(textItemSchema).max(10).default([]),
    notes: z.string().trim().max(300).optional(),
  })
  .strict()
  .superRefine((data, context) => {
    if (data.languages.length === 0 && data.accessibilitySkills.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["languages"],
        message: "Informe ao menos um idioma ou uma forma de acessibilidade.",
      });
    }
  });

const volunteerLocationSchema = z
  .object({
    city: z.string().trim().min(2).max(80),
    state: z
      .string()
      .trim()
      .length(2)
      .transform((value) => value.toUpperCase()),
    radiusKm: z.number().int().min(1).max(500),
    remote: z.boolean(),
  })
  .strict();

const volunteerAvailabilityDetailsSchema = z
  .object({
    days: z.array(textItemSchema).max(7).default([]),
    periods: z.array(textItemSchema).max(8).default([]),
    frequency: z.enum(["punctual", "monthly", "weekly", "flexible"]),
  })
  .strict()
  .superRefine((data, context) => {
    if (
      data.frequency !== "flexible" &&
      (data.days.length === 0 || data.periods.length === 0)
    ) {
      context.addIssue({
        code: "custom",
        path: ["days"],
        message: "Informe dias e períodos, ou marque disponibilidade variável.",
      });
    }
  });

const volunteerProfileDataSchema = z
  .object({
    interestAreas: z.array(textItemSchema).min(1).max(10),
    availability: z.string().trim().max(240).optional(),
    causes: z
      .array(textItemSchema)
      .min(1)
      .max(30)
      .superRefine((causes, context) => {
        const mainCauses = causes.filter((value) => !value.includes("::"));
        if (mainCauses.length === 0) {
          context.addIssue({
            code: "custom",
            message: "At least one main cause is required",
          });
        }
        if (mainCauses.length > 3) {
          context.addIssue({
            code: "custom",
            message: "Select at most three main causes",
          });
        }
      }),
    location: volunteerLocationSchema,
    availabilityDetails: volunteerAvailabilityDetailsSchema,
    opportunityPreference: z
      .enum(["recurring", "punctual", "both"])
      .default("both"),
  })
  .strict();

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
  | z.infer<typeof volunteerProfileDataSchema>;

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

export function parseCollaborationProfileData(
  role: CollaborationRole,
  profileData: unknown,
): CollaborationProfileData {
  return profileDataSchemas[role].parse(
    profileData,
  ) as CollaborationProfileData;
}
