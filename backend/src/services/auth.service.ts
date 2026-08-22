import pool from "../config/database.js";
import { createSupabaseAuthClient, supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/app-error.js";
import { env } from "../config/env.js";

interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
}

interface RegisteredUser {
  id: string;
  name: string;
}

interface LoginUserInput {
  email: string;
  password: string;
}

interface LoggedUser {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface RefreshedSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export async function registerUser(
  input: RegisterUserInput,
): Promise<RegisteredUser> {
  const { name, email, password } = input;

  const supabaseAuth = createSupabaseAuthClient();

  const { data, error } = await supabaseAuth.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${env.frontendUrl}/auth/confirm`,
    },
  });

  if (error || !data.user) {
    throw new AppError(
      "Unable to create authentication account",
      500,
      "AUTH_ACCOUNT_CREATION_FAILED",
    );
  }

  const authUser = data.user;

  try {
    const result = await pool.query<RegisteredUser>(
      `
          insert into public.users (
            auth_user_id,
            name
          )
          values ($1, $2)
          returning
            id,
            name
        `,
      [authUser.id, name],
    );

    const user = result.rows[0];

    if (!user) {
      throw new Error("User profile was not created");
    }

    return user;
  } catch {
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      authUser.id,
    );

    if (deleteError) {
      console.error(
        "Failed to rollback authentication user after profile creation failure",
      );
    }

    throw new AppError(
      "Unable to create user profile",
      500,
      "USER_PROFILE_CREATION_FAILED",
    );
  }
}

export async function loginUser(input: LoginUserInput): Promise<LoggedUser> {
  const supabaseAuth = createSupabaseAuthClient();

  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) {
    if (error.code === "email_not_confirmed") {
      throw new AppError("Email is not confirmed", 403, "EMAIL_NOT_CONFIRMED");
    }

    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  if (!data.session) {
    throw new AppError(
      "Unable to create user session",
      500,
      "SESSION_CREATION_FAILED",
    );
  }

  const result = await pool.query<{
    id: string;
    name: string;
    active: boolean;
  }>(
    `
      select
        id,
        name,
        active
      from public.users
      where auth_user_id = $1
      limit 1
    `,
    [data.user.id],
  );

  const user = result.rows[0];

  if (!user) {
    throw new AppError(
      "User profile was not found",
      500,
      "USER_PROFILE_NOT_FOUND",
    );
  }

  if (!user.active) {
    throw new AppError("User account is inactive", 403, "USER_INACTIVE");
  }

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresIn: data.session.expires_in,

    user: {
      id: user.id,
      name: user.name,
      email: data.user.email ?? input.email,
    },
  };
}

interface CurrentUser {
  id: string;
  name: string;
  email: string;
}

export async function getCurrentUser(
  authUserId: string,
  email: string,
): Promise<CurrentUser> {
  const result = await pool.query<{
    id: string;
    name: string;
    active: boolean;
  }>(
    `
      select
        id,
        name,
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
      "User profile was not found",
      404,
      "USER_PROFILE_NOT_FOUND",
    );
  }

  if (!user.active) {
    throw new AppError("User account is inactive", 403, "USER_INACTIVE");
  }

  return {
    id: user.id,
    name: user.name,
    email,
  };
}

export async function refreshUserSession(
  refreshToken: string,
): Promise<RefreshedSession> {
  const supabaseAuth = createSupabaseAuthClient();

  const { data, error } = await supabaseAuth.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    throw new AppError(
      "Unable to refresh user session",
      401,
      "INVALID_REFRESH_TOKEN",
    );
  }

  return {
    accessToken: data.session.access_token,

    refreshToken: data.session.refresh_token,

    expiresIn: data.session.expires_in,
  };
}

export async function logoutUserSession(accessToken: string): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.signOut(
    accessToken,
    "local",
  );

  if (error) {
    throw new AppError(
      "Unable to end user session",
      500,
      "SESSION_LOGOUT_FAILED",
    );
  }
}
