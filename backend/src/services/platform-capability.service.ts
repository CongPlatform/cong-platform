import type { PoolClient } from "pg";

import pool from "../config/database.js";

export const NATIVE_DESIGNS_CAPABILITY = "institutional.native_designs.manage";

type QueryClient = Pick<PoolClient, "query">;

export async function hasPlatformCapability(
  client: QueryClient,
  authUserId: string,
  capability: string,
): Promise<boolean> {
  const result = await client.query<{ allowed: boolean }>(
    `
      select exists (
        select 1
        from public.users u
        join public.platform_user_capabilities puc
          on puc.user_id = u.id
        where u.auth_user_id = $1
          and u.active = true
          and puc.capability = $2
      ) as allowed
    `,
    [authUserId, capability],
  );

  return Boolean(result.rows[0]?.allowed);
}

export async function canManageNativeDesigns(
  authUserId: string,
): Promise<boolean> {
  const client = await pool.connect();
  try {
    return await hasPlatformCapability(
      client,
      authUserId,
      NATIVE_DESIGNS_CAPABILITY,
    );
  } finally {
    client.release();
  }
}
