import type { PoolClient } from "pg";

import pool from "../config/database.js";
import { AppError } from "../utils/app-error.js";

import {
  parseCollaborationProfileData,
  type CollaborationProfileData,
  type CollaborationRole,
} from "../validators/collaboration-profile.validator.js";

export interface CollaborationProfile {
  id: string;
  role: CollaborationRole;
  profileData: CollaborationProfileData;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface UserRow {
  id: string;
  active: boolean;
}

interface CollaborationProfileRow {
  id: string;
  role: CollaborationRole;
  profileData: CollaborationProfileData;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ProfileRoleRow {
  role: CollaborationRole;
}

/* ==================================================
   HELPERS
   ================================================== */

function requireActiveUser(user: UserRow | undefined): UserRow {
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

function requireProfile(
  profile: CollaborationProfileRow | undefined,
): CollaborationProfileRow {
  if (!profile) {
    throw new AppError(
      "Collaboration profile could not be persisted",
      500,
      "COLLABORATION_PROFILE_PERSISTENCE_ERROR",
    );
  }

  return profile;
}

async function getUserByAuthId(authUserId: string): Promise<UserRow> {
  const result = await pool.query<UserRow>(
    `
      select
        id,
        active
      from public.users
      where auth_user_id = $1
      limit 1
    `,
    [authUserId],
  );

  return requireActiveUser(result.rows[0]);
}

async function getUserByAuthIdForUpdate(
  client: PoolClient,
  authUserId: string,
): Promise<UserRow> {
  const result = await client.query<UserRow>(
    `
      select
        id,
        active
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
   READ
   ================================================== */

export async function getCollaborationProfiles(
  authUserId: string,
): Promise<CollaborationProfile[]> {
  const user = await getUserByAuthId(authUserId);

  const result = await pool.query<CollaborationProfileRow>(
    `
        select
          id,
          role,
          profile_data as "profileData",
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt"
        from public.collaboration_profiles
        where user_id = $1
        order by created_at asc
      `,
    [user.id],
  );

  return result.rows;
}

/* ==================================================
   CREATE
   ================================================== */

export async function createCollaborationProfile(
  authUserId: string,
  role: CollaborationRole,
  profileData: unknown,
): Promise<CollaborationProfile> {
  /*
   * Os dados são validados de acordo com a role
   * antes de qualquer alteração no banco.
   */
  const validatedProfileData = parseCollaborationProfileData(role, profileData);

  const client = await pool.connect();

  try {
    await client.query("begin");

    const user = await getUserByAuthIdForUpdate(client, authUserId);

    /*
     * Por enquanto, mantemos a regra existente:
     * somente um perfil de colaboração fica ativo
     * por vez.
     *
     * Quando o conceito definitivo de perfil ativo
     * da CONG for fechado, essa regra poderá ser
     * revista separadamente.
     */
    await client.query(
      `
        update public.collaboration_profiles
        set
          is_active = false,
          updated_at = now()
        where user_id = $1
          and is_active = true
      `,
      [user.id],
    );

    const result = await client.query<CollaborationProfileRow>(
      `
          insert into public.collaboration_profiles (
            user_id,
            role,
            profile_data,
            is_active
          )
          values ($1, $2, $3, true)

          returning
            id,
            role,
            profile_data as "profileData",
            is_active as "isActive",
            created_at as "createdAt",
            updated_at as "updatedAt"
        `,
      [user.id, role, validatedProfileData],
    );

    const profile = requireProfile(result.rows[0]);

    await client.query("commit");

    return profile;
  } catch (error) {
    await client.query("rollback");

    /*
     * O banco impede que o mesmo usuário tenha
     * dois perfis da mesma role.
     */
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      throw new AppError(
        "A collaboration profile with this role already exists",
        409,
        "COLLABORATION_PROFILE_ALREADY_EXISTS",
      );
    }

    throw error;
  } finally {
    client.release();
  }
}

/* ==================================================
   UPDATE
   ================================================== */

export async function updateCollaborationProfile(
  authUserId: string,
  profileId: string,
  profileData: unknown,
): Promise<CollaborationProfile> {
  const client = await pool.connect();

  try {
    await client.query("begin");

    const user = await getUserByAuthIdForUpdate(client, authUserId);

    /*
     * Buscamos a role diretamente do banco.
     *
     * Assim, o frontend não escolhe qual schema
     * será utilizado para validar o perfil.
     */
    const existingResult = await client.query<ProfileRoleRow>(
      `
          select
            role
          from public.collaboration_profiles
          where id = $1
            and user_id = $2
          limit 1
          for update
        `,
      [profileId, user.id],
    );

    const existingProfile = existingResult.rows[0];

    if (!existingProfile) {
      throw new AppError(
        "Collaboration profile was not found",
        404,
        "COLLABORATION_PROFILE_NOT_FOUND",
      );
    }

    const validatedProfileData = parseCollaborationProfileData(
      existingProfile.role,
      profileData,
    );

    const result = await client.query<CollaborationProfileRow>(
      `
          update public.collaboration_profiles
          set
            profile_data = $1,
            updated_at = now()
          where id = $2
            and user_id = $3

          returning
            id,
            role,
            profile_data as "profileData",
            is_active as "isActive",
            created_at as "createdAt",
            updated_at as "updatedAt"
        `,
      [validatedProfileData, profileId, user.id],
    );

    const profile = requireProfile(result.rows[0]);

    await client.query("commit");

    return profile;
  } catch (error) {
    await client.query("rollback");

    throw error;
  } finally {
    client.release();
  }
}

/* ==================================================
   DELETE
   ================================================== */

export async function deleteCollaborationProfile(
  authUserId: string,
  profileId: string,
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("begin");

    const user = await getUserByAuthIdForUpdate(client, authUserId);

    const result = await client.query<{
      id: string;
      isActive: boolean;
    }>(
      `
          delete from public.collaboration_profiles
          where id = $1
            and user_id = $2

          returning
            id,
            is_active as "isActive"
        `,
      [profileId, user.id],
    );

    const deletedProfile = result.rows[0];

    if (!deletedProfile) {
      throw new AppError(
        "Collaboration profile was not found",
        404,
        "COLLABORATION_PROFILE_NOT_FOUND",
      );
    }

    /*
     * Se o perfil removido era o ativo,
     * o perfil restante mais antigo passa
     * a ser o ativo.
     *
     * Caso não exista outro perfil, nenhuma
     * alteração adicional é necessária.
     */
    if (deletedProfile.isActive) {
      await client.query(
        `
          with next_profile as (
            select id
            from public.collaboration_profiles
            where user_id = $1
            order by created_at asc
            limit 1
          )

          update public.collaboration_profiles
          set
            is_active = true,
            updated_at = now()
          where id = (
            select id
            from next_profile
          )
        `,
        [user.id],
      );
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");

    throw error;
  } finally {
    client.release();
  }
}

/* ==================================================
   ACTIVATE
   ================================================== */

export async function activateCollaborationProfile(
  authUserId: string,
  profileId: string,
): Promise<CollaborationProfile> {
  const client = await pool.connect();

  try {
    await client.query("begin");

    const user = await getUserByAuthIdForUpdate(client, authUserId);

    /*
     * Primeiro garantimos que o perfil existe
     * e pertence ao usuário autenticado.
     */
    const ownershipResult = await client.query<{ id: string }>(
      `
          select
            id
          from public.collaboration_profiles
          where id = $1
            and user_id = $2
          limit 1
          for update
        `,
      [profileId, user.id],
    );

    if (!ownershipResult.rows[0]) {
      throw new AppError(
        "Collaboration profile was not found",
        404,
        "COLLABORATION_PROFILE_NOT_FOUND",
      );
    }

    /*
     * Desativamos o perfil atualmente ativo.
     */
    await client.query(
      `
        update public.collaboration_profiles
        set
          is_active = false,
          updated_at = now()
        where user_id = $1
          and is_active = true
      `,
      [user.id],
    );

    /*
     * Em seguida, ativamos exclusivamente
     * o perfil escolhido.
     */
    const result = await client.query<CollaborationProfileRow>(
      `
          update public.collaboration_profiles
          set
            is_active = true,
            updated_at = now()
          where id = $1
            and user_id = $2

          returning
            id,
            role,
            profile_data as "profileData",
            is_active as "isActive",
            created_at as "createdAt",
            updated_at as "updatedAt"
        `,
      [profileId, user.id],
    );

    const profile = requireProfile(result.rows[0]);

    await client.query("commit");

    return profile;
  } catch (error) {
    await client.query("rollback");

    throw error;
  } finally {
    client.release();
  }
}
