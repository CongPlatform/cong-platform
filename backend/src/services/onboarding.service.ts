import type { PoolClient } from "pg";

import pool from "../config/database.js";

import { AppError } from "../utils/app-error.js";

import type { CollaborationRole } from "../validators/collaboration-profile.validator.js";

import type {
  OnboardingParticipationInput,
  OnboardingRepresentation,
} from "../validators/onboarding.validator.js";

interface OnboardingUserRow {
  id: string;
  active: boolean;

  displayName: string | null;

  username: string | null;

  onboardingStep: "identity" | "roles" | "profiles" | "completed";

  onboardingRoles: CollaborationRole[];

  onboardingRepresentations: OnboardingRepresentation[];
}

export interface OnboardingIdentityInput {
  displayName: string;

  pronouns: string | null;

  username: string;
}

/* ==================================================
   HELPERS
   ================================================== */

function requireActiveUser(
  user: OnboardingUserRow | undefined,
): OnboardingUserRow {
  if (!user) {
    throw new AppError(
      "User account was not found",
      404,
      "USER_ACCOUNT_NOT_FOUND",
    );
  }

  if (!user.active) {
    throw new AppError("User account is inactive", 403, "USER_INACTIVE");
  }

  return user;
}

async function getUserForUpdate(
  client: PoolClient,
  authUserId: string,
): Promise<OnboardingUserRow> {
  const result = await client.query<OnboardingUserRow>(
    `
        select
          id,
          active,
          display_name as "displayName",
          username,
          onboarding_step as "onboardingStep",
          onboarding_roles as "onboardingRoles",
          onboarding_representations as "onboardingRepresentations"
        from public.users
        where auth_user_id = $1
        limit 1
        for update
      `,
    [authUserId],
  );

  return requireActiveUser(result.rows[0]);
}

/* ==================================================
   IDENTIDADE
   ================================================== */

export async function saveOnboardingIdentity(
  authUserId: string,
  input: OnboardingIdentityInput,
): Promise<void> {
  try {
    const result = await pool.query(
      `
          update public.users
          set
            display_name = $2,
            pronouns = $3,
            username = $4,
            onboarding_step = case
              when onboarding_step = 'identity'
                then 'roles'
              else onboarding_step
            end
          where auth_user_id = $1
            and active = true
          returning id
        `,
      [authUserId, input.displayName, input.pronouns, input.username],
    );

    if (result.rowCount === 0) {
      throw new AppError(
        "User account was not found",
        404,
        "USER_ACCOUNT_NOT_FOUND",
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      throw new AppError(
        "Username is already in use",
        409,
        "USERNAME_ALREADY_IN_USE",
      );
    }

    throw error;
  }
}

/* ==================================================
   PARTICIPAÇÃO
   ================================================== */

export async function saveOnboardingParticipation(
  authUserId: string,
  input: OnboardingParticipationInput,
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("begin");

    const user = await getUserForUpdate(client, authUserId);

    if (user.onboardingStep === "completed") {
      throw new AppError(
        "Onboarding is already completed",
        409,
        "ONBOARDING_ALREADY_COMPLETED",
      );
    }

    if (!user.displayName || !user.username) {
      throw new AppError(
        "Complete your identity before choosing how to participate",
        409,
        "ONBOARDING_IDENTITY_REQUIRED",
      );
    }

    const roles = [...new Set(input.roles)];

    const representations = [...new Set(input.representations)];

    if (roles.length === 0 && representations.length === 0) {
      throw new AppError(
        "Choose at least one way to participate",
        400,
        "ONBOARDING_PARTICIPATION_REQUIRED",
      );
    }

    /*
     * collaboration_profiles guarda apenas
     * os perfis pessoais.
     *
     * Se a pessoa voltou na seleção e retirou
     * um perfil que já havia começado a preencher,
     * removemos esse perfil.
     *
     * ONG e empresa não passam por esta tabela.
     */
    await client.query(
      `
        delete
        from public.collaboration_profiles
        where user_id = $1
          and not (
            role = any(
              $2::text[]
            )
          )
      `,
      [user.id, roles],
    );

    /*
     * A seleção temporária do onboarding fica
     * separada entre perfis pessoais e
     * representações institucionais.
     */
    await client.query(
      `
        update public.users
        set
          onboarding_roles =
            $2::text[],
          onboarding_representations =
            $3::text[],
          onboarding_step =
            'profiles'
        where id = $1
      `,
      [user.id, roles, representations],
    );

    /*
     * Se um perfil ativo tiver sido removido,
     * ativa o primeiro perfil pessoal restante.
     *
     * Se não houver nenhum perfil pessoal,
     * a subquery simplesmente não encontra linha
     * e nenhum update é realizado.
     */
    await client.query(
      `
        update public.collaboration_profiles
        set is_active = true
        where id = (
          select profile.id
          from public.collaboration_profiles as profile
          where profile.user_id = $1
            and not exists (
              select 1
              from public.collaboration_profiles as active_profile
              where active_profile.user_id = $1
                and active_profile.is_active = true
            )
          order by
            profile.created_at asc
          limit 1
        )
      `,
      [user.id],
    );

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");

    throw error;
  } finally {
    client.release();
  }
}

/* ==================================================
   CONCLUSÃO
   ================================================== */

export async function completeOnboarding(authUserId: string): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("begin");

    const user = await getUserForUpdate(client, authUserId);

    if (user.onboardingStep === "completed") {
      await client.query("commit");

      return;
    }

    if (!user.displayName || !user.username) {
      throw new AppError(
        "Onboarding identity is incomplete",
        409,
        "ONBOARDING_IDENTITY_REQUIRED",
      );
    }

    if (
      user.onboardingRoles.length === 0 &&
      user.onboardingRepresentations.length === 0
    ) {
      throw new AppError(
        "Choose at least one way to participate",
        409,
        "ONBOARDING_PARTICIPATION_REQUIRED",
      );
    }

    /* ==================================================
       PERFIS PESSOAIS
       ================================================== */

    const profileResult = await client.query<{
      role: CollaborationRole;
    }>(
      `
          select role
          from public.collaboration_profiles
          where user_id = $1
            and role = any(
              $2::text[]
            )
        `,
      [user.id, user.onboardingRoles],
    );

    const completedRoles = new Set(
      profileResult.rows.map((profile) => profile.role),
    );

    const missingRole = user.onboardingRoles.find(
      (role) => !completedRoles.has(role),
    );

    if (missingRole) {
      throw new AppError(
        "Complete every selected collaboration profile",
        409,
        "ONBOARDING_PROFILE_REQUIRED",
      );
    }

    /* ==================================================
       REPRESENTAÇÕES INSTITUCIONAIS
       ================================================== */

    const representationResult = await client.query<{
      organizationType: OnboardingRepresentation;
    }>(
      `
      select distinct
        organization.organization_type
          as "organizationType"
      from public.organization_users
        as membership

      join public.organizations
        as organization
        on organization.id =
          membership.organization_id

      where membership.user_id = $1

        and membership.status
          in (
            'pending',
            'active'
          )

        and organization.active = true

        and organization.organization_type =
          any($2::text[])
    `,
      [user.id, user.onboardingRepresentations],
    );

    const completedRepresentations = new Set(
      representationResult.rows.map(
        (representation) => representation.organizationType,
      ),
    );

    const missingRepresentation = user.onboardingRepresentations.find(
      (representation) => !completedRepresentations.has(representation),
    );

    if (missingRepresentation) {
      throw new AppError(
        "Complete every selected institutional representation",
        409,
        "ONBOARDING_REPRESENTATION_REQUIRED",
      );
    }

    /* ==================================================
       PERFIL ATIVO
       ================================================== */

    await client.query(
      `
        update public.collaboration_profiles
        set is_active = true
        where id = (
          select profile.id
          from public.collaboration_profiles as profile
          where profile.user_id = $1
            and not exists (
              select 1
              from public.collaboration_profiles as active_profile
              where active_profile.user_id = $1
                and active_profile.is_active = true
            )
          order by
            profile.created_at asc
          limit 1
        )
      `,
      [user.id],
    );

    await client.query(
      `
        update public.users
        set
          onboarding_step =
            'completed'
        where id = $1
      `,
      [user.id],
    );

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");

    throw error;
  } finally {
    client.release();
  }
}
