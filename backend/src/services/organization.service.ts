import pool from "../config/database.js";

import { AppError } from "../utils/app-error.js";

export interface AccessibleOrganization {
  id: string;
  name: string;
  organizationType: "ngo" | "company";
  membershipId: string;
  role: {
    id: string;
    code: string;
    name: string;
  };
}

export interface OrganizationContext {
  organizationId: string;
  organizationName: string;
  organizationType: "ngo" | "company";
  membershipId: string;
  roleId: string;
  roleCode: string;
  roleName: string;
}

interface UserRow {
  id: string;
  active: boolean;
}

interface AccessibleOrganizationRow {
  id: string;
  name: string;
  organizationType: "ngo" | "company";
  membershipId: string;
  roleId: string;
  roleCode: string;
  roleName: string;
}

/* ==================================================
   USUÁRIO
   ================================================== */

async function getActiveUser(authUserId: string): Promise<UserRow> {
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

  return user;
}

/* ==================================================
   ORGANIZAÇÕES ACESSÍVEIS
   ================================================== */

export async function getAccessibleOrganizations(
  authUserId: string,
): Promise<AccessibleOrganization[]> {
  const user = await getActiveUser(authUserId);

  const result = await pool.query<AccessibleOrganizationRow>(
    `
      select
        o.id,
        o.name,
        o.organization_type
          as "organizationType",
        ou.id
          as "membershipId",
        r.id
          as "roleId",
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
        and ou.status = 'active'
        and o.active = true
      order by o.name asc
    `,
    [user.id],
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    organizationType: row.organizationType,
    membershipId: row.membershipId,
    role: {
      id: row.roleId,
      code: row.roleCode,
      name: row.roleName,
    },
  }));
}

/* ==================================================
   CONTEXTO MULTI-TENANT
   ================================================== */

export async function getOrganizationContext(
  authUserId: string,
  organizationId: string,
): Promise<OrganizationContext> {
  const user = await getActiveUser(authUserId);

  const result = await pool.query<AccessibleOrganizationRow>(
    `
      select
        o.id,
        o.name,
        o.organization_type
          as "organizationType",
        ou.id
          as "membershipId",
        r.id
          as "roleId",
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
        and ou.organization_id = $2
        and ou.status = 'active'
        and o.active = true
      limit 1
    `,
    [user.id, organizationId],
  );

  const organization = result.rows[0];

  if (!organization) {
    throw new AppError(
      "You do not have access to this organization",
      403,
      "ORGANIZATION_ACCESS_DENIED",
    );
  }

  return {
    organizationId: organization.id,
    organizationName: organization.name,
    organizationType: organization.organizationType,
    membershipId: organization.membershipId,
    roleId: organization.roleId,
    roleCode: organization.roleCode,
    roleName: organization.roleName,
  };
}
