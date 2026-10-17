import pool from "../config/database.js";
import { AppError } from "../utils/app-error.js";
import { getAvatarPublicUrl } from "./avatar.service.js";

import type { CollaborationRole } from "../validators/collaboration-profile.validator.js";
import type { OnboardingRepresentation } from "../validators/onboarding.validator.js";

export type OnboardingStep = "identity" | "roles" | "profiles" | "completed";

export type AccountAuthProvider = "email" | "google" | "github";

export interface AccountAuthentication {
  email: string;
  emailVerified: boolean;
  providers: AccountAuthProvider[];
}

interface Account {
  id: string;
  name: string;
  displayName: string | null;
  pronouns: string | null;
  username: string | null;
  bio: string | null;
  avatarPath: string | null;
  authentication: AccountAuthentication;
  onboardingStep: OnboardingStep;
  onboardingRoles: CollaborationRole[];
  onboardingRepresentations: OnboardingRepresentation[];
  createdAt: Date;
  updatedAt: Date;
}

interface UpdateAccountInput {
  name?: string;
  displayName?: string;
  pronouns?: string | null;
  username?: string;
  bio?: string | null;
}

interface AccountRow {
  id: string;
  name: string;
  displayName: string | null;
  pronouns: string | null;
  username: string | null;
  bio: string | null;
  avatarPath: string | null;
  active: boolean;
  onboardingStep: OnboardingStep;
  onboardingRoles: CollaborationRole[];
  onboardingRepresentations: OnboardingRepresentation[];
  createdAt: Date;
  updatedAt: Date;
}

function toAccount(
  user: AccountRow,
  authentication: AccountAuthentication,
): Account {
  return {
    id: user.id,
    name: user.name,
    displayName: user.displayName,
    pronouns: user.pronouns,
    username: user.username,
    bio: user.bio,
    avatarPath: getAvatarPublicUrl(user.avatarPath),
    authentication,
    onboardingStep: user.onboardingStep,
    onboardingRoles: user.onboardingRoles,
    onboardingRepresentations: user.onboardingRepresentations,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function getAccount(
  authUserId: string,
  authentication: AccountAuthentication,
): Promise<Account> {
  const result = await pool.query<AccountRow>(
    `
      select
        id,
        name,
        display_name as "displayName",
        pronouns,
        username,
        bio,
        avatar_path as "avatarPath",
        active,
        onboarding_step as "onboardingStep",
        onboarding_roles as "onboardingRoles",
        onboarding_representations as "onboardingRepresentations",
        created_at as "createdAt",
        updated_at as "updatedAt"
      from public.users
      where auth_user_id = $1
      limit 1
    `,
    [authUserId],
  );

  const user = result.rows[0];

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

  return toAccount(user, authentication);
}

export async function updateAccount(
  authUserId: string,
  authentication: AccountAuthentication,
  input: UpdateAccountInput,
): Promise<Account> {
  const fields: string[] = [];
  const values: unknown[] = [authUserId];

  let parameterIndex = 2;

  function addField(column: string, value: unknown): void {
    fields.push(`${column} = $${parameterIndex}`);
    values.push(value);
    parameterIndex++;
  }

  if (input.name !== undefined) {
    addField("name", input.name);
  }

  if (input.displayName !== undefined) {
    addField("display_name", input.displayName);
  }

  if (input.pronouns !== undefined) {
    addField("pronouns", input.pronouns);
  }

  if (input.username !== undefined) {
    addField("username", input.username);
  }

  if (input.bio !== undefined) {
    addField("bio", input.bio);
  }
  try {
    const result = await pool.query<AccountRow>(
      `
        update public.users
        set ${fields.join(", ")}
        where auth_user_id = $1
        returning
          id,
          name,
          display_name as "displayName",
          pronouns,
          username,
          bio,
          avatar_path as "avatarPath",
          active,
          onboarding_step as "onboardingStep",
          onboarding_roles as "onboardingRoles",
          onboarding_representations as "onboardingRepresentations",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `,
      values,
    );

    const user = result.rows[0];

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

    return toAccount(user, authentication);
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

export async function checkUsernameAvailability(
  authUserId: string,
  username: string,
): Promise<{
  username: string;
  available: boolean;
}> {
  const normalizedUsername = username.trim().replace(/^@+/, "").toLowerCase();

  const result = await pool.query<{ inUse: boolean }>(
    `
      select exists (
        select 1
        from public.users
        where lower(username) = $1
          and auth_user_id <> $2
      ) as "inUse"
    `,
    [normalizedUsername, authUserId],
  );

  const inUse = result.rows[0]?.inUse ?? false;

  return {
    username: normalizedUsername,
    available: !inUse,
  };
}


/** Suspende somente a própria conta. Um novo login válido poderá reativá-la. */
export async function selfDeactivateAccount(authUserId: string): Promise<void> {
  const result = await pool.query(
    `update public.users
       set active = false, self_deactivated_at = now(), updated_at = now()
     where auth_user_id = $1 and active = true
       and deletion_requested_at is null
     returning id`,
    [authUserId],
  );
  if (!result.rowCount) {
    throw new AppError("Esta conta não está disponível para desativação.", 409, "ACCOUNT_DEACTIVATION_UNAVAILABLE");
  }
}

/** Solicitação persistida; não simula uma eliminação imediata de dados vinculados a ONGs. */
export async function requestOwnAccountDeletion(authUserId: string): Promise<void> {
  const result = await pool.query(
    `update public.users
       set active = false, self_deactivated_at = null,
           deletion_requested_at = now(), updated_at = now()
     where auth_user_id = $1 and active = true
       and deletion_requested_at is null
     returning id`,
    [authUserId],
  );
  if (!result.rowCount) {
    throw new AppError("Não foi possível registrar a solicitação nesta conta.", 409, "ACCOUNT_DELETION_REQUEST_UNAVAILABLE");
  }
}


/** Fila operacional para administradores da plataforma. Não executa exclusão. */
export interface AccountDeletionQueueItem {
  id: string;
  displayName: string;
  username: string | null;
  requestedAt: Date;
  organizationMemberships: number;
}

export async function listAccountDeletionQueue(authUserId: string): Promise<AccountDeletionQueueItem[]> {
  const admin = await pool.query<{ allowed: boolean }>(
    `select exists (
      select 1 from public.users u join public.roles r on r.id = u.platform_role_id
      where u.auth_user_id = $1 and u.active = true and r.code = 'platform_admin'
    ) as allowed`, [authUserId],
  );
  if (!admin.rows[0]?.allowed) {
    throw new AppError("Somente administradores da CONG podem consultar solicitações de exclusão.", 403, "ACCOUNT_DELETION_QUEUE_FORBIDDEN");
  }
  const result = await pool.query<AccountDeletionQueueItem>(
    `select u.id, coalesce(u.display_name,u.name) as "displayName", u.username,
       u.deletion_requested_at as "requestedAt",
       (select count(*)::int from public.organization_users ou where ou.user_id = u.id and ou.status = 'active') as "organizationMemberships"
     from public.users u
     where u.deletion_requested_at is not null and u.deleted_at is null
     order by u.deletion_requested_at asc
     limit 200`,
  );
  return result.rows;
}
