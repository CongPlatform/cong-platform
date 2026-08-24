import {
  apiPatch,
  apiPost,
  apiRequest,
} from "./api";

import type {
  CollaborationRole,
} from "./collaborationProfileService";

/* ==================================================
   IDENTIDADE
   ================================================== */

export interface OnboardingIdentityInput {
  displayName: string;
  pronouns: string | null;
  username: string;
}

/* ==================================================
   PARTICIPAÇÃO
   ================================================== */

export type OnboardingRepresentation =
  | "ngo"
  | "company";

export interface OnboardingParticipationInput {
  roles: CollaborationRole[];

  representations:
    OnboardingRepresentation[];
}

/* ==================================================
   RESPOSTA PADRÃO
   ================================================== */

interface MessageResponse {
  message: string;
}

/* ==================================================
   IDENTIDADE
   ================================================== */

export async function saveOnboardingIdentity(
  input: OnboardingIdentityInput,
): Promise<void> {
  await apiPatch<MessageResponse>(
    "/account/me/onboarding/identity",
    input,
  );
}

/* ==================================================
   PARTICIPAÇÃO
   ================================================== */

export async function saveOnboardingParticipation(
  input: OnboardingParticipationInput,
): Promise<void> {
  await apiRequest<MessageResponse>(
    "/account/me/onboarding/participation",
    {
      method: "PUT",

      body: JSON.stringify({
        roles: input.roles,

        representations:
          input.representations,
      }),
    },
  );
}

/* ==================================================
   CONCLUSÃO
   ================================================== */

export async function completeOnboarding(): Promise<void> {
  await apiPost<MessageResponse>(
    "/account/me/onboarding/complete",
    {},
  );
}