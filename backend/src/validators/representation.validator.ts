import * as z from "zod";

export const organizationTypeSchema = z.enum(["ngo", "company"]);

export type OrganizationType = z.infer<typeof organizationTypeSchema>;

const initiativeKindSchema = z.enum(["formal", "independent", "punctual"]);

const stateSchema = z.enum([
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
]);

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function isValidCnpj(value: string): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;

  const digit = (length: 12 | 13) => {
    const weights =
      length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    const sum = weights.reduce(
      (total, weight, index) => total + Number(cnpj[index]) * weight,
      0,
    );
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return digit(12) === Number(cnpj[12]) && digit(13) === Number(cnpj[13]);
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

const requiredText = (min: number, max: number) =>
  z.string().trim().min(min).max(max);

const optionalCnpj = z
  .string()
  .trim()
  .max(30)
  .optional()
  .transform((value) => {
    const digits = value ? onlyDigits(value) : "";
    return digits || undefined;
  });

const cepSchema = z
  .string()
  .trim()
  .refine((value) => onlyDigits(value).length === 8, "Invalid CEP")
  .transform(onlyDigits);

export const createRepresentationSchema = z
  .object({
    organizationType: organizationTypeSchema,
    name: requiredText(2, 120),
    legalName: optionalText(160),
    cnpj: optionalCnpj,
    email: z.email(),
    phone: requiredText(10, 40),
    description: requiredText(20, 500),
    cep: cepSchema,
    street: z.string().trim().max(140),
    district: z.string().trim().max(100),
    number: requiredText(1, 20),
    complement: optionalText(100),
    city: requiredText(2, 80),
    state: stateSchema,
    initiativeKind: initiativeKindSchema,
    areas: z.array(z.string().trim().min(2).max(100)).min(1).max(30),
    supportTypes: z.array(z.string().trim().min(2).max(80)).max(8),
  })
  .superRefine((input, ctx) => {
    const formal =
      input.organizationType === "company" || input.initiativeKind === "formal";

    if (
      input.organizationType === "company" &&
      input.initiativeKind !== "formal"
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["initiativeKind"],
        message: "Companies must use the formal initiative kind",
      });
    }

    if (formal && (!input.legalName || input.legalName.length < 2)) {
      ctx.addIssue({
        code: "custom",
        path: ["legalName"],
        message: "Legal name is required for formal organizations",
      });
    }

    if (formal && (!input.cnpj || !isValidCnpj(input.cnpj))) {
      ctx.addIssue({
        code: "custom",
        path: ["cnpj"],
        message: "A valid CNPJ is required",
      });
    }

    if (!formal && input.cnpj && !isValidCnpj(input.cnpj)) {
      ctx.addIssue({
        code: "custom",
        path: ["cnpj"],
        message: "Invalid CNPJ",
      });
    }

    const mainAreas = input.areas.filter((value) => !value.includes("::"));
    if (mainAreas.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["areas"],
        message: "At least one main area is required",
      });
    }
    if (mainAreas.length > 5) {
      ctx.addIssue({
        code: "custom",
        path: ["areas"],
        message: "Select at most five main areas",
      });
    }

    if (
      input.organizationType === "company" &&
      input.supportTypes.length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["supportTypes"],
        message: "At least one support type is required",
      });
    }
  });

export type CreateRepresentationInput = z.infer<
  typeof createRepresentationSchema
>;

export const requestRepresentationSchema = z
  .object({
    organizationId: z.uuid(),
  })
  .strict();
