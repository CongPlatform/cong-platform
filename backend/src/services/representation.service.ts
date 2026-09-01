import type { PoolClient } from "pg";

import pool from "../config/database.js";

import { AppError } from "../utils/app-error.js";

import type {
  CreateRepresentationInput,
  OrganizationType,
} from "../validators/representation.validator.js";

interface UserRow {
  id: string;
  active: boolean;
  onboardingStep: "identity" | "roles" | "profiles" | "completed";
  onboardingRepresentations: OrganizationType[];
}

interface SystemRoleRow {
  id: string;
}

interface OrganizationRow {
  id: string;
  name: string;
  organizationType: OrganizationType;
  active: boolean;
}

export interface OrganizationSearchResult {
  id: string;
  name: string;

  organizationType: OrganizationType;

  city: string | null;

  state: string | null;

  legalName: string | null;

  cnpj: string | null;

  description: string | null;

  areas: string[];

  initiativeKind: string | null;

  membershipStatus: "pending" | "active" | "suspended" | null;
}

export interface MyRepresentation {
  id: string;

  organizationId: string;

  organizationName: string;

  organizationType: OrganizationType;

  status: "pending" | "active" | "suspended";

  roleCode: string | null;

  roleName: string;
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

async function getUser(authUserId: string): Promise<UserRow> {
  const result = await pool.query<UserRow>(
    `
        select
          id,
          active,
          onboarding_step
            as "onboardingStep",
          onboarding_representations
            as "onboardingRepresentations"
        from public.users
        where auth_user_id = $1
        limit 1
      `,
    [authUserId],
  );

  return requireActiveUser(result.rows[0]);
}

async function getUserForUpdate(
  client: PoolClient,
  authUserId: string,
): Promise<UserRow> {
  const result = await client.query<UserRow>(
    `
        select
          id,
          active,
          onboarding_step
            as "onboardingStep",
          onboarding_representations
            as "onboardingRepresentations"
        from public.users
        where auth_user_id = $1
        limit 1
        for update
      `,
    [authUserId],
  );

  return requireActiveUser(result.rows[0]);
}

async function getSystemRole(
  client: PoolClient,
  code: string,
): Promise<SystemRoleRow> {
  const result = await client.query<SystemRoleRow>(
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

  const role = result.rows[0];

  if (!role) {
    throw new AppError(
      "Required organization role was not found",
      500,
      "ORGANIZATION_ROLE_NOT_FOUND",
    );
  }

  return role;
}

function requireRepresentationAvailable(
  user: UserRow,
  type: OrganizationType,
): void {
  if (user.onboardingStep === "completed") {
    return;
  }

  if (user.onboardingRepresentations.includes(type)) {
    return;
  }

  throw new AppError(
    "This institutional representation was not selected during onboarding",
    409,
    "ONBOARDING_REPRESENTATION_NOT_SELECTED",
  );
}

/* ==================================================
   MINHAS REPRESENTAÇÕES
   ================================================== */

export async function getMyRepresentations(
  authUserId: string,
): Promise<MyRepresentation[]> {
  const user = await getUser(authUserId);

  const result = await pool.query<MyRepresentation>(
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
  const user = await getUser(authUserId);

  requireRepresentationAvailable(user, type);

  const normalized = query.trim();

  if (normalized.length < 2) {
    return [];
  }

  const result = await pool.query<OrganizationSearchResult>(
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
          o.legal_name
            as "legalName",
          o.cnpj,
          o.description,
          coalesce(
            o.settings -> 'areas',
            '[]'::jsonb
          ) as areas,
          o.settings ->> 'initiativeKind'
            as "initiativeKind",
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
    [user.id, type, normalized],
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
  const client = await pool.connect();

  try {
    await client.query("begin");

    const user = await getUserForUpdate(client, authUserId);

    requireRepresentationAvailable(user, input.organizationType);

    if (input.cnpj) {
      const duplicateCnpjResult = await client.query<{
        id: string;
        name: string;
      }>(
        `
            select
              id,
              name
            from public.organizations
            where regexp_replace(
              coalesce(cnpj, ''),
              '[^0-9]',
              '',
              'g'
            ) = regexp_replace(
              $1,
              '[^0-9]',
              '',
              'g'
            )
            limit 1
          `,
        [input.cnpj],
      );

      const duplicate = duplicateCnpjResult.rows[0];

      if (duplicate) {
        throw new AppError(
          `Este CNPJ já está cadastrado como "${duplicate.name}". Procure a instituição existente e solicite o vínculo.`,
          409,
          "ORGANIZATION_CNPJ_ALREADY_EXISTS",
        );
      }
    }

    const adminRole = await getSystemRole(client, "organization_admin");

    const organizationResult = await client.query<OrganizationRow>(
      `
          insert into public.organizations (
            name,
            legal_name,
            cnpj,
            email,
            phone,
            description,
            address,
            settings,
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
            $8::jsonb,
            $9
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
          cep: input.cep,
          street: input.street,
          district: input.district,
          number: input.number,
          complement: input.complement,
          city: input.city,
          state: input.state,
        }),

        JSON.stringify({
          initiativeKind: input.initiativeKind,
          areas: input.areas,
          supportTypes: input.supportTypes,
        }),

        input.organizationType,
      ],
    );

    const organization = organizationResult.rows[0];

    if (!organization) {
      throw new AppError(
        "Organization could not be created",
        500,
        "ORGANIZATION_CREATION_FAILED",
      );
    }

    const membershipResult = await client.query<MyRepresentation>(
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

    const representation = membershipResult.rows[0];

    if (!representation) {
      throw new AppError(
        "Organization membership could not be created",
        500,
        "ORGANIZATION_MEMBERSHIP_CREATION_FAILED",
      );
    }

    await client.query("commit");

    return representation;
  } catch (error) {
    await client.query("rollback");

    if (
      typeof error === "object" &&
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
  const client = await pool.connect();

  try {
    await client.query("begin");

    const user = await getUserForUpdate(client, authUserId);

    const organizationResult = await client.query<OrganizationRow>(
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

    const organization = organizationResult.rows[0];

    if (!organization || !organization.active) {
      throw new AppError(
        "Organization was not found",
        404,
        "ORGANIZATION_NOT_FOUND",
      );
    }

    requireRepresentationAvailable(user, organization.organizationType);

    const existingResult = await client.query<MyRepresentation>(
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
      [organization.id, user.id],
    );

    const existing = existingResult.rows[0];

    if (existing) {
      if (existing.status === "pending" || existing.status === "active") {
        await client.query("commit");

        return existing;
      }

      throw new AppError(
        "This organization membership is suspended",
        409,
        "ORGANIZATION_MEMBERSHIP_SUSPENDED",
      );
    }

    const representativeRole = await getSystemRole(
      client,
      "organization_representative",
    );

    const result = await client.query<MyRepresentation>(
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

    const representation = result.rows[0];

    if (!representation) {
      throw new AppError(
        "Representation request could not be created",
        500,
        "REPRESENTATION_REQUEST_FAILED",
      );
    }

    await client.query("commit");

    return representation;
  } catch (error) {
    await client.query("rollback");

    throw error;
  } finally {
    client.release();
  }
}

/* ==================================================
   CANCELAR SOLICITAÇÃO DE VÍNCULO PENDENTE
   ================================================== */
export async function cancelRepresentationRequest(
  authUserId: string,
  representationId: string,
): Promise<void> {
  const user = await getUser(authUserId);

  const currentResult = await pool.query<{
    id: string;
    status: "pending" | "active" | "suspended";
  }>(
    `
        select
          id,
          status
        from public.organization_users
        where id = $1
          and user_id = $2
        limit 1
      `,
    [representationId, user.id],
  );

  const current = currentResult.rows[0];

  if (!current) {
    throw new AppError(
      "Solicitação de vínculo não encontrada",
      404,
      "REPRESENTATION_REQUEST_NOT_FOUND",
    );
  }

  if (current.status !== "pending") {
    throw new AppError(
      "Somente solicitações ainda pendentes podem ser canceladas",
      409,
      "REPRESENTATION_REQUEST_NOT_PENDING",
    );
  }

  const deleteResult = await pool.query(
    `
        delete from public.organization_users
        where id = $1
          and user_id = $2
          and status = 'pending'
      `,
    [representationId, user.id],
  );

  if (deleteResult.rowCount === 0) {
    throw new AppError(
      "A solicitação mudou de estado e não pode mais ser cancelada",
      409,
      "REPRESENTATION_REQUEST_CHANGED",
    );
  }
}

/* ==================================================
   CHECAGEM DE CNPJ PARA FEEDBACK EM TEMPO REAL
   ================================================== */
export async function checkRepresentationCnpjAvailability(
  cnpj: string,
): Promise<{
  available: boolean;
  organization: {
    id: string;
    name: string;
    organizationType: "ngo" | "company";
  } | null;
}> {
  const result = await pool.query<{
    id: string;
    name: string;
    organizationType: "ngo" | "company";
  }>(
    `
      select
        id,
        name,
        organization_type as "organizationType"
      from public.organizations
      where regexp_replace(
        coalesce(cnpj, ''),
        '[^0-9]',
        '',
        'g'
      ) = regexp_replace(
        $1,
        '[^0-9]',
        '',
        'g'
      )
      limit 1
    `,
    [cnpj],
  );

  const organization = result.rows[0] ?? null;

  return {
    available: organization === null,
    organization,
  };
}
