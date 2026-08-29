import * as z from "zod";

import { usernameSchema } from "./account.validator.js";
import {
  collaborationRoleSchema,
  type CollaborationRole,
} from "./collaboration-profile.validator.js";

/* ==================================================
   IDENTIDADE
   ================================================== */

export const onboardingIdentitySchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Informe como você gostaria de ser chamado.")
    .max(60, "O nome de exibição deve ter no máximo 60 caracteres."),

  pronouns: z.union([z.string().trim().min(1).max(60), z.null()]),

  username: usernameSchema,
});

/* ==================================================
   REPRESENTAÇÕES INSTITUCIONAIS
   ================================================== */

export const onboardingRepresentationSchema = z.enum(["ngo", "company"]);

export type OnboardingRepresentation = z.infer<
  typeof onboardingRepresentationSchema
>;

/* ==================================================
   PARTICIPAÇÃO
   ================================================== */

export const onboardingParticipationSchema = z
  .object({
    roles: z
      .array(collaborationRoleSchema)
      .max(4, "Não é possível selecionar mais de quatro perfis pessoais."),

    representations: z
      .array(onboardingRepresentationSchema)
      .max(
        2,
        "Não é possível selecionar mais de duas representações institucionais.",
      ),
  })
  .superRefine((data, context) => {
    if (data.roles.length === 0 && data.representations.length === 0) {
      context.addIssue({
        code: "custom",
        path: [],
        message: "Escolha pelo menos uma forma de participar.",
      });
    }

    const uniqueRoles = new Set<CollaborationRole>(data.roles);

    if (uniqueRoles.size !== data.roles.length) {
      context.addIssue({
        code: "custom",
        path: ["roles"],
        message: "O mesmo perfil não pode ser selecionado mais de uma vez.",
      });
    }

    const uniqueRepresentations = new Set<OnboardingRepresentation>(
      data.representations,
    );

    if (uniqueRepresentations.size !== data.representations.length) {
      context.addIssue({
        code: "custom",
        path: ["representations"],
        message:
          "A mesma representação não pode ser selecionada mais de uma vez.",
      });
    }
  });

export type OnboardingParticipationInput = z.infer<
  typeof onboardingParticipationSchema
>;
