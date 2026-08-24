import * as z from "zod";

export const organizationTypeSchema = z.enum([
  "ngo",
  "company",
]);

export type OrganizationType =
  z.infer<typeof organizationTypeSchema>;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) =>
      value && value.length > 0
        ? value
        : undefined,
    );

export const createRepresentationSchema =
  z.object({
    organizationType:
      organizationTypeSchema,

    name: z
      .string()
      .trim()
      .min(2)
      .max(120),

    legalName:
      optionalText(160),

    cnpj:
      optionalText(30),

    email: z
      .union([
        z.email(),
        z.literal(""),
      ])
      .optional()
      .transform((value) =>
        value || undefined,
      ),

    phone:
      optionalText(40),

    description:
      optionalText(500),

    city:
      optionalText(80),

    state: z
      .union([
        z
          .string()
          .trim()
          .length(2)
          .transform((value) =>
            value.toUpperCase(),
          ),
        z.literal(""),
      ])
      .optional()
      .transform((value) =>
        value || undefined,
      ),
  })
  .strict();

export type CreateRepresentationInput =
  z.infer<
    typeof createRepresentationSchema
  >;

export const requestRepresentationSchema =
  z
    .object({
      organizationId:
        z.uuid(),
    })
    .strict();