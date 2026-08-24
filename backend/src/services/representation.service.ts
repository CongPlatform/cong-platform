import type {
  PoolClient,
} from "pg";

import pool from "../config/database.js";

import { AppError } from "../utils/app-error.js";

import type {
  CreateRepresentationInput,
  OrganizationType,
} from "../validators/representation.validator.js";

interface UserRow {
  id: string;
  active: boolean;
  onboardingRepresentations:
    OrganizationType[];
}

interface SystemRoleRow {
  id: string;
}

interface OrganizationRow {
  id: string;
  name: string;
  organizationType:
    OrganizationType;
  active: boolean;
}

export interface OrganizationSearchResult {
  id: string;
  name: string;

  organizationType:
    OrganizationType;

  city:
    | string
    | null;

  state:
    | string
    | null;

  membershipStatus:
    | "pending"
    | "active"
    | "suspended"
    | null;
}

export interface MyRepresentation {
  id: string;

  organizationId:
    string;

  organizationName:
    string;

  organizationType:
    OrganizationType;

  status:
    | "pending"
    | "active"
    | "suspended";

  roleCode:
    string | null;

  roleName:
    string;
}

/* ==================================================
   HELPERS
   ================================================== */

function requireActiveUser(
  user:
    | UserRow
    | undefined,
): UserRow {
  if (!user) {
    throw new AppError(
      "User account was not found",
      404,
      "USER_ACCOUNT_NOT_FOUND",
    );
  }

  if (!user.active) {
    throw new AppError(
      "User account is inactive",
      403,
      "USER_INACTIVE",
    );
  }

  return user;
}

async function getUser(
  authUserId: string,
): Promise<UserRow> {
  const result =
    await pool.query<UserRow>(
      `
        select
          id,
          active,
          onboarding_representations
            as "onboardingRepresentations"
        from public.users
        where auth_user_id = $1
        limit 1
      `,
      [authUserId],
    );

  return requireActiveUser(
    result.rows[0],
  );
}

async function getUserForUpdate(
  client: PoolClient,
  authUserId: string,
): Promise<UserRow> {
  const result =
    await client.query<UserRow>(
      `
        select
          id,
          active,
          onboarding_representations
            as "onboardingRepresentations"
        from public.users
        where auth_user_id = $1
        limit 1
        for update
      `,
      [authUserId],
    );

  return requireActiveUser(
    result.rows[0],
  );
}

async function getSystemRole(
  client: PoolClient,
  code: string,
): Promise<SystemRoleRow> {
  const result =
    await client.query<SystemRoleRow>(
      `
        select id
        from public.roles
        where code = $1
          and scope = 'organization'
          and is_system = true
        limit 1
      `,
      [code],
    );

  const role =
    result.rows[0];

  if (!role) {
    throw new AppError(
      "Required organization role was not found",
      500,
      "ORGANIZATION_ROLE_NOT_FOUND",
    );
  }

  return role;
}

function requireSelectedRepresentation(
  user: UserRow,
  type: OrganizationType,
): void {
  if (
    !user
      .onboardingRepresentations
      .includes(type)
  ) {
    throw new AppError(
      "This institutional representation was not selected during onboarding",
      409,
      "ONBOARDING_REPRESENTATION_NOT_SELECTED",
    );
  }
}

/* ==================================================
   MINHAS REPRESENTAÇÕES
   ================================================== */

export async function getMyRepresentations(
  authUserId: string,
): Promise<MyRepresentation[]> {
  const user =
    await getUser(authUserId);

  const result =
    await pool.query<MyRepresentation>(
      `
        select
          ou.id,
          o.id
            as "organizationId",
          o.name
            as "organizationName",
          o.organization_type
            as "organizationType",
          ou.status,
          r.code
            as "roleCode",
          r.name
            as "roleName"
        from public.organization_users ou
        join public.organizations o
          on o.id = ou.organization_id
        join public.roles r
          on r.id = ou.role_id
        where ou.user_id = $1
        order by ou.created_at asc
      `,
      [user.id],
    );

  return result.rows;
}

/* ==================================================
   BUSCA
   ================================================== */

export async function searchOrganizations(
  authUserId: string,
  type: OrganizationType,
  query: string,
): Promise<OrganizationSearchResult[]> {
  const user =
    await getUser(authUserId);

  requireSelectedRepresentation(
    user,
    type,
  );

  const normalized =
    query.trim();

  if (
    normalized.length < 2
  ) {
    return [];
  }

  const result =
    await pool.query<OrganizationSearchResult>(
      `
        select
          o.id,
          o.name,
          o.organization_type
            as "organizationType",
          o.address ->> 'city'
            as city,
          o.address ->> 'state'
            as state,
          ou.status
            as "membershipStatus"
        from public.organizations o
        left join public.organization_users ou
          on ou.organization_id = o.id
          and ou.user_id = $1
        where o.active = true
          and o.organization_type = $2
          and (
            o.name ilike '%' || $3 || '%'
            or coalesce(
              o.legal_name,
              ''
            ) ilike '%' || $3 || '%'
          )
        order by
          case
            when lower(o.name) =
              lower($3)
              then 0
            else 1
          end,
          o.name asc
        limit 10
      `,
      [
        user.id,
        type,
        normalized,
      ],
    );

  return result.rows;
}

/* ==================================================
   CRIAR NOVA INSTITUIÇÃO
   ================================================== */

export async function createRepresentation(
  authUserId: string,
  input: CreateRepresentationInput,
): Promise<MyRepresentation> {
  const client =
    await pool.connect();

  try {
    await client.query(
      "begin",
    );

    const user =
      await getUserForUpdate(
        client,
        authUserId,
      );

    requireSelectedRepresentation(
      user,
      input.organizationType,
    );

    const adminRole =
      await getSystemRole(
        client,
        "organization_admin",
      );

    const organizationResult =
      await client.query<OrganizationRow>(
        `
          insert into public.organizations (
            name,
            legal_name,
            cnpj,
            email,
            phone,
            description,
            address,
            organization_type
          )
          values (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7::jsonb,
            $8
          )
          returning
            id,
            name,
            organization_type
              as "organizationType",
            active
        `,
        [
          input.name,
          input.legalName ?? null,
          input.cnpj ?? null,
          input.email ?? null,
          input.phone ?? null,
          input.description ?? null,

          JSON.stringify({
            ...(input.city
              ? {
                  city:
                    input.city,
                }
              : {}),

            ...(input.state
              ? {
                  state:
                    input.state,
                }
              : {}),
          }),

          input.organizationType,
        ],
      );

    const organization =
      organizationResult.rows[0];

    if (!organization) {
      throw new AppError(
        "Organization could not be created",
        500,
        "ORGANIZATION_CREATION_FAILED",
      );
    }

    const membershipResult =
      await client.query<MyRepresentation>(
        `
          insert into public.organization_users (
            organization_id,
            user_id,
            role_id,
            status,
            joined_at
          )
          values (
            $1,
            $2,
            $3,
            'active',
            now()
          )
          returning
            id,
            organization_id
              as "organizationId",
            $4::text
              as "organizationName",
            $5::text
              as "organizationType",
            status,
            'organization_admin'::text
              as "roleCode",
            'Administrador'::text
              as "roleName"
        `,
        [
          organization.id,
          user.id,
          adminRole.id,
          organization.name,
          organization.organizationType,
        ],
      );

    const representation =
      membershipResult.rows[0];

    if (!representation) {
      throw new AppError(
        "Organization membership could not be created",
        500,
        "ORGANIZATION_MEMBERSHIP_CREATION_FAILED",
      );
    }

    await client.query(
      "commit",
    );

    return representation;
  } catch (error) {
    await client.query(
      "rollback",
    );

    if (
      typeof error ===
        "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      throw new AppError(
        "An organization with these identifying data already exists",
        409,
        "ORGANIZATION_ALREADY_EXISTS",
      );
    }

    throw error;
  } finally {
    client.release();
  }
}

/* ==================================================
   SOLICITAR VÍNCULO COM EXISTENTE
   ================================================== */

export async function requestRepresentation(
  authUserId: string,
  organizationId: string,
): Promise<MyRepresentation> {
  const client =
    await pool.connect();

  try {
    await client.query(
      "begin",
    );

    const user =
      await getUserForUpdate(
        client,
        authUserId,
      );

    const organizationResult =
      await client.query<OrganizationRow>(
        `
          select
            id,
            name,
            organization_type
              as "organizationType",
            active
          from public.organizations
          where id = $1
          limit 1
          for update
        `,
        [organizationId],
      );

    const organization =
      organizationResult.rows[0];

    if (
      !organization ||
      !organization.active
    ) {
      throw new AppError(
        "Organization was not found",
        404,
        "ORGANIZATION_NOT_FOUND",
      );
    }

    requireSelectedRepresentation(
      user,
      organization.organizationType,
    );

    const existingResult =
      await client.query<MyRepresentation>(
        `
          select
            ou.id,
            o.id
              as "organizationId",
            o.name
              as "organizationName",
            o.organization_type
              as "organizationType",
            ou.status,
            r.code
              as "roleCode",
            r.name
              as "roleName"
          from public.organization_users ou
          join public.organizations o
            on o.id = ou.organization_id
          join public.roles r
            on r.id = ou.role_id
          where ou.organization_id = $1
            and ou.user_id = $2
          limit 1
        `,
        [
          organization.id,
          user.id,
        ],
      );

    const existing =
      existingResult.rows[0];

    if (existing) {
      if (
        existing.status ===
          "pending" ||
        existing.status ===
          "active"
      ) {
        await client.query(
          "commit",
        );

        return existing;
      }

      throw new AppError(
        "This organization membership is suspended",
        409,
        "ORGANIZATION_MEMBERSHIP_SUSPENDED",
      );
    }

    const representativeRole =
      await getSystemRole(
        client,
        "organization_representative",
      );

    const result =
      await client.query<MyRepresentation>(
        `
          insert into public.organization_users (
            organization_id,
            user_id,
            role_id,
            status
          )
          values (
            $1,
            $2,
            $3,
            'pending'
          )
          returning
            id,
            organization_id
              as "organizationId",
            $4::text
              as "organizationName",
            $5::text
              as "organizationType",
            status,
            'organization_representative'::text
              as "roleCode",
            'Representante'::text
              as "roleName"
        `,
        [
          organization.id,
          user.id,
          representativeRole.id,
          organization.name,
          organization.organizationType,
        ],
      );

    const representation =
      result.rows[0];

    if (!representation) {
      throw new AppError(
        "Representation request could not be created",
        500,
        "REPRESENTATION_REQUEST_FAILED",
      );
    }

    await client.query(
      "commit",
    );

    return representation;
  } catch (error) {
    await client.query(
      "rollback",
    );

    throw error;
  } finally {
    client.release();
  }
}