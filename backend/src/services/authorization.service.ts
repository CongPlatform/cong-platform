import pool from "../config/database.js";

interface PermissionRow {
  allowed: boolean;
}

export async function roleHasPermission(
  roleId: string,
  permissionCode: string,
): Promise<boolean> {
  const result = await pool.query<PermissionRow>(
    `
      select exists (
        select 1
        from public.role_permissions rp
        join public.permissions p
          on p.id = rp.permission_id
        where rp.role_id = $1
          and p.code = $2
      ) as allowed
    `,
    [roleId, permissionCode],
  );

  return result.rows[0]?.allowed ?? false;
}
