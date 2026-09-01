import { createHash, randomBytes } from "node:crypto";

import pool from "../config/database.js";

import { supabaseAdmin } from "../config/supabase.js";

import { AppError } from "../utils/app-error.js";

const VERIFICATION_FLOW_TTL_MS = 30 * 60 * 1000;

export type EmailVerificationStatus =
  "pending" | "confirmed" | "expired" | "unavailable";

interface EmailVerificationFlow {
  auth_user_id: string;
  expires_at: Date;
  confirmed_at: Date | null;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createVerificationToken(): {
  token: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const token = randomBytes(32).toString("base64url");

  return {
    token,
    tokenHash: hashToken(token),

    expiresAt: new Date(Date.now() + VERIFICATION_FLOW_TTL_MS),
  };
}

export async function storeEmailVerificationFlow(
  authUserId: string,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> {
  /*
   * Mantemos apenas um fluxo recente
   * por usuário.
   */
  await pool.query(
    `
      delete from public.email_verification_flows
      where auth_user_id = $1
    `,
    [authUserId],
  );

  await pool.query(
    `
      insert into public.email_verification_flows (
        auth_user_id,
        token_hash,
        expires_at
      )
      values ($1, $2, $3)
    `,
    [authUserId, tokenHash, expiresAt],
  );
}

export async function getEmailVerificationStatus(
  rawToken: string,
): Promise<EmailVerificationStatus> {
  const tokenHash = hashToken(rawToken);

  const result = await pool.query<EmailVerificationFlow>(
    `
        select
          auth_user_id,
          expires_at,
          confirmed_at
        from public.email_verification_flows
        where token_hash = $1
        limit 1
      `,
    [tokenHash],
  );

  const flow = result.rows[0];

  if (!flow) {
    return "unavailable";
  }

  if (new Date(flow.expires_at).getTime() <= Date.now()) {
    return "expired";
  }

  /*
   * Depois que detectamos a confirmação
   * uma vez, não precisamos consultar
   * o Supabase novamente a cada polling.
   */
  if (flow.confirmed_at) {
    return "confirmed";
  }

  const { data, error } = await supabaseAdmin.auth.admin.getUserById(
    flow.auth_user_id,
  );

  if (error) {
    console.error("Unable to check email verification status:", error);

    throw new AppError(
      "Unable to check email verification status",
      503,
      "EMAIL_VERIFICATION_STATUS_UNAVAILABLE",
    );
  }

  const user = data.user;

  if (!user) {
    return "unavailable";
  }

  if (!user.email_confirmed_at) {
    return "pending";
  }

  await pool.query(
    `
      update public.email_verification_flows
      set confirmed_at = now()
      where token_hash = $1
    `,
    [tokenHash],
  );

  return "confirmed";
}
